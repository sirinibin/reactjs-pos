/**
 * Pure logic for sales returns, non-VAT sales and non-VAT returns (sales.md §2, §6, §10.2).
 * Everything here mirrors the Go server so the screen shows what the server will store.
 */
import { computeTotals, goRound2, linesFromApi, linesToApi, r2, r8, type DocLine, type PaymentRow, type Totals } from '../../framework/doc/calc';
import type { SummaryValues } from '../../framework/doc/Summary';

export interface ReturnLine extends DocLine {
  /** Included in this return (server `selected`). */
  selected: boolean;
  /** Quantity on the original document line. */
  sold: number;
  /** Quantity already returned by other returns. */
  already: number;
  /** Maximum quantity this return may carry for the line. */
  max: number;
}

const num = (v: unknown) => Number(v) || 0;

/* ------------------------------------------------------------------ */
/* Sales return (against an order)                                     */
/* ------------------------------------------------------------------ */

/** Server matches a return line to the LAST order line with the same product (models/sales_return.go Validate). */
export function matchOrderLine(orderProducts: any[], productId: string | null | undefined): any | undefined {
  for (let i = (orderProducts || []).length - 1; i >= 0; i--) if (orderProducts[i].product_id === productId) return orderProducts[i];
  return undefined;
}

/**
 * Build return lines from the order (new) or from an existing return (edit).
 * max = sold − quantity_returned (+ this return's own previously selected quantity on edit).
 * The array keeps the order's length/order: the server pairs lines by index on update.
 */
export function buildSalesReturnLines(order: any, existing?: any): ReturnLine[] {
  const vat = existing?.vat_percent ?? order?.vat_percent ?? 15;
  const src: any[] = existing ? existing.products || [] : order?.products || [];
  const base = linesFromApi(src, vat);
  return base.map((l, i) => {
    const p = src[i];
    const ol = matchOrderLine(order?.products || [], p.product_id) || order?.products?.[i] || {};
    const own = existing && p.selected ? num(p.quantity) : 0;
    const already = Math.max(0, r8(num(ol.quantity_returned) - own));
    const sold = num(ol.quantity ?? p.quantity);
    const max = Math.max(0, r8(sold - already));
    const { quantity_returned: _q, selected: _s, ...rest } = l as any;
    return {
      ...rest,
      selected: existing ? !!p.selected : false,
      quantity: existing ? num(p.quantity) : max,
      sold,
      already,
      max,
    } as ReturnLine;
  });
}

/** Header defaults copied from the order (sales_return/create.js:367-560). */
export function returnSummaryFromOrder(o: any): SummaryValues {
  const auto = o?.auto_rounding_amount ?? true;
  return {
    vat_percent: o?.vat_percent ?? 15,
    shipping_handling_fees: num(o?.shipping_handling_fees),
    discount: Math.max(0, r2(num(o?.discount) - num(o?.return_discount))),
    // Server serialises Order.ReturnDiscountWithVAT as `return_discount_vat` (legacy FE bug never subtracted it).
    discount_with_vat: Math.max(0, r2(num(o?.discount_with_vat) - num(o?.return_discount_vat ?? o?.return_discount_with_vat))),
    auto_rounding_amount: auto,
    rounding_amount: auto ? 0 : num(o?.rounding_amount),
    cash_discount: Math.max(0, r2(num(o?.cash_discount) - num(o?.return_cash_discount))),
  };
}

export function summaryFromDoc(d: any): SummaryValues {
  return {
    vat_percent: d?.vat_percent ?? 15,
    shipping_handling_fees: num(d?.shipping_handling_fees),
    discount: num(d?.discount),
    discount_with_vat: num(d?.discount_with_vat),
    auto_rounding_amount: d?.auto_rounding_amount ?? true,
    rounding_amount: num(d?.rounding_amount),
    cash_discount: num(d?.cash_discount),
  };
}

/** Serialise ALL lines with their `selected` flag (unselected lines are kept for index pairing). */
export function returnProductsToApi(lines: ReturnLine[]) {
  const api = linesToApi(lines);
  return api.map((p, i) => ({ ...p, selected: lines[i].selected, is_service: !!lines[i].is_service }));
}

export const selectedLines = <T extends ReturnLine>(lines: T[]) => lines.filter((l) => l.selected);

/** Totals for a sales return: order formula over selected lines only. */
export function salesReturnTotals(lines: ReturnLine[], s: SummaryValues): Totals {
  return computeTotals({ lines: selectedLines(lines), ...s });
}

/**
 * Most that may be refunded on a sales return (models/sales_return.go Validate):
 * ≤ net − cash discount, ≤ original net total, and on create ≤ received − already returned.
 * Unpaid invoices get no refund rows at all.
 */
export function refundCap(order: any, netTotal: number, cashDiscount: number, editing: boolean): number {
  if (!order || order.payment_status === 'not_paid') return 0;
  const caps = [r2(netTotal - cashDiscount), num(order.net_total)];
  if (!editing) caps.push(r2(num(order.total_payment_received) - num(order.return_amount)));
  return Math.max(0, r2(Math.min(...caps)));
}

