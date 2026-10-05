import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { computeTotals, linesFromApi, linesToApi, makeLine } from '../../src/framework/doc/calc';
import { loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
const iso = () => {
  const d = new Date();
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};

beforeAll(async () => {
  seed = loadSeed();
  await signIn();
});

describe('sales invoices — live API', () => {
  it('lists invoices for the store with meta totals when stats=1', async () => {
    const r = await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId, stats: 1 }, limit: 5, sort: '-created_at' });
    expect(r.result!.length).toBeGreaterThan(0);
    expect(r.total_count).toBeGreaterThanOrEqual(r.result!.length);
    expect(r.meta).toHaveProperty('total_sales');
    expect(r.meta).toHaveProperty('unpaid_sales');
  });

  it('client totals engine matches the server for every seeded invoice', async () => {
    const r = await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId }, limit: 30, select: 'id,products,vat_price,net_total,total,shipping_handling_fees,discount,auto_rounding_amount,rounding_amount,vat_percent' });
    for (const o of r.result!) {
      const t = computeTotals({ lines: linesFromApi(o.products, o.vat_percent), vat_percent: o.vat_percent, shipping_handling_fees: o.shipping_handling_fees, discount: o.discount, auto_rounding_amount: o.auto_rounding_amount, rounding_amount: o.rounding_amount });
      expect({ id: o.id, total: t.total, vat: t.vat_price, net: t.net_total }).toEqual({ id: o.id, total: o.total, vat: o.vat_price, net: o.net_total });
    }
  });

  it('calculate-net-total agrees with the client engine for awkward VAT-inclusive prices', async () => {
    const p = seed.products[0];
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price_with_vat: 9.99, quantity: 7 }, 15), makeLine({ product_id: seed.products[1].id, name: seed.products[1].name, unit_price: 33.333, unit_discount: 1.25, quantity: 3 }, 15)];
    const body = { store_id: seed.storeId, vat_percent: 15, products: linesToApi(lines), discount: 2.5, shipping_handling_fees: 10, auto_rounding_amount: true, date_str: iso() };
    const r = await api.post<any>('/v1/order/calculate-net-total', body, S(seed.storeId));
    const t = computeTotals({ lines, vat_percent: 15, discount: 2.5, shipping_handling_fees: 10, auto_rounding_amount: true });
    expect(r.result.net_total).toBe(t.net_total);
    expect(r.result.vat_price).toBe(t.vat_price);
  });

  it('creates an invoice, records a partial payment and updates balance/status', async () => {
    const p = seed.products[3];
    const c = seed.customers[1];
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: p.price, quantity: 2 }, 15)];
    const t = computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true });
    const created = await api.post<any>('/v1/order', { store_id: seed.storeId, date_str: iso(), customer_id: c.id, customer_name: c.name, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, discount: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: [] }, S(seed.storeId));
    expect(created.result.code).toMatch(/^S-INV-\d{6}$/);
    expect(created.result.net_total).toBe(t.net_total);
    await api.post('/v1/sales-payment', { store_id: seed.storeId, order_id: created.result.id, order_code: created.result.code, amount: 10, method: 'cash', date_str: iso() }, S(seed.storeId));
    const after = await api.get<any>(`/v1/order/${created.result.id}`, S(seed.storeId));
    expect(after.result.payment_status).toBe('paid_partially');
    expect(after.result.balance_amount).toBeCloseTo(t.net_total - 10, 2);
  });

  it('rejects an invoice without items with a field-level error', async () => {
    await expect(api.post('/v1/order', { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [] }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'product_id' in e.errors);
  });

  it('rejects a payment larger than the balance', async () => {
    const o = (await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId, payment_status: 'not_paid' }, limit: 1 })).result![0];
    await expect(api.post('/v1/sales-payment', { store_id: seed.storeId, order_id: o.id, order_code: o.code, amount: o.net_total + 1000, method: 'cash', date_str: iso() }, S(seed.storeId))).rejects.toBeInstanceOf(ApiError);
  });

  it('filters by date range using the API date format', async () => {
    const d = new Date();
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    const today = `${mon} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
    const r = await api.get<any[]>('/v1/order', { search: { store_id: seed.storeId, from_date: today, to_date: today }, limit: 50, select: 'id,date' });
    for (const o of r.result!) expect(new Date(o.date).toDateString()).toBe(d.toDateString());
  });
});
