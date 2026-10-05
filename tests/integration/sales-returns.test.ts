import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { api, ApiError, setBaseUrl } from '../../src/api/client';
import { KEYS } from '../../src/api/session';
import { linesToApi, makeLine } from '../../src/framework/doc/calc';
import { buildSalesReturnLines, nonVatTotals, refundCap, returnProductsToApi, salesReturnTotals, summaryFromDoc } from '../../src/modules/sales-returns/logic';
import { API_URL, loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
let storeId: string;

const iso = (d = new Date()) => {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};

/** Reuse the Playwright session token when valid — /v1/authorize is rate-limited per IP. */
async function authenticate() {
  setBaseUrl(API_URL);
  const st = resolve(__dirname, '../e2e/.auth/state.json');
  if (existsSync(st)) {
    const token = JSON.parse(readFileSync(st, 'utf8')).origins?.flatMap((o: any) => o.localStorage || []).find((x: any) => x.name === 'access_token')?.value;
    if (token && (await fetch(`${API_URL}/v1/me`, { headers: { Authorization: token } })).ok) {
      (globalThis as any).window.localStorage.setItem(KEYS.token, token);
      return;
    }
  }
  await signIn();
}

async function createOrder(opts: { paid: boolean; qty?: [number, number] } = { paid: true }) {
  const [a, b] = [seed.products[3], seed.products[5]];
  const [qa, qb] = opts.qty || [4, 2];
  const lines = [makeLine({ product_id: a.id, name: a.name, unit_price: a.price, quantity: qa }, 15), makeLine({ product_id: b.id, name: b.name, unit_price: b.price, quantity: qb }, 15)];
  const calc = await api.post<any>('/v1/order/calculate-net-total', { store_id: storeId, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, date_str: iso() }, S(storeId));
  const net = calc.result.net_total;
  const r = await api.post<any>('/v1/order', {
    store_id: storeId, date_str: iso(), customer_id: seed.customers[0].id, customer_name: seed.customers[0].name, vat_percent: 15, products: linesToApi(lines),
    auto_rounding_amount: true, discount: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: opts.paid ? [{ date_str: iso(), amount: net, method: 'cash' }] : [],
  }, S(storeId));
  return (await api.get<any>(`/v1/order/${r.result.id}`, S(storeId))).result;
}

function returnBody(order: any, pick: Record<number, number>, refund: number | null) {
  const lines = buildSalesReturnLines(order).map((l, i) => (pick[i] !== undefined ? { ...l, selected: true, quantity: pick[i] } : l));
  const summary = { ...summaryFromDoc(order), discount: 0, discount_with_vat: 0, cash_discount: 0, shipping_handling_fees: 0 };
  const t = salesReturnTotals(lines, summary);
  return {
    t, lines,
    body: {
      store_id: storeId, order_id: order.id, order_code: order.code, date_str: iso(), customer_id: order.customer_id, customer_name: order.customer_name,
      status: 'received', vat_percent: 15, discount: 0, discount_with_vat: 0, shipping_handling_fees: 0, cash_discount: 0, auto_rounding_amount: true, rounding_amount: t.rounding_amount,
      products: returnProductsToApi(lines),
      payments_input: refund === null ? [] : [{ date_str: iso(), amount: refund, method: 'cash' }],
      total_payment_paid: refund || 0,
    },
  };
}

beforeAll(async () => {
  seed = loadSeed();
  storeId = seed.storeId;
  await authenticate();
});

/** Wait until the order document stops changing (CreateOrder's background post-processing has finished). */
async function orderSettled(id: string, quietMs = 1500, maxMs = 20000) {
  const t0 = Date.now();
  let last = '';
  let since = Date.now();
  while (Date.now() - t0 < maxMs) {
    const o = (await api.get<any>(`/v1/order/${id}`, S(storeId))).result;
    const sig = String(o.updated_at);
    if (sig !== last) { last = sig; since = Date.now(); } else if (Date.now() - since >= quietMs) return;
    await new Promise((r) => setTimeout(r, 250));
  }
}

describe('sales returns — live API', () => {
  it('calculate-net-total agrees with the client engine (selected lines only)', async () => {
    const order = await createOrder();
    const { body, t } = returnBody(order, { 0: 1, 1: 2 }, null);
    const r = await api.post<any>('/v1/sales-return/calculate-net-total', body, S(storeId));
    expect({ total: r.result.total, vat: r.result.vat_price, net: r.result.net_total }).toEqual({ total: t.total, vat: t.vat_price, net: t.net_total });
  });

  it('creates a partial return with a refund; order returned qty, return_amount and list filters update', async () => {
    const order = await createOrder();
    // API quirk: CreateOrder keeps saving the order from a background goroutine after it responds; a return
    // posted inside that window loses its quantity_returned (lost update). Wait until the sale settles.
    await orderSettled(order.id);
    const { body, t } = returnBody(order, { 0: 1 }, null);
    body.payments_input = [{ date_str: iso(), amount: refundCap(order, t.net_total, 0, false), method: 'cash' }];
    body.total_payment_paid = body.payments_input[0].amount;
    const r = await api.post<any>('/v1/sales-return', body, S(storeId));
    expect(r.result.code).toMatch(/^S-RET-\d+/);
    expect(r.result.net_total).toBe(t.net_total);
    expect(r.result.payment_status).toBe('paid');
    const after = (await api.get<any>(`/v1/order/${order.id}`, S(storeId))).result;
    expect(after.products[0].quantity_returned).toBe(1);
    expect(after.return_count).toBe(1);
    expect(after.return_amount).toBeCloseTo(t.net_total, 2);
    // GET keeps the unselected line in place (index pairing on update).
    const got = (await api.get<any>(`/v1/sales-return/${r.result.id}`, S(storeId))).result;
    expect(got.products.map((p: any) => !!p.selected)).toEqual([true, false]);
    // List: by order, with stats meta.
    const list = await api.get<any[]>('/v1/sales-return', { search: { store_id: storeId, order_id: order.id, stats: 1 }, limit: 10 });
    expect(list.result!.map((x) => x.id)).toEqual([r.result.id]);
    expect(list.meta).toHaveProperty('total_sales_return');
    expect(list.meta).toHaveProperty('paid_sales_return');
    // Refund appears in the return-payment list.
    const pays = await api.get<any[]>('/v1/sales-return-payment', { search: { store_id: storeId, sales_return_id: r.result.id, stats: 1 } });
    expect(pays.result!).toHaveLength(1);
    expect(pays.meta!.total_payment).toBeCloseTo(t.net_total, 2);

    // Client max for the next return reflects what is already returned.
    const next = buildSalesReturnLines(after);
    expect(next[0].max).toBe(3);
  });

  it('rejects a quantity above sold − returned with quantity_<index>', async () => {
    const order = await createOrder();
    const { body } = returnBody(order, { 1: 3 }, null);
    await expect(api.post('/v1/sales-return', body, S(storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && /purchased quantity/.test(e.errors.quantity_1));
  });

  it('rejects a refund above net total with total_payment', async () => {
    const order = await createOrder();
    const { body, t } = returnBody(order, { 0: 1 }, null);
    body.payments_input = [{ date_str: iso(), amount: t.net_total + 50, method: 'cash' }];
    await expect(api.post('/v1/sales-return', body, S(storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'total_payment' in e.errors);
  });

  it('unpaid invoice: return is created without refund and ends not_paid', async () => {
    const order = await createOrder({ paid: false });
    expect(refundCap(order, 100, 0, false)).toBe(0);
    const { body } = returnBody(order, { 1: 1 }, null);
    const r = await api.post<any>('/v1/sales-return', body, S(storeId));
    expect(r.result.payment_status).toBe('not_paid');
    expect(r.result.total_payment_paid).toBe(0);
  });

  it('update keeps line order; delete is soft and restorable', async () => {
    const order = await createOrder();
    const { body } = returnBody(order, { 0: 1 }, null);
    const created = (await api.post<any>('/v1/sales-return', body, S(storeId))).result;
    const fresh = (await api.get<any>(`/v1/order/${order.id}`, S(storeId))).result;
    const existing = (await api.get<any>(`/v1/sales-return/${created.id}`, S(storeId))).result;
    const lines = buildSalesReturnLines(fresh, existing);
    expect(lines[0].max).toBe(4); // own quantity added back
    lines[0] = { ...lines[0], quantity: 2 };
    const upd = await api.put<any>(`/v1/sales-return/${created.id}`, { ...body, products: returnProductsToApi(lines), payments_input: [] }, S(storeId));
    expect(upd.result.products[0]).toMatchObject({ selected: true, quantity: 2 });
    expect((await api.get<any>(`/v1/order/${order.id}`, S(storeId))).result.products[0].quantity_returned).toBe(2);

    await api.del(`/v1/sales-return/${created.id}`, S(storeId));
    const live = await api.get<any[]>('/v1/sales-return', { search: { store_id: storeId, order_id: order.id } });
    expect(live.result!.some((x) => x.id === created.id)).toBe(false);
    const deleted = await api.get<any[]>('/v1/sales-return', { search: { store_id: storeId, order_id: order.id, deleted: 1 } });
    expect(deleted.result!.some((x) => x.id === created.id)).toBe(true);
    await api.post(`/v1/sales-return/restore/${created.id}`, {}, S(storeId));
    const back = await api.get<any[]>('/v1/sales-return', { search: { store_id: storeId, order_id: order.id } });
    expect(back.result!.some((x) => x.id === created.id)).toBe(true);
  });
});

describe('sales payments & cash discounts — live API', () => {
  it('payment create → list by order with total → update → delete', async () => {
    const order = await createOrder({ paid: false });
    const p = (await api.post<any>('/v1/sales-payment', { store_id: storeId, order_id: order.id, order_code: order.code, amount: 20, method: 'cash', date_str: iso() }, S(storeId))).result;
    const list = await api.get<any[]>('/v1/sales-payment', { search: { store_id: storeId, order_id: order.id, stats: 1 } });
    expect(list.result!.map((x) => x.id)).toEqual([p.id]);
    expect(list.meta!.total_payment).toBe(20);
    const full = (await api.get<any>(`/v1/sales-payment/${p.id}`, S(storeId))).result;
    await api.put(`/v1/sales-payment/${p.id}`, { ...full, amount: 25, method: 'bank_transfer', date_str: iso() }, S(storeId));
    const o2 = (await api.get<any>(`/v1/order/${order.id}`, S(storeId))).result;
    expect(o2.total_payment_received).toBe(25);
    expect(o2.payment_status).toBe('paid_partially');
    await api.del(`/v1/sales-payment/${p.id}`, S(storeId));
    expect((await api.get<any[]>('/v1/sales-payment', { search: { store_id: storeId, order_id: order.id } })).result).toHaveLength(0);
  });

  it('filters payments by method and amount operator', async () => {
    const r = await api.get<any[]>('/v1/sales-payment', { search: { store_id: storeId, method: 'cash', amount: '>=1' }, limit: 20 });
    for (const x of r.result!) { expect(x.method).toMatch(/cash/); expect(x.amount).toBeGreaterThanOrEqual(1); }
  });

  it('payment above the balance is rejected on amount', async () => {
    const order = await createOrder({ paid: false });
    await expect(api.post('/v1/sales-payment', { store_id: storeId, order_id: order.id, order_code: order.code, amount: order.net_total + 10, method: 'cash', date_str: iso() }, S(storeId)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'amount' in e.errors);
  });

  it('cash discount must stay below the amount received; saving sets order.cash_discount', async () => {
    const order = await createOrder({ paid: false });
    await api.post('/v1/sales-payment', { store_id: storeId, order_id: order.id, order_code: order.code, amount: 50, method: 'cash', date_str: iso() }, S(storeId));
    await expect(api.post('/v1/sales-cash-discount', { store_id: storeId, order_id: order.id, order_code: order.code, amount: 50, method: 'cash', date_str: iso() }, S(storeId)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && /less than/.test(e.errors.amount));
    const cd = (await api.post<any>('/v1/sales-cash-discount', { store_id: storeId, order_id: order.id, order_code: order.code, amount: 5, method: 'cash', date_str: iso() }, S(storeId))).result;
    const list = await api.get<any[]>('/v1/sales-cash-discount', { search: { store_id: storeId, order_id: order.id, stats: 1 } });
    expect(list.result!.map((x) => x.id)).toEqual([cd.id]);
    expect(list.meta!.total_cash_discount).toBe(5);
    expect((await api.get<any>(`/v1/order/${order.id}`, S(storeId))).result.cash_discount).toBe(5);
  });
});

describe('non-VAT sales & returns — live API', () => {
  const productLine = () => ({ product_id: seed.products[3].id, name: seed.products[3].name, quantity: 2, unit_price: seed.products[3].price, unit_price_with_vat: Math.round(seed.products[3].price * 115) / 100, unit_discount: 0, unit_discount_with_vat: 0, is_service: false });

  it('calculate-net-total matches the client port, incl. exclusions and cash discount', async () => {
    const line = productLine();
    for (const flags of [{ exclude_service_tax: true, exclude_product_tax: false }, { exclude_service_tax: true, exclude_product_tax: true }]) {
      const l = flags.exclude_product_tax ? { ...line, unit_price_with_vat: line.unit_price } : line;
      const body = { store_id: storeId, vat_percent: 15, ...flags, products: [l], discount: 2, cash_discount: 3, shipping_handling_fees: 4, auto_rounding_amount: true };
      const r = await api.post<any>('/v1/non-vat-sales/calculate-net-total', body, S(storeId));
      const t = nonVatTotals({ lines: [{ ...l, key: 'k' } as any], ...flags, vat_percent: 15, discount: 2, cash_discount: 3, shipping_handling_fees: 4, auto_rounding_amount: true });
      expect({ total: r.result.total, twv: r.result.total_with_vat, net: r.result.net_total }).toEqual({ total: t.total, twv: t.total_with_vat, net: t.net_total });
    }
  });

  it('cash discount is subtracted twice: net_total − cash_discount − paid = balance', async () => {
    const s = (await api.post<any>('/v1/non-vat-sales', {
      store_id: storeId, date_str: iso(), customer_id: null, customer_name: '', vat_percent: 15, exclude_service_tax: true, exclude_product_tax: false,
      cash_discount: 5, discount: 0, shipping_handling_fees: 0, auto_rounding_amount: true, products: [productLine()], payments_input: [],
    }, S(storeId))).result;
    const twv = productLine().unit_price_with_vat * 2;
    expect(s.net_total).toBeCloseTo(twv - 5, 2);
    expect(s.balance_amount).toBeCloseTo(twv - 10, 2);
    expect(s.payment_status).toBe('not_paid');
    // Overpaying past net − cash is rejected.
    await expect(api.put(`/v1/non-vat-sales/${s.id}`, { ...s, date_str: iso(), payments_input: [{ date_str: iso(), amount: twv, method: 'cash' }] }, S(storeId)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'total_payment' in e.errors);
  });

  it('return against a sale: only returned lines are posted; parent return_count increments; list by sale', async () => {
    const sale = (await api.post<any>('/v1/non-vat-sales', {
      store_id: storeId, date_str: iso(), customer_id: null, customer_name: 'Walk-in', vat_percent: 15, exclude_service_tax: true, exclude_product_tax: false,
      cash_discount: 0, discount: 0, shipping_handling_fees: 0, auto_rounding_amount: true, products: [productLine()], payments_input: [{ date_str: iso(), amount: productLine().unit_price_with_vat * 2, method: 'cash' }],
    }, S(storeId))).result;
    // Backend race: the sale's async accounting re-saves the whole doc (AdjustPayments → Update) and would
    // overwrite return_count if the return lands first. Give it a moment, as a user naturally would.
    await new Promise((r) => setTimeout(r, 2500));
    const ret = (await api.post<any>('/v1/non-vat-sales-return', {
      store_id: storeId, non_vat_sales_id: sale.id, non_vat_sales_code: sale.code, date_str: iso(), customer_id: null, customer_name: 'Walk-in', vat_percent: 15,
      exclude_service_tax: true, exclude_product_tax: false, discount: 0, cash_discount: 0, auto_rounding_amount: true,
      products: [{ ...productLine(), quantity: 1 }], payments_input: [{ date_str: iso(), amount: productLine().unit_price_with_vat, method: 'cash' }],
    }, S(storeId))).result;
    expect(ret.net_total).toBeCloseTo(productLine().unit_price_with_vat, 2);
    expect(ret.payment_status).toBe('paid');
    const parent = (await api.get<any>(`/v1/non-vat-sales/${sale.id}`, S(storeId))).result;
    expect(parent.return_count).toBe(1);
    const list = await api.get<any[]>('/v1/non-vat-sales-return', { search: { store_id: storeId, non_vat_sales_id: sale.id, stats: 1 }, select: 'id,products' });
    expect(list.result!.map((x) => x.id)).toEqual([ret.id]);
    expect(list.result![0].products[0].quantity).toBe(1);
    expect(list.meta).toHaveProperty('total_non_vat_sales_return');
  });
});
