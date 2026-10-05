/**
 * Pure rules for quotations, delivery notes and quotation sales returns (sales.md §3–§5).
 * Kept free of React so they can be unit-tested and reused by the editors.
 */
// Relative imports (no "@/" alias, no UI modules) so the live-API integration tests can use these rules too.
import { applyVat, computeTotals, linesFromApi, linesToApi, makeLine, newLineKey, paymentSummary, r2, type DocLine, type PaymentRow, type Totals } from '../../framework/doc/calc';
import type { DocState } from '../../framework/doc/DocumentEditor';
import type { SummaryValues } from '../../framework/doc/Summary';
import { toRfc3339 } from '../../lib/format';

/** Same shape as Summary.blankPayment (kept local to avoid importing UI code). */
const blankPayment = (amount = 0): PaymentRow => ({ key: newLineKey(), date_str: toRfc3339(new Date()), amount, method: 'cash', deleted: false });

export const ZERO_ID = '000000000000000000000000';
export type QuotationType = 'quotation' | 'invoice';

// ───────────────────────── Quotations ─────────────────────────

export const QUOTATION_STATUSES = ['created', 'delivered', 'pending', 'accepted', 'rejected', 'cancelled'] as const;
export const STATUS_LABEL: Record<string, string> = { created: 'Created', delivered: 'Delivered', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', cancelled: 'Cancelled', received: 'Received' };

/** "Invoiced" ⇔ order_id set and not the zero ObjectID (sales.md §3.5). */
export const isInvoiced = (d: Record<string, any> | null | undefined) => !!d?.order_id && d.order_id !== ZERO_ID;

/** Sales invoices linked to a quotation/DN: order_ids/order_codes arrays, falling back to order_id/order_code. */
export function linkedOrders(d: Record<string, any>): { id?: string; code: string }[] {
  const codes: string[] = d.order_codes || [];
  const ids: string[] = d.order_ids || [];
  const out = codes.map((code, i) => ({ id: ids[i], code }));
  if (isInvoiced(d) && d.order_code && !out.some((x) => x.code === d.order_code)) out.push({ id: d.order_id, code: d.order_code });
  return out.filter((x) => x.code);
}

export interface QuotationDefaults { type: QuotationType; status: string; validity_days: number; delivery_days: number; delivery_from: string }

/** New-quotation defaults (create.js:166) — store defaults for validity/delivery days are honoured when set. */
export function quotationDefaults(settings: Record<string, any> | undefined, type: QuotationType = 'quotation'): QuotationDefaults {
  const pos = (v: unknown, d: number) => (Number.isInteger(Number(v)) && Number(v) >= 1 ? Number(v) : d);
  return {
    type,
    status: 'delivered',
    validity_days: pos(settings?.default_quotation_validity_days, 2),
    delivery_days: pos(settings?.default_quotation_delivery_days, 7),
    delivery_from: 'Payment',
  };
}

/** validity_days / delivery_days must be whole numbers ≥ 1 (models/quotation.go:1856). */
export function validateQuotationTerms(extra: Record<string, any>): Record<string, string> {
  const e: Record<string, string> = {};
  const check = (k: string, label: string) => {
    const raw = extra[k];
    const n = Number(raw);
    if (raw === '' || raw === null || raw === undefined) e[k] = `${label} are required`;
    else if (!Number.isInteger(n) || n < 1) e[k] = `${label} should be a whole number greater than 0`;
  };
  check('validity_days', 'Validity days');
  check('delivery_days', 'Delivery days');
  return e;
}

/** "Valid until" = quotation date + validity days. */
export function validUntil(date: string | undefined, validityDays: number | undefined): Date | null {
  if (!date || !validityDays) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(validityDays));
  return d;
}

export const isExpired = (q: Record<string, any>, now = new Date()) => {
  if (q.type === 'invoice' || isInvoiced(q)) return false;
  const until = validUntil(q.date, q.validity_days);
  return !!until && until.getTime() < now.getTime();
};

/**
 * Switching quotation ⇄ invoice on a draft (create.js:4031): with `no_tax_for_quotation_invoice`,
 * invoices carry no VAT — with-VAT prices equal ex-VAT; switching back restores the store VAT.
 * Payments only exist for invoice-type quotations.
 */
