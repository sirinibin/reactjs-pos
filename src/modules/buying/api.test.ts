import { describe, expect, it } from 'vitest';
import { makeLine, type DocLine } from '@/framework/doc/calc';
import type { DocState } from '@/framework/doc/DocumentEditor';
import {
  attachSellPrices, balanceForCreditCheck, isSaudiMobile, buildReturnProducts, marginPct, mergeLines, normalizeDocLines, poFromPr, poProductsToApi, poReceivedBody, prListQuery,
  prToApi, prTotals, purchaseFromExtraction, purchaseFromPo, purchaseToApi, refundPaymentsInput, renamePriceKeys, returnDocForEditor, returnLinesFromPurchase, returnPrefill,
  toArabicDigits, validateReturnLines, validateSellPrices, validateVendor, vendorFromForm, vendorToForm,
} from './api';

const summary = { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 };
const state = (lines: DocLine[], extra: Record<string, any> = {}, payments: any[] = []) =>
  ({ date: '', party: null, phone: '', vat_no: '', address: '', remarks: '', lines, summary, payments, enable_report_to_zatca: false, extra }) as DocState;

const PURCHASE = {
  id: 'p1', code: 'P-INV-000007', vendor_id: 'v1', vendor_name: 'AL JAZIRA', vat_percent: 15, discount: 10, discount_with_vat: 11.5, return_discount: 4, return_discount_with_vat: 4.6,
  cash_discount: 5, return_cash_discount: 2, order_placed_by: 'u9', payment_status: 'paid', auto_rounding_amount: true, shipping_handling_fees: 0,
  products: [
    { product_id: 'a', name: 'Brake Pad Set', quantity: 10, quantity_returned: 4, unit: 'Set', purchase_unit_price: 100, purchase_unit_price_with_vat: 115, unit_discount: 0 },
    { product_id: 'b', name: 'Oil Filter', quantity: 2, quantity_returned: 2, purchase_unit_price: 20, purchase_unit_price_with_vat: 23, unit_discount: 0 },
    { product_id: 'c', name: 'Air Filter', quantity: 3, quantity_returned: 0, purchase_unit_price: 10, unit_discount: 1 },
  ],
};

describe('price key mapping', () => {
  it('normalises purchase prices into the engine keys and derives missing with-VAT values', () => {
    const d = normalizeDocLines(PURCHASE, 'purchase');
    expect(d.products[0]).toMatchObject({ unit_price: 100, unit_price_with_vat: 115 });
    expect(d.products[2]).toMatchObject({ unit_price: 10, unit_price_with_vat: 11.5, unit_discount_with_vat: 1.15 });
    expect(normalizeDocLines({ products: [{ purchasereturn_unit_price: 8, purchasereturn_unit_price_with_vat: 9.2 }] }, 'purchasereturn').products[0]).toMatchObject({ unit_price: 8, unit_price_with_vat: 9.2 });
  });

  it('renames engine keys to purchase / purchasereturn keys', () => {
    const [p] = renamePriceKeys([{ unit_price: 50, unit_price_with_vat: 57.5, purchase_unit_price: 40, name: 'x' }], 'purchase');
    expect(p).toEqual({ name: 'x', purchase_unit_price: 50, purchase_unit_price_with_vat: 57.5 });
    const [r] = renamePriceKeys([{ unit_price: 50, unit_price_with_vat: 57.5, purchase_unit_price: 40 }], 'purchasereturn');
    expect(r).toEqual({ purchasereturn_unit_price: 50, purchasereturn_unit_price_with_vat: 57.5 });
  });
});

