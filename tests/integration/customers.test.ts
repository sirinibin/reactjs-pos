import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { toRfc3339 } from '../../src/lib/format';
import { customerFormToBody, blankCustomerForm, moneyFormToBody, blankMoneyForm, flattenPostings, statementSummary } from '../../src/modules/customers/logic';
import { translateToArabic } from '../../src/modules/customers/api';
import { loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
let store: any;
const RUN = Date.now().toString(36).toUpperCase();
const iso = (d = new Date()) => toRfc3339(d);
// A valid, unique Saudi VAT number: 15 digits, starts and ends with 3.
const vat = () => `3${String(Date.now()).slice(-8)}${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}3`;
const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as ApiError; } throw new Error('expected the request to fail'); };

beforeAll(async () => {
  seed = loadSeed();
  await signIn();
  store = (await api.get<any>(`/v1/store/${seed.storeId}`, { select: 'id,zatca,settings' })).result;
});

async function createCustomer(patch: Record<string, any> = {}) {
  const body = { ...customerFormToBody({ ...blankCustomerForm(), name: `IT Customer ${RUN} ${Math.random().toString(36).slice(2, 6)}` }), store_id: seed.storeId, ...patch };
  return (await api.post<any>('/v1/customer', body, S(seed.storeId))).result;
}

