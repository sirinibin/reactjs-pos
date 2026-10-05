import { describe, expect, it } from 'vitest';
import { makeLine } from '@/framework/doc/calc';
import {
  applyExclusions, buildNonVatReturnLines, buildSalesReturnLines, isReturnLocked, isSystemPayment, matchOrderLine, nonVatBalance, nonVatDisplayDoc,
  nonVatReturnProductsToApi, nonVatTotals, normalizeNonVatEdit, paymentsToApi, refundCap, returnProductsToApi, returnSummaryFromOrder,
  salesReturnTotals, validateReturnLines, zatcaState,
} from './logic';

const ORDER = {
  id: 'o1', code: 'S-INV-000043', vat_percent: 15, net_total: 271.4, total_payment_received: 271.4, return_amount: 48.3, payment_status: 'paid',
  discount: 10, discount_with_vat: 11.5, return_discount: 4, return_discount_vat: 4.6, cash_discount: 5, return_cash_discount: 2, shipping_handling_fees: 3, auto_rounding_amount: true,
  products: [
    { product_id: 'p1', name: 'Spark Plug Iridium', part_number: 'SP-1', quantity: 4, quantity_returned: 1, unit_price: 42, unit_price_with_vat: 48.3, unit: 'pc' },
    { product_id: 'p2', name: 'Wiper Blade', quantity: 2, quantity_returned: 0, unit_price: 34, unit_price_with_vat: 39.1 },
    { product_id: 'p3', name: 'Coolant 4L', quantity: 1, quantity_returned: 1, unit_price: 58, unit_price_with_vat: 66.7 },
  ],
};

describe('sales return lines', () => {
  it('new return: every order line, unselected, qty defaulting to what can still be returned', () => {
    const l = buildSalesReturnLines(ORDER);
    expect(l.map((x) => [x.selected, x.sold, x.already, x.max, x.quantity])).toEqual([[false, 4, 1, 3, 3], [false, 2, 0, 2, 2], [false, 1, 1, 0, 0]]);
    expect(l[0]).not.toHaveProperty('quantity_returned');
  });

  it('edit: own previously-selected quantity is added back to the max', () => {
    const existing = { vat_percent: 15, products: [{ ...ORDER.products[0], quantity: 1, selected: true }, { ...ORDER.products[1], selected: false }, { ...ORDER.products[2], selected: false }] };
    const l = buildSalesReturnLines(ORDER, existing);
    expect(l[0]).toMatchObject({ selected: true, quantity: 1, already: 0, max: 4 });
    expect(l[1]).toMatchObject({ selected: false, max: 2 });
  });

  it('matches the LAST order line with the same product, like the server', () => {
    const products = [{ product_id: 'a', quantity: 1 }, { product_id: 'a', quantity: 5 }];
    expect(matchOrderLine(products, 'a')).toBe(products[1]);
    expect(matchOrderLine(products, 'zz')).toBeUndefined();
  });

  it('serialises all lines with `selected`, keeping order and length', () => {
    const l = buildSalesReturnLines(ORDER);
    l[1] = { ...l[1], selected: true, quantity: 1 };
    const p = returnProductsToApi(l);
    expect(p).toHaveLength(3);
    expect(p.map((x) => x.selected)).toEqual([false, true, false]);
    expect(p[1]).toMatchObject({ product_id: 'p2', quantity: 1, unit_price: 34, unit_price_with_vat: 39.1 });
  });

  it('totals count only selected lines', () => {
    const l = buildSalesReturnLines(ORDER).map((x, i) => ({ ...x, selected: i === 0, quantity: 1 }));
    const t = salesReturnTotals(l, { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 });
    expect(t).toMatchObject({ total: 42, vat_price: 6.3, net_total: 48.3 });
  });

  it('validates: nothing selected, zero qty, qty above max — keyed by full-array index', () => {
    const l = buildSalesReturnLines(ORDER);
    expect(validateReturnLines(l)).toEqual({ product_id: 'Select at least one item to return.' });
    const e = validateReturnLines([l[0], { ...l[1], selected: true, quantity: 3 }, l[2]]);
    expect(e).toEqual({ quantity_1: 'Only 2 can be returned.' });
    expect(validateReturnLines([{ ...l[0], selected: true, quantity: 0 }])).toEqual({ quantity_0: 'Quantity can’t be zero.' });
  });

  it('header defaults subtract what earlier returns already took (incl. return_discount_vat)', () => {
    expect(returnSummaryFromOrder(ORDER)).toEqual({ vat_percent: 15, shipping_handling_fees: 3, discount: 6, discount_with_vat: 6.9, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 3 });
  });
});

