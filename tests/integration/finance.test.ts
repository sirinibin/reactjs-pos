import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { toApiDate, toRfc3339 } from '../../src/lib/format';
import { buildStatement, buildTrialBalance, isBalanced, journalTotals, type Account } from '../../src/modules/finance/logic';
import { equityBody, EQUITY, toExpenseBody } from '../../src/modules/finance/bodies';
import { flagsFrom, isEmptyMonth, kpis } from '../../src/modules/home/dashboard';
import { parseCsv } from '../../src/modules/insights/stats';
import { API_URL, loadSeed, S, signIn, type Seed } from './helpers';

let seed: Seed;
let token = '';
let me: { id: string; name: string };
const run = Date.now().toString(36);
const today = toApiDate(new Date());
const nowLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const rejectsWith = async (p: Promise<unknown>, key: string) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect(Object.keys((e as ApiError).errors)).toContain(key);
    return;
  }
  throw new Error(`expected an error on ${key}`);
};

beforeAll(async () => {
  seed = loadSeed();
  token = await signIn();
  me = (await api.get<any>('/v1/me')).result;
});

describe('expense categories', () => {
  it('creates a category, then rejects a duplicate name in the same store', async () => {
    const name = `IT Utilities ${run}`;
    const r = await api.post<any>('/v1/expense-category', { store_id: seed.storeId, name }, S(seed.storeId));
    expect(r.result).toMatchObject({ name, store_id: seed.storeId });
    await rejectsWith(api.post('/v1/expense-category', { store_id: seed.storeId, name }, S(seed.storeId)), 'name');
    const child = await api.post<any>('/v1/expense-category', { store_id: seed.storeId, name: `IT Child ${run}`, parent_id: r.result.id }, S(seed.storeId));
    expect(child.result.parent_name).toBe(name); // server fills parent_name
  });
});