describe('purchase body', () => {
  const lines = [makeLine({ product_id: 'a', name: 'Brake Pad Set', unit_price: 100, quantity: 2 }, 15)];

  it('renames prices, attaches typed selling prices, drops UI keys and sends the credit-check balance', () => {
    const body = purchaseToApi({ products: [{ product_id: 'a', unit_price: 100, unit_price_with_vat: 115, purchase_unit_price: 80 }], sell: { [lines[0].key]: { retail: 150, curRetail: 140 } }, commission: '', order_placed_by: undefined },
      state(lines, {}, [{ key: 'k', amount: 30, method: 'cash', date_str: '', deleted: false }]));
    expect(body.products[0]).toMatchObject({ purchase_unit_price: 100, purchase_unit_price_with_vat: 115, retail_unit_price: 150, retail_unit_price_with_vat: 172.5 });
    expect(body.products[0]).not.toHaveProperty('unit_price');
    expect(body.products[0]).not.toHaveProperty('wholesale_unit_price');
    expect(body).not.toHaveProperty('sell');
    expect(body).not.toHaveProperty('order_placed_by');
    expect(body).toMatchObject({ status: 'delivered', commission: 0, commission_payment_method: '', balance_amount: 200 });
  });

  it('balance for credit check ignores deleted payments and subtracts cash discount', () => {
    const s = state(lines, {}, [{ key: '1', amount: 50, method: 'cash', date_str: '' }, { key: '2', amount: 100, method: 'cash', date_str: '', deleted: true }]);
    s.summary = { ...summary, cash_discount: 10 };
    expect(balanceForCreditCheck(s)).toBe(170);
  });

  it('only attaches selling prices greater than zero', () => {
    const out = attachSellPrices([{ a: 1 }], lines, { [lines[0].key]: { retail: 0, wholesale: 90 } }, 15);
    expect(out[0]).toEqual({ a: 1, wholesale_unit_price: 90, wholesale_unit_price_with_vat: 103.5 });
  });

  it('flags selling prices below the (net) purchase price, using current prices when untouched', () => {
    const l = makeLine({ product_id: 'a', name: 'X', unit_price: 100, unit_discount: 5, quantity: 1 }, 15);
    expect(validateSellPrices([l], { [l.key]: { curRetail: 90, curWholesale: 96 } })).toEqual({ retail_unit_price_0: expect.any(String) });
    expect(validateSellPrices([l], { [l.key]: { retail: 120, curRetail: 90, wholesale: 95 } })).toEqual({});
    expect(validateSellPrices([l], undefined)).toEqual({});
  });

  it('margin is relative to cost', () => {
    expect(marginPct(100, 125)).toBe(25);
    expect(marginPct(0, 10)).toBeNull();
  });
});

describe('PO → purchase', () => {
  const PO = { id: 'po1', code: 'PO-1', vendor_id: 'v1', vendor_name: 'GULF', vendor_invoice_no: 'X9', vat_percent: 15, discount: 5, products: [{ product_id: 'a', name: 'Brake Pad Set', quantity: 3, purchase_unit_price: 100, purchase_unit_price_with_vat: 115 }] };

  it('prefills vendor, lines, summary and keeps the PO link', () => {
    const p = purchaseFromPo(PO, 15);
    expect(p.party).toMatchObject({ id: 'v1', label: 'GULF' });
    expect(p.lines![0]).toMatchObject({ product_id: 'a', quantity: 3, unit_price: 100 });
    expect(p.summary).toMatchObject({ discount: 5, discount_with_vat: 5.75, vat_percent: 15 });
    expect(p.extra).toMatchObject({ vendor_invoice_no: 'X9', purchase_order_id: 'po1' });
  });

  it('merges into an existing draft, adding quantity for the same product', () => {
    const existing = [makeLine({ product_id: 'a', name: 'Brake Pad Set', unit_price: 100, quantity: 2 }, 15), makeLine({ product_id: 'z', name: 'Other', unit_price: 5, quantity: 1 }, 15)];
    const p = purchaseFromPo(PO, 15, { lines: existing, extra: { vendor_invoice_no: 'MINE' } });
    expect(p.lines!.map((l) => [l.product_id, l.quantity])).toEqual([['a', 5], ['z', 1]]);
    expect(p.extra).toMatchObject({ vendor_invoice_no: 'MINE', purchase_order_id: 'po1' });
  });

  it('mergeLines appends new products and respects allow_duplicates', () => {
    const a = makeLine({ product_id: 'a', name: 'A', unit_price: 1, quantity: 1, allow_duplicates: true }, 15);
    expect(mergeLines([a], [{ ...a, key: 'n' }])).toHaveLength(2);
  });

  it('PUT body marking a PO received is a full document with date_str and the purchase link', () => {
    const b = poReceivedBody({ id: 'po1', code: 'PO-1', date: '2026-10-01T10:00:00Z', expected_date: '2026-10-09T00:00:00Z', status: 'sent', products: [{ a: 1 }], created_at: 'x' }, 'S1', { id: 'p9', code: 'P-9' });
    expect(b).toEqual({ store_id: 'S1', date: '2026-10-01T10:00:00Z', expected_date: '2026-10-09T00:00:00Z', date_str: '2026-10-01T10:00:00Z', expected_date_str: '2026-10-09T00:00:00Z', status: 'received', products: [{ a: 1 }], purchase_id: 'p9', purchase_code: 'P-9' });
  });

  it('PO products carry purchase keys and is_service', () => {
    const l = makeLine({ product_id: 'a', name: 'A', unit_price: 10, quantity: 1, is_service: false, item_code: 'IC' }, 15);
    expect(poProductsToApi([{ unit_price: 10, unit_price_with_vat: 11.5 }], [l])[0]).toEqual({ purchase_unit_price: 10, purchase_unit_price_with_vat: 11.5, is_service: false, item_code: 'IC', prefix_part_number: '' });
  });
});

