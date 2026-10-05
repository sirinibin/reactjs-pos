/**
 * Trade-document maths (sales, returns, quotations, purchases …).
 * Mirrors the Go server's Order.FindNetTotal and the legacy create-form line
 * rules exactly, so the totals shown while typing match what the server stores.
 * Spec: sales.md §0.3, §1.2.
 */

/** FE trimTo2Decimals: Math.round((n+EPSILON)*100)/100. */
export const r2 = (n: number) => Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * 100) / 100;
/** FE trimTo8Decimals. */
export const r8 = (n: number) => Math.round(((Number.isFinite(n) ? n : 0) + Number.EPSILON) * 1e8) / 1e8;
/** BE RoundTo2Decimals (math.Round — half away from zero). */
export const goRound2 = (n: number) => Math.sign(n) * Math.round(Math.abs(n) * 100) / 100 || 0;

export interface DocLine {
  key: string;
  product_id: string | null;
  part_number?: string;
  name: string;
  name_in_arabic?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  unit_price_with_vat: number;
  unit_discount: number;
  unit_discount_with_vat: number;
  unit_discount_percent: number;
  unit_discount_percent_with_vat: number;
  purchase_unit_price?: number;
  purchase_unit_price_with_vat?: number;
  warehouse_id?: string | null;
  warehouse_code?: string | null;
  /** Kept constant when quantity changes (legacy "L. Disc. (incl. VAT)" column). */
  line_discount_with_vat?: number;
  /** Informational, from product lookup. */
  stock?: number;
  is_service?: boolean;
  quantity_returned?: number;
  [extra: string]: unknown;
}

const vf = (vat: number) => 1 + (vat || 0) / 100;
const pct = (part: number, whole: number) => (whole ? r2((part / whole) * 100) : 0);

function withPercents(l: DocLine): DocLine {
  return {
    ...l,
    unit_discount_percent: pct(l.unit_discount, l.unit_price),
    unit_discount_percent_with_vat: pct(l.unit_discount_with_vat, l.unit_price_with_vat),
  };
}

let seq = 0;
export const newLineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeLine(p: Partial<DocLine> & { name: string }, vat: number): DocLine {
  const unit_price = p.unit_price ?? (p.unit_price_with_vat !== undefined ? r8(p.unit_price_with_vat / vf(vat)) : 0);
  const unit_price_with_vat = p.unit_price_with_vat ?? r8(unit_price * vf(vat));
  const unit_discount = p.unit_discount ?? 0;
  const unit_discount_with_vat = p.unit_discount_with_vat ?? r8(unit_discount * vf(vat));
  return withPercents({
    key: newLineKey(),
    product_id: null,
    quantity: 1,
    ...p,
    unit_price,
    unit_price_with_vat,
    unit_discount,
    unit_discount_with_vat,
    unit_discount_percent: 0,
    unit_discount_percent_with_vat: 0,
  });
}

/** Edit unit price (ex VAT) → derive with-VAT price (create.js:7712). */
export function setUnitPrice(l: DocLine, v: number, vat: number): DocLine {
  return withPercents({ ...l, unit_price: v, unit_price_with_vat: r8(v * vf(vat)) });
}

/** Edit unit price incl. VAT → derive ex-VAT price and with-VAT discount (create.js:7828). */
export function setUnitPriceWithVat(l: DocLine, v: number, vat: number): DocLine {
  return withPercents({ ...l, unit_price_with_vat: v, unit_price: r8(v / vf(vat)), unit_discount_with_vat: r2(l.unit_discount * vf(vat)) });
}

/** Edit unit discount (ex VAT) (create.js:7943). */
export function setUnitDiscount(l: DocLine, v: number, vat: number): DocLine {
  const udv = r8(v * vf(vat));
  return withPercents({ ...l, unit_discount: v, unit_discount_with_vat: udv, line_discount_with_vat: r2(udv * l.quantity) });
}

/** Edit line discount incl. VAT (whole line, not per unit) (create.js:8074). */
export function setLineDiscountWithVat(l: DocLine, total: number, vat: number): DocLine {
  const q = l.quantity || 1;
  const udv = r8(total / q);
  return withPercents({ ...l, line_discount_with_vat: total, unit_discount_with_vat: udv, unit_discount: r8(udv / vf(vat)) });
}