export function switchQuotationType(s: DocState, to: QuotationType, opts: { noTax: boolean; storeVat: number }): DocState {
  const vat = opts.noTax ? (to === 'invoice' ? 0 : opts.storeVat) : s.summary.vat_percent;
  const summary: SummaryValues = { ...s.summary, vat_percent: vat, ...(to === 'quotation' ? { cash_discount: 0 } : {}) };
  const lines = vat !== s.summary.vat_percent ? applyVat(s.lines, vat) : s.lines;
  const payments = to === 'invoice' ? (s.payments.length ? s.payments : [blankPayment(0)]) : [];
  const vatChanged = vat !== s.summary.vat_percent;
  return {
    ...s,
    summary: vatChanged ? { ...summary, discount_with_vat: r2(summary.discount * (1 + vat / 100)) } : summary,
    lines: to === 'invoice' ? lines : lines.map((l) => ({ ...l, warehouse_id: null, warehouse_code: null })),
    payments,
    extra: { ...s.extra, type: to },
  };
}

/** Final quotation body tweaks: numeric terms; quotations (not invoices) carry no payments/payment status. */
export function quotationToApi(body: Record<string, any>, userId?: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) if (!k.startsWith('_')) out[k] = v;
  out.type = out.type === 'invoice' ? 'invoice' : 'quotation';
  out.validity_days = Number(out.validity_days);
  out.delivery_days = Number(out.delivery_days);
  out.status = out.status || 'created';
  if (!out.delivered_by && userId) out.delivered_by = userId;
  // 0% VAT (no_tax_for_quotation_invoice): with-VAT prices equal ex-VAT ones (create.js:3490).
  if (Number(out.vat_percent) === 0 && Array.isArray(out.products)) {
    out.products = out.products.map((p: Record<string, any>) => ({ ...p, unit_price_with_vat: p.unit_price, unit_discount_with_vat: p.unit_discount, unit_discount_percent_with_vat: p.unit_discount_percent }));
  }
  if (out.type === 'quotation') {
    out.payments_input = [];
    out.payment_status = '';
    out.cash_discount = 0;
  }
  return out;
}

// ───────────────────────── Delivery notes ─────────────────────────

/** datetime-local value for "now + days" (default reminder: 7 days, sales.md §5.1). */
export function defaultNotifyAt(now = new Date(), days = 7): string {
  return toRfc3339(new Date(now.getTime() + days * 864e5)).slice(0, 16);
}

/**
 * The server does NOT compute delivery-note totals on create/update (controller/dellivery_note.go never calls
 * FindNetTotal) — the client must send them, exactly like the legacy form did.
 */
export function deliveryNoteToApi(body: Record<string, any>, s: Pick<DocState, 'lines' | 'summary' | 'extra'>): Record<string, any> {
  const t = computeTotals({ lines: s.lines, ...s.summary });
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) if (!k.startsWith('_')) out[k] = v;
  const notify = s.extra.notify_at ? new Date(s.extra.notify_at) : null;
  return {
    ...out,
    status: out.status || 'delivered',
    notify_at: notify && !Number.isNaN(notify.getTime()) ? notify.toISOString() : null,
    total: t.total,
    total_with_vat: t.total_with_vat,
    vat_price: t.vat_price,
    net_total: t.net_total,
    rounding_amount: t.rounding_amount,
    discount_percent: t.discount_percent,
    discount_percent_with_vat: t.discount_percent_with_vat,
    total_quantity: t.total_quantity,
  };
}

/** Reminder due: notify time reached and no invoice yet (mirrors /v1/delivery-note/reminders). */
export const reminderDue = (dn: Record<string, any>, now = new Date()) => !!dn.notify_at && !isInvoiced(dn) && new Date(dn.notify_at).getTime() <= now.getTime();

// ───────────────────────── Quotation sales returns ─────────────────────────

export interface ReturnRow extends DocLine { selected: boolean; max: number }

/**
 * Max returnable qty for row `index` (models/quotation_sales_return.go:1820): matched by product_id scanning the
 * quotation from the end; on update the row's previously returned qty is added back.
 */
export function maxReturnQty(quotation: any, productId: string | null, oldQty = 0): number {
  const ps: any[] = quotation?.products || [];
  for (let i = ps.length - 1; i >= 0; i--) {
    if (ps[i].product_id === productId) return Math.max(0, r2((Number(ps[i].quantity) || 0) - (Number(ps[i].quantity_returned) || 0) + oldQty));
  }
  return 0;
}

