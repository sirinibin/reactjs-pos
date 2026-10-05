import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { computeTotals, makeLine, linesToApi } from '../../src/framework/doc/calc';
import { emptyProduct, newAdjustment, productFromApi, productToApi } from '../../src/modules/inventory/lib/productForm';
import { applyPriceEdit, withVat } from '../../src/modules/inventory/lib/pricing';
import { serviceFromApi, serviceToApi } from '../../src/modules/inventory/lib/serviceForm';
import { loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
let sid: string;
let wh: { id: string; code: string; name: string };
const tag = `IT${Date.now().toString(36).toUpperCase()}`;
const created: { path: string; id: string }[] = [];
const iso = () => {
  const d = new Date();
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};
const get = async (id: string) => (await api.get<any>(`/v1/product/${id}`, S(sid))).result;
const waitFor = async <T>(fn: () => Promise<T>, ok: (v: T) => boolean, tries = 20): Promise<T> => {
  let v = await fn();
  for (let i = 0; i < tries && !ok(v); i++) { await new Promise((r) => setTimeout(r, 250)); v = await fn(); }
  return v;
};

/** Create a product through the same mapper the editor uses. */
async function createProduct(name: string, purchase = 40, retailInclVat = 69): Promise<any> {
  let f = { ...emptyProduct(), name };
  f = { ...f, prices: applyPriceEdit(f.prices, 'purchase_unit_price', purchase, 15) };
  f = { ...f, prices: applyPriceEdit(f.prices, 'retail_unit_price_with_vat', retailInclVat, 15) };
  const r = await api.post<any>('/v1/product', productToApi(f, { storeId: sid, warehouseModule: true }), S(sid));
  created.push({ path: '/v1/product', id: r.result.id });
  return r.result;
}

beforeAll(async () => {
  seed = loadSeed();
  sid = seed.storeId;
  await signIn();
  const w = await api.get<any[]>('/v1/warehouse', { search: { store_id: sid }, select: 'id,code,name', limit: 50 });
  wh = w.result![0];
});

afterAll(async () => {
  for (const c of created.reverse()) await api.del(`${c.path}/${c.id}`, S(sid)).catch(() => undefined);
});

describe('products — live API', () => {
  it('lists products only (not services) with stock-value meta when stats=1', async () => {
    const r = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_service: 0, stats: 1 }, limit: 50, select: 'id,is_service,name' });
    expect(r.result!.length).toBeGreaterThan(0);
    expect(r.meta).toEqual(expect.objectContaining({ stock: expect.any(Number), retail_stock_value: expect.any(Number), purchase_stock_value: expect.any(Number), wholesale_stock_value: expect.any(Number), sales: expect.any(Number) }));
    const services = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_service: 1 }, limit: 50, select: 'id' });
    const ids = new Set(r.result!.map((p) => p.id));
    for (const s of services.result!) expect(ids.has(s.id)).toBe(false);
  });

  it('sorts by per-store stock through the stores.* alias and projects nested store fields', async () => {
    const r = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_service: 0 }, limit: 20, sort: '-stores.stock', select: `id,name,product_stores.${sid}.stock` });
    const stocks = r.result!.map((p) => p.product_stores?.[sid]?.stock ?? 0);
    for (let i = 1; i < stocks.length; i++) expect(stocks[i]).toBeLessThanOrEqual(stocks[i - 1]);
  });

  it('filters by warehouse stock with an operator prefix', async () => {
    const r = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_service: 0, warehouse_code: 'main_store', stock: '>0' }, limit: 50, select: `id,product_stores.${sid}.warehouse_stocks` });
    for (const p of r.result!) expect(p.product_stores[sid].warehouse_stocks.main_store).toBeGreaterThan(0);
  });

  it('creates a product (HTTP 200 + status:false + result) with auto part #, EAN-12 and server profit', async () => {
    const p = await createProduct(`${tag} Cabin Filter`);
    expect(p.id).toMatch(/^[0-9a-f]{24}$/);
    const v = await get(p.id);
    expect(v.part_number).toMatch(/^\d{10}$/);
    expect(v.ean_12).toMatch(/^\d{12}$/);
    expect(v.barcode_base64).toMatch(/^data:image\/png;base64,/);
    const ps = v.product_stores[sid];
    expect(ps).toMatchObject({ purchase_unit_price: 40, purchase_unit_price_with_vat: 46, retail_unit_price: 60, retail_unit_price_with_vat: 69 });
    expect(ps.retail_unit_profit).toBe(20);
    expect(ps.retail_unit_profit_perc).toBe(50);
  });

  it('rejects a short name and a duplicate part number with field errors', async () => {
    await expect(api.post('/v1/product', productToApi({ ...emptyProduct(), name: 'ab' }, { storeId: sid, warehouseModule: true }), S(sid)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && /min\. 3/.test(e.errors.name));
    const first = await createProduct(`${tag} Dup A`);
    const v = await get(first.id);
    await expect(api.post('/v1/product', productToApi({ ...emptyProduct(), name: `${tag} Dup B`, part_number: v.part_number }, { storeId: sid, warehouseModule: true }), S(sid)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'part_number' in e.errors);
  });

  it('a stock adjustment via the editor mapper changes stock, keeps prices, and appears in product history', async () => {
    const p = await createProduct(`${tag} Adjusted`, 10, 23);
    const before = await get(p.id);
    const f = productFromApi(before, sid);
    const body = productToApi({ ...f, adjustments: [...f.adjustments, newAdjustment('adding', 12)] }, { storeId: sid, existingStore: before.product_stores[sid], warehouseModule: true });
    await api.put(`/v1/product/${p.id}`, body, S(sid));
    const after = await get(p.id);
    expect(after.product_stores[sid].stock).toBe(12);
    expect(after.product_stores[sid].warehouse_stocks.main_store).toBe(12);
    // The API replaces the whole store entry on PUT — the mapper must carry VAT prices over.
    expect(after.product_stores[sid].retail_unit_price_with_vat).toBe(23);
    const hist = await waitFor(
      () => api.get<any[]>(`/v1/product/history/ignored`, { search: { store_id: sid, product_id: p.id }, limit: 10 }),
      (r) => (r.result || []).length > 0,
    );
    expect(hist.result![0]).toMatchObject({ product_id: p.id, reference_type: 'stock_adjustment_by_adding', quantity: 12 });
  });

  it('rejects an adjustment without a positive quantity', async () => {
    const p = await createProduct(`${tag} Bad adj`);
    const before = await get(p.id);
    const f = productFromApi(before, sid);
    const body = productToApi({ ...f, adjustments: [newAdjustment('adding', 0)] }, { storeId: sid, existingStore: before.product_stores[sid], warehouseModule: true });
    await expect(api.put(`/v1/product/${p.id}`, body, S(sid))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'adjustment_quantity_0' in e.errors);
  });

  it('kit totals become the product price and is_set is stored inverted', async () => {
    const a = await createProduct(`${tag} Kit part A`, 10, 23);
    const b = await createProduct(`${tag} Kit part B`, 20, 46);
    const [pa, pb] = [await get(a.id), await get(b.id)];
    const { addSetLine } = await import('../../src/modules/inventory/lib/productForm');
    let f = { ...emptyProduct(), name: `${tag} Brake kit`, set_name: 'Kit' };
    f = { ...f, set_lines: addSetLine(addSetLine(f.set_lines, pa, sid, 15), pb, sid, 15) };
    f.set_lines[0].quantity = 2;
    const r = await api.post<any>('/v1/product', productToApi(f, { storeId: sid, warehouseModule: true }), S(sid));
    created.push({ path: '/v1/product', id: r.result.id });
    const v = await get(r.result.id);
    expect(v.set.products).toHaveLength(2);
    expect(v.is_set).toBe(false);
    expect(v.product_stores[sid].retail_unit_price).toBe(80);
    expect(v.product_stores[sid].purchase_unit_price).toBe(40);
    const kits = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_set: 0, search_text: tag }, limit: 50, select: 'id' });
    expect(kits.result!.map((x) => x.id)).toContain(r.result.id);
  });

  it('linking is bidirectional', async () => {
    const a = await createProduct(`${tag} Link A`);
    const b = await createProduct(`${tag} Link B`);
    const va = await get(a.id);
    const f = productFromApi(va, sid);
    await api.put(`/v1/product/${a.id}`, productToApi({ ...f, linked: [{ id: b.id, label: 'B' }] }, { storeId: sid, existingStore: va.product_stores[sid], warehouseModule: true }), S(sid));
    const vb = await get(b.id);
    expect(vb.linked_product_ids).toContain(a.id);
    expect((await get(a.id)).linked_products.map((x: any) => x.id)).toContain(b.id);
  });

  it('soft-deletes, lists under deleted=1 and restores', async () => {
    const p = await createProduct(`${tag} Delete me`);
    await api.del(`/v1/product/${p.id}`, S(sid));
    const del = await api.get<any[]>('/v1/product', { search: { store_id: sid, deleted: 1, search_text: tag }, limit: 100, select: 'id,deleted' });
    expect(del.result!.find((x) => x.id === p.id)?.deleted).toBe(true);
    await api.post(`/v1/product/restore/${p.id}`, {}, S(sid));
    expect((await get(p.id)).deleted).toBe(false);
  });
});