/** Edit discount % (applies to ex-VAT unit price). */
export function setDiscountPercent(l: DocLine, p: number, vat: number): DocLine {
  const clamped = Math.max(0, Math.min(100, p));
  return setUnitDiscount(l, r8((l.unit_price * clamped) / 100), vat);
}

/** Edit quantity; a line-level discount stays constant (create.js:7588). */
export function setQuantity(l: DocLine, q: number, vat: number): DocLine {
  const next = { ...l, quantity: q };
  if (l.line_discount_with_vat && q) return setLineDiscountWithVat(next, l.line_discount_with_vat, vat);
  return next;
}

/** Edit line total ex VAT → back-solve unit price (create.js:8347). */
export function setLineTotal(l: DocLine, total: number, vat: number): DocLine {
  const q = l.quantity || 1;
  return setUnitPrice(l, r8(total / q + l.unit_discount), vat);
}

/** Edit line total incl. VAT → back-solve unit price incl. VAT. */
export function setLineTotalWithVat(l: DocLine, total: number, vat: number): DocLine {
  const q = l.quantity || 1;
  const upwv = r8(total / q + l.unit_discount_with_vat);
  return withPercents({ ...l, unit_price_with_vat: upwv, unit_price: r8(upwv / vf(vat)) });
}

/** Re-derive with-VAT figures for every line after the document VAT % changes. */
export function applyVat(lines: DocLine[], vat: number): DocLine[] {
  return lines.map((l) => withPercents({ ...l, unit_price_with_vat: r8(l.unit_price * vf(vat)), unit_discount_with_vat: r8(l.unit_discount * vf(vat)) }));
}

export const lineTotal = (l: DocLine) => r2((l.unit_price - l.unit_discount) * l.quantity);
export const lineTotalWithVat = (l: DocLine) => r2((l.unit_price_with_vat - l.unit_discount_with_vat) * l.quantity);

export interface TotalsInput {
  lines: DocLine[];
  vat_percent: number;
  shipping_handling_fees?: number;
  discount?: number;
  discount_with_vat?: number;
  auto_rounding_amount?: boolean;
  rounding_amount?: number;
  cash_discount?: number;
}

export interface Totals {
  total: number;
  total_with_vat: number;
  taxable: number;
  vat_price: number;
  before_rounding: number;
  rounding_amount: number;
  net_total: number;
  discount_percent: number;
  discount_percent_with_vat: number;
  total_quantity: number;
}

/** Port of models/sales.go Order.FindNetTotal (round2 accumulation, auto rounding). */
export function computeTotals(i: TotalsInput): Totals {
  let total = 0, totalWithVat = 0, actual = 0, qty = 0;
  for (const l of i.lines) {
    total = goRound2(total + l.quantity * (l.unit_price - l.unit_discount));
    totalWithVat = goRound2(totalWithVat + l.quantity * (l.unit_price_with_vat - l.unit_discount_with_vat));
    actual = r8(actual + l.quantity * (l.unit_price - l.unit_discount));
    qty += l.quantity;
  }
  const ship = i.shipping_handling_fees || 0;
  const disc = i.discount || 0;
  const vat = i.vat_percent || 0;
  const base = goRound2(total + ship - disc);
  const vatPrice = goRound2((base * vat) / 100);
  let net = goRound2(base + vatPrice);
  const actualBase = r8(actual + ship - disc);
  const actualNet = goRound2(actualBase + goRound2((actualBase * vat) / 100));
  const rounding = i.auto_rounding_amount ? goRound2(actualNet - net) : i.rounding_amount || 0;
  const beforeRounding = net;
  net = goRound2(net + rounding);
  const dwv = i.discount_with_vat || 0;
  return {
    total,
    total_with_vat: totalWithVat,
    taxable: base,
    vat_price: vatPrice,
    before_rounding: beforeRounding,
    rounding_amount: rounding,
    net_total: net,
    discount_percent: disc > 0 ? goRound2((disc / (net + disc)) * 100) : 0,
    discount_percent_with_vat: dwv > 0 ? goRound2((dwv / (net + dwv)) * 100) : 0,
    total_quantity: qty,
  };
}

