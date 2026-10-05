// Pure business-dashboard maths (finance.md §10). Monthly rows come from GET /v1/dashboard/monthly.
import { round } from '@/lib/format';

export type Settings = Record<string, any>;

export interface Monthly {
  month_str: string;
  sales_amount?: number; sales_count?: number; paid_amount?: number; unpaid_amount?: number; partial_amount?: number;
  sales_return_amount?: number; qtn_invoice_amount?: number; qtn_invoice_return_amount?: number;
  purchase_amount?: number; purchase_return_amount?: number; accounted_purchase_amount?: number; accounted_purchase_return_amount?: number;
  sales_commission?: number; sales_return_commission?: number;
  sales_cash_discount?: number; sales_return_cash_discount?: number; purchase_cash_discount?: number; purchase_return_cash_discount?: number;
  accounted_purchase_cash_discount?: number; accounted_purchase_return_cash_discount?: number; qtn_sales_cash_discount?: number; qtn_sales_return_cash_discount?: number;
  expense_amount?: number; salary_paid?: number; deposit_purchase_fund?: number; non_vat_sales_amount?: number; non_vat_sales_return_amount?: number;
  sales_vat?: number; sales_return_vat?: number; purchase_vat?: number; purchase_return_vat?: number; accounted_purchase_vat?: number; accounted_purchase_return_vat?: number; expense_vendor_vat?: number;
  [k: string]: any;
}

const n = (v: unknown) => Number(v) || 0;

// ---------------------------------------------------------------- months & presets

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function addMonths(key: string, k: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + k, 1));
}
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < 600; k = addMonths(k, 1)) out.push(k);
  return out;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10" → "Oct 26" (chart axis). */