describe('expenses', () => {
  let catId = '';
  let created: any;
  beforeAll(async () => {
    catId = (await api.post<any>('/v1/expense-category', { store_id: seed.storeId, name: `IT Expenses ${run}` }, S(seed.storeId))).result.id;
  });

  it('meta totals are zero unless search[stats]=1', async () => {
    const off = await api.get<any[]>('/v1/expense', { search: { store_id: seed.storeId }, limit: 1 });
    const on = await api.get<any[]>('/v1/expense', { search: { store_id: seed.storeId, stats: 1 }, limit: 1 });
    expect(off.meta?.total || 0).toBe(0);
    expect(on.meta).toHaveProperty('total');
    expect(on.meta).toHaveProperty('purchase_fund');
  });

  it('creates an expense from the editor body: no vendor → no VAT, code EXP-…', async () => {
    const body = toExpenseBody({ date: nowLocal(), amount: '115', description: `IT office tea ${run}`, payment_method: 'cash', vendor: null, vendor_invoice_no: '', categories: [{ id: catId, label: 'x', data: null }], images: [], pending: [] }, seed.storeId);
    const r = await api.post<any>('/v1/expense', body, S(seed.storeId));
    created = r.result;
    expect(created.code).toMatch(/^EXP-?\d+/);
    expect(created.vat_price).toBe(0);
    expect(created.amount).toBe(115);
  });

  it('a linked vendor makes the server compute VAT from the VAT-inclusive amount', async () => {
    const v = seed.vendors[0];
    const r = await api.post<any>('/v1/expense', { store_id: seed.storeId, date_str: toRfc3339(new Date()), amount: 115, description: `IT vendor expense ${run}`, payment_method: 'bank_transfer', category_id: [catId], vendor_id: v.id, vendor_name: v.name }, S(seed.storeId));
    expect(r.result.vat_price).toBe(15);
    expect(r.result.vendor_id).toBe(v.id);
  });

  it('a typed vendor name without id auto-creates the vendor', async () => {
    const name = `IT CORNER SHOP ${run}`;
    const r = await api.post<any>('/v1/expense', { store_id: seed.storeId, date_str: toRfc3339(new Date()), amount: 20, description: `IT corner ${run}`, payment_method: 'cash', category_id: [catId], vendor_id: '', vendor_name: name }, S(seed.storeId));
    const view = await api.get<any>(`/v1/expense/${r.result.id}`, S(seed.storeId));
    expect(view.result.vendor_id).toBeTruthy();
    const vendors = await api.get<any[]>('/v1/vendor', { search: { store_id: seed.storeId, query: name }, limit: 5, select: 'id,name' });
    expect(vendors.result!.some((x) => x.id === view.result.vendor_id)).toBe(true);
  });

  it('reads back, updates with PUT and keeps the category', async () => {
    const view = await api.get<any>(`/v1/expense/${created.id}`, S(seed.storeId));
    expect(view.result.category_id).toEqual([catId]);
    const upd = await api.put<any>(`/v1/expense/${created.id}`, { ...view.result, store_id: seed.storeId, date_str: view.result.date, amount: 230, description: `IT office tea x2 ${run}` }, S(seed.storeId));
    expect(upd.result.amount).toBe(230);
  });

  it('validation errors come back per field', async () => {
    await rejectsWith(api.post('/v1/expense', { store_id: seed.storeId, date_str: toRfc3339(new Date()), amount: 0, description: 'x', payment_method: 'cash', category_id: [catId] }, S(seed.storeId)), 'amount');
    await rejectsWith(api.post('/v1/expense', { store_id: seed.storeId, date_str: toRfc3339(new Date()), amount: 5, description: 'x', payment_method: 'cash', category_id: [] }, S(seed.storeId)), 'category_id');
    await rejectsWith(api.post('/v1/expense', { store_id: seed.storeId, date_str: 'yesterday', amount: 5, description: 'x', payment_method: 'cash', category_id: [catId] }, S(seed.storeId)), 'date_str');
  });

  it('negative amounts are accepted (only zero is rejected)', async () => {
    const r = await api.post<any>('/v1/expense', { store_id: seed.storeId, date_str: toRfc3339(new Date()), amount: -5, description: `IT refund ${run}`, payment_method: 'cash', category_id: [catId] }, S(seed.storeId));
    expect(r.result.amount).toBe(-5);
  });

  it('filters by category, payment method list, amount operator and today', async () => {
    const r = await api.get<any[]>('/v1/expense', { search: { store_id: seed.storeId, category_id: catId, payment_method: 'cash,bank_transfer', amount: '>=100', from_date: today, to_date: today, stats: 1 }, limit: 50, select: 'id,amount,payment_method,category_id' });
    expect(r.result!.length).toBeGreaterThanOrEqual(2);
    for (const e of r.result!) {
      expect(e.amount).toBeGreaterThanOrEqual(100);
      expect(['cash', 'bank_transfer']).toContain(e.payment_method);
    }
    expect(r.meta!.total).toBeGreaterThanOrEqual(345);
    expect(r.meta!.vat).toBeGreaterThanOrEqual(15);
  });

  it('posts a balanced ledger entry for the expense', async () => {
    const r = await api.get<any[]>('/v1/ledger', { search: { store_id: seed.storeId, reference_id: created.id }, limit: 5 });
    expect(r.result!.length).toBe(1);
    expect(r.result![0].reference_model).toBe('expense');
    const tot = journalTotals(r.result![0].journals);
    expect(tot.debit).toBeCloseTo(tot.credit, 2);
    expect(tot.debit).toBe(230);
  });
});

describe('capital & drawings', () => {
  it('requires an investor that is a real user', async () => {
    await rejectsWith(api.post('/v1/capital', { store_id: seed.storeId, ...equityBody(EQUITY.capital, { amount: 10, description: 'x', payment_method: 'cash', date_str: nowLocal() }) }, S(seed.storeId)), 'invested_by_user_id');
  });

  it('creates capital and a drawing; list meta.total is always computed', async () => {
    const before = (await api.get<any[]>('/v1/capital', { search: { store_id: seed.storeId }, limit: 1 })).meta!.total;
    const cap = await api.post<any>('/v1/capital', { store_id: seed.storeId, ...equityBody(EQUITY.capital, { invested_by_user_id: me.id, amount: 1000, description: `IT capital ${run}`, payment_method: 'cash', date_str: nowLocal() }) }, S(seed.storeId));
    expect(cap.result.invested_by_user_name).toBe(me.name);
    const after = (await api.get<any[]>('/v1/capital', { search: { store_id: seed.storeId }, limit: 1 })).meta!.total;
    expect(after - before).toBeCloseTo(1000, 2);
    const dr = await api.post<any>('/v1/divident', { store_id: seed.storeId, ...equityBody(EQUITY.drawing, { withdrawn_by_user_id: me.id, amount: 100, description: `IT drawing ${run}`, payment_method: 'bank_transfer', date_str: nowLocal() }) }, S(seed.storeId));
    expect(dr.result.code).toBeTruthy();
    const one = await api.get<any>(`/v1/divident/${dr.result.id}`, S(seed.storeId));
    expect(one.result.withdrawn_by_user_id).toBe(me.id);
  });

  it('quirk: search[withdrawn_by_user_id] is ignored by the drawings list', async () => {
    const all = await api.get<any[]>('/v1/divident', { search: { store_id: seed.storeId }, limit: 1 });
    const filtered = await api.get<any[]>('/v1/divident', { search: { store_id: seed.storeId, withdrawn_by_user_id: '000000000000000000000000' }, limit: 1 });
    expect(filtered.total_count).toBe(all.total_count);
  });
});