/** Header discount ex VAT ↔ incl. VAT (create.js:8785). */
export const discountWithVat = (discount: number, vat: number) => r2(discount * vf(vat));
export const discountWithoutVat = (discountWithVatValue: number, vat: number) => r2(discountWithVatValue / vf(vat));

export interface PaymentRow { key: string; id?: string; date_str: string; amount: number; method: string; description?: string; reference_type?: string; reference_code?: string; reference_id?: string; receivable_id?: string; bank_reference?: string; deleted?: boolean }

export type PaymentStatus = 'paid' | 'paid_partially' | 'not_paid';

/** UI balance & status (create.js:3417). */
export function paymentSummary(netTotal: number, cashDiscount: number, payments: PaymentRow[]): { paid: number; balance: number; status: PaymentStatus } {
  const paid = r2(payments.filter((p) => !p.deleted).reduce((a, p) => a + (Number(p.amount) || 0), 0));
  const due = r2(r2(netTotal) - r2(cashDiscount));
  const balance = r2(due - paid);
  const status: PaymentStatus = balance <= 0 ? 'paid' : paid <= 0 ? 'not_paid' : 'paid_partially';
  return { paid, balance, status };
}

export interface LineIssue { field: string; message: string }

/** Client-side line validation mirroring server rules (sales.md §1.1 validation table). */
export function validateLines(lines: DocLine[], opts: { allowZeroPrice?: boolean } = {}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!lines.length) e.product_id = 'Add at least one item.';
  lines.forEach((l, i) => {
    if (!l.quantity) e[`quantity_${i}`] = 'Quantity can’t be zero.';
    if (l.quantity < 0) e[`quantity_${i}`] = 'Quantity can’t be negative.';
    if (!l.name || l.name.trim().length < 3) e[`name_${i}`] = 'Name must be at least 3 characters.';
    if (!opts.allowZeroPrice && !l.unit_price) e[`unit_price_${i}`] = 'Unit price can’t be zero.';
    if (l.unit_discount > l.unit_price) e[`unit_discount_${i}`] = 'Discount can’t exceed the unit price.';
    if (l.unit_discount < 0) e[`unit_discount_${i}`] = 'Discount can’t be negative.';
  });
  return e;
}

/** Serialize lines for the API (drops UI-only keys). */
export function linesToApi(lines: DocLine[]) {
  return lines.map((l) => ({
    product_id: l.product_id,
    part_number: l.part_number || '',
    name: l.name,
    name_in_arabic: l.name_in_arabic,
    quantity: l.quantity,
    unit: l.unit || '',
    unit_price: l.unit_price,
    unit_price_with_vat: l.unit_price_with_vat,
    unit_discount: l.unit_discount,
    unit_discount_with_vat: l.unit_discount_with_vat,
    unit_discount_percent: l.unit_discount_percent,
    unit_discount_percent_with_vat: l.unit_discount_percent_with_vat,
    purchase_unit_price: l.purchase_unit_price ?? 0,
    purchase_unit_price_with_vat: l.purchase_unit_price_with_vat ?? 0,
    warehouse_id: l.warehouse_id || null,
    warehouse_code: l.warehouse_code || null,
  }));
}

/** Hydrate lines from an API document. */
export function linesFromApi(products: any[] | undefined, vat: number): DocLine[] {
  return (products || []).map((p) => {
    const l: DocLine = {
      ...p,
      key: newLineKey(),
      product_id: p.product_id || null,
      name: p.name || '',
      quantity: Number(p.quantity) || 0,
      unit_price: Number(p.unit_price) || 0,
      unit_price_with_vat: Number(p.unit_price_with_vat) || r8((Number(p.unit_price) || 0) * vf(vat)),
      unit_discount: Number(p.unit_discount) || 0,
      unit_discount_with_vat: Number(p.unit_discount_with_vat) || r8((Number(p.unit_discount) || 0) * vf(vat)),
      unit_discount_percent: Number(p.unit_discount_percent) || 0,
      unit_discount_percent_with_vat: Number(p.unit_discount_percent_with_vat) || 0,
    };
    if (l.unit_discount_with_vat) l.line_discount_with_vat = r2(l.unit_discount_with_vat * l.quantity);
    return l;
  });
}
