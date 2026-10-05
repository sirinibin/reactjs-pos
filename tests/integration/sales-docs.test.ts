import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError, setBaseUrl } from '../../src/api/client';
import { KEYS } from '../../src/api/session';
import { computeTotals, linesToApi, makeLine } from '../../src/framework/doc/calc';
import { buildReturnBody, deliveryNoteToApi, quotationToApi, returnRows, returnSummaryFrom, returnTotals, maxReturnQty } from '../../src/modules/sales-docs/logic';
import { deliveryNoteToDocState, quotationToDocState } from '../../src/modules/sales/conversions';
import { API_URL, loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
const iso = () => {
  const d = new Date();
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};
const apiDate = (d = new Date()) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
const rejectsWith = async (p: Promise<unknown>, key: string) => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).errors).toHaveProperty(key);
    return (e as ApiError).errors;
  }
  throw new Error(`expected a validation error on "${key}"`);
};

/** POST that surfaces the server's field errors in the failure message. */
async function post<T = any>(path: string, body: any): Promise<T> {
  try {
    return (await api.post<T>(path, body, S(seed.storeId))).result as T;
  } catch (e) {
    throw new Error(`${path}: ${e instanceof ApiError ? JSON.stringify(e.errors) : (e as Error).message}`);
  }
}

/** The API rate-limits /authorize; reuse the Playwright session token when it is still valid. */
async function authenticate() {
  const st = resolve(__dirname, '../e2e/.auth/state.json');
  if (existsSync(st)) {
    try {
      const token = JSON.parse(readFileSync(st, 'utf8')).origins?.flatMap((o: any) => o.localStorage || []).find((x: any) => x.name === 'access_token')?.value;
      if (token && (await fetch(`${API_URL}/v1/me`, { headers: { Authorization: token } })).ok) {
        setBaseUrl(API_URL);
        (globalThis as any).window.localStorage.setItem(KEYS.token, token);
        return;
      }
    } catch {
      /* fall through to a real sign-in */
    }
  }
  await signIn();
}

const line = (i: number, qty: number) => {
  const p = seed.products[i];
  return makeLine({ product_id: p.id, name: p.name, part_number: p.part, unit_price: p.price, quantity: qty, purchase_unit_price: p.cost }, 15);
};