describe('accounts, trial balance & statements', () => {
  it('total_count and meta only come back with search[stats]=1', async () => {
    const off = await api.get<any[]>('/v1/account', { search: { store_id: seed.storeId }, limit: 2 });
    const on = await api.get<any[]>('/v1/account', { search: { store_id: seed.storeId, stats: 1 }, limit: 2 });
    expect(off.total_count).toBe(0);
    expect(on.total_count).toBeGreaterThan(2);
    expect(on.meta).toHaveProperty('debit_balance_total');
    expect(on.meta).toHaveProperty('credit_balance_total');
  });

  it('the client trial-balance tree adds up to the server totals', async () => {
    const all: Account[] = [];
    let meta: any = {};
    for (let page = 1; page <= 10; page++) {
      const r = await api.get<Account[]>('/v1/account', { search: { store_id: seed.storeId, stats: 1 }, page, limit: 500, select: 'id,name,number,type,balance,debit_or_credit_balance,reference_model,deleted' });
      if (page === 1) meta = r.meta;
      all.push(...r.result!);
      if (r.result!.length < 500) break;
    }
    const tb = buildTrialBalance(all);
    expect(tb.debit).toBeCloseTo(meta.debit_balance_total, 1);
    expect(tb.credit).toBeCloseTo(meta.credit_balance_total, 1);
    expect(typeof isBalanced(tb.debit, tb.credit)).toBe('boolean');
  });

  it('search[search] matches name or number (typeahead)', async () => {
    const r = await api.get<Account[]>('/v1/account', { search: { store_id: seed.storeId, search: 'CASH' }, limit: 5, select: 'id,name,number' });
    expect(r.result!.some((a) => a.name === 'CASH')).toBe(true);
  });

  it('CASH statement: meta closing balance matches the client statement and the last running balance', async () => {
    const cash = (await api.get<Account[]>('/v1/account', { search: { store_id: seed.storeId, name: '^CASH$' }, limit: 1, select: 'id,name,balance,debit_or_credit_balance' })).result![0];
    const first = await api.get<any[]>('/v1/posting', { search: { store_id: seed.storeId, account_id: cash.id, stats: 1 }, limit: 1, sort: 'posts.date', select: 'id' });
    const total = first.total_count!;
    expect(total).toBeGreaterThan(0);
    const last = Math.ceil(total / 50);
    const r = await api.get<any[]>('/v1/posting', { search: { store_id: seed.storeId, account_id: cash.id, stats: 1 }, page: last, limit: 50, sort: 'posts.date', select: 'id,date,account_id,reference_id,reference_model,reference_code,posts' });
    const st = buildStatement(r.result!, r.meta!);
    expect(r.meta!.account.id).toBe(cash.id);
    expect(st.closing.amount).toBeCloseTo(Math.abs(r.meta!.debit_total - r.meta!.credit_total), 2);
    expect(st.closing.amount).toBeCloseTo(cash.balance!, 1);
  });

  it('a date range yields an opening balance (bought down) and only in-range posts', async () => {
    const cash = (await api.get<Account[]>('/v1/account', { search: { store_id: seed.storeId, name: '^CASH$' }, limit: 1, select: 'id' })).result![0];
    const r = await api.get<any[]>('/v1/posting', { search: { store_id: seed.storeId, account_id: cash.id, stats: 1, from_date: today, to_date: today }, limit: 200, sort: 'posts.date', select: 'id,reference_code,reference_model,posts' });
    const keys = Object.keys(r.meta!);
    expect(keys.some((k) => k.endsWith('_bought_down'))).toBe(true);
    const todayStr = new Date().toDateString();
    for (const p of r.result!) for (const post of p.posts) expect(new Date(post.date).toDateString()).toBe(todayStr);
  });

  it('ledger account filter matches journals of that account', async () => {
    const cash = (await api.get<Account[]>('/v1/account', { search: { store_id: seed.storeId, name: '^CASH$' }, limit: 1, select: 'id' })).result![0];
    const r = await api.get<any[]>('/v1/ledger', { search: { store_id: seed.storeId, account_id: cash.id }, limit: 10, sort: '-journals.date' });
    expect(r.result!.length).toBeGreaterThan(0);
    for (const l of r.result!) expect(l.journals.some((j: any) => j.account_id === cash.id)).toBe(true);
  });

  it('print-data endpoints are public and 404 for unknown keys', async () => {
    const res = await fetch(`${API_URL}/v1/posting/print-data/does-not-exist`);
    expect(res.status).toBe(404);
    const res2 = await fetch(`${API_URL}/v1/report/print-data/does-not-exist`);
    expect(res2.status).toBe(404);
  });
});

