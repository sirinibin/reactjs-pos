/**
 * Product pricing / stock maths for the inventory module (masters.md §5.3).
 * Pure functions only — unit tested in pricing.test.ts.
 */
import { r2, r8 } from '../../../framework/doc/calc';

export { r2, r8 };

const vf = (vat: number) => 1 + (Number(vat) || 0) / 100;

/** price × (1 + vat%) trimmed to 8 decimals (legacy trimTo8Decimals). */
export const withVat = (price: number, vat: number) => r8((Number(price) || 0) * vf(vat));
/** with_vat ÷ (1 + vat%) trimmed to 8 decimals. */
export const withoutVat = (priceWithVat: number, vat: number) => r8((Number(priceWithVat) || 0) / vf(vat));

/** Margin % of a selling price over the purchase price: ((price / purchase) − 1) × 100. 0 when purchase is 0. */
export function marginOf(price: number, purchase: number): number {
  if (!purchase || purchase <= 0 || !price) return 0;
  return r2((price / purchase - 1) * 100);
}

/** Selling price from purchase price and margin %. */
export const priceFromMargin = (purchase: number, margin: number) => r8((Number(purchase) || 0) * (1 + (Number(margin) || 0) / 100));

/** Server profit rule (BE product.go:3106): profit = price − purchase; % = purchase==0 ? (profit>0?100:0) : profit/purchase×100 (2dp). */
export function unitProfit(price: number, purchase: number): { profit: number; percent: number } {
  const profit = r2((Number(price) || 0) - (Number(purchase) || 0));
  const percent = !purchase ? (profit > 0 ? 100 : 0) : r2((profit / purchase) * 100);
  return { profit, percent };
}

export interface StorePrices {
  purchase_unit_price: number;
  purchase_unit_price_with_vat: number;
  wholesale_unit_price: number;
  wholesale_unit_price_with_vat: number;
  retail_unit_price: number;
  retail_unit_price_with_vat: number;
  wholesale_margin_percent: number;
  retail_margin_percent: number;
  wholesale_manual_price_updated_at?: string | null;
  retail_manual_price_updated_at?: string | null;
}

export type PriceField =
  | 'purchase_unit_price' | 'purchase_unit_price_with_vat'
  | 'wholesale_unit_price' | 'wholesale_unit_price_with_vat'
  | 'retail_unit_price' | 'retail_unit_price_with_vat'
  | 'wholesale_margin_percent' | 'retail_margin_percent';

/** Re-derive a selling tier after the purchase price changed (create.js:2163). */
function retier(p: StorePrices, tier: 'wholesale' | 'retail', vat: number): StorePrices {
  const m = p[`${tier}_margin_percent`];
  const price = p[`${tier}_unit_price`];
  if (m > 0 && p.purchase_unit_price > 0) {
    const np = priceFromMargin(p.purchase_unit_price, m);
    return { ...p, [`${tier}_unit_price`]: np, [`${tier}_unit_price_with_vat`]: withVat(np, vat) };
  }
  if (price > 0) return { ...p, [`${tier}_margin_percent`]: marginOf(price, p.purchase_unit_price) };
  return p;
}

/**
 * Apply one edited price input and cascade: ex/incl VAT pairs, margins, manual-update stamps.
 * `now` is injectable for tests.
 */
