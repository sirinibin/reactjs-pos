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

describe('edge cases', () => {
  it('parses numeric strings coming from the API', () => {
    const m = mapQuotationProductForImport({ product_id: 'x', quantity: '3', unit_price: '10.5', unit_price_with_vat: '12.075', unit_discount: '0.5' });
    expect(m.quantity).toBe(3);
    expect(m.unit_price).toBe(10.5);
    expect(m.unit_price_with_vat).toBe(12.075);
    expect(m.unit_discount).toBe(0.5);
  });

  it('treats non-numeric values as 0 and a zero quantity as 1', () => {
    const m = mapQuotationProductForImport({ product_id: 'x', quantity: 0, unit_price: 'abc', unit_discount: null });
    expect(m.quantity).toBe(1);
    expect(m.unit_price).toBe(0);
    expect(m.unit_discount).toBe(0);
  });

  it('noTax copies the VAT-exclusive discount percent too', () => {
    const m = mapQuotationProductForImport({ product_id: 'x', unit_discount_percent: 7, unit_discount_percent_with_vat: 9 }, { noTax: true });
    expect(m.unit_discount_percent_with_vat).toBe(7);
  });

  it('keeps the service flag', () => {
    expect(mapQuotationProductForImport({ product_id: 'x', is_service: true }).is_service).toBe(true);
  });

  it('falls back to empty strings for missing text fields', () => {
    const m = mapQuotationProductForImport({ product_id: 'x' });
    expect(m).toMatchObject({ code: '', prefix_part_number: '', part_number: '', name: '', name_in_arabic: '', unit: '' });
  });

  it('merges a product that appears twice in the picked list into one line', () => {
    const out = mergeImportedQuotationProducts([], [{ product_id: 'p', quantity: 2 }, { product_id: 'p', quantity: 3 }]);
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(5);
  });

  it('adds to an existing quantity stored as a string', () => {
    const out = mergeImportedQuotationProducts([{ product_id: 'p', quantity: '2' }], [{ product_id: 'p', quantity: 3 }]);
    expect(out[0].quantity).toBe(5);
  });

  it('adds 1 when the picked line has no quantity', () => {
    const out = mergeImportedQuotationProducts([{ product_id: 'p', quantity: 2 }], [{ product_id: 'p' }]);
    expect(out[0].quantity).toBe(3);
  });

  it('keeps the order of existing lines and appends new ones at the end', () => {
    const out = mergeImportedQuotationProducts(
      [{ product_id: 'a', quantity: 1 }, { product_id: 'b', quantity: 1 }],
      [{ product_id: 'c' }, { product_id: 'a' }, { product_id: 'd' }]
    );
    expect(out.map(p => p.product_id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles null or undefined inputs', () => {
    expect(mergeImportedQuotationProducts(null, null)).toEqual([]);
    expect(mergeImportedQuotationProducts(undefined, [{ product_id: 'p' }])).toHaveLength(1);
    expect(mergeImportedQuotationProducts([{ product_id: 'p', quantity: 1 }], undefined)).toHaveLength(1);
  });

  it('applies noTax to newly added lines only, leaving existing prices alone', () => {
    const out = mergeImportedQuotationProducts(
      [{ product_id: 'a', quantity: 1, unit_price: 10, unit_price_with_vat: 11.5 }],
      [{ product_id: 'b', unit_price: 20, unit_price_with_vat: 23 }],
      { noTax: true }
    );
    expect(out[0].unit_price_with_vat).toBe(11.5);
    expect(out[1].unit_price_with_vat).toBe(20);
  });
});

describe('mergeImportedQuotationProducts options used by quotation form type 3', () => {
  it('prepend puts new lines on top, in picked order, and still merges duplicates', () => {
    const existing = [{ product_id: 'old', quantity: 1 }, { product_id: 'p1', quantity: 2 }];
    const result = mergeImportedQuotationProducts(existing, [
      { product_id: 'n1', quantity: 1 },
      { product_id: 'p1', quantity: 3 },
      { product_id: 'n2', quantity: 4 },
    ], { prepend: true });
    expect(result.map(p => p.product_id)).toEqual(['n1', 'n2', 'old', 'p1']);
    expect(result.find(p => p.product_id === 'p1').quantity).toBe(5);
  });

  it('prepend merges a product that appears twice in the picked list into one new line', () => {
    const result = mergeImportedQuotationProducts([], [{ product_id: 'a', quantity: 1 }, { product_id: 'a', quantity: 2 }], { prepend: true });
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('vatExcluded copies VAT-exclusive prices for the lines it selects only', () => {
    const result = mergeImportedQuotationProducts([], [
      { product_id: 'svc', is_service: true, unit_price: 50, unit_price_with_vat: 57.5, unit_discount: 5, unit_discount_with_vat: 5.75 },
      { product_id: 'prd', is_service: false, unit_price: 10, unit_price_with_vat: 11.5 },
    ], { vatExcluded: (p) => p.is_service });
    const svc = result.find(p => p.product_id === 'svc');
    const prd = result.find(p => p.product_id === 'prd');
    expect([svc.unit_price, svc.unit_price_with_vat, svc.unit_discount_with_vat]).toEqual([50, 50, 5]);
    expect([prd.unit_price, prd.unit_price_with_vat]).toEqual([10, 11.5]);
  });

  it('noTax wins over a vatExcluded that returns false', () => {
    const [line] = mergeImportedQuotationProducts([], [{ product_id: 'x', unit_price: 10, unit_price_with_vat: 11.5 }], { noTax: true, vatExcluded: () => false });
    expect(line.unit_price_with_vat).toBe(10);
  });

  it('ignores deleted lines when looking for a product already in the list', () => {
    const existing = [{ product_id: 'p1', quantity: 2, deleted: true }];
    const result = mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 1 }], { prepend: true });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ product_id: 'p1', quantity: 1 });
    expect(result[1]).toMatchObject({ product_id: 'p1', quantity: 2, deleted: true });
  });
});
