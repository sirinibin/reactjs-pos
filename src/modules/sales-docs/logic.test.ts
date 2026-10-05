import { describe, expect, it } from 'vitest';
import { makeLine } from '@/framework/doc/calc';
import type { DocState } from '@/framework/doc/DocumentEditor';
import {
  autoRefund, buildReturnBody, defaultNotifyAt, deliveryNoteToApi, isExpired, isInvoiced, linkedOrders, maxReturnQty, quotationDefaults, quotationToApi,
  refundCap, reminderDue, returnRows, rfqPrefillToDocState, takeRfqPrefill, RFQ_PREFILL_KEY, returnSummaryFrom, returnTotals, switchQuotationType, validateQuotationTerms, validateReturn, validUntil, ZERO_ID, type ReturnDraft,
} from './logic';

const summary = { vat_percent: 15, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 };
const draft = (over: Partial<DocState> = {}): DocState => ({
  date: '2026-10-05T10:00', party: null, phone: '', vat_no: '', address: '', remarks: '',
  lines: [makeLine({ product_id: 'p1', name: 'Brake Pad Set', unit_price: 100, quantity: 2 }, 15)],
  summary: { ...summary }, payments: [], enable_report_to_zatca: false, extra: { type: 'quotation' }, ...over,
});

describe('quotation rules', () => {
  it('treats a zero ObjectID as not invoiced', () => {
    expect(isInvoiced({ order_id: ZERO_ID })).toBe(false);
    expect(isInvoiced({ order_id: null })).toBe(false);
    expect(isInvoiced({ order_id: 'abc' })).toBe(true);
  });

  it('pairs order ids with codes and falls back to the single link', () => {
    expect(linkedOrders({ order_ids: ['a', 'b'], order_codes: ['S-1', 'S-2'], order_id: 'b', order_code: 'S-2' })).toEqual([{ id: 'a', code: 'S-1' }, { id: 'b', code: 'S-2' }]);
    expect(linkedOrders({ order_id: 'x', order_code: 'S-9' })).toEqual([{ id: 'x', code: 'S-9' }]);
    expect(linkedOrders({ order_id: null, order_code: null })).toEqual([]);
  });

  it('uses legacy defaults (2 / 7 days) unless the store overrides them', () => {
    expect(quotationDefaults(undefined)).toEqual({ type: 'quotation', status: 'delivered', validity_days: 2, delivery_days: 7, delivery_from: 'Payment' });
    expect(quotationDefaults({ default_quotation_validity_days: 10, default_quotation_delivery_days: 0 }, 'invoice')).toMatchObject({ type: 'invoice', validity_days: 10, delivery_days: 7 });
  });

  it('requires whole-number validity and delivery days ≥ 1', () => {
    expect(validateQuotationTerms({ validity_days: '2', delivery_days: 7 })).toEqual({});
    expect(validateQuotationTerms({ validity_days: '', delivery_days: 0 })).toEqual({ validity_days: 'Validity days are required', delivery_days: 'Delivery days should be a whole number greater than 0' });
    expect(validateQuotationTerms({ validity_days: 1.5, delivery_days: 3 })).toHaveProperty('validity_days');
  });

  it('computes valid-until and expiry (never for invoices or invoiced quotations)', () => {
    expect(validUntil('2026-10-01T10:00:00Z', 7)?.toISOString()).toBe('2026-10-08T10:00:00.000Z');
    const now = new Date('2026-10-20T00:00:00Z');
    expect(isExpired({ date: '2026-10-01T10:00:00Z', validity_days: 7 }, now)).toBe(true);
    expect(isExpired({ date: '2026-10-01T10:00:00Z', validity_days: 30 }, now)).toBe(false);
    expect(isExpired({ date: '2026-10-01T10:00:00Z', validity_days: 7, type: 'invoice' }, now)).toBe(false);
    expect(isExpired({ date: '2026-10-01T10:00:00Z', validity_days: 7, order_id: 'x' }, now)).toBe(false);
  });

  it('switching to invoice adds a payment row; without no-tax setting VAT is unchanged', () => {
    const s = switchQuotationType(draft(), 'invoice', { noTax: false, storeVat: 15 });
    expect(s.extra.type).toBe('invoice');
    expect(s.payments).toHaveLength(1);
    expect(s.summary.vat_percent).toBe(15);
    expect(s.lines[0].unit_price_with_vat).toBe(115);
  });

  it('with no_tax_for_quotation_invoice, invoices drop VAT and switching back restores it', () => {
    const inv = switchQuotationType(draft({ summary: { ...summary, discount: 10, discount_with_vat: 11.5 } }), 'invoice', { noTax: true, storeVat: 15 });
    expect(inv.summary.vat_percent).toBe(0);
    expect(inv.lines[0].unit_price_with_vat).toBe(100);
    expect(inv.summary.discount_with_vat).toBe(10);
    const back = switchQuotationType({ ...inv, lines: inv.lines.map((l) => ({ ...l, warehouse_id: 'w1', warehouse_code: 'W1' })) }, 'quotation', { noTax: true, storeVat: 15 });
    expect(back.summary.vat_percent).toBe(15);
    expect(back.lines[0].unit_price_with_vat).toBe(115);
    expect(back.payments).toEqual([]);
    expect(back.lines[0].warehouse_id).toBeNull();
  });

  it('quotation body: numeric terms, no payments for plain quotations, delivered_by defaults to the user', () => {
    const body = quotationToApi({ type: 'quotation', validity_days: '3', delivery_days: '5', payments_input: [{ amount: 5 }], cash_discount: 4, _source: {} }, 'u1');
    expect(body).toMatchObject({ type: 'quotation', validity_days: 3, delivery_days: 5, payments_input: [], payment_status: '', cash_discount: 0, delivered_by: 'u1', status: 'created' });
    expect(body).not.toHaveProperty('_source');
    const inv = quotationToApi({ type: 'invoice', validity_days: 2, delivery_days: 7, payments_input: [{ amount: 5 }], status: 'delivered', delivered_by: 'u9' }, 'u1');
    expect(inv.payments_input).toEqual([{ amount: 5 }]);
    expect(inv.delivered_by).toBe('u9');
  });

  it('at 0% VAT the with-VAT line prices equal the ex-VAT ones', () => {
    const b = quotationToApi({ type: 'invoice', vat_percent: 0, validity_days: 2, delivery_days: 7, products: [{ unit_price: 100, unit_price_with_vat: 115, unit_discount: 5, unit_discount_with_vat: 5.75, unit_discount_percent: 5 }] });
    expect(b.products[0]).toMatchObject({ unit_price_with_vat: 100, unit_discount_with_vat: 5, unit_discount_percent_with_vat: 5 });
  });
});

