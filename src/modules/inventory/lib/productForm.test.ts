import { describe, expect, it } from 'vitest';
import { addSetLine, effectivePrices, emptyProduct, newAdjustment, normalizeServerErrors, productFromApi, productToApi, validateProduct } from './productForm';
import { endsFromSelect, locationName, stockWarnings, validateEnds } from './transfer';

const SID = 'store1';
const API = {
  id: 'p1', name: 'Air Filter', name_in_arabic: 'فلتر هواء', part_number: 'AF-1', prefix_part_number: 'BO', ean_12: '100000000003', unit: 'Pc',
  brand_id: 'b1', brand_name: 'Bosch', category_id: ['c1', 'c2'], category_name: ['Filters', 'Engine'], country_name: 'Germany', country_code: 'DE',
  allow_duplicates: true, note: 'n',
  linked_products: [{ id: 'p9', name: 'Oil Filter' }],
  set: { name: '', products: null },
  product_stores: {
    [SID]: {
      store_id: SID, purchase_unit_price: 22.1, purchase_unit_price_with_vat: 25.415, retail_unit_price: 38.5, retail_unit_price_with_vat: 44.275,
      wholesale_unit_price: 34.65, wholesale_unit_price_with_vat: 39.8475, stock: 59, sales_count: 4, warehouse_racks: { main_store: 'A-6' },
      stock_adjustments: [{ date: '2026-07-27T10:10:00Z', type: 'adding', quantity: 7, reason: 'Opening stock', warehouse_id: null, warehouse_code: null }],
    },
  },
};