/** Client validation of return lines; keys use the full-array index the server uses (quantity_<i>). */
export function validateReturnLines(lines: ReturnLine[], opts: { checkPrice?: boolean } = {}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!lines.some((l) => l.selected)) e.product_id = 'Select at least one item to return.';
  lines.forEach((l, i) => {
    if (!l.selected) return;
    if (!(l.quantity > 0)) e[`quantity_${i}`] = 'Quantity can’t be zero.';
    else if (l.quantity > l.max + 1e-9) e[`quantity_${i}`] = `Only ${l.max} can be returned.`;
    if (!l.name || l.name.trim().length < 3) e[`name_${i}`] = 'Name must be at least 3 characters.';
    if (opts.checkPrice !== false && !l.unit_price) e[`unit_price_${i}`] = 'Unit price can’t be zero.';
    if (l.unit_discount > l.unit_price && l.unit_price > 0) e[`unit_discount_${i}`] = 'Discount can’t exceed the unit price.';
  });
  return e;
}

export const livePayments = (p: PaymentRow[]) => p.filter((x) => !x.deleted);
export const paymentsTotal = (p: PaymentRow[]) => r2(livePayments(p).reduce((a, x) => a + num(x.amount), 0));

/** payments_input: only live rows (the server deletes stored payments missing from the list). */
export function paymentsToApi(p: PaymentRow[]) {
  return livePayments(p)
    .filter((x) => x.id || num(x.amount) > 0)
    .map(({ key: _k, deleted: _d, ...x }) => ({ ...x, amount: num(x.amount) }));
}

/* ------------------------------------------------------------------ */
/* ZATCA                                                               */
/* ------------------------------------------------------------------ */

export type ZatcaState = 'reported' | 'compliance_failed' | 'reporting_failed' | 'not_reported';

/** Badge logic from order/index.js:2433-2460 (sales.md §10.2). */
export function zatcaState(z: any): ZatcaState {
  if (!z) return 'not_reported';
  if (z.reporting_passed) return 'reported';
  if (!z.compliance_passed && num(z.compliance_check_failed_count) > 0) return 'compliance_failed';
  if (num(z.reporting_failed_count) > 0) return 'reporting_failed';
  return 'not_reported';
}

/** Returns reported in phase 2 are locked — no store-setting override (sales.md §2.6). */
export const isReturnLocked = (doc: any, store: any) => !!doc?.zatca?.reporting_passed && store?.zatca?.phase === '2';

/* ------------------------------------------------------------------ */
/* Non-VAT sales & returns (models/non_vat_sales.go:104-170)          */
/* ------------------------------------------------------------------ */

export interface ExcludeFlags { exclude_service_tax: boolean; exclude_product_tax: boolean }

export const isExcluded = (l: Pick<DocLine, 'is_service'>, f: ExcludeFlags) => (l.is_service ? f.exclude_service_tax : f.exclude_product_tax);

/** Excluded kinds carry no tax: with-VAT price = ex-VAT price (the server also uses the sent udwv as-is). */
export function applyExclusions<T extends DocLine>(lines: T[], f: ExcludeFlags, vat: number): T[] {
  const m = 1 + (vat || 0) / 100;
  return lines.map((l) => {
    if (isExcluded(l, f)) {
      return l.unit_price_with_vat === l.unit_price && l.unit_discount_with_vat === l.unit_discount ? l : { ...l, unit_price_with_vat: l.unit_price, unit_discount_with_vat: l.unit_discount };
    }
    if (l.unit_price_with_vat === l.unit_price && l.unit_price > 0 && vat > 0) {
      return { ...l, unit_price_with_vat: r2(l.unit_price * m), unit_discount_with_vat: r8(l.unit_discount * m) };
    }
    return l;
  });
}

export interface NonVatTotalsInput extends ExcludeFlags {
  lines: DocLine[];
  vat_percent: number;
  discount?: number;
  cash_discount?: number;
  shipping_handling_fees?: number;
  auto_rounding_amount?: boolean;
  rounding_amount?: number;
  /** Returns ignore shipping. */
  isReturn?: boolean;
}