describe('delivery note rules', () => {
  it('defaults the reminder to 7 days ahead (datetime-local)', () => {
    const v = defaultNotifyAt(new Date(2026, 9, 5, 9, 30));
    expect(v).toBe('2026-10-12T09:30');
  });

  it('sends client-computed totals because the server does not compute them', () => {
    const s = draft({ extra: { notify_at: '2026-10-12T09:30' } });
    const body = deliveryNoteToApi({ store_id: 's', products: [], _x: 1 }, s);
    expect(body).toMatchObject({ total: 200, vat_price: 30, net_total: 230, total_quantity: 2, status: 'delivered' });
    expect(body.notify_at).toBe(new Date('2026-10-12T09:30').toISOString());
    expect(body).not.toHaveProperty('_x');
    expect(deliveryNoteToApi({}, draft({ extra: { notify_at: '' } })).notify_at).toBeNull();
  });

  it('flags a reminder as due only when not invoiced and the time has passed', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(reminderDue({ notify_at: '2026-10-09T00:00:00Z' }, now)).toBe(true);
    expect(reminderDue({ notify_at: '2026-10-11T00:00:00Z' }, now)).toBe(false);
    expect(reminderDue({ notify_at: '2026-10-09T00:00:00Z', order_id: 'o' }, now)).toBe(false);
  });
});