describe('product form mapping', () => {
  it('hydrates from the API, adding date_str to existing adjustments', () => {
    const f = productFromApi(API, SID);
    expect(f.brand).toEqual({ id: 'b1', label: 'Bosch' });
    expect(f.categories).toEqual([{ id: 'c1', label: 'Filters' }, { id: 'c2', label: 'Engine' }]);
    expect(f.prices.retail_unit_price).toBe(38.5);
    expect(f.racks).toEqual({ main_store: 'A-6' });
    expect(f.adjustments[0]).toMatchObject({ type: 'adding', quantity: 7, reason: 'Opening stock' });
    expect(f.adjustments[0].date_str).toMatch(/^2026-07-27T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(f.linked).toEqual([{ id: 'p9', label: 'Oil Filter' }]);
  });

  it('builds the body, keeping server counters in the store entry', () => {
    const f = productFromApi(API, SID);
    const body = productToApi({ ...f, name: '  Air Filter X ' }, { storeId: SID, existingStore: API.product_stores[SID], warehouseModule: true });
    expect(body).toMatchObject({ store_id: SID, name: 'Air Filter X', brand_id: 'b1', category_id: ['c1', 'c2'], linked_product_ids: ['p9'], is_service: false, allow_duplicates: true });
    const ps = body.product_stores[SID];
    expect(ps).toMatchObject({ store_id: SID, sales_count: 4, retail_unit_price: 38.5, retail_unit_price_with_vat: 44.275, warehouse_racks: { main_store: 'A-6' } });
    expect(ps.stock_adjustments[0]).not.toHaveProperty('key');
    expect(ps.stock_adjustments[0]).toHaveProperty('date_str');
    expect(body).not.toHaveProperty('rack');
  });

  it('uses the legacy rack field without the warehouse module', () => {
    const body = productToApi({ ...emptyProduct(), name: 'Thing', rack: ' R1 ' }, { storeId: SID, warehouseModule: false });
    expect(body.rack).toBe('R1');
    expect(body.product_stores[SID].warehouse_racks).toBeNull();
  });

  it('kit component totals overwrite the product prices', () => {
    let f = { ...emptyProduct(), name: 'Brake kit' };
    f = { ...f, set_lines: addSetLine(f.set_lines, { id: 'a', name: 'Pad', product_stores: { [SID]: { retail_unit_price: 20, purchase_unit_price: 10 } } }, SID, 15) };
    f = { ...f, set_lines: addSetLine(f.set_lines, { id: 'a', name: 'Pad', product_stores: { [SID]: { retail_unit_price: 20, purchase_unit_price: 10 } } }, SID, 15) };
    expect(f.set_lines).toHaveLength(1);
    expect(f.set_lines[0].quantity).toBe(2);
    expect(f.set_lines[0].retail_unit_price_with_vat).toBe(23);
    expect(effectivePrices(f)).toMatchObject({ retail_unit_price: 40, purchase_unit_price: 20, retail_unit_price_with_vat: 46 });
    const body = productToApi(f, { storeId: SID, warehouseModule: true });
    expect(body.set.products[0]).toMatchObject({ product_id: 'a', quantity: 2, retail_price_percent: 100 });
    expect(body.product_stores[SID].retail_unit_price).toBe(40);
  });

  it('passes link_to_product_id when creating from a linked product', () => {
    expect(productToApi({ ...emptyProduct(), name: 'abc' }, { storeId: SID, warehouseModule: true, linkTo: 'p7' }).link_to_product_id).toBe('p7');
  });

  it('defaults allow_duplicates from the store setting', () => {
    expect(emptyProduct({ allow_products_duplicates_by_default: true }).allow_duplicates).toBe(true);
    expect(emptyProduct().allow_duplicates).toBe(false);
  });
});

describe('product validation', () => {
  it('requires a 3+ char name', () => {
    expect(validateProduct(emptyProduct()).name).toBe('Name is required');
    expect(validateProduct({ ...emptyProduct(), name: 'ab' }).name).toBe('Name length should be min. 3 chars');
    expect(validateProduct({ ...emptyProduct(), name: 'abc' })).toEqual({});
  });
  it('rejects negative prices', () => {
    const f = { ...emptyProduct(), name: 'abc' };
    expect(validateProduct({ ...f, prices: { ...f.prices, retail_unit_price: -1 } }).retail_unit_price).toBeTruthy();
  });
  it('validates stock adjustments with the server keys', () => {
    const f = { ...emptyProduct(), name: 'abc', adjustments: [{ ...newAdjustment('adding', 0), type: '' as const }] };
    expect(validateProduct(f)).toMatchObject({ adjustment_quantity_0: expect.any(String), adjustment_type_0: expect.any(String) });
  });
  it('requires kit component quantities', () => {
    const f = { ...emptyProduct(), name: 'abc', set_lines: [{ product_id: 'a', name: 'x', quantity: 0, purchase_unit_price: 0, purchase_unit_price_with_vat: 0, retail_unit_price: 0, retail_unit_price_with_vat: 0 }] };
    expect(validateProduct(f).set_product_quantity_0).toBe('Quantity is required');
  });
  it('maps server error keys onto visible fields', () => {
    expect(normalizeServerErrors({ purchase_unit_price_0: 'a', retail_unit_price_with_vat: 'b', name: 'c' })).toEqual({ purchase_unit_price: 'a', retail_unit_price: 'b', name: 'c' });
  });
});

describe('stock transfer helpers', () => {
  const WH = [{ id: 'w1', code: 'WH1', name: 'Dammam' }, { id: 'w2', code: 'WH2', name: 'Jeddah' }];
  it('maps selects to from/to ids and codes (empty = Main Store)', () => {
    expect(endsFromSelect('', 'w1', WH)).toEqual({ from_warehouse_id: null, from_warehouse_code: null, to_warehouse_id: 'w1', to_warehouse_code: 'WH1' });
  });
  it('rejects Main Store → Main Store and same warehouse', () => {
    expect(validateEnds(endsFromSelect('', '', WH)).from_warehouse_id).toMatch(/cannot be Main Store/);
    expect(validateEnds(endsFromSelect('w1', 'w1', WH)).to_warehouse_id).toBe('Choose different warehouse');
    expect(validateEnds(endsFromSelect('w1', '', WH))).toEqual({});
  });
  it('labels locations', () => {
    expect(locationName(null, WH)).toBe('Main Store');
    expect(locationName('main_store', WH)).toBe('Main Store');
    expect(locationName('WH2', WH)).toBe('WH2 · Jeddah');
    expect(locationName('WH9', WH)).toBe('WH9');
  });
  it('warns when the summed quantity exceeds stock at the source', () => {
    const w = stockWarnings([{ product_id: 'p1', quantity: 3 }, { product_id: 'p2', quantity: 1 }, { product_id: 'p1', quantity: 2 }], { p1: { main_store: 4, WH1: 10 }, p2: { main_store: 5 } }, null);
    expect(Object.keys(w)).toEqual(['quantity_0', 'quantity_2']);
    expect(w.quantity_0).toEqual({ code: 'main_store', have: 4 });
    expect(stockWarnings([{ product_id: 'p1', quantity: 5 }], { p1: { main_store: 4, WH1: 10 } }, 'WH1')).toEqual({});
  });
});
