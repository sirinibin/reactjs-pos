import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { computeTotals, linesFromApi, linesToApi, makeLine, type DocLine } from '../../src/framework/doc/calc';
import type { DocState } from '../../src/framework/doc/DocumentEditor';
import {
  EP, buildReturnProducts, normalizeDocLines, poReceivedBody, prListQuery, prToApi, purchaseToApi, refundPaymentsInput, returnLinesFromPurchase,
  vendorFromForm, vendorToForm,
} from '../../src/modules/buying/api';
import { loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
let me: { id: string; name: string };
const iso = (d = new Date()) => {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

/** Build a DocState-like object and run it through the module's purchase mapper, like the editor does. */
function purchaseBody(lines: DocLine[], extra: Record<string, any> = {}, payments: any[] = []) {
  const s = {
    date: '', party: null, phone: '', vat_no: '', address: '', remarks: 'integration', lines,
    summary: { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 },
    payments, enable_report_to_zatca: false, extra,
  } as unknown as DocState;
  const body = { store_id: seed.storeId, date_str: iso(), remarks: s.remarks, products: linesToApi(lines), vat_percent: 15, discount: 0, discount_with_vat: 0, shipping_handling_fees: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0, payments_input: payments, ...extra };
  return purchaseToApi(body, s);
}

beforeAll(async () => {
  seed = loadSeed();
  await signIn();
  me = (await api.get<any>('/v1/me')).result;
});

describe('purchases — live API', () => {
  it('lists purchases with meta totals when stats=1 and sorts by date', async () => {
    const r = await api.get<any[]>(EP.purchase, { search: { store_id: seed.storeId, stats: 1 }, limit: 5, sort: '-date' });
    expect(r.result!.length).toBeGreaterThan(0);
    expect(r.meta).toHaveProperty('total_purchase');
    expect(r.meta).toHaveProperty('unpaid_purchase');
    const dates = r.result!.map((p) => new Date(p.date).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('client totals engine matches the server for seeded purchases (purchase price keys normalised)', async () => {
    const r = await api.get<any[]>(EP.purchase, { search: { store_id: seed.storeId }, limit: 20, select: 'id,products,vat_price,net_total,total,shipping_handling_fees,discount,auto_rounding_amount,rounding_amount,vat_percent' });
    for (const raw of r.result!) {
      const p = normalizeDocLines(raw, 'purchase');
      const t = computeTotals({ lines: linesFromApi(p.products, p.vat_percent), vat_percent: p.vat_percent, shipping_handling_fees: p.shipping_handling_fees, discount: p.discount, auto_rounding_amount: p.auto_rounding_amount, rounding_amount: p.rounding_amount });
      expect({ id: p.id, total: t.total, vat: t.vat_price, net: t.net_total }).toEqual({ id: p.id, total: p.total, vat: p.vat_price, net: p.net_total });
    }
  });

  it('filters by payment status (CSV) and vendor', async () => {
    const v = seed.vendors[0];
    const r = await api.get<any[]>(EP.purchase, { search: { store_id: seed.storeId, payment_status: 'not_paid,paid_partially', vendor_id: v.id }, limit: 50, select: 'id,payment_status,vendor_id' });
    for (const p of r.result || []) {
      expect(['not_paid', 'paid_partially']).toContain(p.payment_status);
      expect(p.vendor_id).toBe(v.id);
    }
  });

  it('calculate-net-total agrees with the client engine for the renamed body', async () => {
    const lines = [makeLine({ product_id: seed.products[0].id, name: seed.products[0].name, unit_price: 33.333, unit_discount: 1.25, quantity: 3 }, 15), makeLine({ product_id: seed.products[1].id, name: seed.products[1].name, unit_price_with_vat: 9.99, quantity: 7 }, 15)];
    const r = await api.post<any>(`${EP.purchase}/calculate-net-total`, purchaseBody(lines), S(seed.storeId));
    const t = computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true });
    expect(r.result.net_total).toBe(t.net_total);
    expect(r.result.vat_price).toBe(t.vat_price);
  });

  it('rejects a purchase without items and a zero purchase price, with field keys', async () => {
    await expect(api.post(EP.purchase, purchaseBody([]), S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'product_id' in e.errors);
    const zero = [makeLine({ product_id: seed.products[2].id, name: seed.products[2].name, unit_price: 0, quantity: 1 }, 15)];
    await expect(api.post(EP.purchase, purchaseBody(zero), S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'purchase_unit_price_0' in e.errors);
  });
});

describe('purchase → payment → return → refund — live API', () => {
  let purchase: any;
  const prod = () => seed.products[5];

  it('creates a purchase, stores the purchase price and pushes the typed retail price to the product', async () => {
    const p = prod();
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: p.cost, quantity: 4 }, 15), makeLine({ product_id: seed.products[6].id, name: seed.products[6].name, unit_price: seed.products[6].cost, quantity: 2 }, 15)];
    const retail = p.price; // unchanged retail (server copies values > 0)
    const body = purchaseBody(lines, { vendor_invoice_no: `INT-${uniq()}`, sell: { [lines[0].key]: { retail } }, order_placed_by: me.id });
    expect(body.products[0]).toMatchObject({ purchase_unit_price: p.cost, retail_unit_price: retail });
    expect(body.products[0]).not.toHaveProperty('unit_price');
    expect(body).not.toHaveProperty('sell');
    const created = await api.post<any>(EP.purchase, { ...body, vendor_id: seed.vendors[1].id, vendor_name: seed.vendors[1].name }, S(seed.storeId));
    purchase = created.result;
    expect(purchase.code).toMatch(/^P-INV-\d{6}$/);
    expect(purchase.net_total).toBe(computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true }).net_total);
    expect(purchase.payment_status).toBe('not_paid');
    const prodAfter = (await api.get<any>(`${EP.product}/${p.id}`, { search: { store_id: seed.storeId }, select: `id,product_stores.${seed.storeId}.purchase_unit_price,product_stores.${seed.storeId}.retail_unit_price` })).result;
    expect(prodAfter.product_stores[seed.storeId].purchase_unit_price).toBe(p.cost);
    expect(prodAfter.product_stores[seed.storeId].retail_unit_price).toBe(retail);
  });

  it('rejects a duplicate vendor invoice number for the same vendor', async () => {
    const p = prod();
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: p.cost, quantity: 1 }, 15)];
    const body = purchaseBody(lines, { vendor_invoice_no: purchase.vendor_invoice_no });
    await expect(api.post(EP.purchase, { ...body, vendor_id: seed.vendors[1].id, vendor_name: seed.vendors[1].name }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'vendor_invoice_no' in e.errors);
  });

  it('records a partial purchase payment and rejects overpayment', async () => {
    await api.post(EP.pay, { store_id: seed.storeId, purchase_id: purchase.id, purchase_code: purchase.code, amount: 10, method: 'cash', date_str: iso() }, S(seed.storeId));
    const after = (await api.get<any>(`${EP.purchase}/${purchase.id}`, S(seed.storeId))).result;
    expect(after.payment_status).toBe('paid_partially');
    expect(after.balance_amount).toBeCloseTo(purchase.net_total - 10, 2);
    expect(after.payments.filter((x: any) => !x.deleted)).toHaveLength(1);
    await expect(api.post(EP.pay, { store_id: seed.storeId, purchase_id: purchase.id, purchase_code: purchase.code, amount: after.balance_amount + 500, method: 'cash', date_str: iso() }, S(seed.storeId))).rejects.toBeInstanceOf(ApiError);
    const list = await api.get<any[]>(EP.pay, { search: { store_id: seed.storeId, purchase_id: purchase.id, stats: 1 }, limit: 10 });
    expect(list.meta?.total_payment).toBe(10);
    purchase = after;
  });

  let ret: any;
  it('returns part of one line (full product list, selected flags) and updates returned quantities', async () => {
    const lines = returnLinesFromPurchase(purchase).slice(0, 1).map((l) => ({ ...l, quantity: 1 }));
    const products = buildReturnProducts(purchase.products, lines, false);
    expect(products).toHaveLength(purchase.products.length);
    expect(products.map((p) => p.selected)).toEqual([true, false]);
    expect(products[0]).toHaveProperty('purchasereturn_unit_price', prod().cost);
    const created = await api.post<any>(EP.ret, {
      store_id: seed.storeId, purchase_id: purchase.id, purchase_code: purchase.code, date_str: iso(), vendor_id: purchase.vendor_id, vendor_name: purchase.vendor_name,
      purchase_returned_by: me.id, vat_percent: 15, discount: 0, discount_with_vat: 0, shipping_handling_fees: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0,
      products, payments_input: [],
    }, S(seed.storeId));
    ret = created.result;
    expect(ret.code).toMatch(/^PR-|RET|-\d+/);
    expect(ret.net_total).toBe(computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true }).net_total);
    const after = (await api.get<any>(`${EP.purchase}/${purchase.id}`, S(seed.storeId))).result;
    expect(after.products[0].quantity_returned).toBe(1);
    const again = returnLinesFromPurchase(after);
    expect(again[0].max_qty).toBe(3);
  });

  it('requires purchase_id and purchase_returned_by on a return', async () => {
    await expect(api.post(EP.ret, { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [] }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && ('purchase_id' in e.errors || 'product_id' in e.errors));
  });

  it('records a refund by PUTting payments_input on the return (standalone create crashes server-side)', async () => {
    const full = (await api.get<any>(`${EP.ret}/${ret.id}`, S(seed.storeId))).result;
    const payments_input = refundPaymentsInput(full, { amount: 5, method: 'cash', date_str: iso() });
    await api.put(`${EP.ret}/${ret.id}`, { store_id: seed.storeId, date_str: full.date, payments_input }, S(seed.storeId));
    const after = (await api.get<any>(`${EP.ret}/${ret.id}`, S(seed.storeId))).result;
    expect(after.payment_status).toBe('paid_partially');
    expect(after.total_payment_paid).toBe(5);
    const pays = await api.get<any[]>(EP.retPay, { search: { store_id: seed.storeId, purchase_return_id: ret.id, stats: 1 }, limit: 5 });
    expect(pays.meta?.total_payment).toBe(5);
  });

  it('updating a return keeps the product list positions (server indexes the old return by position)', async () => {
    const full = (await api.get<any>(`${EP.ret}/${ret.id}`, S(seed.storeId))).result;
    const editLines = linesFromApi(normalizeDocLines(full, 'purchasereturn').products.map((p: any, i: number) => ({ ...p, src_index: i })).filter((p: any) => p.selected), 15).map((l) => ({ ...l, quantity: 2 }));
    const products = buildReturnProducts(full.products, editLines, true);
    await api.put(`${EP.ret}/${ret.id}`, { store_id: seed.storeId, date_str: full.date, products, payments_input: refundPaymentsInput(full, { amount: 0.01, method: 'cash', date_str: iso() }).slice(0, -1) }, S(seed.storeId));
    const p = (await api.get<any>(`${EP.purchase}/${purchase.id}`, S(seed.storeId))).result;
    expect(p.products[0].quantity_returned).toBe(2);
  });

  it('cash discount documents overwrite the purchase cash discount', async () => {
    await api.post(EP.cd, { store_id: seed.storeId, purchase_id: purchase.id, purchase_code: purchase.code, amount: 3 }, S(seed.storeId));
    const after = (await api.get<any>(`${EP.purchase}/${purchase.id}`, S(seed.storeId))).result;
    expect(after.cash_discount).toBe(3);
    await expect(api.post(EP.cd, { store_id: seed.storeId, purchase_id: purchase.id, purchase_code: purchase.code, amount: 0 }, S(seed.storeId))).rejects.toBeInstanceOf(ApiError);
  });
});