const QUOTE = {
  id: 'q1', code: 'QTN-000006', type: 'invoice', customer_id: 'c1', customer_name: 'AL NOOR', vat_percent: 15, net_total: 460, payment_status: 'paid_partially',
  total_payment_received: 150, return_amount: 50, discount: 10, return_discount: 4, discount_with_vat: 11.5, return_discount_vat: 4.6, cash_discount: 5, return_cash_discount: 0,
  products: [
    { product_id: 'p1', name: 'Brake Pad Set', quantity: 3, quantity_returned: 1, unit_price: 100, unit_price_with_vat: 115 },
    { product_id: 'p2', name: 'Engine Oil 4L', quantity: 1, quantity_returned: 1, unit_price: 50, unit_price_with_vat: 57.5 },
  ],
};

describe('quotation sales return rules', () => {
  it('max returnable = sold − already returned (+ this return’s old qty on edit)', () => {
    expect(maxReturnQty(QUOTE, 'p1')).toBe(2);
    expect(maxReturnQty(QUOTE, 'p1', 1)).toBe(3);
    expect(maxReturnQty(QUOTE, 'p2')).toBe(0);
    expect(maxReturnQty(QUOTE, 'nope')).toBe(0);
  });

  it('new return lists every quotation line unselected, qty capped to what is left', () => {
    const rows = returnRows(QUOTE);
    expect(rows.map((r) => [r.product_id, r.selected, r.quantity, r.max])).toEqual([['p1', false, 2, 2], ['p2', false, 1, 0]]);
    expect(rows[0]).not.toHaveProperty('quantity_returned');
  });

  it('editing keeps the stored line order and adds back the old quantity', () => {
    const rows = returnRows(QUOTE, { vat_percent: 15, products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100, selected: true }, { product_id: 'p2', name: 'Engine Oil 4L', quantity: 1, unit_price: 50, selected: false }] });
    expect(rows.map((r) => [r.selected, r.max])).toEqual([[true, 3], [false, 0]]);
  });

  it('copies the remaining header discounts from the quotation', () => {
    expect(returnSummaryFrom(QUOTE)).toMatchObject({ discount: 6, discount_with_vat: 6.9, cash_discount: 5, vat_percent: 15 });
  });

  it('refund cap = paid − earlier refunds (old refund added back on edit)', () => {
    expect(refundCap(QUOTE)).toBe(100);
    expect(refundCap(QUOTE, { total_payment_paid: 50 })).toBe(150);
    expect(refundCap({ total_payment_received: 0, return_amount: 0 })).toBe(0);
  });

  const mk = (rows = returnRows(QUOTE), extra: Partial<ReturnDraft> = {}): ReturnDraft => ({ date: '2026-10-05T10:00', remarks: '', phone: '', vat_no: '', address: '', rows, summary: { ...summary }, payments: [], ...extra });

  it('only selected lines count towards totals', () => {
    const rows = returnRows(QUOTE);
    expect(returnTotals(rows, summary).net_total).toBe(0);
    rows[0] = { ...rows[0], selected: true, quantity: 1 };
    expect(returnTotals(rows, summary).net_total).toBe(115);
  });

  it('validates selection, quantities and refund caps', () => {
    const none = mk();
    expect(validateReturn(none, returnTotals(none.rows, summary), { quotation: QUOTE, refundCap: 100, payable: true })).toHaveProperty('product_id');
    const rows = returnRows(QUOTE);
    rows[0] = { ...rows[0], selected: true, quantity: 3 };
    const over = mk(rows);
    expect(validateReturn(over, returnTotals(rows, summary), { quotation: QUOTE, refundCap: 100, payable: true })).toEqual({ quantity_0: 'More than what is left to return.' });
    rows[0] = { ...rows[0], quantity: 1 };
    const pay = mk(rows, { payments: [{ key: 'k', date_str: '', amount: 115, method: 'cash' }] });
    expect(validateReturn(pay, returnTotals(rows, summary), { quotation: QUOTE, refundCap: 100, payable: true })).toEqual({ total_payment: 'Refunds can’t exceed what the customer paid on the invoice.' });
    expect(validateReturn(pay, returnTotals(rows, summary), { quotation: QUOTE, refundCap: 200, payable: true })).toEqual({});
  });

  it('body carries ALL lines with selected flags and refund totals; unpaid invoices send no refunds', () => {
    const rows = returnRows(QUOTE);
    rows[0] = { ...rows[0], selected: true, quantity: 1 };
    const d = mk(rows, { payments: [{ key: 'k', date_str: '2026-10-05T10:00:00+03:00', amount: 60, method: 'cash' }, { key: 'z', date_str: '', amount: 0, method: 'cash' }] });
    const totals = returnTotals(rows, summary);
    const body = buildReturnBody(d, totals, { storeId: 's1', quotation: QUOTE, payable: true });
    expect(body.products.map((p: any) => [p.product_id, p.selected, p.quantity])).toEqual([['p1', true, 1], ['p2', false, 1]]);
    expect(body).toMatchObject({ store_id: 's1', quotation_id: 'q1', quotation_code: 'QTN-000006', customer_id: 'c1', status: 'received', total_payment_paid: 60 });
    expect(body.payments_input).toEqual([{ date_str: '2026-10-05T10:00:00+03:00', amount: 60, method: 'cash' }]);
    expect(body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(buildReturnBody(d, totals, { storeId: 's1', quotation: QUOTE, payable: false }).payments_input).toEqual([]);
  });

  it('refund auto-fill never exceeds what can be refunded', () => {
    const t = returnTotals([{ ...returnRows(QUOTE)[0], selected: true, quantity: 2 }], summary);
    expect(autoRefund(t, 0, 100)).toBe(100);
    expect(autoRefund(t, 10, 1000)).toBe(220);
  });
});