describe('customers — live API', () => {
  it('lists customers with per-store stats and meta when stats=1', async () => {
    const r = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, stats: 1 }, limit: 5, sort: '-stores.sales_amount', select: 'id,code,name,credit_balance,stores' });
    expect(r.result!.length).toBeGreaterThan(0);
    expect(r.meta).toHaveProperty('credit_balance');
    expect(r.meta).toHaveProperty('sales_credit_balance');
    const amounts = r.result!.map((c) => c.stores?.[seed.storeId]?.sales_amount ?? 0);
    expect([...amounts].sort((a, b) => b - a)).toEqual(amounts); // "stores." sort is rewritten per store
  });

  it('search[query] finds by name words and search[code] by partial code', async () => {
    const c = await createCustomer({ name: `Zephyr Query ${RUN}` });
    const byName = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, query: `zephyr query` }, limit: 5, select: 'id' });
    expect(byName.result!.map((x) => x.id)).toContain(c.id);
    const byCode = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, code: c.code.slice(0, 5) }, limit: 50, select: 'id,code' });
    expect(byCode.result!.every((x) => x.code.toUpperCase().includes(c.code.slice(0, 5).toUpperCase()))).toBe(true);
  });

  it('create → read → update: uppercases the name, keeps Arabic digit fields, partial PUT', async () => {
    const v = vat();
    const body = customerFormToBody({ ...blankCustomerForm(), name: `gulf star ${RUN}`, vat_no: v, phone: '+966551234567', credit_limit: '2500', national_address: { ...blankCustomerForm().national_address, building_no: '8779', zipcode: '12241', city_name: 'Riyadh' } });
    const created = (await api.post<any>('/v1/customer', { ...body, store_id: seed.storeId }, S(seed.storeId))).result;
    expect(created.code).toMatch(/\S+/);
    const read = (await api.get<any>(`/v1/customer/${created.id}`, S(seed.storeId))).result;
    expect(read.name).toBe(`GULF STAR ${RUN}`);
    expect(read.phone).toBe('0551234567'); // +966 normalised to 0…
    expect(read.vat_no_in_arabic).toBe(body.vat_no_in_arabic);
    expect(read.national_address.building_no_arabic).toBe('۸۷۷۹');
    expect(read.credit_limit).toBe(2500);
    await api.put(`/v1/customer/${created.id}`, { store_id: seed.storeId, email: 'it@example.sa' }, S(seed.storeId));
    const after = (await api.get<any>(`/v1/customer/${created.id}`, S(seed.storeId))).result;
    expect(after.email).toBe('it@example.sa');
    expect(after.vat_no).toBe(v); // partial update keeps other fields
  });

  it('validates name, VAT format and C.R. with field errors', async () => {
    const e1 = await fail(api.post('/v1/customer', { store_id: seed.storeId, name: '' }, S(seed.storeId)));
    expect(e1.errors).toHaveProperty('name');
    const e2 = await fail(api.post('/v1/customer', { store_id: seed.storeId, name: `Bad VAT ${RUN}`, vat_no: '210000000000002' }, S(seed.storeId)));
    expect(e2.errors.vat_no).toMatch(/start and end with 3/);
    const e3 = await fail(api.post('/v1/customer', { store_id: seed.storeId, name: `Bad CR ${RUN}`, registration_number: '10-10' }, S(seed.storeId)));
    expect(e3.errors).toHaveProperty('registration_number');
  });

  it('rejects a duplicate VAT + name with 409', async () => {
    const v = vat();
    const name = `DUP CUSTOMER ${RUN}`;
    await createCustomer({ name, vat_no: v });
    const e = await fail(api.post('/v1/customer', { store_id: seed.storeId, name, vat_no: v }, S(seed.storeId)));
    expect(e.status).toBe(409);
    expect(e.errors.vat_no).toMatch(/already exists/);
  });

  it('enforces the national address on ZATCA phase 2 for VAT customers', async () => {
    if (store?.zatca?.phase !== '2') return; // rule only applies to phase-2 stores
    const e = await fail(api.post('/v1/customer', { store_id: seed.storeId, name: `NA ${RUN}`, vat_no: vat(), national_address: { building_no: '12', zipcode: '123' } }, S(seed.storeId)));
    expect(e.errors).toMatchObject({ national_address_building_no: expect.any(String), national_address_zipcode: expect.any(String) });
  });

  it('soft-deletes, lists under deleted=1 and restores', async () => {
    const c = await createCustomer();
    await api.del(`/v1/customer/${c.id}`, S(seed.storeId));
    const live = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, customer_id: c.id }, select: 'id' });
    expect(live.result!.map((x) => x.id)).not.toContain(c.id);
    const del = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, customer_id: c.id, deleted: 1 }, select: 'id,deleted' });
    expect(del.result!.map((x) => x.id)).toContain(c.id);
    expect((await api.get<any>(`/v1/customer/${c.id}`, S(seed.storeId))).result.deleted).toBe(true);
    await api.post(`/v1/customer/restore/${c.id}`, {}, S(seed.storeId));
    const back = await api.get<any[]>('/v1/customer', { search: { store_id: seed.storeId, customer_id: c.id }, select: 'id' });
    expect(back.result!.map((x) => x.id)).toContain(c.id);
  });

  it('posts an opening balance to the ledger and derives credit_balance from it', async () => {
    const asOf = new Date(Date.now() - 400 * 86400000);
    const c = await createCustomer({ opening_balance: 750, opening_balance_type: 'receivable', opening_balance_date: iso(asOf) });
    const read = (await api.get<any>(`/v1/customer/${c.id}`, S(seed.storeId))).result;
    expect(read.opening_balance_posted).toBe(true);
    expect(read.credit_balance).toBeCloseTo(750, 2);
    expect(read.account?.id).toBeTruthy();
    const st = await api.get<any[]>('/v1/posting', { search: { store_id: seed.storeId, account_id: read.account.id, stats: 1 }, limit: 20, sort: '-posts.date' });
    const rows = flattenPostings(st.result as any);
    expect(rows.length).toBeGreaterThan(0);
    expect(statementSummary(st.meta)).toMatchObject({ closing: 750, side: 'DR' });
  });

  it('requires an opening balance date', async () => {
    const e = await fail(api.post('/v1/customer', { store_id: seed.storeId, name: `OB ${RUN}`, opening_balance: 10, opening_balance_type: 'receivable' }, S(seed.storeId)));
    expect(e.errors).toHaveProperty('opening_balance_date');
  });

  it('returns churn/CLV history arrays', async () => {
    const r = await api.get<any>(`/v1/customer/${seed.customers[0].id}/history`, S(seed.storeId));
    expect(Array.isArray(r.result.churn_history)).toBe(true);
    expect(Array.isArray(r.result.clv_history)).toBe(true);
  });

  it('auto-translate degrades gracefully when the translate service is unavailable', async () => {
    const ar = await translateToArabic('Riyadh');
    expect(typeof ar).toBe('string'); // '' when Google credentials are missing (500 text/plain)
  });
});