/** Own fixture customer per quotation (free text → the server creates it), so other suites can't interfere. */
async function createQuotation(type: 'quotation' | 'invoice', payments: any[] = [], qty = 3) {
  const name = `ITEST SALES DOCS ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const lines = [line(0, qty), line(1, 1)];
  const body = quotationToApi({ store_id: seed.storeId, date_str: iso(), customer_id: null, customer_name: name, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, discount: 0, shipping_handling_fees: 0, type, status: 'delivered', validity_days: 2, delivery_days: 7, delivery_from: 'Payment', payments_input: payments });
  const r = await api.post<any>('/v1/quotation', body, S(seed.storeId));
  return { q: r.result, lines };
}

beforeAll(async () => {
  seed = loadSeed();
  await authenticate();
});

describe('quotations — live API', () => {
  it('lists with meta (quotation + invoice-type stats) when stats=1', async () => {
    const r = await api.get<any[]>('/v1/quotation', { search: { store_id: seed.storeId, stats: 1 }, limit: 5, sort: '-created_at' });
    expect(r.result!.length).toBeGreaterThan(0);
    for (const k of ['total_quotation', 'invoiced_count', 'invoiced_amount', 'profit', 'loss', 'invoice_total_sales', 'invoice_unpaid_sales']) expect(r.meta).toHaveProperty(k);
  });

  it('creates a quotation whose totals match the client engine; type/terms round-trip', async () => {
    const { q, lines } = await createQuotation('quotation');
    expect(q.code).toMatch(/^QTN-/);
    expect(q.net_total).toBe(computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true }).net_total);
    const got = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
    expect(got).toMatchObject({ type: 'quotation', validity_days: 2, delivery_days: 7, delivery_from: 'Payment', status: 'delivered', payment_status: '' });
  });

  it('rejects missing validity/delivery days and empty lines with field errors', async () => {
    const errs = await rejectsWith(api.post('/v1/quotation', { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [], type: 'quotation' }, S(seed.storeId)), 'validity_days');
    expect(errs).toHaveProperty('delivery_days');
    expect(errs).toHaveProperty('product_id');
  });

  it('updates a quotation with PUT (status/terms)', async () => {
    const { q, lines } = await createQuotation('quotation');
    const body = quotationToApi({ store_id: seed.storeId, date_str: iso(), customer_id: q.customer_id, customer_name: q.customer_name, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, type: 'quotation', status: 'accepted', validity_days: 10, delivery_days: 3 });
    await api.put(`/v1/quotation/${q.id}`, body, S(seed.storeId));
    const got = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
    expect(got).toMatchObject({ status: 'accepted', validity_days: 10, delivery_days: 3 });
  });

  it('invoice-type quotation records payments and computes balance/status', async () => {
    const { q } = await createQuotation('invoice', [{ date_str: iso(), amount: 100, method: 'cash' }]);
    expect(q.payment_status).toBe('paid_partially');
    expect(q.total_payment_received).toBe(100);
    expect(q.balance_amount).toBeCloseTo(q.net_total - 100, 2);
  });

  it('filters by type and invoiced flag', async () => {
    const inv = await api.get<any[]>('/v1/quotation', { search: { store_id: seed.storeId, type: 'invoice' }, limit: 20, select: 'id,type' });
    for (const x of inv.result!) expect(x.type).toBe('invoice');
    const open = await api.get<any[]>('/v1/quotation', { search: { store_id: seed.storeId, invoiced: '0' }, limit: 20, select: 'id,order_id' });
    for (const x of open.result!) expect(x.order_id || null).toBeNull();
  });

  it('quotation → sales invoice links both ways; unlink clears the quotation side', async () => {
    const { q } = await createQuotation('quotation');
    const full = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
    const pre = quotationToDocState(full, 15);
    const body = {
      store_id: seed.storeId, date_str: iso(), customer_id: pre.party!.id.startsWith('new:') ? null : pre.party!.id, customer_name: pre.party!.label, vat_percent: 15, products: linesToApi(pre.lines!), auto_rounding_amount: true,
      discount: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: [], quotation_id: pre.extra!.quotation_id, quotation_code: pre.extra!.quotation_code, quotation_ids: pre.extra!.quotation_ids, quotation_codes: pre.extra!.quotation_codes,
    };
    const o = await post<any>('/v1/order', body);
    expect(o.net_total).toBe(full.net_total);
    // Linking runs after the response; poll briefly.
    let linked: any;
    for (let i = 0; i < 20; i++) {
      linked = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
      if (linked.order_id && linked.order_codes?.includes?.(o.code)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(linked).toMatchObject({ order_id: o.id, order_code: o.code });
    expect(linked.order_codes).toContain(o.code);
    const back = (await api.get<any>(`/v1/order/${o.id}`, S(seed.storeId))).result;
    expect(back).toMatchObject({ quotation_id: q.id, quotation_code: q.code });
    const un = (await api.del<any>(`/v1/quotation/${q.id}/order/${o.id}`, S(seed.storeId))).result;
    expect(un.order_id || null).toBeNull();
  });

  it('soft-deletes a quotation (gone from the list)', async () => {
    const { q } = await createQuotation('quotation');
    await api.del(`/v1/quotation/${q.id}`, S(seed.storeId));
    const r = await api.get<any[]>('/v1/quotation', { search: { store_id: seed.storeId, code: q.code }, select: 'id' });
    expect(r.result!.some((x) => x.id === q.id)).toBe(false);
  });
});

describe('delivery notes — live API', () => {
  it('server does not compute totals: what the client sends is stored', async () => {
    const c = seed.customers[1];
    const lines = [line(2, 2)];
    const s = { lines, summary: { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 }, extra: { notify_at: '' } };
    const bare = { store_id: seed.storeId, date_str: iso(), customer_id: c.id, customer_name: c.name, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true };
    const raw = (await api.post<any>('/v1/delivery-note', bare, S(seed.storeId))).result;
    expect(raw.net_total).toBe(0); // the quirk this module works around
    const dn = (await api.post<any>('/v1/delivery-note', deliveryNoteToApi(bare, s), S(seed.storeId))).result;
    expect(dn.code).toMatch(/^DN-/);
    expect(dn.net_total).toBe(computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true }).net_total);
    const calc = (await api.post<any>('/v1/delivery-note/calculate-net-total', bare, S(seed.storeId))).result;
    expect(calc.net_total).toBe(dn.net_total);
  });

  it('rejects an empty note', async () => {
    await rejectsWith(api.post('/v1/delivery-note', { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [] }, S(seed.storeId)), 'product_id');
  });

  it('lists with meta, filters today and invoiced=0', async () => {
    const r = await api.get<any[]>('/v1/delivery-note', { search: { store_id: seed.storeId, stats: 1, from_date: apiDate(), to_date: apiDate(), invoiced: '0' }, limit: 20, select: 'id,date,order_id' });
    expect(r.meta).toHaveProperty('total_deliverynote');
    expect(r.meta).toHaveProperty('invoiced_count');
    for (const x of r.result!) {
      expect(new Date(x.date).toDateString()).toBe(new Date().toDateString());
      expect(x.order_id || null).toBeNull();
    }
  });

  it('delivery note → invoice sets delivery_note_id and the note gets the order code', async () => {
    const c = seed.customers[1];
    const lines = [line(3, 1)];
    const s = { lines, summary: { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 }, extra: { notify_at: new Date(Date.now() + 864e5).toISOString() } };
    const dn = (await api.post<any>('/v1/delivery-note', deliveryNoteToApi({ store_id: seed.storeId, date_str: iso(), customer_id: c.id, customer_name: c.name, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true }, s), S(seed.storeId))).result;
    const full = (await api.get<any>(`/v1/delivery-note/${dn.id}`, S(seed.storeId))).result;
    const pre = deliveryNoteToDocState(full, 15);
    const o = await post<any>('/v1/order', { store_id: seed.storeId, date_str: iso(), customer_id: pre.party!.id, customer_name: pre.party!.label, vat_percent: 15, products: linesToApi(pre.lines!), auto_rounding_amount: true, payments_input: [], delivery_note_id: dn.id });
    let got: any;
    for (let i = 0; i < 20; i++) {
      got = (await api.get<any>(`/v1/delivery-note/${dn.id}`, S(seed.storeId))).result;
      if (got.order_id) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(got).toMatchObject({ order_id: o.id, order_code: o.code });
  });
});

describe('quotation sales returns — live API', () => {
  it('returns part of an invoice-type quotation, enforcing quantity limits; refunds via return payments', async () => {
    const { q } = await createQuotation('invoice', [{ date_str: iso(), amount: 150, method: 'cash' }], 3);
    const quote = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
    const rows = returnRows(quote);
    expect(rows.map((r) => r.max)).toEqual([3, 1]);

    // Over the limit → quantity_0 error from the server too.
    const over = rows.map((r, i) => (i === 0 ? { ...r, selected: true, quantity: 4 } : r));
    const draftBase = { date: iso().slice(0, 16), remarks: '', phone: '', vat_no: '', address: '', summary: returnSummaryFrom(quote), payments: [] };
    await rejectsWith(api.post('/v1/quotation-sales-return', buildReturnBody({ ...draftBase, rows: over }, returnTotals(over, draftBase.summary), { storeId: seed.storeId, quotation: quote, payable: true }), S(seed.storeId)), 'quantity_0');

    const sel = rows.map((r, i) => (i === 0 ? { ...r, selected: true, quantity: 1 } : r));
    const totals = returnTotals(sel, draftBase.summary);
    const ret = (await api.post<any>('/v1/quotation-sales-return', buildReturnBody({ ...draftBase, rows: sel, payments: [{ key: 'k', date_str: iso(), amount: 50, method: 'cash' }] }, totals, { storeId: seed.storeId, quotation: quote, payable: true }), S(seed.storeId))).result;
    expect(ret.code).toMatch(/^QSR-/);
    expect(ret.net_total).toBe(totals.net_total);
    expect(ret.total_payment_paid).toBe(50);

    const after = (await api.get<any>(`/v1/quotation/${q.id}`, S(seed.storeId))).result;
    expect(after.return_count).toBe(1);
    expect(after.products[0].quantity_returned).toBe(1);
    expect(maxReturnQty(after, after.products[0].product_id)).toBe(2);

    await api.post('/v1/quotation-sales-return-payment', { store_id: seed.storeId, quotation_sales_return_id: ret.id, quotation_sales_return_code: ret.code, quotation_id: q.id, quotation_code: q.code, amount: 10, method: 'cash', date_str: iso() }, S(seed.storeId));
    const r2 = (await api.get<any>(`/v1/quotation-sales-return/${ret.id}`, S(seed.storeId))).result;
    expect(r2.total_payment_paid).toBe(60);
    expect(r2.balance_amount).toBeCloseTo(totals.net_total - 60, 2);
    expect(r2.products).toHaveLength(2); // all lines kept, index-aligned
    expect(r2.products.map((p: any) => p.selected)).toEqual([true, false]);

    const pays = await api.get<any[]>('/v1/quotation-sales-return-payment', { search: { store_id: seed.storeId, quotation_sales_return_id: ret.id } });
    expect(pays.result!.length).toBe(2);

    // Edit: keep the order, raise qty within the new limit (old qty added back).
    const editRows = returnRows(after, r2);
    expect(editRows[0].max).toBe(3);
    const edited = editRows.map((r, i) => (i === 0 ? { ...r, quantity: 2 } : r));
    const et = returnTotals(edited, { ...draftBase.summary });
    await api.put(`/v1/quotation-sales-return/${ret.id}`, buildReturnBody({ ...draftBase, rows: edited, payments: (r2.payments || []).map((p: any) => ({ ...p, key: p.id, date_str: p.date })) }, et, { storeId: seed.storeId, quotation: after, payable: true }), S(seed.storeId));
    const r3 = (await api.get<any>(`/v1/quotation-sales-return/${ret.id}`, S(seed.storeId))).result;
    expect(r3.products[0].quantity).toBe(2);
  });

  it('lists with meta and filters by quotation_id', async () => {
    const r = await api.get<any[]>('/v1/quotation-sales-return', { search: { store_id: seed.storeId, stats: 1 }, limit: 5, select: 'id,quotation_id' });
    expect(r.meta).toHaveProperty('total_quotation_sales_return');
    expect(r.meta).toHaveProperty('unpaid_quotation_sales_return');
    if (r.result!.length) {
      const qid = r.result![0].quotation_id;
      const f = await api.get<any[]>('/v1/quotation-sales-return', { search: { store_id: seed.storeId, quotation_id: qid }, limit: 20, select: 'id,quotation_id' });
      for (const x of f.result!) expect(x.quotation_id).toBe(qid);
    }
  });

  it('requires a quotation', async () => {
    await rejectsWith(api.post('/v1/quotation-sales-return', { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [] }, S(seed.storeId)), 'quotation_id');
  });
});