describe('purchase orders & requests — live API', () => {
  let po: any;
  it('PO validation errors arrive as HTTP 200 + status:false and still throw', async () => {
    await expect(api.post(EP.po, { store_id: seed.storeId, date_str: iso(), vat_percent: 15, products: [] }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'product_id' in e.errors);
  });

  it('creates a draft PO, filters by single status, and marks it received with a purchase link', async () => {
    const p = seed.products[7];
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: p.cost, quantity: 5 }, 15)];
    const created = await api.post<any>(EP.po, { store_id: seed.storeId, date_str: iso(), vendor_id: seed.vendors[2].id, vendor_name: seed.vendors[2].name, status: 'draft', vat_percent: 15, auto_rounding_amount: true, products: linesToApi(lines).map((x) => ({ ...x, purchase_unit_price: x.unit_price, purchase_unit_price_with_vat: x.unit_price_with_vat })) }, S(seed.storeId));
    po = created.result;
    expect(po.net_total).toBe(computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true }).net_total);
    const drafts = await api.get<any[]>(EP.po, { search: { store_id: seed.storeId, status: 'draft', stats: 1 }, limit: 50, select: 'id,status' });
    expect(drafts.result!.every((x) => x.status === 'draft')).toBe(true);
    expect(drafts.result!.some((x) => x.id === po.id)).toBe(true);
    expect(drafts.meta).toHaveProperty('total_purchase_order');
    const full = (await api.get<any>(`${EP.po}/${po.id}`, S(seed.storeId))).result;
    await api.put(`${EP.po}/${po.id}`, poReceivedBody(full, seed.storeId, { id: seed.purchases[0].id, code: 'P-LINK' }), S(seed.storeId));
    const after = (await api.get<any>(`${EP.po}/${po.id}`, S(seed.storeId))).result;
    expect(after.status).toBe('received');
    expect(after.purchase_code).toBe('P-LINK');
    expect(after.products).toHaveLength(1);
    expect(after.code).toBe(po.code);
  });

  it('previous/next navigation endpoints answer for a PO', async () => {
    const r = await api.get<any>(`/v1/next-purchase-order/${po.id}`, S(seed.storeId));
    expect(r.status).toBe(true);
  });

  it('purchase request: create → list with search[page] params → accept → create PO links back', async () => {
    const p = seed.products[8];
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: p.cost, quantity: 2 }, 15)];
    const s = { lines, extra: { assigned_to: { id: me.id, label: me.name } } } as unknown as DocState;
    const body = prToApi({ store_id: seed.storeId, date_str: iso(), remarks: 'need stock', products: linesToApi(lines), vat_percent: 15, discount: 0, shipping_handling_fees: 0 }, s);
    expect(body).toMatchObject({ assigned_to: me.id, notes: 'need stock' });
    const created = (await api.post<any>(EP.pr, body, S(seed.storeId))).result;
    expect(created.status).toBe('pending');
    const list = await api.get<any[]>(EP.pr, prListQuery({ storeId: seed.storeId, page: 1, limit: 5, tab: 'received', userId: me.id, status: 'pending' }));
    expect(list.result!.some((x) => x.id === created.id)).toBe(true);
    expect(list.result!.length).toBeLessThanOrEqual(5);
    await api.post(`${EP.pr}/${created.id}/accept`, { partial: false }, S(seed.storeId));
    const prPo = (await api.post<any>(EP.po, { store_id: seed.storeId, date_str: iso(), status: 'draft', vat_percent: 15, purchase_request_id: created.id, purchase_request_code: created.code, products: body.products }, S(seed.storeId))).result;
    const after = (await api.get<any>(`${EP.pr}/${created.id}`, S(seed.storeId))).result;
    expect(after.status).toBe('accepted');
    expect(after.purchase_order_id).toBe(prPo.id);
    await api.del(`${EP.po}/${prPo.id}`, S(seed.storeId));
    await api.del(`${EP.pr}/${created.id}`, S(seed.storeId));
  });

  it('PR validation errors (missing assignee) come back with status:false', async () => {
    await expect(api.post(EP.pr, { store_id: seed.storeId, date_str: iso(), products: [] }, S(seed.storeId))).rejects.toBeInstanceOf(ApiError);
  });
});