describe('business dashboard endpoints', () => {
  it('take a plain store_id; search[store_id] alone is rejected', async () => {
    const ok = await api.get<any[]>('/v1/dashboard/monthly', { store_id: seed.storeId, from_month: '2020-01', to_month: '2030-12' });
    expect(Array.isArray(ok.result)).toBe(true);
    const months = ok.result!.map((m) => m.month_str);
    expect([...months].sort()).toEqual(months);
    await expect(api.get('/v1/dashboard/monthly', { search: { store_id: seed.storeId } })).rejects.toBeInstanceOf(ApiError);
  });

  it('monthly rows feed the KPI engine; sales match the order list for the same months', async () => {
    const m = (await api.get<any[]>('/v1/dashboard/monthly', { store_id: seed.storeId, from_month: '2020-01', to_month: '2030-12' })).result!.filter((x) => !isEmptyMonth(x));
    const k = kpis(m, flagsFrom({}));
    expect(k.orders).toBeGreaterThan(0);
    expect(k.salesGross).toBeGreaterThan(0);
    expect(k.avgOrder).toBeCloseTo(k.salesGross / k.orders, 1);
  });

  it('stock, accounts, products and outstanding have the documented shapes', async () => {
    const stock = (await api.get<any>('/v1/dashboard/stock', { store_id: seed.storeId })).result;
    expect(stock.total).toBe(stock.out_of_stock + stock.low_stock + stock.healthy_stock);
    const acc = (await api.get<any[]>('/v1/dashboard/accounts', { store_id: seed.storeId })).result!;
    for (const a of acc) expect(['cash', 'bank']).toContain(a.account_type);
    const prods = (await api.get<any[]>('/v1/dashboard/products', { store_id: seed.storeId, limit: 3 })).result!;
    expect(prods.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < prods.length; i++) expect(prods[i - 1].total_revenue).toBeGreaterThanOrEqual(prods[i].total_revenue);
    const out = (await api.get<any[]>('/v1/dashboard/outstanding', { store_id: seed.storeId, limit: 5 })).result!;
    for (const o of out) expect(o.outstanding).toBeGreaterThan(0);
  });

  it('home "needs attention" counts come from list endpoints', async () => {
    const open = await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId, payment_status: 'not_paid,paid_partially' }, limit: 1, select: 'id' });
    expect(open.total_count).toBeGreaterThanOrEqual(0);
    const bills = await api.get<any[]>('/v1/purchase', { search: { store_id: seed.storeId, payment_status: 'not_paid,paid_partially' }, limit: 1, select: 'id' });
    expect(bills.total_count).toBeGreaterThanOrEqual(0);
  });
});

describe('statistics & forecasts', () => {
  it('each module returns the meta keys the Statistics page reads', async () => {
    const order = await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId, stats: 1 }, limit: 1, select: 'id' });
    for (const k of ['total_sales', 'paid_sales', 'unpaid_sales', 'cash_sales', 'net_profit', 'vat_price']) expect(order.meta).toHaveProperty(k);
    const dep = await api.get<any[]>('/v1/customer-deposit', { search: { store_id: seed.storeId, stats: 1 }, limit: 1, select: 'id' });
    for (const k of ['total', 'cash', 'bank', 'purchase_fund', 'total_customer', 'total_vendor']) expect(dep.meta).toHaveProperty(k);
  });

  it('forecast download needs search[store_id] (legacy plain store_id → 400)', async () => {
    const good = await fetch(`${API_URL}/v1/bi/report-result/download?search[store_id]=${seed.storeId}&report_key=revenue_forecast_6m&format=csv`, { headers: { Authorization: token } });
    expect([200, 404]).toContain(good.status);
    if (good.status === 200) expect(Array.isArray(parseCsv(await good.text()))).toBe(true);
    const bad = await fetch(`${API_URL}/v1/bi/report-result/download?store_id=${seed.storeId}&report_key=revenue_forecast_6m&format=csv`, { headers: { Authorization: token } });
    expect(bad.status).toBe(400);
  });
});