describe('refund cap', () => {
  it('create: min(net − cash discount, invoice net, received − already returned)', () => {
    expect(refundCap(ORDER, 300, 0, false)).toBe(223.1);
    expect(refundCap(ORDER, 50, 5, false)).toBe(45);
  });
  it('edit ignores the received-minus-returned rule', () => {
    expect(refundCap(ORDER, 300, 0, true)).toBe(271.4);
  });
  it('unpaid invoices refund nothing', () => {
    expect(refundCap({ ...ORDER, payment_status: 'not_paid' }, 50, 0, false)).toBe(0);
  });
});

describe('payments_input', () => {
  it('drops deleted and empty new rows, keeps ids, strips UI keys', () => {
    const out = paymentsToApi([
      { key: 'a', amount: 10, method: 'cash', date_str: 'd' },
      { key: 'b', amount: 0, method: 'cash', date_str: 'd' },
      { key: 'c', id: 'p1', amount: 5, method: 'cash', date_str: 'd', deleted: true },
      { key: 'd', id: 'p2', amount: 0, method: 'bank_transfer', date_str: 'd' },
    ]);
    expect(out).toEqual([{ amount: 10, method: 'cash', date_str: 'd' }, { id: 'p2', amount: 0, method: 'bank_transfer', date_str: 'd' }]);
  });
  it('flags system-generated payments', () => {
    expect(isSystemPayment({ reference_type: 'customer_deposit' })).toBe(true);
    expect(isSystemPayment({ method: 'sales_return' })).toBe(true);
    expect(isSystemPayment({ method: 'cash' })).toBe(false);
  });
});

describe('ZATCA', () => {
  it('a fresh doc (compliance_passed=false, no failures) is "not reported", not "compliance failed"', () => {
    expect(zatcaState({ compliance_passed: false, reporting_passed: false })).toBe('not_reported');
    expect(zatcaState({ compliance_passed: false, compliance_check_failed_count: 1 })).toBe('compliance_failed');
    expect(zatcaState({ reporting_failed_count: 2 })).toBe('reporting_failed');
    expect(zatcaState({ reporting_passed: true })).toBe('reported');
    expect(zatcaState(undefined)).toBe('not_reported');
  });
  it('returns lock only when reported in phase 2 (no settings override)', () => {
    expect(isReturnLocked({ zatca: { reporting_passed: true } }, { zatca: { phase: '2' }, settings: { disable_sales_edit_once_reported_to_zatca: false } })).toBe(true);
    expect(isReturnLocked({ zatca: { reporting_passed: true } }, { zatca: { phase: '1' } })).toBe(false);
    expect(isReturnLocked({ zatca: { reporting_passed: false } }, { zatca: { phase: '2' } })).toBe(false);
  });
});