describe('services — live API', () => {
  it('creates a service through the drawer mapper and keeps it out of the product list', async () => {
    const f = { ...serviceFromApi(null, sid), name: `${tag} Wheel balancing`, unit: 'HUR', duration_minutes: 45 };
    f.prices = applyPriceEdit(f.prices, 'retail_unit_price', 100, 15);
    const r = await api.post<any>('/v1/product', serviceToApi(f, sid), S(sid));
    created.push({ path: '/v1/product', id: r.result.id });
    const v = await get(r.result.id);
    expect(v).toMatchObject({ is_service: true, unit: 'HUR', duration_minutes: 45 });
    expect(v.product_stores[sid].retail_unit_price_with_vat).toBe(withVat(100, 15));
    const prods = await api.get<any[]>('/v1/product', { search: { store_id: sid, is_service: 0, search_text: tag }, limit: 100, select: 'id' });
    expect(prods.result!.map((x) => x.id)).not.toContain(r.result.id);
  });
});

describe('categories, brands, warehouses — live API', () => {
  it('category: create with parent, duplicate rejected, delete + restore', async () => {
    const parent = (await api.post<any>('/v1/product-category', { store_id: sid, name: `${tag} Parent` }, S(sid))).result;
    created.push({ path: '/v1/product-category', id: parent.id });
    const child = (await api.post<any>('/v1/product-category', { store_id: sid, name: `${tag} Child`, parent_id: parent.id }, S(sid))).result;
    created.push({ path: '/v1/product-category', id: child.id });
    const v = (await api.get<any>(`/v1/product-category/${child.id}`, S(sid))).result;
    expect(v.parent_name).toBe(`${tag} Parent`);
    await expect(api.post('/v1/product-category', { store_id: sid, name: `${tag} Parent` }, S(sid))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'name' in e.errors);
    await api.del(`/v1/product-category/${child.id}`, S(sid));
    const del = await api.get<any[]>('/v1/product-category', { search: { store_id: sid, deleted: 1, name: tag }, limit: 50 });
    expect(del.result!.map((x) => x.id)).toContain(child.id);
    await api.post(`/v1/product-category/restore/${child.id}`, {}, S(sid));
    const act = await api.get<any[]>('/v1/product-category', { search: { store_id: sid, name: tag }, limit: 50 });
    expect(act.result!.map((x) => x.id)).toContain(child.id);
  });

  it('brand: code is required and unique', async () => {
    await expect(api.post('/v1/product-brand', { store_id: sid, name: `${tag} Brand` }, S(sid))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'code' in e.errors);
    const b = (await api.post<any>('/v1/product-brand', { store_id: sid, name: `${tag} Brand`, code: tag }, S(sid))).result;
    created.push({ path: '/v1/product-brand', id: b.id });
    await expect(api.post('/v1/product-brand', { store_id: sid, name: `${tag} Brand 2`, code: tag }, S(sid))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'code' in e.errors);
  });

  it('service category: create + search', async () => {
    const c = (await api.post<any>('/v1/service-category', { store_id: sid, name: `${tag} Diagnostics` }, S(sid))).result;
    created.push({ path: '/v1/service-category', id: c.id });
    const r = await api.get<any[]>('/v1/service-category', { search: { store_id: sid, name: tag }, limit: 10 });
    expect(r.result!.map((x) => x.id)).toContain(c.id);
  });

  it('warehouse: invalid phone and building number are rejected (nothing created)', async () => {
    await expect(api.post('/v1/warehouse', { store_id: sid, name: `${tag} WH`, phone: '12345', national_address: { building_no: '12' } }, S(sid)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'phone' in e.errors);
    const r = await api.get<any[]>('/v1/warehouse', { search: { store_id: sid }, limit: 50 });
    expect(r.result!.some((w) => w.name === `${tag} WH`)).toBe(false);
    expect(wh.code).toMatch(/^WH\d+$/);
  });
});

describe('stock transfers — live API', () => {
  it('calculate-net-total agrees with the client engine', async () => {
    const lines = [makeLine({ product_id: seed.products[0].id, name: seed.products[0].name, unit_price: 22.1, quantity: 3 }, 15), makeLine({ product_id: seed.products[1].id, name: seed.products[1].name, unit_price: 33.333, quantity: 7 }, 15)];
    const r = await api.post<any>('/v1/stock-transfer/calculate-net-total', { store_id: sid, date_str: iso(), vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, from_warehouse_id: null, to_warehouse_id: wh.id, to_warehouse_code: wh.code }, S(sid));
    const t = computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true });
    expect(r.result.net_total).toBe(t.net_total);
    expect(r.result.vat_price).toBe(t.vat_price);
  });

  it('rejects Main Store → Main Store and the same warehouse twice', async () => {
    const line = linesToApi([makeLine({ product_id: seed.products[0].id, name: seed.products[0].name, unit_price: 10, quantity: 1 }, 15)]);
    await expect(api.post('/v1/stock-transfer', { store_id: sid, date_str: iso(), vat_percent: 15, products: line, from_warehouse_id: null, to_warehouse_id: null }, S(sid)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && /Main Store/.test(Object.values(e.errors).join(' ')));
    await expect(api.post('/v1/stock-transfer', { store_id: sid, date_str: iso(), vat_percent: 15, products: line, from_warehouse_id: wh.id, from_warehouse_code: wh.code, to_warehouse_id: wh.id, to_warehouse_code: wh.code }, S(sid)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'to_warehouse_id' in e.errors);
  });

  it('moves stock Main Store → warehouse, lists it, filters by "main store" and records history', async () => {
    const p = await createProduct(`${tag} Transfer item`, 10, 23);
    const v0 = await get(p.id);
    const f = productFromApi(v0, sid);
    await api.put(`/v1/product/${p.id}`, productToApi({ ...f, adjustments: [newAdjustment('adding', 10)] }, { storeId: sid, existingStore: v0.product_stores[sid], warehouseModule: true }), S(sid));
    const lines = [makeLine({ product_id: p.id, name: p.name, unit_price: 10, quantity: 4 }, 15)];
    const r = await api.post<any>('/v1/stock-transfer', { store_id: sid, date_str: iso(), vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true, from_warehouse_id: null, from_warehouse_code: null, to_warehouse_id: wh.id, to_warehouse_code: wh.code, remarks: tag }, S(sid));
    expect(r.result.code).toBeTruthy();
    expect(r.result.total_quantity).toBe(4);
    const after = await waitFor(() => get(p.id), (x) => x.product_stores[sid].warehouse_stocks?.[wh.code] === 4);
    expect(after.product_stores[sid].warehouse_stocks).toMatchObject({ [wh.code]: 4, main_store: 6 });
    expect(after.product_stores[sid].stock).toBe(10);
    const list = await api.get<any[]>('/v1/stock-transfer', { search: { store_id: sid, from_warehouse_code: 'main store', stats: 1 }, limit: 20, sort: '-created_at', select: 'id,from_warehouse_code,to_warehouse_code' });
    expect(list.result!.map((x) => x.id)).toContain(r.result.id);
    for (const x of list.result!) expect(x.from_warehouse_code || null).toBeNull();
    expect(list.meta).toHaveProperty('total_quantity');
    const hist = await waitFor(() => api.get<any[]>(`/v1/product/history/${p.id}`, { search: { store_id: sid, product_id: p.id, reference_type: 'stock_transfer' }, limit: 5 }), (x) => (x.result || []).length > 0);
    expect(hist.result![0]).toMatchObject({ reference_type: 'stock_transfer', to_warehouse_code: wh.code, quantity: 4 });
    const prev = await api.get<any>(`/v1/previous-stock-transfer/${r.result.id}`, S(sid)).catch(() => null);
    if (prev?.result?.id) expect(prev.result.id).not.toBe(r.result.id);
  });
});
