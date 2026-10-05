/**
 * API-compatibility tests: every request the rebuilt master-data screens
 * send is replayed against the live pos-rest API, and the response fields
 * the screens read are checked. If the API changes shape, these fail.
 */
const { test, expect } = require('@playwright/test');
const { API_URL, login, firstStore, uid, testClientIp } = require('../helpers');

let token;
let storeId;
const auth = () => ({ Authorization: token, 'Content-Type': 'application/json' });
const q = params => Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

test.beforeAll(async ({ request }) => {
    token = await login(request);
    storeId = (await firstStore(request, token)).id;
});

test('auth: authorize → accesstoken → me returns the fields the app stores', async ({ request }) => {
    const res = await request.get(API_URL + '/v1/me', { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const me = (await res.json()).result;
    for (const k of ['id', 'name', 'email', 'admin']) expect(me).toHaveProperty(k);
    expect('role' in me || me.admin !== undefined).toBeTruthy();
});

test('auth: a bad password is rejected with a field error', async ({ request }) => {
    const res = await request.post(API_URL + '/v1/authorize', { data: { email: 'nobody@example.com', password: 'wrong-' + Date.now() }, headers: { 'X-Real-IP': testClientIp() } });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.status).toBe(false);
    expect(Object.keys(body.errors).length).toBeGreaterThan(0);
});

test('auth: requests without a token get 401 with errors.access_token (drives the logout redirect)', async ({ request }) => {
    const res = await request.get(API_URL + '/v1/product-brand?' + q({ 'search[store_id]': storeId }));
    expect(res.status()).toBe(401);
    expect((await res.json()).errors).toHaveProperty('access_token');
});

const resources = [
    { name: 'product-brand', select: 'id,code,name,created_at,deleted', body: () => ({ name: uid('Brand'), code: uid('B').slice(0, 12) }), required: ['name', 'code'], softDelete: true },
    { name: 'product-category', select: 'id,name,parent_name,parent_id,created_by_name,created_at,deleted', body: () => ({ name: uid('Cat') }), required: ['name'], softDelete: true },
    { name: 'service-category', select: 'id,name,parent_name,parent_id,created_at,deleted', body: () => ({ name: uid('SvcCat') }), required: ['name'], softDelete: true },
    { name: 'expense-category', select: 'id,name,parent_name,parent_id,created_by_name,created_at', body: () => ({ name: uid('ExpCat') }), required: ['name'], softDelete: false },
];

for (const r of resources) {
    test.describe(r.name, () => {
        test('list envelope, select fields, paging and sort', async ({ request }) => {
            const res = await request.get(`${API_URL}/v1/${r.name}?select=${r.select}&` + q({
                'search[store_id]': storeId, 'search[timezone_offset]': '0', sort: '-created_at', page: '1', limit: '5',
            }), { headers: auth() });
            expect(res.ok()).toBeTruthy();
            const body = await res.json();
            expect(body.status).toBe(true);
            expect(Array.isArray(body.result)).toBeTruthy();
            expect(typeof body.total_count).toBe('number');
            expect(body.result.length).toBeLessThanOrEqual(5);
            const times = body.result.map(x => new Date(x.created_at).getTime());
            expect(times).toEqual(times.slice().sort((a, b) => b - a));
        });

        test('create validation errors use the field names the form maps', async ({ request }) => {
            const res = await request.post(`${API_URL}/v1/${r.name}?` + q({ 'search[store_id]': storeId }), { headers: auth(), data: { store_id: storeId } });
            expect(res.ok()).toBeFalsy();
            const body = await res.json();
            expect(body.status).toBe(false);
            for (const f of r.required) expect(body.errors).toHaveProperty(f);
        });

        test('create → get → update → filter → delete → restore lifecycle', async ({ request }) => {
            const data = { ...r.body(), store_id: storeId };
            const created = await request.post(`${API_URL}/v1/${r.name}?` + q({ 'search[store_id]': storeId }), { headers: auth(), data });
            expect(created.ok(), await created.text()).toBeTruthy();
            const rec = (await created.json()).result;
            expect(rec.id).toBeTruthy();
            expect(rec.name).toBe(data.name);

            const got = await request.get(`${API_URL}/v1/${r.name}/${rec.id}?` + q({ 'search[store_id]': storeId }), { headers: auth() });
            const full = (await got.json()).result;
            for (const k of ['id', 'name', 'created_at', 'updated_at']) expect(full).toHaveProperty(k);

            const newName = data.name + ' X';
            const upd = await request.put(`${API_URL}/v1/${r.name}/${rec.id}?` + q({ 'search[store_id]': storeId }), { headers: auth(), data: { ...full, name: newName, store_id: storeId } });
            expect(upd.ok(), await upd.text()).toBeTruthy();
            expect((await upd.json()).result.name).toBe(newName);

            // name filter as sent by the column filter
            const found = await request.get(`${API_URL}/v1/${r.name}?select=${r.select}&` + q({ 'search[store_id]': storeId, 'search[name]': newName, page: '1', limit: '20' }), { headers: auth() });
            expect((await found.json()).result.map(x => x.id)).toContain(rec.id);

            // date filter in the "MMM dd yyyy" format the DateFilter sends
            const d = new Date(full.created_at);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const apiDate = `${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')} ${d.getUTCFullYear()}`;
            const byDate = await request.get(`${API_URL}/v1/${r.name}?select=${r.select}&` + q({ 'search[store_id]': storeId, 'search[created_at]': apiDate, 'search[timezone_offset]': '0', page: '1', limit: '200' }), { headers: auth() });
            expect(byDate.ok()).toBeTruthy();
            expect((await byDate.json()).result.map(x => x.id)).toContain(rec.id);

            if (!r.softDelete) return;
            const del = await request.delete(`${API_URL}/v1/${r.name}/${rec.id}?` + q({ 'search[store_id]': storeId }), { headers: auth() });
            expect(del.ok(), await del.text()).toBeTruthy();
            const active = await request.get(`${API_URL}/v1/${r.name}?select=${r.select}&` + q({ 'search[store_id]': storeId, 'search[name]': newName }), { headers: auth() });
            expect((await active.json()).result.map(x => x.id)).not.toContain(rec.id);
            const deleted = await request.get(`${API_URL}/v1/${r.name}?select=${r.select}&` + q({ 'search[store_id]': storeId, 'search[name]': newName, 'search[deleted]': '1' }), { headers: auth() });
            const delRows = (await deleted.json()).result;
            expect(delRows.map(x => x.id)).toContain(rec.id);
            expect(delRows.find(x => x.id === rec.id).deleted).toBe(true);

            const res2 = await request.post(`${API_URL}/v1/${r.name}/restore/${rec.id}?` + q({ 'search[store_id]': storeId }), { headers: auth() });
            expect(res2.ok(), await res2.text()).toBeTruthy();
            const back = await request.get(`${API_URL}/v1/${r.name}/${rec.id}?` + q({ 'search[store_id]': storeId }), { headers: auth() });
            expect((await back.json()).result.deleted).toBe(false);
        });
    });
}

test('product-category: parent link round-trips (parent_id / parent_name)', async ({ request }) => {
    const parent = (await (await request.post(`${API_URL}/v1/product-category?` + q({ 'search[store_id]': storeId }), { headers: auth(), data: { name: uid('Parent'), store_id: storeId } })).json()).result;
    const childRes = await request.post(`${API_URL}/v1/product-category?` + q({ 'search[store_id]': storeId }), { headers: auth(), data: { name: uid('Child'), parent_id: parent.id, store_id: storeId } });
    expect(childRes.ok(), await childRes.text()).toBeTruthy();
    const child = (await childRes.json()).result;
    const got = (await (await request.get(`${API_URL}/v1/product-category/${child.id}?` + q({ 'search[store_id]': storeId }), { headers: auth() })).json()).result;
    expect(got.parent_id).toBe(parent.id);
    expect(got.parent_name).toBe(parent.name);
    // clearing the parent (the form sends parent_id: null)
    const cleared = await request.put(`${API_URL}/v1/product-category/${child.id}?` + q({ 'search[store_id]': storeId }), { headers: auth(), data: { ...got, parent_id: null, parent_name: '', store_id: storeId } });
    expect(cleared.ok(), await cleared.text()).toBeTruthy();
});

test('lookups: user search used by the Created By filter', async ({ request }) => {
    const res = await request.get(`${API_URL}/v1/user?select=id,name&` + q({ 'search[name]': '' }), { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const rows = (await res.json()).result || [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('id');
    expect(rows[0]).toHaveProperty('name');
});

test('created_by multi-id filter accepts comma-separated ids', async ({ request }) => {
    const me = (await (await request.get(API_URL + '/v1/me', { headers: auth() })).json()).result;
    const res = await request.get(`${API_URL}/v1/product-category?select=id,created_by_name&` + q({ 'search[store_id]': storeId, 'search[created_by]': me.id + ',' + me.id }), { headers: auth() });
    expect(res.ok()).toBeTruthy();
    const rows = (await res.json()).result;
    expect(rows.length).toBeGreaterThan(0);
});
