// Statistics page formulas (finance.md §8). Inputs are the `meta` objects of other modules' list endpoints.
import { round } from '@/lib/format';

export type Meta = Record<string, any>;
export interface Metas {
  sales?: Meta; salesReturn?: Meta; purchase?: Meta; purchaseReturn?: Meta; expense?: Meta;
  receivables?: Meta; payables?: Meta; quotation?: Meta; qsr?: Meta; nonVatSales?: Meta; nonVatSalesReturn?: Meta;
}
export interface StatSettings { qtnAcc: boolean; nonVat: boolean; onAcc: boolean; employees: boolean; vatPercent: number }
export const statSettings = (s: Record<string, any> = {}, vat?: number): StatSettings => ({
  qtnAcc: s.enable_sales_in_quotation === true,
  nonVat: s.non_vat_sales === true,
  onAcc: s.disable_purchases_on_accounts === true,
  employees: s.enable_employee_module === true,
  vatPercent: vat || 15,
});

const n = (v: unknown) => Number(v) || 0;
export const vatOf = (x: number, p: number) => round((x * p) / (100 + p));
export const withoutVatOf = (x: number, p: number) => round(x - (x * p) / (100 + p));

export interface Component { label: string; value: number; sign: 1 | -1 }
export interface ProfitLoss {
  revenueBase: number; revenue: number; expense: number; profit: number;
  profitVat: number; revenueWithoutVat: number; expenseWithoutVat: number; profitWithoutVat: number;
  revenueParts: Component[]; expenseParts: Component[];
}

/** §8.1 Profit / Loss statement. */
export function profitLoss(m: Metas, s: StatSettings): ProfitLoss {
  const S = m.sales || {}, SR = m.salesReturn || {}, P = m.purchase || {}, PR = m.purchaseReturn || {}, E = m.expense || {}, R = m.receivables || {}, Q = m.quotation || {}, QSR = m.qsr || {};
  const revenueParts: Component[] = [
    { label: 'Sales', value: n(S.total_sales), sign: 1 },
    { label: 'Sales returns', value: n(SR.total_sales_return), sign: -1 },
    ...(s.qtnAcc ? [{ label: 'Qtn. invoice sales', value: n(Q.invoice_total_sales), sign: 1 as const }, { label: 'Qtn. sales returns', value: n(QSR.total_quotation_sales_return), sign: -1 as const }] : []),
  ];
  const revenueBase = revenueParts.reduce((a, c) => a + c.sign * c.value, 0);
  const nonVatParts: Component[] = s.nonVat ? [{ label: 'Non-VAT sales', value: n(m.nonVatSales?.net_total), sign: 1 }, { label: 'Non-VAT sales returns', value: n(m.nonVatSalesReturn?.total_non_vat_sales_return), sign: -1 }] : [];
  const revenue = revenueBase + nonVatParts.reduce((a, c) => a + c.sign * c.value, 0);
  const purCD = s.onAcc ? n(P.accounted_purchase_cash_discount) : n(P.cash_discount);
  const purRetCD = s.onAcc ? n(PR.accounted_purchase_return_cash_discount) : n(PR.cash_discount);
  const expenseParts: Component[] = [
    { label: 'Expenses', value: n(E.total), sign: 1 },
    ...(s.onAcc
      ? [{ label: 'Purchase fund deposits', value: n(R.purchase_fund), sign: -1 as const }, { label: 'Accounted purchases', value: n(P.accounted_purchase), sign: 1 as const }, { label: 'Accounted purchase returns', value: n(PR.accounted_purchase_return), sign: -1 as const }]
      : [{ label: 'Purchases', value: n(P.total_purchase), sign: 1 as const }, { label: 'Purchase returns', value: n(PR.total_purchase_return), sign: -1 as const }]),
    { label: 'Sales cash discount', value: n(S.cash_discount), sign: 1 },
    { label: 'Sales return cash discount', value: n(SR.cash_discount), sign: -1 },
    { label: 'Purchase return cash discount', value: purRetCD, sign: 1 },
    { label: 'Purchase cash discount', value: purCD, sign: -1 },
    ...(s.qtnAcc ? [{ label: 'Qtn. invoice cash discount', value: n(Q.invoice_cash_discount), sign: 1 as const }, { label: 'Qtn. return cash discount', value: n(QSR.cash_discount), sign: -1 as const }] : []),
    { label: 'Sales commission', value: n(S.commission), sign: 1 },
    { label: 'Sales return commission', value: n(SR.commission), sign: -1 },
    ...(s.employees ? [{ label: 'Salaries paid', value: n(E.salary_paid), sign: 1 as const }] : []),
  ];
  const expense = expenseParts.reduce((a, c) => a + c.sign * c.value, 0);
  const profit = revenue - expense;
  const p = s.vatPercent;
  return {
    revenueBase: round(revenueBase), revenue: round(revenue), expense: round(expense), profit: round(profit),
    profitVat: vatOf(profit, p), revenueWithoutVat: withoutVatOf(revenueBase, p), expenseWithoutVat: withoutVatOf(expense, p), profitWithoutVat: withoutVatOf(profit, p),
    revenueParts: [...revenueParts, ...nonVatParts], expenseParts,
  };
}

/** §8.2 Overall summary. */
export function overallSummary(m: Metas) {
  const s = n(m.sales?.total_sales), sr = n(m.salesReturn?.total_sales_return), p = n(m.purchase?.total_purchase), pr = n(m.purchaseReturn?.total_purchase_return);
  const sv = n(m.sales?.vat_price), srv = n(m.salesReturn?.vat_price), pv = n(m.purchase?.vat_price), prv = n(m.purchaseReturn?.vat_price);
  const salesWith = s - sr, purWith = p - pr;
  const salesWo = s - sv - (sr - srv), purWo = p - pv - (pr - prv);
  return {
    salesWithVat: round(salesWith), purchaseWithVat: round(purWith), differenceWithVat: round(salesWith - purWith),
    salesWithoutVat: round(salesWo), purchaseWithoutVat: round(purWo), differenceWithoutVat: round(salesWo - purWo),
    vat: round(sv - srv - (pv - prv)),
  };
}

export const pct = (part: number, whole: number) => (whole ? round((part / whole) * 100) : 0);

/** Naive CSV (first line = headers), as the legacy forecast reader. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const h = lines[0].split(',').map((x) => x.trim());
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(h.map((k, i) => [k, (c[i] ?? '').trim()]));
  });
}

export interface ForecastRow { label: string; value: number; good?: boolean; parts?: Component[] }
export function forecastRows(kind: 'revenue' | 'expense' | 'profit', rows: Record<string, string>[]): ForecastRow[] {
  return rows.map((r) => {
    const label = `${r.month_name || ''} ${r.year || ''}`.trim();
    if (kind === 'revenue') {
      const qtn = r.qtn_accounting === '1';
      return {
        label, value: n(r.predicted_revenue),
        parts: [
          { label: 'Gross sales', value: n(r.predicted_gross_sales), sign: 1 },
          ...(qtn ? [{ label: 'Qtn. invoice sales', value: n(r.predicted_qtn_sales), sign: 1 as const }] : []),
          { label: 'Sales returns', value: n(r.predicted_sales_returns), sign: -1 },
          ...(qtn ? [{ label: 'Qtn. sales returns', value: n(r.predicted_qtn_sales_returns), sign: -1 as const }] : []),
        ],
      };
    }
    if (kind === 'expense') return { label, value: n(r.predicted_expense) };
    return { label, value: n(r.predicted_profit), good: r.is_profit === '1' };
  });
}