describe('RFQ → quotation prefill', () => {
  it('maps customer, RFQ link, remarks and lines (cost kept, quantity defaulted)', () => {
    const d = rfqPrefillToDocState({
      rfq_code: 'RFQ-1', rfq_received_id: 'r1', rfq_received_code: 'RFQ-1', customer_id: 'c1', customer_name: 'ACME', customer_phone: '055',
      items: [{ product_id: 'p1', product_name: 'Filter', part_no: 'F-1', quantity: 2, cost_price: 10, unit_price: 12.5 }, { product_name: 'Free text', quantity: 0 }, {} as any],
    }, 15);
    expect(d.party).toMatchObject({ id: 'c1', label: 'ACME' });
    expect(d.phone).toBe('055');
    expect(d.remarks).toBe('RFQ: RFQ-1');
    expect(d.extra).toEqual({ rfq_received_id: 'r1', rfq_received_code: 'RFQ-1' });
    expect(d.lines).toHaveLength(2);
    expect(d.lines![0]).toMatchObject({ product_id: 'p1', name: 'Filter', part_number: 'F-1', quantity: 2, unit_price: 12.5, unit_price_with_vat: 14.375, purchase_unit_price: 10, purchase_unit_price_with_vat: 11.5 });
    expect(d.lines![1]).toMatchObject({ product_id: null, name: 'Free text', quantity: 1, unit_price: 0 });
  });

  it('walk-in customer becomes a free-text party; no items leaves lines untouched', () => {
    const d = rfqPrefillToDocState({ customer_name: 'Walk-in Ali' }, 15);
    expect(d.party).toMatchObject({ id: 'new:Walk-in Ali', label: 'Walk-in Ali' });
    expect(d.lines).toBeUndefined();
    expect(d.extra).toEqual({});
    expect(rfqPrefillToDocState({}, 15).party).toBeUndefined();
  });

  it('takeRfqPrefill is one-shot and tolerates bad JSON', () => {
    sessionStorage.setItem(RFQ_PREFILL_KEY, JSON.stringify({ rfq_code: 'X' }));
    expect(takeRfqPrefill()).toEqual({ rfq_code: 'X' });
    expect(takeRfqPrefill()).toBeNull();
    sessionStorage.setItem(RFQ_PREFILL_KEY, '{bad');
    expect(takeRfqPrefill()).toBeNull();
    expect(sessionStorage.getItem(RFQ_PREFILL_KEY)).toBeNull();
  });
});