export function applyPriceEdit(p: StorePrices, field: PriceField, value: number, vat: number, now: () => string = () => new Date().toISOString()): StorePrices {
  const v = Number(value) || 0;
  switch (field) {
    case 'purchase_unit_price':
    case 'purchase_unit_price_with_vat': {
      const ex = field === 'purchase_unit_price' ? v : withoutVat(v, vat);
      const inc = field === 'purchase_unit_price' ? withVat(v, vat) : v;
      let n: StorePrices = { ...p, purchase_unit_price: ex, purchase_unit_price_with_vat: inc };
      n = retier(n, 'wholesale', vat);
      n = retier(n, 'retail', vat);
      return n;
    }
    case 'wholesale_unit_price':
    case 'wholesale_unit_price_with_vat':
    case 'retail_unit_price':
    case 'retail_unit_price_with_vat': {
      const tier = field.startsWith('wholesale') ? 'wholesale' : 'retail';
      const incl = field.endsWith('_with_vat');
      const ex = incl ? withoutVat(v, vat) : v;
      const inc = incl ? v : withVat(v, vat);
      return {
        ...p,
        [`${tier}_unit_price`]: ex,
        [`${tier}_unit_price_with_vat`]: inc,
        [`${tier}_margin_percent`]: p.purchase_unit_price > 0 ? marginOf(ex, p.purchase_unit_price) : p[`${tier}_margin_percent`],
        [`${tier}_manual_price_updated_at`]: now(),
      };
    }
    case 'wholesale_margin_percent':
    case 'retail_margin_percent': {
      const tier = field.startsWith('wholesale') ? 'wholesale' : 'retail';
      const n = { ...p, [field]: v };
      if (p.purchase_unit_price > 0) {
        const np = priceFromMargin(p.purchase_unit_price, v);
        return { ...n, [`${tier}_unit_price`]: np, [`${tier}_unit_price_with_vat`]: withVat(np, vat) };
      }
      return n;
    }
  }
}

/** Price from the last purchase and a margin (the "Update now" button). */
export function priceFromLastPurchase(lastPurchase: number, margin: number, vat: number): { price: number; price_with_vat: number } | null {
  if (!margin) return null;
  const price = priceFromMargin(lastPurchase, margin);
  return { price, price_with_vat: withVat(price, vat) };
}

/** Purchase secret code used on labels: digits of int(price) 1→K … 9→S, 0→T. */
export function secretCode(purchase: number): string {
  const map: Record<string, string> = { '1': 'K', '2': 'L', '3': 'M', '4': 'N', '5': 'O', '6': 'P', '7': 'Q', '8': 'R', '9': 'S', '0': 'T' };
  return String(Math.trunc(Math.abs(Number(purchase) || 0))).split('').map((d) => map[d] || '').join('');
}

/** The list endpoint may return "<ean12>(Old:<bar_code>)" — strip the suffix for display/print. */
export const cleanEan = (ean?: string | null) => (ean || '').replace(/\(Old:[^)]*\)\s*$/, '').trim();

export const partLabel = (p: { prefix_part_number?: string; part_number?: string; [k: string]: any }) => [p.prefix_part_number, p.part_number].filter(Boolean).join('-');

// ---------------------------------------------------------------- sets / kits

export interface SetLine {
  product_id: string;
  part_number?: string;
  name: string;
  quantity: number;
  unit?: string;
  purchase_unit_price: number;
  purchase_unit_price_with_vat: number;
  retail_unit_price: number;
  retail_unit_price_with_vat: number;
  retail_price_percent?: number;
  purchase_price_percent?: number;
}

export interface SetTotals { total: number; total_with_vat: number; purchase_total: number; purchase_total_with_vat: number; total_quantity: number }

/** Set totals (FE create.js:1100) — they overwrite the product's own retail/purchase prices. */
export function setTotals(lines: SetLine[]): SetTotals {
  const t = { total: 0, total_with_vat: 0, purchase_total: 0, purchase_total_with_vat: 0, total_quantity: 0 };
  for (const l of lines) {
    const q = Number(l.quantity) || 0;
    t.total += (l.retail_unit_price || 0) * q;
    t.total_with_vat += (l.retail_unit_price_with_vat || 0) * q;
    t.purchase_total += (l.purchase_unit_price || 0) * q;
    t.purchase_total_with_vat += (l.purchase_unit_price_with_vat || 0) * q;
    t.total_quantity += q;
  }
  return { total: r8(t.total), total_with_vat: r8(t.total_with_vat), purchase_total: r8(t.purchase_total), purchase_total_with_vat: r8(t.purchase_total_with_vat), total_quantity: r8(t.total_quantity) };
}

