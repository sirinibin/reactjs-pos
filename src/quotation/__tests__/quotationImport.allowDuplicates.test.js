// "Allow duplicates" products are imported as separate lines instead of merged.
import { mergeImportedQuotationProducts, fetchAllowDuplicateIds, productIdsToCheckForDuplicates } from '../quotationImport';

describe('mergeImportedQuotationProducts with allowDuplicateIds', () => {
  const existing = [{ product_id: 'p1', quantity: 2, unit_price: 10 }, { product_id: 'p2', quantity: 1, unit_price: 5 }];

  it('adds an allow-duplicates product as a new line even when it is already in the list', () => {
    const out = mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 3, unit_price: 12 }], { allowDuplicateIds: ['p1'] });
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ product_id: 'p1', quantity: 2, unit_price: 10 });
    expect(out[2]).toMatchObject({ product_id: 'p1', quantity: 3, unit_price: 12 });
  });

  it('still merges products that do not allow duplicates', () => {
    const out = mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 3 }, { product_id: 'p2', quantity: 4 }], { allowDuplicateIds: ['p1'] });
    expect(out).toHaveLength(3);
    expect(out[1]).toMatchObject({ product_id: 'p2', quantity: 5 });
  });

  it('keeps each picked allow-duplicates line separate when the same product is picked twice', () => {
    const out = mergeImportedQuotationProducts([], [{ product_id: 'p9', quantity: 1 }, { product_id: 'p9', quantity: 2 }], { allowDuplicateIds: ['p9'] });
    expect(out.map(p => p.quantity)).toEqual([1, 2]);
  });

  it('accepts a Set and behaves as before when no ids are given', () => {
    expect(mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 1 }], { allowDuplicateIds: new Set(['p1']) })).toHaveLength(3);
    expect(mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 1 }])).toHaveLength(2);
    expect(mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 1 }], { allowDuplicateIds: null })).toHaveLength(2);
  });

  it('does not mutate the existing list', () => {
    mergeImportedQuotationProducts(existing, [{ product_id: 'p1', quantity: 1 }], { allowDuplicateIds: ['p1'] });
    expect(existing).toHaveLength(2);
  });
});

describe('fetchAllowDuplicateIds', () => {
  const ok = (result) => Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) });

  it('returns only the products with allow_duplicates set', async () => {
    const f = jest.fn(() => ok([{ id: 'p1', allow_duplicates: true }, { id: 'p2', allow_duplicates: false }, { id: 'p3' }]));
    expect(await fetchAllowDuplicateIds(['p1', 'p2', 'p3', 'p1'], 's1', f)).toEqual(['p1']);
    expect(f).toHaveBeenCalledTimes(1);
    const url = f.mock.calls[0][0];
    expect(url).toContain('search[ids]=p1,p2,p3&');
    expect(url).toContain('search[store_id]=s1');
    expect(url).toContain('select=id,allow_duplicates');
  });

  it('does not call the API without ids', async () => {
    const f = jest.fn();
    expect(await fetchAllowDuplicateIds([undefined, ''], 's1', f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('splits more than 100 ids and keeps results from chunks that succeed', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => 'p' + i);
    const f = jest.fn()
      .mockImplementationOnce(() => ok([{ id: 'p0', allow_duplicates: true }]))
      .mockImplementationOnce(() => Promise.reject(new Error('network')));
    expect(await fetchAllowDuplicateIds(ids, 's1', f)).toEqual(['p0']);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('treats an error response or a bad payload as no duplicates', async () => {
    expect(await fetchAllowDuplicateIds(['p1'], 's1', () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))).toEqual([]);
    expect(await fetchAllowDuplicateIds(['p1'], 's1', () => ok(null))).toEqual([]);
  });
});

describe('allowDuplicateIds with prepend (quotation form type 3)', () => {
  it('puts the separate line on top and leaves the existing one alone', () => {
    const existing = [{ product_id: 'dup', quantity: 2 }, { product_id: 'plain', quantity: 1 }];
    const out = mergeImportedQuotationProducts(existing, [{ product_id: 'dup', quantity: 3 }, { product_id: 'plain', quantity: 1 }], { allowDuplicateIds: ['dup'], prepend: true });
    expect(out.map(p => [p.product_id, p.quantity])).toEqual([['dup', 3], ['dup', 2], ['plain', 2]]);
  });
});

describe('productIdsToCheckForDuplicates', () => {
  it('returns picked products already on the form or picked twice, once each', () => {
    const ids = productIdsToCheckForDuplicates(
      [{ product_id: 'a' }, { product_id: 'gone', deleted: true }, { product_id: 'b' }],
      [{ product_id: 'a' }, { product_id: 'gone' }, { product_id: 'c' }, { product_id: 'c' }, { product_id: 'a' }, { name: 'no id' }, null],
    );
    expect(ids.sort()).toEqual(['a', 'c']);
  });

  it('returns nothing for new products only, or empty inputs', () => {
    expect(productIdsToCheckForDuplicates([{ product_id: 'a' }], [{ product_id: 'b' }])).toEqual([]);
    expect(productIdsToCheckForDuplicates(null, undefined)).toEqual([]);
  });
});