export const monthLabel = (key: string) => `${MON[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;

export type Preset = 'mtd' | '3m' | 'ytd' | '12m';
export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'mtd', label: 'MTD' },
  { id: '3m', label: '3M' },
  { id: 'ytd', label: 'YTD' },
  { id: '12m', label: '12M' },
];

/** Months covered by a preset, and the equally long window just before it (for deltas). */
export function presetWindow(p: Preset, now: Date = new Date()): { from: string; to: string; prevFrom: string; prevTo: string; months: number } {
  const to = monthKey(now);
  const len = p === 'mtd' ? 1 : p === '3m' ? 3 : p === 'ytd' ? now.getMonth() + 1 : 12;
  const from = addMonths(to, -(len - 1));
  if (p === 'ytd') return { from, to, prevFrom: addMonths(from, -12), prevTo: addMonths(to, -12), months: len };
  return { from, to, prevFrom: addMonths(from, -len), prevTo: addMonths(from, -1), months: len };
}

/** Months with no activity are dropped like the legacy dashboard (§10.2). */
export const isEmptyMonth = (r: Monthly) => n(r.sales_amount) + n(r.sales_return_amount) + n(r.purchase_amount) + n(r.expense_amount) + n(r.qtn_invoice_amount) === 0;

export const inWindow = (rows: Monthly[], from: string, to: string) => rows.filter((r) => r.month_str >= from && r.month_str <= to);

// ---------------------------------------------------------------- formulas (§10.4 / §10.5)

export interface Flags { qtnAcc: boolean; onAcc: boolean; nonVat: boolean; employees: boolean; vatBox: boolean; vatPercent: number }
export const flagsFrom = (s: Settings = {}, vatPercent?: number): Flags => ({
  qtnAcc: s.enable_sales_in_quotation === true,
  onAcc: s.disable_purchases_on_accounts === true,
  nonVat: s.non_vat_sales === true,
  employees: s.enable_employee_module === true,
  vatBox: s.enable_vat_box === true,
  vatPercent: vatPercent || 15,
});

export function netRevenue(r: Monthly, f: Flags): number {
  return n(r.sales_amount) - n(r.sales_return_amount) + (f.qtnAcc ? n(r.qtn_invoice_amount) - n(r.qtn_invoice_return_amount) : 0);
}
export function cashDiscountAdj(r: Monthly, f: Flags): number {
  const purCD = f.onAcc ? n(r.accounted_purchase_cash_discount) : n(r.purchase_cash_discount);
  const purRetCD = f.onAcc ? n(r.accounted_purchase_return_cash_discount) : n(r.purchase_return_cash_discount);
  return n(r.sales_cash_discount) - n(r.sales_return_cash_discount) + purRetCD - purCD + (f.qtnAcc ? n(r.qtn_sales_cash_discount) - n(r.qtn_sales_return_cash_discount) : 0);
}
export function baseExpense(r: Monthly, f: Flags): number {
  return f.onAcc
    ? n(r.expense_amount) - n(r.deposit_purchase_fund) + n(r.accounted_purchase_amount) - n(r.accounted_purchase_return_amount)
    : n(r.expense_amount) + n(r.purchase_amount) - n(r.purchase_return_amount);
}
/** KPI "Total expense": base + cash-discount adj + commissions + salaries (if employee module). */
export function totalExpense(r: Monthly, f: Flags): number {
  return baseExpense(r, f) + cashDiscountAdj(r, f) + (n(r.sales_commission) - n(r.sales_return_commission)) + (f.employees ? n(r.salary_paid) : 0);
}
export const purchases = (r: Monthly, f: Flags) => (f.onAcc ? n(r.accounted_purchase_amount) - n(r.accounted_purchase_return_amount) : n(r.purchase_amount) - n(r.purchase_return_amount));
export function vatNet(r: Monthly, f: Flags): number {
  const pv = f.onAcc ? n(r.accounted_purchase_vat) : n(r.purchase_vat);
  const prv = f.onAcc ? n(r.accounted_purchase_return_vat) : n(r.purchase_return_vat);
  // Expense VAT is *added* in the legacy KPI card — replicated as-is (§10.5).
  return n(r.sales_vat) - n(r.sales_return_vat) - pv + prv + n(r.expense_vendor_vat);
}

export interface Kpis {
  revenue: number; totalRevenue: number; expense: number; profit: number; purchases: number;
  orders: number; avgOrder: number; returnRate: number; vat: number; salesGross: number; salesReturn: number;
}
export function kpis(rows: Monthly[], f: Flags): Kpis {
  const sum = (fn: (r: Monthly) => number) => rows.reduce((a, r) => a + fn(r), 0);
  const revenue = sum((r) => netRevenue(r, f));
  const totalRevenue = revenue + (f.nonVat ? sum((r) => n(r.non_vat_sales_amount) - n(r.non_vat_sales_return_amount)) : 0);
  const expense = sum((r) => totalExpense(r, f));
  const salesGross = sum((r) => n(r.sales_amount));
  const salesReturn = sum((r) => n(r.sales_return_amount));
  const orders = sum((r) => n(r.sales_count));
  return {
    revenue: round(revenue), totalRevenue: round(totalRevenue), expense: round(expense), profit: round(totalRevenue - expense),
    purchases: round(sum((r) => purchases(r, f))), orders, avgOrder: orders ? round(salesGross / orders) : 0,
    returnRate: salesGross ? round((salesReturn / salesGross) * 100) : 0, vat: round(sum((r) => vatNet(r, f))), salesGross: round(salesGross), salesReturn: round(salesReturn),
  };
}

/** Per-month series over `keys` with zero fill (months missing from the API count as 0). */
export function series(rows: Monthly[], keys: string[], fn: (r: Monthly) => number): number[] {
  const by = new Map(rows.map((r) => [r.month_str, r]));
  return keys.map((k) => (by.has(k) ? round(fn(by.get(k)!)) : 0));
}

/** Percentage change vs the previous window; undefined when there is no base to compare with. */
export function delta(cur: number, prev: number): number | undefined {
  if (!prev) return undefined;
  return round(((cur - prev) / Math.abs(prev)) * 100, 1);
}

/** Portion of a VAT-inclusive amount that is VAT: X·p/(100+p). */
export const withoutVat = (x: number, p: number) => round(x - (x * p) / (100 + p));

const METHODS: [string, string][] = [['cash', 'Cash'], ['debit_card', 'Debit card'], ['bank_card', 'Bank card'], ['credit_card', 'Credit card'], ['bank_transfer', 'Bank transfer'], ['bank_cheque', 'Bank cheque'], ['customer_account', 'Customer account']];
/** Collections by payment method over the window (+ quotation invoice payments when quotations are accounted), largest first, zeros dropped. */
export function paymentMix(rows: Monthly[], f: Flags): { label: string; value: number }[] {
  return METHODS.map(([k, label]) => ({ label, value: round(rows.reduce((a, r) => a + n(r[`payment_${k}`]) + (f.qtnAcc ? n(r[`qtn_payment_${k}`]) : 0), 0)) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ---------------------------------------------------------------- receivables aging & tasks

export interface OpenInvoice { date?: string; balance_amount?: number }
export const AGING_BUCKETS = ['0–30', '31–60', '61–90', '90+'] as const;
export function aging(rows: OpenInvoice[], now: Date = new Date()): { label: string; value: number; count: number }[] {
  const out = AGING_BUCKETS.map((label) => ({ label: label as string, value: 0, count: 0 }));
  for (const r of rows) {
    const bal = n(r.balance_amount);
    if (bal <= 0 || !r.date) continue;
    const days = Math.floor((now.getTime() - new Date(r.date).getTime()) / 86400000);
    const i = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
    out[i].value = round(out[i].value + bal);
    out[i].count++;
  }
  return out;
}

export interface TaskInput {
  zatcaFailed?: number;
  openSales?: { count: number; amount: number };
  overdue?: { count: number; amount: number };
  openPurchases?: { count: number; amount: number };
  stock?: { out_of_stock?: number; low_stock?: number } | null;
  tb?: { debit: number; credit: number } | null;
  salaryOwed?: number;
}
export interface Task { id: string; tone: 'crit' | 'warn' | 'info'; count: number | string; title: string; sub: string; subArgs?: Record<string, string | number>; path: string; action: string }

/** "Needs attention" list, most urgent first; only items with something to do. */
export function buildTasks(i: TaskInput, fmt: (x: number) => string): Task[] {
  const t: Task[] = [];
  if (i.zatcaFailed) t.push({ id: 'zatca', tone: 'crit', count: i.zatcaFailed, title: 'ZATCA rejected invoices', sub: 'Fix the errors, then report again', path: '/sales/invoices?view=zatca', action: 'Review' });
  if (i.tb && Math.abs(i.tb.debit - i.tb.credit) >= 0.005) t.push({ id: 'tb', tone: 'crit', count: '!', title: 'Trial balance is out of balance', sub: 'Difference {{n}}', subArgs: { n: fmt(Math.abs(i.tb.debit - i.tb.credit)) }, path: '/finance/accounts?tab=tb', action: 'Review' });
  if (i.overdue?.count) t.push({ id: 'overdue', tone: 'warn', count: i.overdue.count, title: 'Overdue receivables (30+ days)', sub: 'SAR {{n}} outstanding', subArgs: { n: fmt(i.overdue.amount) }, path: '/sales/invoices?view=open', action: 'Remind' });
  if (i.stock?.out_of_stock) t.push({ id: 'oos', tone: 'warn', count: i.stock.out_of_stock, title: 'Products out of stock', sub: 'Reorder before you lose sales', path: '/stock/products', action: 'Reorder' });
  if (i.stock?.low_stock) t.push({ id: 'low', tone: 'warn', count: i.stock.low_stock, title: 'Low stock (under 5 units)', sub: 'Plan a purchase order', path: '/stock/products', action: 'Plan' });
  if (i.openSales?.count) t.push({ id: 'open', tone: 'info', count: i.openSales.count, title: 'Unpaid sales invoices', sub: 'SAR {{n}} to collect', subArgs: { n: fmt(i.openSales.amount) }, path: '/sales/invoices?view=open', action: 'Collect' });
  if (i.openPurchases?.count) t.push({ id: 'bills', tone: 'info', count: i.openPurchases.count, title: 'Unpaid purchase bills', sub: 'SAR {{n}} to pay', subArgs: { n: fmt(i.openPurchases.amount) }, path: '/buying/purchases?f.payment_status=not_paid', action: 'Pay' });
  if (i.salaryOwed && i.salaryOwed > 0) t.push({ id: 'salary', tone: 'info', count: '!', title: 'Salaries owed to employees', sub: 'SAR {{n}}', subArgs: { n: fmt(i.salaryOwed) }, path: '/workshop/salaries', action: 'Pay' });
  return t;
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