/**
 * Rows for the return editor. New: every quotation line, unselected, qty = remaining returnable.
 * Edit: the stored return lines in their original order (the server matches them by index).
 */
export function returnRows(quotation: any, existing?: any): ReturnRow[] {
  const vat = existing?.vat_percent ?? quotation?.vat_percent ?? 15;
  if (existing) {
    return linesFromApi(existing.products, vat).map((l, i) => {
      const old = existing.products[i]?.selected ? Number(existing.products[i].quantity) || 0 : 0;
      return { ...l, selected: !!existing.products[i]?.selected, max: maxReturnQty(quotation, l.product_id, old) };
    });
  }
  return linesFromApi(quotation?.products, vat).map((l) => {
    const max = maxReturnQty(quotation, l.product_id);
    const { quantity_returned: _q, ...rest } = l;
    return { ...rest, quantity: max > 0 ? Math.min(l.quantity, max) : l.quantity, selected: false, max } as ReturnRow;
  });
}

/** Refunds may not exceed what the customer actually paid on the quotation invoice (net of earlier refunds). */
export function refundCap(quotation: any, oldReturn?: any): number {
  return Math.max(0, r2((quotation?.total_payment_received || 0) - ((quotation?.return_amount || 0) - (oldReturn?.total_payment_paid || 0))));
}

export interface ReturnDraft {
  date: string;
  remarks: string;
  phone: string;
  vat_no: string;
  address: string;
  rows: ReturnRow[];
  summary: SummaryValues;
  payments: PaymentRow[];
}

/** Header defaults copied from the quotation (sales_return/create.js:367): remaining discount/cash discount. */
export function returnSummaryFrom(q: any): SummaryValues {
  return {
    vat_percent: q?.vat_percent ?? 15,
    shipping_handling_fees: 0,
    discount: Math.max(0, r2((q?.discount || 0) - (q?.return_discount || 0))),
    discount_with_vat: Math.max(0, r2((q?.discount_with_vat || 0) - (q?.return_discount_vat || 0))),
    auto_rounding_amount: q?.auto_rounding_amount ?? true,
    rounding_amount: 0,
    cash_discount: Math.max(0, r2((q?.cash_discount || 0) - (q?.return_cash_discount || 0))),
  };
}

export const returnTotals = (rows: ReturnRow[], summary: SummaryValues): Totals => computeTotals({ lines: rows.filter((r) => r.selected), ...summary });

/** Client validation for a quotation sales return (mirrors the server rules with friendlier messages). */
export function validateReturn(d: ReturnDraft, totals: Totals, ctx: { quotation: any; refundCap: number; payable: boolean }): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.rows.some((r) => r.selected)) e.product_id = 'Select at least one item to return.';
  d.rows.forEach((r, i) => {
    if (!r.selected) return;
    if (!(r.quantity > 0)) e[`quantity_${i}`] = 'Quantity must be greater than zero.';
    else if (r.quantity > r.max + 1e-9) e[`quantity_${i}`] = r.max > 0 ? 'More than what is left to return.' : 'Already returned in full.';
    if (r.unit_discount > r.unit_price) e[`unit_discount_${i}`] = 'Discount can’t exceed the unit price.';
  });
  if (!d.date) e.date_str = 'Date is required';
  if (ctx.quotation && totals.net_total > (ctx.quotation.net_total || 0) + 1e-9) e.net_total = 'The return total can’t exceed the original invoice total.';
  if (d.summary.cash_discount < 0 || (d.summary.cash_discount > 0 && d.summary.cash_discount >= totals.net_total)) e.cash_discount = 'Cash discount must be less than the total.';
  if (ctx.payable) {
    const paid = paymentSummary(totals.net_total, d.summary.cash_discount, d.payments).paid;
    if (paid > r2(totals.net_total - d.summary.cash_discount) + 0.004) e.total_payment = 'Refunds can’t exceed the return total.';
    else if (paid > ctx.refundCap + 0.004) e.total_payment = 'Refunds can’t exceed what the customer paid on the invoice.';
  }
  return e;
}

