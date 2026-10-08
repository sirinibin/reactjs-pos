import { mapQuotationProductForImport, mergeImportedQuotationProducts } from '../quotationImport';

const src = {
  product_id: 'p1', item_code: 'IC1', prefix_part_number: 'AB', part_number: '100', name: 'Filter',
  name_in_arabic: 'فلتر', quantity: 3, unit: 'pcs', unit_price: 10, unit_price_with_vat: 11.5,
  purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9, unit_discount: 1, unit_discount_with_vat: 1.15,
  unit_discount_percent: 10, unit_discount_percent_with_vat: 10, is_service: false,
};

describe('mapQuotationProductForImport', () => {
  it('carries over prices, discounts and identity fields', () => {
    const m = mapQuotationProductForImport(src);
    expect(m).toMatchObject({
      product_id: 'p1', code: 'IC1', prefix_part_number: 'AB', part_number: '100', name: 'Filter',
      quantity: 3, unit: 'pcs', unit_price: 10, unit_price_with_vat: 11.5,
      purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9,
      unit_discount: 1, unit_discount_with_vat: 1.15, unit_discount_percent: 10, is_service: false,
    });
    expect(m.product_stores).toEqual({});
  });

  it('uses VAT-exclusive values when noTax is set', () => {
    const m = mapQuotationProductForImport(src, { noTax: true });
    expect(m.unit_price_with_vat).toBe(10);
    expect(m.unit_discount_with_vat).toBe(1);
  });

  it('defaults missing quantity to 1 and missing prices to 0', () => {
    const m = mapQuotationProductForImport({ product_id: 'x' });
    expect(m.quantity).toBe(1);
    expect(m.unit_price).toBe(0);
    expect(m.unit_price_with_vat).toBe(0);
  });
});

describe('mergeImportedQuotationProducts', () => {
  it('appends new products', () => {
    const out = mergeImportedQuotationProducts([{ product_id: 'a', quantity: 1 }], [src]);
    expect(out).toHaveLength(2);
    expect(out[1].product_id).toBe('p1');
  });

  it('adds quantity to a product already in the list instead of duplicating', () => {
    const out = mergeImportedQuotationProducts([{ product_id: 'p1', quantity: 2, unit_price: 99 }], [src]);
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(5);
    expect(out[0].unit_price).toBe(99);
  });

  it('does not mutate the existing list', () => {
    const existing = [{ product_id: 'p1', quantity: 2 }];
    mergeImportedQuotationProducts(existing, [src]);
    expect(existing[0].quantity).toBe(2);
  });

  it('skips lines without product_id', () => {
    expect(mergeImportedQuotationProducts([], [{ name: 'x' }, null])).toEqual([]);
  });
});