describe('receivables & payables — live API', () => {
  let customer: any;
  let invoice: any;

  beforeAll(async () => {
    customer = await createCustomer({ name: `RCV Customer ${RUN}` });
    const p = seed.products[0];
    invoice = (await api.post<any>('/v1/order', {
      store_id: seed.storeId, date_str: iso(new Date(Date.now() - 60_000)), customer_id: customer.id, customer_name: customer.name, vat_percent: 15,
      products: [{ product_id: p.id, name: p.name, quantity: 1, unit_price: 100, unit_price_with_vat: 115, unit_discount: 0, unit_discount_with_vat: 0 }],
      auto_rounding_amount: false, discount: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: [],
    }, S(seed.storeId))).result;
  });

  const depositBody = (amount: number, extra: Partial<Record<string, any>> = {}) => {
    const f = blankMoneyForm();
    f.party = { id: customer.id, name: customer.name };
    f.payments = [{ ...f.payments[0], amount: String(amount), method: 'cash', ...extra }];
    return { store_id: seed.storeId, ...moneyFormToBody(f, { isNew: true }) };
  };

  it('validates with customer_receivable_* keys', async () => {
    const f = blankMoneyForm();
    const e = await fail(api.post('/v1/customer-deposit', { store_id: seed.storeId, ...moneyFormToBody(f, { isNew: true }) }, S(seed.storeId)));
    expect(e.errors).toHaveProperty('customer_id');
    expect(e.errors).toHaveProperty('customer_receivable_payment_amount_0');
    expect(e.errors).toHaveProperty('customer_receivable_payment_method_0');
  });

  it('rejects paying more than the linked invoice balance', async () => {
    const e = await fail(api.post('/v1/customer-deposit', depositBody(invoice.net_total + 50, { invoice_id: invoice.id, invoice_code: invoice.code, invoice_type: 'sales' }), S(seed.storeId)));
    expect(e.errors.customer_receivable_payment_amount_0).toMatch(/Invoice Balance/);
  });

  it('creates a receivable that settles the invoice, then updates it, with list meta', async () => {
    const amount = 40;
    const created = (await api.post<any>('/v1/customer-deposit', depositBody(amount, { invoice_id: invoice.id, invoice_code: invoice.code, invoice_type: 'sales' }), S(seed.storeId))).result;
    expect(created.code).toBeTruthy();
    expect(created.net_total).toBe(amount);
    const view = (await api.get<any>(`/v1/customer-deposit/${created.id}`, S(seed.storeId))).result;
    expect(view.customer?.id || view.customer_id).toBeTruthy();
    expect(view.payments[0].invoice_code).toBe(invoice.code);
    const inv = (await api.get<any>(`/v1/order/${invoice.id}`, S(seed.storeId))).result;
    expect(inv.balance_amount).toBeCloseTo(invoice.net_total - amount, 2);
    expect(inv.payment_status).toBe('paid_partially');

    const list = await api.get<any[]>('/v1/customer-deposit', { search: { store_id: seed.storeId, customer_id: customer.id, stats: 1 }, limit: 10 });
    expect(list.result!.map((x) => x.id)).toContain(created.id);
    expect(list.meta!.total).toBeGreaterThanOrEqual(amount);
    expect(list.meta).toHaveProperty('purchase_fund');

    // Update: payments must carry date_str again (the API re-validates every payment).
    const f = blankMoneyForm();
    f.party = { id: customer.id, name: customer.name };
    f.date = view.date ? toRfc3339(new Date(view.date)).slice(0, 16) : f.date;
    f.payments = [{ id: view.payments[0].id, date: toRfc3339(new Date(view.payments[0].date)).slice(0, 16), amount: '30', discount: '', method: 'bank_transfer', bank_reference: 'TRX-1', description: '', invoice_id: invoice.id, invoice_code: invoice.code, invoice_type: 'sales' }];
    await api.put(`/v1/customer-deposit/${created.id}`, { store_id: seed.storeId, ...moneyFormToBody(f, { isNew: false }) }, S(seed.storeId));
    const after = (await api.get<any>(`/v1/customer-deposit/${created.id}`, S(seed.storeId))).result;
    expect(after.net_total).toBe(30);
    expect(after.payment_methods).toEqual(['bank_transfer']);
    const inv2 = (await api.get<any>(`/v1/order/${invoice.id}`, S(seed.storeId))).result;
    expect(inv2.balance_amount).toBeCloseTo(invoice.net_total - 30, 2);
  });

  it('flags a duplicate receivable (same party + amount within 30s)', async () => {
    const amount = 7.77;
    await api.post('/v1/customer-deposit', depositBody(amount), S(seed.storeId));
    const e = await fail(api.post('/v1/customer-deposit', depositBody(amount), S(seed.storeId)));
    expect(e.errors).toHaveProperty('duplicate');
  });

  it('filters receivables by date range and code', async () => {
    const d = new Date();
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    const today = `${mon} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
    const r = await api.get<any[]>('/v1/customer-deposit', { search: { store_id: seed.storeId, from_date: today, to_date: today, customer_id: customer.id }, limit: 50, select: 'id,code,date' });
    expect(r.result!.length).toBeGreaterThan(0);
    const code = r.result![0].code;
    const byCode = await api.get<any[]>('/v1/customer-deposit', { search: { store_id: seed.storeId, code }, select: 'id,code' });
    expect(byCode.result!.map((x) => x.code)).toContain(code);
  });

  it('creates a payable (customer withdrawal) and validates with customer_payable_* keys', async () => {
    const f = blankMoneyForm();
    const e = await fail(api.post('/v1/customer-withdrawal', { store_id: seed.storeId, ...moneyFormToBody(f, { isNew: true }) }, S(seed.storeId)));
    expect(e.errors).toHaveProperty('customer_payable_payment_amount_0');
    f.party = { id: customer.id, name: customer.name };
    f.payments = [{ ...f.payments[0], amount: '12.5', method: 'cash' }];
    const r = (await api.post<any>('/v1/customer-withdrawal', { store_id: seed.storeId, ...moneyFormToBody(f, { isNew: true }) }, S(seed.storeId))).result;
    expect(r.net_total).toBe(12.5);
    const list = await api.get<any[]>('/v1/customer-withdrawal', { search: { store_id: seed.storeId, customer_id: customer.id, stats: 1 } });
    expect(list.result!.map((x) => x.id)).toContain(r.id);
    expect(list.meta).not.toHaveProperty('purchase_fund');
  });
});

describe('customer packages — live API', () => {
  it('CRUD with unique names and tab ids', async () => {
    const name = `IT Package ${RUN}`;
    const created = (await api.post<any>('/v1/customer-package', { name, tab_ids: ['sales', 'customers'] })).result;
    expect(created.id).toBeTruthy();
    const dup = await fail(api.post('/v1/customer-package', { name, tab_ids: [] }));
    expect(dup.errors.name).toMatch(/already in use/i);
    const empty = await fail(api.post('/v1/customer-package', { name: '' }));
    expect(empty.errors).toHaveProperty('name');
    await api.put(`/v1/customer-package/${created.id}`, { name, tab_ids: ['sales', 'customers', 'receivables'] });
    const read = (await api.get<any>(`/v1/customer-package/${created.id}`)).result;
    expect(read.tab_ids).toEqual(['sales', 'customers', 'receivables']);
    const list = await api.get<any[]>('/v1/customer-package', { search: { name }, limit: 10 });
    expect(list.result!.map((x) => x.id)).toContain(created.id);
    await api.del(`/v1/customer-package/${created.id}`);
    const gone = await api.get<any[]>('/v1/customer-package', { search: { name }, limit: 10 });
    expect((gone.result || []).map((x) => x.id)).not.toContain(created.id);
  });
});
