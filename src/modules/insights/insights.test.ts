import { describe, expect, it } from 'vitest';
import { forecastRows, overallSummary, parseCsv, pct, profitLoss, statSettings, vatOf, withoutVatOf } from './stats';
import { bucketIndex, bucketLabels, bucketSeries, daysInMonth, firstYearOf, toggleSlot } from './analytics';

const metas = {
  sales: { total_sales: 1150, cash_discount: 10, commission: 5, vat_price: 150 },
  salesReturn: { total_sales_return: 115, cash_discount: 2, commission: 1, vat_price: 15 },
  purchase: { total_purchase: 460, cash_discount: 4, accounted_purchase: 300, accounted_purchase_cash_discount: 3, vat_price: 60 },
  purchaseReturn: { total_purchase_return: 46, cash_discount: 1, accounted_purchase_return: 20, accounted_purchase_return_cash_discount: 1, vat_price: 6 },
  expense: { total: 200, salary_paid: 50 },
  receivables: { purchase_fund: 30 },
  quotation: { invoice_total_sales: 100, invoice_cash_discount: 1 },
  qsr: { total_quotation_sales_return: 10, cash_discount: 0 },
  nonVatSales: { net_total: 40 },
  nonVatSalesReturn: { total_non_vat_sales_return: 5 },
};

describe('profit / loss (§8.1)', () => {
  it('default settings', () => {
    const r = profitLoss(metas, statSettings({}));
    expect(r.revenue).toBe(1035);
    // 200 + 460 − 46 + (10 − 2 + 1 − 4) + (5 − 1)
    expect(r.expense).toBe(623);
    expect(r.profit).toBe(412);
    expect(r.profitVat).toBe(vatOf(412, 15));
    expect(r.revenueWithoutVat).toBe(900);
  });
  it('quotation accounting, non-VAT sales, purchases on accounts, employee salaries', () => {
    const s = statSettings({ enable_sales_in_quotation: true, non_vat_sales: true, disable_purchases_on_accounts: true, enable_employee_module: true }, 15);
    const r = profitLoss(metas, s);
    expect(r.revenueBase).toBe(1125);
    expect(r.revenue).toBe(1160);
    // 200 − 30 + 300 − 20 + (10 − 2 + 1 − 3 + 1 − 0) + 4 + 50
    expect(r.expense).toBe(511);
    expect(r.revenueParts.map((p) => p.label)).toContain('Non-VAT sales');
    expect(r.expenseParts.map((p) => p.label)).toContain('Salaries paid');
  });
  it('treats missing modules as zero', () => {
    expect(profitLoss({}, statSettings({}))).toMatchObject({ revenue: 0, expense: 0, profit: 0 });
  });
});

describe('overall summary & helpers', () => {
  it('computes with/without VAT figures', () => {
    expect(overallSummary(metas)).toEqual({ salesWithVat: 1035, purchaseWithVat: 414, differenceWithVat: 621, salesWithoutVat: 900, purchaseWithoutVat: 360, differenceWithoutVat: 540, vat: 81 });
    expect(pct(25, 200)).toBe(12.5);
    expect(pct(5, 0)).toBe(0);
    expect(withoutVatOf(115, 15)).toBe(100);
  });
  it('parses forecast CSVs', () => {
    const rows = parseCsv('month_name,year,predicted_revenue,predicted_gross_sales,predicted_sales_returns,qtn_accounting,predicted_qtn_sales\r\nNov,2026,900,1000,100,1,50\n');
    expect(rows).toEqual([{ month_name: 'Nov', year: '2026', predicted_revenue: '900', predicted_gross_sales: '1000', predicted_sales_returns: '100', qtn_accounting: '1', predicted_qtn_sales: '50' }]);
    const f = forecastRows('revenue', rows);
    expect(f[0]).toMatchObject({ label: 'Nov 2026', value: 900 });
    expect(f[0].parts!.map((p) => p.label)).toEqual(['Gross sales', 'Qtn. invoice sales', 'Sales returns', 'Qtn. sales returns']);
    expect(forecastRows('profit', [{ month_name: 'Dec', year: '2026', predicted_profit: '-5', is_profit: '0' }])[0]).toEqual({ label: 'Dec 2026', value: -5, good: false });
    expect(parseCsv('')).toEqual([]);
  });
});

describe('analytics bucketing (§9)', () => {
  const sel = { year: 2026, month: 9, day: 5 };
  const recs = [
    { date: new Date(2026, 9, 5, 9, 30).toISOString(), net_total: 10 },
    { date: new Date(2026, 9, 5, 9, 45).toISOString(), net_total: 5 },
    { date: new Date(2026, 9, 1, 12).toISOString(), net_total: 7 },
    { date: new Date(2026, 2, 1, 12).toISOString(), net_total: 3 },
    { date: new Date(2024, 2, 1, 12).toISOString(), net_total: 1 },
    { date: 'bad', net_total: 99 },
  ];
  it('labels each granularity', () => {
    expect(bucketLabels('hourly', sel, 2024, 2026)).toHaveLength(24);
    expect(bucketLabels('daily', sel, 2024, 2026)).toHaveLength(daysInMonth(2026, 9));
    expect(bucketLabels('monthly', sel, 2024, 2026)[0]).toBe('Jan');
    expect(bucketLabels('yearly', sel, 2024, 2026)).toEqual(['2024', '2025', '2026']);
  });
  it('cuts off future buckets', () => {
    const now = new Date(2026, 9, 5, 15);
    expect(bucketLabels('monthly', sel, 2024, 2026, now)).toHaveLength(10);
    expect(bucketLabels('daily', sel, 2024, 2026, now)).toHaveLength(5);
    expect(bucketLabels('hourly', sel, 2024, 2026, now)).toHaveLength(16);
    expect(bucketLabels('monthly', { ...sel, year: 2025 }, 2024, 2026, now)).toHaveLength(12);
  });
  it('sums values into the right buckets in local time', () => {
    expect(bucketSeries(recs, 'net_total', 'hourly', sel, 2024, 2026)[9]).toBe(15);
    const daily = bucketSeries(recs, 'net_total', 'daily', sel, 2024, 2026);
    expect([daily[0], daily[4]]).toEqual([7, 15]);
    const monthly = bucketSeries(recs, 'net_total', 'monthly', sel, 2024, 2026);
    expect([monthly[2], monthly[9]]).toEqual([3, 22]);
    expect(bucketSeries(recs, 'net_total', 'yearly', sel, 2024, 2026)).toEqual([1, 0, 25]);
    expect(bucketIndex(new Date(2025, 0, 1), 'monthly', sel, 2024)).toBe(-1);
  });
  it('finds the first year with data', () => {
    expect(firstYearOf([recs], 2026)).toBe(2024);
    expect(firstYearOf([[]], 2026)).toBe(2026);
  });
  it('keeps colour slots stable while toggling series', () => {
    let s: (string | null)[] = ['sales', null, null];
    s = toggleSlot(s, 'expense');
    s = toggleSlot(s, 'purchase');
    expect(s).toEqual(['sales', 'expense', 'purchase']);
    expect(toggleSlot(s, 'paid_sales')).toEqual(s); // full
    s = toggleSlot(s, 'sales');
    expect(s).toEqual([null, 'expense', 'purchase']);
    expect(toggleSlot(s, 'paid_sales')).toEqual(['paid_sales', 'expense', 'purchase']);
  });
});
