import { fetchRetailPrices, purchaseLinesToQuotationLines, mergeImportedQuotationProducts } from '../quotationImport';

const okJson = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

describe('fetchRetailPrices', () => {
  beforeEach(() => localStorage.setItem('access_token', 'tok'));

  it('requests the store retail prices for the given products and maps them by id', async () => {
    const fetchFn = jest.fn(() => okJson({ result: [
      { id: 'a', product_stores: { s1: { retail_unit_price: 10, retail_unit_price_with_vat: 11.5 } } },
      { id: 'b', product_stores: { s1: { retail_unit_price: '20', retail_unit_price_with_vat: '23' } } },
    ] }));
    const prices = await fetchRetailPrices(['a', 'b'], 's1', fetchFn);
    expect(prices).toEqual({ a: { retail_unit_price: 10, retail_unit_price_with_vat: 11.5 }, b: { retail_unit_price: 20, retail_unit_price_with_vat: 23 } });
    const [url, opts] = fetchFn.mock.calls[0];
    expect(url).toContain('search[ids]=a,b&');
    expect(url).toContain('search[store_id]=s1');
    expect(url).toContain('product_stores.s1.retail_unit_price');
    expect(opts.headers.Authorization).toBe('tok');
  });

  it('skips the request when there are no ids, and dedupes ids', async () => {
    const fetchFn = jest.fn(() => okJson({ result: [] }));
    expect(await fetchRetailPrices([], 's1', fetchFn)).toEqual({});
    expect(await fetchRetailPrices([null, undefined, ''], 's1', fetchFn)).toEqual({});
    expect(fetchFn).not.toHaveBeenCalled();
    await fetchRetailPrices(['a', 'a', 'b'], 's1', fetchFn);
    expect(fetchFn.mock.calls[0][0]).toContain('search[ids]=a,b&');
  });

  it('splits more than 100 ids into several requests', async () => {
    const ids = Array.from({ length: 205 }, (_, i) => 'p' + i);
    const fetchFn = jest.fn(() => okJson({ result: [] }));
    await fetchRetailPrices(ids, 's1', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls[2][0]).toContain('limit=5');
  });

  it('treats a product without store prices as 0', async () => {
    const fetchFn = jest.fn(() => okJson({ result: [{ id: 'a', product_stores: {} }] }));
    expect(await fetchRetailPrices(['a'], 's1', fetchFn)).toEqual({ a: { retail_unit_price: 0, retail_unit_price_with_vat: 0 } });
  });

  it('throws when the API fails, and tolerates an empty result', async () => {
    await expect(fetchRetailPrices(['a'], 's1', () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))).rejects.toThrow();
    await expect(fetchRetailPrices(['a'], 's1', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    expect(await fetchRetailPrices(['a'], 's1', () => okJson({ result: null }))).toEqual({});
  });
});

describe('purchaseLinesToQuotationLines', () => {
  const line = { product_id: 'a', item_code: 'IC', prefix_part_number: 'AB', part_number: '1', name: 'Bolt', name_in_arabic: 'برغي', quantity: 4, unit: 'pcs', purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9, unit_discount: 2, retail_unit_price: 9, retail_unit_price_with_vat: 10.35 };

  it('uses the store retail price as the selling price and keeps the purchase price as cost', () => {
    const [q] = purchaseLinesToQuotationLines([line], { a: { retail_unit_price: 12, retail_unit_price_with_vat: 13.8 } });
    expect(q).toMatchObject({ product_id: 'a', item_code: 'IC', prefix_part_number: 'AB', part_number: '1', name: 'Bolt', name_in_arabic: 'برغي', quantity: 4, unit: 'pcs', unit_price: 12, unit_price_with_vat: 13.8, purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9 });
  });

  it('never carries the purchase discount into the quotation', () => {
    const [q] = purchaseLinesToQuotationLines([line], {});
    expect(q).toMatchObject({ unit_discount: 0, unit_discount_with_vat: 0, unit_discount_percent: 0, unit_discount_percent_with_vat: 0 });
  });

  it('falls back to the retail price saved on the purchase line when the store has none', () => {
    expect(purchaseLinesToQuotationLines([line], {})[0].unit_price).toBe(9);
    expect(purchaseLinesToQuotationLines([line], { a: { retail_unit_price: 0, retail_unit_price_with_vat: 0 } })[0].unit_price_with_vat).toBe(10.35);
  });

  it('uses 0 when no selling price is known anywhere', () => {
    const [q] = purchaseLinesToQuotationLines([{ product_id: 'x' }], {});
    expect(q.unit_price).toBe(0);
    expect(q.unit_price_with_vat).toBe(0);
    expect(q.quantity).toBe(1);
  });

  it('drops lines without a product_id and handles empty input', () => {
    expect(purchaseLinesToQuotationLines([{ name: 'free text' }, null, line], {})).toHaveLength(1);
    expect(purchaseLinesToQuotationLines(null)).toEqual([]);
  });

  it('turns zero or negative quantities into 1', () => {
    expect(purchaseLinesToQuotationLines([{ product_id: 'a', quantity: 0 }])[0].quantity).toBe(1);
    expect(purchaseLinesToQuotationLines([{ product_id: 'a', quantity: -2 }])[0].quantity).toBe(1);
  });

  it('feeds into the same merge as quotation imports', () => {
    const lines = purchaseLinesToQuotationLines([line], { a: { retail_unit_price: 12, retail_unit_price_with_vat: 13.8 } });
    const out = mergeImportedQuotationProducts([], lines);
    expect(out[0]).toMatchObject({ code: 'IC', unit_price: 12, unit_price_with_vat: 13.8, purchase_unit_price: 6, quantity: 4, unit_discount: 0 });
    const noTax = mergeImportedQuotationProducts([], lines, { noTax: true });
    expect(noTax[0].unit_price_with_vat).toBe(12);
  });
});
