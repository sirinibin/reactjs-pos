// Analytics bucketing (finance.md §9): raw records → per-period sums, in the browser's local timezone.
import { round } from '@/lib/format';

export type Source = 'order' | 'expense' | 'purchase' | 'sales_return' | 'purchase_return';
export const SOURCES: Record<Source, { path: string; select: string; resource: string }> = {
  order: { path: '/v1/order', select: 'date,net_total,total_payment_received,balance_amount,payment_status,net_profit,loss', resource: 'sales' },
  expense: { path: '/v1/expense', select: 'date,amount', resource: 'expenses' },
  purchase: { path: '/v1/purchase', select: 'date,net_total', resource: 'purchases' },
  sales_return: { path: '/v1/sales-return', select: 'date,net_total,net_profit,loss', resource: 'sales_return' },
  purchase_return: { path: '/v1/purchase-return', select: 'date,net_total', resource: 'purchase_return' },
};

export interface SeriesDef { id: string; label: string; source: Source; field: string }
export const SERIES_DEFS: SeriesDef[] = [
  { id: 'sales', label: 'Sales', source: 'order', field: 'net_total' },
  { id: 'sales_profit', label: 'Sales profit', source: 'order', field: 'net_profit' },
  { id: 'paid_sales', label: 'Paid sales', source: 'order', field: 'total_payment_received' },
  { id: 'credit_sales', label: 'Credit sales', source: 'order', field: 'balance_amount' },
  { id: 'sales_loss', label: 'Sales loss', source: 'order', field: 'loss' },
  { id: 'expense', label: 'Expense', source: 'expense', field: 'amount' },
  { id: 'purchase', label: 'Purchase', source: 'purchase', field: 'net_total' },
  { id: 'sales_return', label: 'Sales return', source: 'sales_return', field: 'net_total' },
  { id: 'sales_return_profit', label: 'Sales return profit', source: 'sales_return', field: 'net_profit' },
  { id: 'sales_return_loss', label: 'Sales return loss', source: 'sales_return', field: 'loss' },
  { id: 'purchase_return', label: 'Purchase return', source: 'purchase_return', field: 'net_total' },
];

export type Granularity = 'hourly' | 'daily' | 'monthly' | 'yearly';
export interface Selection { year: number; month: number; day: number }
export type Rec = { date?: string } & Record<string, any>;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Axis labels for a granularity + selection (yearly spans firstYear..current year). */
export function bucketLabels(g: Granularity, sel: Selection, firstYear: number, nowYear: number, now?: Date): string[] {
  // Future buckets are cut off so the line doesn't drop to a fake zero.
  const cur = (y: number, m?: number, d?: number) => !!now && now.getFullYear() === y && (m === undefined || now.getMonth() === m) && (d === undefined || now.getDate() === d);
  if (g === 'hourly') return Array.from({ length: cur(sel.year, sel.month, sel.day) ? now!.getHours() + 1 : 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  if (g === 'daily') return Array.from({ length: cur(sel.year, sel.month) ? now!.getDate() : daysInMonth(sel.year, sel.month) }, (_, d) => String(d + 1));
  if (g === 'monthly') return MON.slice(0, cur(sel.year) ? now!.getMonth() + 1 : 12);
  return Array.from({ length: Math.max(1, nowYear - firstYear + 1) }, (_, i) => String(firstYear + i));
}

/** Index of the bucket a date falls into, or -1 when outside the selection. */
export function bucketIndex(d: Date, g: Granularity, sel: Selection, firstYear: number): number {
  if (g === 'hourly') return d.getFullYear() === sel.year && d.getMonth() === sel.month && d.getDate() === sel.day ? d.getHours() : -1;
  if (g === 'daily') return d.getFullYear() === sel.year && d.getMonth() === sel.month ? d.getDate() - 1 : -1;
  if (g === 'monthly') return d.getFullYear() === sel.year ? d.getMonth() : -1;
  return d.getFullYear() - firstYear;
}

export function bucketSeries(records: Rec[], field: string, g: Granularity, sel: Selection, firstYear: number, nowYear: number, now?: Date): number[] {
  const out = new Array(bucketLabels(g, sel, firstYear, nowYear, now).length).fill(0);
  for (const r of records) {
    if (!r.date) continue;
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    const i = bucketIndex(d, g, sel, firstYear);
    if (i >= 0 && i < out.length) out[i] += Number(r[field]) || 0;
  }
  return out.map((v) => round(v));
}

/** Earliest year across all loaded records (legacy hard-coded 2020; we start at the data). */
export function firstYearOf(sets: Rec[][], fallback: number): number {
  let y = fallback;
  for (const s of sets) for (const r of s) {
    const d = r.date ? new Date(r.date) : null;
    if (d && !Number.isNaN(d.getTime())) y = Math.min(y, d.getFullYear());
  }
  return y;
}

/** Up to three series are plotted; a series keeps its colour slot while it stays selected. */
export function toggleSlot(slots: (string | null)[], id: string): (string | null)[] {
  const i = slots.indexOf(id);
  if (i >= 0) return slots.map((s, k) => (k === i ? null : s));
  const free = slots.indexOf(null);
  if (free < 0) return slots;
  return slots.map((s, k) => (k === free ? id : s));
}
