import { createResource } from '../../api/resource';

describe('createResource', () => {
    const realFetch = global.fetch;
    beforeEach(() => {
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'tok');
        global.fetch = jest.fn().mockResolvedValue({
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ status: true, result: [{ id: 'a' }], total_count: 41 }),
        });
    });
    afterEach(() => { global.fetch = realFetch; localStorage.clear(); });

    const r = createResource('product-brand', { select: 'id,name' });

    it('list sends select, store, timezone, sort, page and limit like the classic list', async () => {
        const out = await r.list({ search: { name: 'bo' }, sort: { key: 'created_at', dir: 'desc' }, page: 3, limit: 20 });
        expect(out).toEqual({ rows: [{ id: 'a' }], total: 41, meta: undefined });
        const url = decodeURIComponent(global.fetch.mock.calls[0][0]);
        expect(url).toMatch(/^\/v1\/product-brand\?select=id,name&/);
        expect(url).toContain('search[name]=bo');
        expect(url).toContain('search[store_id]=store1');
        expect(url).toContain('search[timezone_offset]=');
        expect(url).toContain('sort=-created_at');
        expect(url).toContain('page=3');
        expect(url).toContain('limit=20');
    });

    it('get scopes to the store', async () => {
        await r.get('id1');
        expect(decodeURIComponent(global.fetch.mock.calls[0][0])).toBe('/v1/product-brand/id1?search[store_id]=store1');
    });

    it('create POSTs with store_id in body and query', async () => {
        await r.create({ name: 'X' });
        const [url, opts] = global.fetch.mock.calls[0];
        expect(decodeURIComponent(url)).toBe('/v1/product-brand?search[store_id]=store1');
        expect(opts.method).toBe('POST');
        expect(JSON.parse(opts.body)).toEqual({ name: 'X', store_id: 'store1' });
    });

    it('update PUTs to /id and keeps an explicit store_id', async () => {
        await r.update('id9', { name: 'Y', store_id: 'other' });
        const [url, opts] = global.fetch.mock.calls[0];
        expect(decodeURIComponent(url)).toBe('/v1/product-brand/id9?search[store_id]=store1');
        expect(opts.method).toBe('PUT');
        expect(JSON.parse(opts.body).store_id).toBe('other');
    });

    it('remove DELETEs and restore POSTs to /restore/id', async () => {
        await r.remove('d1');
        await r.restore('d1');
        expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
        expect(decodeURIComponent(global.fetch.mock.calls[0][0])).toBe('/v1/product-brand/d1?search[store_id]=store1');
        expect(global.fetch.mock.calls[1][1].method).toBe('POST');
        expect(decodeURIComponent(global.fetch.mock.calls[1][0])).toBe('/v1/product-brand/restore/d1?search[store_id]=store1');
    });

    it('list falls back to empty rows when the API omits result', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ status: true }) });
        expect(await r.list()).toEqual({ rows: [], total: 0, meta: undefined });
    });
});