/** Each component's share of the set's purchase and retail totals. */
export function withSetPercents(lines: SetLine[]): SetLine[] {
  const t = setTotals(lines);
  return lines.map((l) => ({
    ...l,
    retail_price_percent: t.total ? r2(((l.retail_unit_price * l.quantity) / t.total) * 100) : 0,
    purchase_price_percent: t.purchase_total ? r2(((l.purchase_unit_price * l.quantity) / t.purchase_total) * 100) : 0,
  }));
}

/** BE stores is_set inverted (true when there are NO components); read the real thing from the set. */
export const isKit = (p: { set?: { products?: unknown[] | null } | null; [k: string]: any }) => !!p.set?.products && p.set.products.length > 0;

// ---------------------------------------------------------------- stock

export interface Adjustment { date_str: string; type: 'adding' | 'removing' | ''; quantity: number; reason: string; warehouse_id: string | null; warehouse_code: string | null }

export function adjustmentTotals(list: Adjustment[]): { added: number; removed: number } {
  let added = 0, removed = 0;
  for (const a of list) {
    if (a.type === 'adding') added += Number(a.quantity) || 0;
    else if (a.type === 'removing') removed += Number(a.quantity) || 0;
  }
  return { added: r8(added), removed: r8(removed) };
}

export interface Location { code: string; name: string; id: string | null }
export const MAIN_STORE = 'main_store';

/** Stock per location: Main Store first, then each warehouse (missing → 0). */
export function stockByLocation(
  ps: { stock?: number; warehouse_stocks?: Record<string, number> | null } | undefined,
  warehouses: { id: string; code: string; name: string }[],
  mainLabel = 'Main Store',
): { code: string; name: string; stock: number }[] {
  const ws = ps?.warehouse_stocks || {};
  const main = ws[MAIN_STORE] ?? (warehouses.length ? (ps?.stock ?? 0) - warehouses.reduce((a, w) => a + (ws[w.code] || 0), 0) : ps?.stock ?? 0);
  return [{ code: MAIN_STORE, name: mainLabel, stock: r8(main) }, ...warehouses.map((w) => ({ code: w.code, name: w.name, stock: ws[w.code] ?? 0 }))];
}

// ---------------------------------------------------------------- demand / reorder

export interface Movement { date: string; reference_type: string; quantity: number }

const SOLD = new Set(['sales', 'quotation_invoice', 'non_vat_sales']);
const RETURNED = new Set(['sales_return', 'quotation_sales_return', 'non_vat_sales_return']);

/** Net units sold per calendar month for the last `months` months (oldest first). */
export function monthlyUnits(rows: Movement[], months = 12, now = new Date()): { key: string; label: string; value: number }[] {
  const out: { key: string; label: string; value: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    idx.set(key, out.length);
    out.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), value: 0 });
  }
  for (const r of rows) {
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const i = idx.get(key);
    if (i === undefined) continue;
    if (SOLD.has(r.reference_type)) out[i].value += Number(r.quantity) || 0;
    else if (RETURNED.has(r.reference_type)) out[i].value -= Number(r.quantity) || 0;
  }
  return out.map((x) => ({ ...x, value: Math.max(0, r2(x.value)) }));
}

/** Net units sold in the last `days` days. */
export function soldInLast(rows: Movement[], days: number, now = new Date()): number {
  const from = now.getTime() - days * 86400000;
  let n = 0;
  for (const r of rows) {
    const t = new Date(r.date).getTime();
    if (!(t >= from && t <= now.getTime())) continue;
    if (SOLD.has(r.reference_type)) n += Number(r.quantity) || 0;
    else if (RETURNED.has(r.reference_type)) n -= Number(r.quantity) || 0;
  }
  return Math.max(0, r2(n));
}