describe('purchase return', () => {
  it('starts with returnable lines only, quantity = remaining, carrying max and source index', () => {
    const lines = returnLinesFromPurchase(PURCHASE);
    expect(lines.map((l) => [l.product_id, l.quantity, l.max_qty, l.src_index])).toEqual([['a', 6, 6, 0], ['c', 3, 3, 2]]);
  });

  it('prefill nets returned discounts, keeps the purchaser and links the purchase', () => {
    const p = returnPrefill(PURCHASE, 'me', 15);
    expect(p.summary).toMatchObject({ discount: 6, discount_with_vat: 6.9, cash_discount: 3 });
    expect(p.extra).toMatchObject({ purchase_id: 'p1', purchase_code: 'P-INV-000007', purchase_returned_by: 'u9' });
    expect(p.payments).toBeUndefined();
    expect(returnPrefill({ ...PURCHASE, payment_status: 'not_paid', order_placed_by: undefined }, 'me', 15)).toMatchObject({ payments: [], extra: { purchase_returned_by: 'me' } });
  });

  it('drops landline phones the return API would reject', () => {
    expect(returnPrefill({ ...PURCHASE, phone: '0112223344' }, 'me', 15).phone).toBe('');
    expect(returnPrefill({ ...PURCHASE, phone: '0551234567' }, 'me', 15).phone).toBe('0551234567');
    expect(isSaudiMobile('+966551234567')).toBe(true);
  });

  it('sends the full purchase list with selected flags, edited values for kept lines', () => {
    const lines = returnLinesFromPurchase(PURCHASE);
    const kept = [{ ...lines[1], quantity: 2, unit_price: 9, unit_price_with_vat: 10.35 }];
    const out = buildReturnProducts(PURCHASE.products, kept, false);
    expect(out).toHaveLength(3);
    expect(out.map((p) => [p.product_id, p.selected, p.quantity])).toEqual([['a', false, 6], ['b', false, 0], ['c', true, 2]]);
    expect(out[2]).toMatchObject({ purchasereturn_unit_price: 9, purchasereturn_unit_price_with_vat: 10.35 });
    expect(out[0]).toMatchObject({ purchasereturn_unit_price: 100 });
  });

  it('editing uses the stored return list as base and only shows selected lines', () => {
    const ret = { vat_percent: 15, products: [{ product_id: 'a', quantity: 2, selected: true, purchasereturn_unit_price: 100 }, { product_id: 'c', quantity: 3, selected: false, purchasereturn_unit_price: 10 }] };
    const ed = returnDocForEditor(ret, PURCHASE);
    expect(ed.products).toHaveLength(1);
    expect(ed.products[0]).toMatchObject({ unit_price: 100, src_index: 0, max_qty: 8 });
    const out = buildReturnProducts(ret.products, [{ ...makeLine({ product_id: 'a', name: 'Brake', unit_price: 100, quantity: 3 }, 15), src_index: 0 }], true);
    expect(out.map((p) => [p.selected, p.quantity])).toEqual([[true, 3], [false, 3]]);
  });

  it('validates selection, foreign lines and max quantity', () => {
    expect(validateReturnLines([])).toEqual({ product_id: 'No products selected' });
    const l = makeLine({ product_id: 'x', name: 'Foreign', unit_price: 1, quantity: 1 }, 15);
    expect(validateReturnLines([l])).toHaveProperty('name_0');
    expect(validateReturnLines([{ ...l, src_index: 0, max_qty: 2, quantity: 3 }])).toEqual({ quantity_0: 'Only 2 can be returned.' });
  });

  it('refund payments keep existing ids and append the new row', () => {
    const out = refundPaymentsInput({ payments: [{ id: 'x', date: 'D', amount: 5, method: 'cash' }, { id: 'y', deleted: true, amount: 1 }] }, { amount: 7, method: 'bank_transfer', date_str: 'N' });
    expect(out).toEqual([{ id: 'x', date_str: 'D', amount: 5, method: 'cash', description: '' }, { amount: 7, method: 'bank_transfer', date_str: 'N', description: '' }]);
  });
});