describe('non-VAT totals (models/non_vat_sales.go)', () => {
  const product = makeLine({ product_id: 'p1', name: 'Spark Plug', unit_price: 42, unit_price_with_vat: 48.3, quantity: 2 }, 15);
  const service = makeLine({ product_id: 's1', name: 'Labour', unit_price: 100, unit_price_with_vat: 115, quantity: 1, is_service: true }, 15);

  it('matches the live server for the seeded example (cash discount inside net_total)', () => {
    const t = nonVatTotals({ lines: [product], vat_percent: 15, exclude_service_tax: true, exclude_product_tax: false, cash_discount: 5, auto_rounding_amount: true });
    expect(t).toMatchObject({ total: 84, total_with_vat: 96.6, vat_price: 12.6, net_total: 91.6 });
  });

  it('excluded kinds carry no tax; shipping only on sales, not returns', () => {
    const t = nonVatTotals({ lines: [product, service], vat_percent: 15, exclude_service_tax: true, exclude_product_tax: false, shipping_handling_fees: 10, discount: 1 });
    expect(t.total_with_vat).toBe(196.6);
    expect(t.net_total).toBe(205.6);
    expect(nonVatTotals({ lines: [product, service], vat_percent: 15, exclude_service_tax: true, exclude_product_tax: false, shipping_handling_fees: 10, discount: 1, isReturn: true }).net_total).toBe(195.6);
  });

  it('balance subtracts the cash discount a second time (server quirk)', () => {
    expect(nonVatBalance(91.6, 5, 86.6)).toEqual({ balance: 0, status: 'paid' });
    expect(nonVatBalance(91.6, 5, 0)).toEqual({ balance: 86.6, status: 'not_paid' });
    expect(nonVatBalance(91.6, 5, 50).status).toBe('paid_partially');
  });

  it('applyExclusions toggles with-tax prices by line kind', () => {
    const [p, s] = applyExclusions([product, service], { exclude_service_tax: true, exclude_product_tax: false }, 15);
    expect(s.unit_price_with_vat).toBe(100);
    expect(p.unit_price_with_vat).toBe(48.3);
    const [p2] = applyExclusions([p], { exclude_service_tax: true, exclude_product_tax: true }, 15);
    expect(p2.unit_price_with_vat).toBe(42);
    const [p3] = applyExclusions([p2], { exclude_service_tax: true, exclude_product_tax: false }, 15);
    expect(p3.unit_price_with_vat).toBe(48.3);
  });

  it('editing the incl.-tax price of an excluded line sets the plain price', () => {
    const f = { exclude_service_tax: true, exclude_product_tax: false };
    const [s0] = applyExclusions([service], f, 15);
    const edited = { ...s0, unit_price_with_vat: 120, unit_price: 104.34782609 };
    const [out] = normalizeNonVatEdit([s0], [edited], f, 15);
    expect(out).toMatchObject({ unit_price: 120, unit_price_with_vat: 120 });
  });

  it('non-VAT return lines: max = sold − returned by other returns; body keeps only returned lines', () => {
    const sale = { vat_percent: 15, products: [{ product_id: 'p1', name: 'Spark Plug', quantity: 4, unit_price: 42, unit_price_with_vat: 48.3 }, { product_id: 's1', name: 'Labour', quantity: 1, unit_price: 100, unit_price_with_vat: 100, is_service: true }] };
    const others = [{ id: 'r1', products: [{ product_id: 'p1', quantity: 3 }] }, { id: 'me', products: [{ product_id: 's1', quantity: 1 }] }];
    const fresh = buildNonVatReturnLines(sale, others);
    expect(fresh.map((l) => [l.max, l.selected])).toEqual([[1, false], [0, false]]);
    const edit = buildNonVatReturnLines(sale, others, { id: 'me', vat_percent: 15, products: [{ product_id: 's1', name: 'Labour', quantity: 1, unit_price: 100, unit_price_with_vat: 100 }] });
    expect(edit.map((l) => [l.max, l.selected, l.quantity])).toEqual([[1, false, 1], [1, true, 1]]);
    const body = nonVatReturnProductsToApi(edit);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ product_id: 's1', quantity: 1, is_service: true });
  });

  it('display doc shows charged prices and the incl.-tax subtotal', () => {
    const d = nonVatDisplayDoc({ total: 84, total_with_vat: 96.6, products: [{ unit_price: 42, unit_price_with_vat: 48.3, unit_discount: 0, unit_discount_with_vat: 0 }] });
    expect(d.total).toBe(96.6);
    expect(d.products[0].unit_price).toBe(48.3);
  });
});