export interface ReorderAdvice {
  /** Average units sold per day over the look-back window. */
  dailyRate: number;
  /** Days the current stock lasts at that rate (Infinity when nothing sells). */
  daysLeft: number;
  low: boolean;
  out: boolean;
  /** Units to order to reach `coverDays` of stock after the lead time. */
  suggest: number;
}

/**
 * The API has no reorder level, so low stock is derived from demand:
 * low when stock covers fewer than `lowDays` days of average sales (90-day window).
 */
export function reorderAdvice(stock: number, rows: Movement[], opts: { now?: Date; windowDays?: number; lowDays?: number; coverDays?: number; leadDays?: number } = {}): ReorderAdvice {
  const { now = new Date(), windowDays = 90, lowDays = 14, coverDays = 30, leadDays = 7 } = opts;
  const sold = soldInLast(rows, windowDays, now);
  const dailyRate = sold / windowDays;
  const s = Number(stock) || 0;
  const daysLeft = dailyRate > 0 ? Math.max(0, s) / dailyRate : Infinity;
  const out = s <= 0;
  const low = out ? dailyRate > 0 || s < 0 : daysLeft < lowDays;
  const target = dailyRate * (coverDays + leadDays);
  const suggest = low ? Math.max(1, Math.ceil(target - Math.max(0, s))) : 0;
  return { dailyRate: r2(dailyRate), daysLeft: Number.isFinite(daysLeft) ? Math.floor(daysLeft) : Infinity, low, out, suggest };
}

// ---------------------------------------------------------------- services

export const SERVICE_UNITS = [
  { value: 'C62', label: 'Each / Per visit (C62)' },
  { value: 'HUR', label: 'Hour (HUR)' },
  { value: 'DAY', label: 'Day (DAY)' },
  { value: 'WEE', label: 'Week (WEE)' },
  { value: 'MON', label: 'Month (MON)' },
  { value: 'ANN', label: 'Year (ANN)' },
];

/** Legacy free-text units → UN/ECE codes (service/create.js:156). */
export function normalizeServiceUnit(u?: string | null): string {
  if (!u) return 'C62';
  if (SERVICE_UNITS.some((x) => x.value === u)) return u;
  const map: Record<string, string> = { hour: 'HUR', day: 'DAY', month: 'MON', week: 'WEE', year: 'ANN', session: 'C62', package: 'C62', visit: 'C62' };
  return map[u.toLowerCase()] || 'C62';
}

/** "90 minutes" → "1h 30m"; other units shown as "2 hours". */
export function formatDuration(n?: number | null, unit?: string | null): string {
  const v = Number(n) || 0;
  if (!v) return '';
  const u = unit || 'minutes';
  if (u === 'minutes') {
    if (v < 60) return `${v}m`;
    const h = Math.floor(v / 60), m = v % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${v} ${u}`;
}

export const PRODUCT_UNITS = [
  { value: '', label: 'Piece (PCE)' },
  { value: 'drum', label: 'Drum (DRM)' },
  { value: 'set', label: 'Set (SET)' },
  { value: 'Kg', label: 'Kilogram (KGM)' },
  { value: 'Meter(s)', label: 'Metre (MTR)' },
  { value: 'CMT', label: 'Centimetre (CMT)' },
  { value: 'MMT', label: 'Millimetre (MMT)' },
  { value: 'Gm', label: 'Gram (GRM)' },
  { value: 'L', label: 'Litre (LTR)' },
  { value: 'Mg', label: 'Milligram (MG)' },
];

/** Western → Arabic-Indic digits for *_arabic fields (legacy map "۰۱۲۳٤۵٦۷۸۹"). */
export function toArabicDigits(s?: string | null): string {
  const map = '۰۱۲۳٤۵٦۷۸۹';
  return (s || '').replace(/\d/g, (d) => map[Number(d)]);
}