describe('purchase request', () => {
  it('list query paginates through search[] keys and scopes the tab', () => {
    expect(prListQuery({ storeId: 'S', page: 2, limit: 20, tab: 'sent', userId: 'u', dir: -1, status: 'pending' })).toEqual({ search: { store_id: 'S', page: 2, limit: 20, sort_by: 'created_at', sort_order: 'desc', created_by: 'u', status: 'pending' } });
    expect(prListQuery({ storeId: 'S', page: 1, limit: 10, tab: 'received', userId: 'u', sortBy: 'code', dir: 1 }).search).toMatchObject({ assigned_to: 'u', sort_by: 'code', sort_order: 'asc' });
    expect(prListQuery({ storeId: 'S', page: 1, limit: 10, tab: 'all', userId: 'u' }).search).not.toHaveProperty('assigned_to');
  });

  it('body maps remarks→notes, assignee option→id/name, purchase price keys', () => {
    const l = makeLine({ product_id: 'a', name: 'Brake', unit_price: 10, quantity: 2 }, 15);
    const b = prToApi({ store_id: 'S', date_str: 'D', remarks: 'urgent', vat_percent: 15, discount: 1, shipping_handling_fees: 2, products: [{ product_id: 'a', name: 'Brake', quantity: 2, unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 0 }] },
      state([l], { assigned_to: { id: 'u2', label: 'Ali' } }));
    expect(b).toMatchObject({ assigned_to: 'u2', assigned_to_name: 'Ali', notes: 'urgent', discount: 1, shipping_handling_fees: 2 });
    expect(b.products[0]).toMatchObject({ purchase_unit_price: 10, quantity: 2, is_service: false });
  });

  it('PR totals have no rounding amount', () => {
    expect(prTotals([{ quantity: 3, purchase_unit_price: 9.99, unit_discount: 0 }], 15)).toEqual({ total: 29.97, vat_price: 4.5, net_total: 34.47 });
  });

  it('PO prefill from a PR keeps the request link and notes', () => {
    const p = poFromPr({ id: 'r1', code: 'PR-1', notes: 'n', vat_percent: 0, products: [{ product_id: 'a', name: 'Brake', quantity: 1, purchase_unit_price: 10 }] }, 15);
    expect(p.extra).toMatchObject({ purchase_request_id: 'r1', purchase_request_code: 'PR-1', status: 'draft' });
    expect(p.summary?.vat_percent).toBe(15);
    expect(p.lines![0]).toMatchObject({ unit_price: 10, unit_price_with_vat: 11.5 });
    expect(p.remarks).toBe('n');
  });
});

describe('vendors', () => {
  it('round-trips national address, categories and tags', () => {
    const f = vendorToForm({ id: 'v', name: 'X', national_address: { city_name: 'Riyadh', building_no: '1234' }, category_id: ['c1'], category_name: ['Parts'], product_categories: ['oil'] });
    expect(f).toMatchObject({ na_city_name: 'Riyadh', na_building_no: '1234', category_id: [{ id: 'c1', label: 'Parts' }], product_categories: ['oil'] });
    const b = vendorFromForm({ ...f, vat_percent: '', phone: '0551234567', opening_balance: 0 }, (d) => d.toISOString());
    expect(b.national_address).toMatchObject({ city_name: 'Riyadh', building_no: '1234', building_no_arabic: '١٢٣٤' });
    expect(b).toMatchObject({ category_id: ['c1'], product_categories: ['oil'], vat_percent: 15, phone_in_arabic: '٠٥٥١٢٣٤٥٦٧' });
    expect(b).not.toHaveProperty('id');
    expect(b).not.toHaveProperty('na_city_name');
    expect(b).not.toHaveProperty('opening_balance_date');
  });

  it('validates name, VAT, email, CRN and opening balance date', () => {
    expect(validateVendor({ name: '' })).toHaveProperty('name');
    expect(validateVendor({ name: 'A', vat_no: '123456789012345' })).toHaveProperty('vat_no');
    expect(validateVendor({ name: 'A', vat_no: '300112233400003', email: 'a@b.co', registration_number: 'AB12' })).toEqual({});
    expect(validateVendor({ name: 'A', email: 'nope' })).toHaveProperty('email');
    expect(validateVendor({ name: 'A', registration_number: '12-3' })).toHaveProperty('registration_number');
    expect(validateVendor({ name: 'A', opening_balance: 10 })).toHaveProperty('opening_balance_date');
  });

  it('converts digits to Arabic-Indic', () => {
    expect(toArabicDigits('05 12')).toBe('٠٥ ١٢');
  });
});

describe('bill extraction', () => {
  it('builds lines from extracted products with resolved ids and the invoice number', () => {
    const p = purchaseFromExtraction({ vendor_company_name: 'ACME', invoice_number: 'INV-1', products: [{ part_no: 'P1', name: 'Bolt', quantity: 4, unit_price: 2.5 }, { name: 'Nut' }] }, null, ['id1', null], 15);
    expect(p.party).toMatchObject({ id: 'new:ACME', label: 'ACME' });
    expect(p.extra).toEqual({ vendor_invoice_no: 'INV-1' });
    expect(p.lines!.map((l) => [l.product_id, l.quantity, l.unit_price, l.unit_price_with_vat])).toEqual([['id1', 4, 2.5, 2.875], [null, 1, 0, 0]]);
  });
});