/** Request body: ALL quotation lines with `selected` flags, index-aligned with the quotation/old return. */
export function buildReturnBody(d: ReturnDraft, totals: Totals, ctx: { storeId: string; quotation: any; payable: boolean }): Record<string, any> {
  const products = linesToApi(d.rows).map((p, i) => ({ ...p, selected: d.rows[i].selected }));
  const payments = ctx.payable
    ? d.payments.filter((p) => p.id || (p.amount && !p.deleted)).map(({ key: _k, ...p }) => ({ ...p, amount: Number(p.amount) || 0 }))
    : [];
  const q = ctx.quotation || {};
  return {
    store_id: ctx.storeId,
    date_str: toRfc3339(new Date(d.date)),
    quotation_id: q.id,
    quotation_code: q.code,
    customer_id: q.customer_id && q.customer_id !== ZERO_ID ? q.customer_id : null,
    customer_name: q.customer_name || '',
    phone: d.phone,
    vat_no: d.vat_no,
    address: d.address,
    remarks: d.remarks,
    status: 'received',
    vat_percent: d.summary.vat_percent,
    discount: d.summary.discount,
    discount_with_vat: d.summary.discount_with_vat,
    discount_percent: totals.discount_percent,
    discount_percent_with_vat: totals.discount_percent_with_vat,
    shipping_handling_fees: d.summary.shipping_handling_fees,
    auto_rounding_amount: d.summary.auto_rounding_amount,
    rounding_amount: totals.rounding_amount,
    cash_discount: d.summary.cash_discount,
    products,
    payments_input: payments,
    total_payment_paid: r2(payments.filter((p) => !p.deleted).reduce((a, p) => a + (p.amount || 0), 0)),
  };
}

/** Refund auto-fill for a new return with one untouched row: min(net − cash discount, refundable). */
export const autoRefund = (totals: Totals, cashDiscount: number, cap: number) => Math.max(0, Math.min(r2(totals.net_total - cashDiscount), cap));

// ───────────────────────── RFQ → quotation prefill ─────────────────────────

/** sessionStorage key written by AI procurement "Create quotation" (legacy rfq_received/index.js). */
export const RFQ_PREFILL_KEY = 'rfq_quotation_prefill_active';

export interface RfqPrefillItem { product_id?: string | null; product_name?: string; part_no?: string; quantity?: number; unit?: string; cost_price?: number; unit_price?: number }
export interface RfqPrefill {
  rfq_code?: string; rfq_received_id?: string; rfq_received_code?: string;
  customer_id?: string; customer_name?: string; customer_phone?: string;
  procurement_message_id?: string; procurement_message_code?: string;
  items?: RfqPrefillItem[];
}

/** Read and consume (one-shot, like legacy quotation/create.js) the RFQ prefill. */
export function takeRfqPrefill(storage: Pick<Storage, 'getItem' | 'removeItem'> = sessionStorage): RfqPrefill | null {
  try {
    const raw = storage.getItem(RFQ_PREFILL_KEY);
    if (!raw) return null;
    storage.removeItem(RFQ_PREFILL_KEY);
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

/** Map the legacy RFQ prefill onto the quotation editor state (customer, RFQ link, priced lines with cost). */
export function rfqPrefillToDocState(p: RfqPrefill, vat: number): Partial<DocState> {
  const out: Partial<DocState> = {};
  const name = p.customer_name || '';
  if (p.customer_id) out.party = { id: p.customer_id, label: name, data: { id: p.customer_id, name, phone: p.customer_phone } as any };
  else if (name) out.party = { id: `new:${name}`, label: name, data: { id: '', name } as any };
  if (p.customer_phone) out.phone = p.customer_phone;
  if (p.rfq_code) out.remarks = `RFQ: ${p.rfq_code}`;
  const extra: Record<string, any> = {};
  if (p.rfq_received_id) { extra.rfq_received_id = p.rfq_received_id; extra.rfq_received_code = p.rfq_received_code || ''; }
  out.extra = extra;
  const items = Array.isArray(p.items) ? p.items.filter((i) => i && (i.product_name || i.product_id)) : [];
  if (items.length) {
    out.lines = items.map((i) => makeLine({
      product_id: i.product_id || null,
      name: i.product_name || '',
      part_number: i.part_no || '',
      unit: i.unit || '',
      quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
      unit_price: Number(i.unit_price) || 0,
      purchase_unit_price: Number(i.cost_price) || 0,
      purchase_unit_price_with_vat: Math.round((Number(i.cost_price) || 0) * (1 + vat / 100) * 100) / 100,
    }, vat));
  }
  return out;
}