/** Port of NonVATSales.FindNetTotal. Note: net_total already subtracts the cash discount. */
export function nonVatTotals(i: NonVatTotalsInput): Totals {
  let total = 0, twv = 0, at = 0, atwv = 0, qty = 0;
  const vat = i.vat_percent || 0;
  for (const raw of i.lines) {
    const ex = isExcluded(raw, i);
    const upwv = ex ? raw.unit_price : raw.unit_price_with_vat === 0 && raw.unit_price > 0 && vat > 0 ? goRound2(raw.unit_price * (1 + vat / 100)) : raw.unit_price_with_vat;
    total = goRound2(total + raw.quantity * (raw.unit_price - raw.unit_discount));
    twv = goRound2(twv + raw.quantity * (upwv - raw.unit_discount_with_vat));
    at = r8(at + raw.quantity * (raw.unit_price - raw.unit_discount));
    atwv = r8(atwv + raw.quantity * (upwv - raw.unit_discount_with_vat));
    qty += raw.quantity;
  }
  const disc = goRound2(i.discount || 0);
  const cash = i.cash_discount || 0;
  const ship = i.isReturn ? 0 : goRound2(i.shipping_handling_fees || 0);
  const vatPrice = goRound2(twv - total);
  let net = goRound2(twv - disc - cash + ship);
  const actualNet = goRound2(atwv - disc - cash + ship);
  const rounding = i.auto_rounding_amount ? goRound2(actualNet - net) : i.rounding_amount || 0;
  const before = net;
  net = goRound2(net + rounding);
  return {
    total, total_with_vat: twv, taxable: twv, vat_price: vatPrice, before_rounding: before, rounding_amount: rounding, net_total: net,
    discount_percent: 0, discount_percent_with_vat: 0, total_quantity: qty,
  };
}

/** Server rule: balance = net_total − cash_discount − paid (cash discount counted twice). */
export function nonVatBalance(netTotal: number, cashDiscount: number, paid: number) {
  const balance = r2(r2(netTotal - cashDiscount) - paid);
  const status = paid <= 0 ? 'not_paid' : balance <= 0 ? 'paid' : 'paid_partially';
  return { balance, status };
}

/** Lines for a non-VAT return: sale lines with max = sold − returned by other returns (per product). */
export function buildNonVatReturnLines(sale: any, otherReturns: any[], existing?: any): ReturnLine[] {
  const vat = existing?.vat_percent ?? sale?.vat_percent ?? 15;
  const returned = new Map<string, number>();
  for (const r of otherReturns || []) {
    if (existing && r.id === existing.id) continue;
    for (const p of r.products || []) returned.set(p.product_id, num(returned.get(p.product_id)) + num(p.quantity));
  }
  const soldBy = new Map<string, number>();
  for (const p of sale?.products || []) soldBy.set(p.product_id, num(soldBy.get(p.product_id)) + num(p.quantity));
  const ownBy = new Map<string, any>();
  for (const p of existing?.products || []) ownBy.set(p.product_id, p);
  return linesFromApi(sale?.products || [], vat).map((l, i) => {
    const sp = sale.products[i];
    const own = ownBy.get(sp.product_id);
    const sold = num(soldBy.get(sp.product_id));
    const already = num(returned.get(sp.product_id));
    const max = Math.max(0, r8(sold - already));
    const src = own ? { ...l, ...linesFromApi([own], vat)[0], key: l.key } : l;
    if (own) ownBy.delete(sp.product_id);
    return { ...src, selected: !!own, quantity: own ? num(own.quantity) : max, sold, already, max } as ReturnLine;
  });
}

/** Non-VAT return body keeps only the returned lines (its totals ignore `selected`). */
export function nonVatReturnProductsToApi(lines: ReturnLine[]) {
  const sel = selectedLines(lines);
  return linesToApi(sel).map((p, i) => ({ ...p, is_service: !!sel[i].is_service }));
}

export function nonVatProductsToApi(lines: DocLine[]) {
  return linesToApi(lines).map((p, i) => ({ ...p, is_service: !!lines[i].is_service }));
}

/** Display-only copy of a non-VAT document: prices shown as charged (incl. any tax), VAT hidden. */
export function nonVatDisplayDoc(d: any) {
  if (!d) return d;
  return {
    ...d,
    total: d.total_with_vat ?? d.total,
    products: (d.products || []).map((p: any) => ({ ...p, unit_price: p.unit_price_with_vat || p.unit_price, unit_discount: p.unit_discount_with_vat ?? p.unit_discount })),
  };
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

/** System-generated payment rows (receivables, returns) can't be edited from payment lists. */
export const isSystemPayment = (p: any) => !!(p?.reference_type || p?.receivable_id || p?.payable_id || ['sales_return', 'purchase'].includes(p?.method));

/** Text search for document lists: codes contain digits or a prefix dash. */
export const looksLikeCode = (q: string) => /\d|^[A-Za-z]+-/.test(q);

/**
 * After a LinesEditor edit on a non-VAT doc: excluded lines carry no tax, so an edit of the
 * incl.-tax price/amount must become the plain price (not price ÷ (1+VAT)).
 */
export function normalizeNonVatEdit<T extends DocLine>(prev: T[], next: T[], f: ExcludeFlags, vat: number): T[] {
  const before = new Map(prev.map((l) => [l.key, l]));
  const fixed = next.map((n) => {
    const p = before.get(n.key);
    if (!p || !isExcluded(n, f)) return n;
    if (n.unit_price_with_vat !== p.unit_price_with_vat && n.unit_price !== p.unit_price && n.unit_price !== n.unit_price_with_vat) {
      return { ...n, unit_price: n.unit_price_with_vat };
    }
    return n;
  });
  return applyExclusions(fixed, f, vat);
}
