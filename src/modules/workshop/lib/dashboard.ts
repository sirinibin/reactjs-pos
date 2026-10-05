// Workshop dashboard period handling and number helpers (workshop spec §5).

export type DashMode = 'single_month' | 'month_range' | 'year' | 'single_date' | 'date_range' | 'year_range';
export const DASH_MODES: { value: DashMode; label: string }[] = [
  { value: 'single_month', label: 'Single Month' },
  { value: 'month_range', label: 'Month Range' },
  { value: 'year', label: 'Year' },
  { value: 'single_date', label: 'Single Date' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'year_range', label: 'Year Range' },
];

export interface DashRange { from: string; to: string }

/** Turn a mode + raw inputs into the applied range (YYYY-MM or YYYY-MM-DD). Incomplete → null (all time). */
export function toRange(mode: DashMode, a: string, b: string): DashRange | null {
  const ym = /^\d{4}-\d{2}$/, ymd = /^\d{4}-\d{2}-\d{2}$/, y = /^\d{4}$/;
  switch (mode) {
    case 'single_month': return ym.test(a) ? { from: a, to: a } : null;
    case 'month_range': return ym.test(a) && ym.test(b) ? (a <= b ? { from: a, to: b } : { from: b, to: a }) : null;
    case 'year': return y.test(a) ? { from: `${a}-01`, to: `${a}-12` } : null;
    case 'single_date': return ymd.test(a) ? { from: a, to: a } : null;
    case 'date_range': return ymd.test(a) && ymd.test(b) ? (a <= b ? { from: a, to: b } : { from: b, to: a }) : null;
    case 'year_range': return y.test(a) && y.test(b) ? { from: `${a <= b ? a : b}-01`, to: `${a <= b ? b : a}-12` } : null;
    default: return null;
  }
}

/** Range → query params: 10-char values use from_date/to_date, otherwise from_month/to_month. */
export function rangeParams(r: DashRange | null): Record<string, string> {
  if (!r) return {};
  return r.from.length === 10 ? { from_date: r.from, to_date: r.to } : { from_month: r.from, to_month: r.to };
}

/** All dashboard amounts are VAT-inclusive. */
export function calcVat(v: number, p: number) {
  const withVAT = Number(v) || 0;
  const vat = p > 0 ? (withVAT * p) / (100 + p) : 0;
  return { withVAT, vat, withoutVAT: withVAT - vat };
}

export function fmtCompact(v: number): string {
  const a = Math.abs(Number(v) || 0);
  const s = (x: number, suf: string) => `${(Math.round((v / x) * 10) / 10).toFixed(1).replace(/\.0$/, '')}${suf}`;
  if (a >= 1e9) return s(1e9, 'B');
  if (a >= 1e6) return s(1e6, 'M');
  if (a >= 1e3) return s(1e3, 'K');
  return (Math.round((Number(v) || 0) * 10) / 10).toFixed(1).replace(/\.0$/, '');
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(ym || '');
  return m ? `${MON[+m[2] - 1]} ${m[1]}` : ym;
}

export function periodText(r: DashRange | null): string {
  if (!r) return 'Last 12 Months';
  const f = (x: string) => (x.length === 7 ? fmtMonth(x) : x);
  return r.from === r.to ? f(r.from) : `${f(r.from)} → ${f(r.to)}`;
}

export interface MonthRow { month: string; labour_profit?: number; spare_profit?: number; additional_profit?: number; total_profit?: number; revenue?: number }

/** Years present in the (unfiltered) breakdown with any profit or revenue, newest first. */
export function yearOptions(rows: MonthRow[] | null | undefined): string[] {
  const s = new Set<string>();
  (rows || []).forEach((r) => { if ((r.total_profit || r.revenue) && /^\d{4}/.test(r.month)) s.add(r.month.slice(0, 4)); });
  return [...s].sort().reverse();
}

/** Revenue / expense / profit per month for the trend chart (expense = revenue − profit). */
export function trendSeries(rows: MonthRow[] | null | undefined) {
  const list = rows || [];
  return {
    labels: list.map((r) => fmtMonth(r.month)),
    revenue: list.map((r) => Number(r.revenue) || 0),
    expense: list.map((r) => (Number(r.revenue) || 0) - (Number(r.total_profit) || 0)),
    profit: list.map((r) => Number(r.total_profit) || 0),
  };
}