describe('vendors — live API', () => {
  it('creates a vendor from form values, reads it back flattened, soft-deletes and restores it', async () => {
    const name = `INT VENDOR ${uniq()}`;
    const body = vendorFromForm({ name, phone: '0551234567', vat_percent: 15, na_city_name: 'Riyadh', na_building_no: '1234', product_categories: ['filters'], category_id: [], opening_balance: 0 }, (d) => d.toISOString());
    const created = (await api.post<any>(EP.vendor, { store_id: seed.storeId, ...body }, S(seed.storeId))).result;
    expect(created.name).toBe(name.toUpperCase());
    const v = (await api.get<any>(`${EP.vendor}/${created.id}`, S(seed.storeId))).result;
    const form = vendorToForm(v);
    expect(form.na_city_name).toBe('Riyadh');
    expect(form.product_categories).toEqual(['filters']);
    await api.del(`${EP.vendor}/${created.id}`, S(seed.storeId));
    const deleted = await api.get<any[]>(EP.vendor, { search: { store_id: seed.storeId, deleted: 1, query: name }, limit: 5, select: 'id,deleted' });
    expect(deleted.result!.some((x) => x.id === created.id)).toBe(true);
    await api.post(`${EP.vendor}/restore/${created.id}`, {}, S(seed.storeId));
    expect((await api.get<any>(`${EP.vendor}/${created.id}`, S(seed.storeId))).result.deleted).toBe(false);
  });

  it('rejects an invalid vendor VAT number', async () => {
    await expect(api.post(EP.vendor, { store_id: seed.storeId, name: `BAD VAT ${uniq()}`, vat_no: '12345' }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'vat_no' in e.errors);
  });

  it('lists vendors with purchase meta and per-store stats', async () => {
    const r = await api.get<any[]>(EP.vendor, { search: { store_id: seed.storeId, stats: 1 }, limit: 5, select: 'id,name,stores,credit_balance' });
    expect(r.meta).toHaveProperty('purchase');
    expect(r.meta).toHaveProperty('sales_unpaid_count');
    // Other suites create fresh vendors, so check a seeded vendor that is known to have purchases.
    const seeded = await api.get<any[]>(EP.vendor, { search: { store_id: seed.storeId, vendor_id: seed.vendors.map((v) => v.id).join(',') }, limit: 10, select: 'id,name,stores' });
    const withStats = seeded.result!.find((v) => v.stores?.[seed.storeId]);
    expect(withStats?.stores?.[seed.storeId]).toHaveProperty('purchase_amount');
  });

  it('vendor categories: create, duplicate-name error, delete', async () => {
    const name = `Cat ${uniq()}`;
    const c = (await api.post<any>(EP.vcat, { store_id: seed.storeId, name }, S(seed.storeId))).result;
    await expect(api.post(EP.vcat, { store_id: seed.storeId, name }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'name' in e.errors);
    await api.del(`${EP.vcat}/${c.id}`, S(seed.storeId));
  });
});
