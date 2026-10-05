import { describe, expect, it } from 'vitest';
import { addMonths, aging, paymentMix, buildTasks, delta, flagsFrom, greeting, isEmptyMonth, kpis, monthLabel, monthRange, presetWindow, series, totalExpense, vatNet, withoutVat, type Monthly } from './dashboard';

const NOW = new Date(2026, 9, 5, 15, 0, 0); // 05 Oct 2026

describe('months and presets', () => {
  it('walks month keys across years', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthLabel('2026-10')).toBe('Oct 26');
  });
  it('resolves presets and their comparison windows', () => {
    expect(presetWindow('mtd', NOW)).toEqual({ from: '2026-10', to: '2026-10', prevFrom: '2026-09', prevTo: '2026-09', months: 1 });
    expect(presetWindow('3m', NOW)).toMatchObject({ from: '2026-08', to: '2026-10', prevFrom: '2026-05', prevTo: '2026-07' });
    expect(presetWindow('ytd', NOW)).toMatchObject({ from: '2026-01', to: '2026-10', prevFrom: '2025-01', prevTo: '2025-10', months: 10 });
    expect(presetWindow('12m', NOW)).toMatchObject({ from: '2025-11', to: '2026-10', prevFrom: '2024-11', prevTo: '2025-10' });
  });
});

const row = (p: Partial<Monthly>): Monthly => ({ month_str: '2026-10', ...p });

describe('KPI formulas (§10.5)', () => {
  const rows = [
    row({ month_str: '2026-09', sales_amount: 1000, sales_count: 4, sales_return_amount: 100, purchase_amount: 400, purchase_return_amount: 50, expense_amount: 200, sales_cash_discount: 10, purchase_cash_discount: 5, sales_commission: 3, salary_paid: 30, qtn_invoice_amount: 500, qtn_invoice_return_amount: 20, non_vat_sales_amount: 70, sales_vat: 130, purchase_vat: 52, expense_vendor_vat: 4 }),
  ];
  it('computes revenue, expense and profit with default settings', () => {
    const k = kpis(rows, flagsFrom({}));
    expect(k.revenue).toBe(900);
    expect(k.totalRevenue).toBe(900);
    // 200 + 400 − 50 + (10 − 5) + 3
    expect(k.expense).toBe(558);
    expect(k.profit).toBe(342);
    expect(k.orders).toBe(4);
    expect(k.avgOrder).toBe(250);
    expect(k.returnRate).toBe(10);
    expect(k.vat).toBe(82);
  });
  it('honours quotation accounting, non-VAT sales and the employee module', () => {
    const f = flagsFrom({ enable_sales_in_quotation: true, non_vat_sales: true, enable_employee_module: true });
    const k = kpis(rows, f);
    expect(k.revenue).toBe(1380);
    expect(k.totalRevenue).toBe(1450);
    expect(k.expense).toBe(588);
  });
  it('uses accounted purchases and nets the purchase fund when purchases are on accounts', () => {
    const f = flagsFrom({ disable_purchases_on_accounts: true });
    const r = row({ expense_amount: 100, deposit_purchase_fund: 40, accounted_purchase_amount: 300, accounted_purchase_return_amount: 30, purchase_amount: 999, accounted_purchase_vat: 39, purchase_vat: 999 });
    expect(totalExpense(r, f)).toBe(330);
    expect(vatNet(r, f)).toBe(-39);
  });
  it('guards divisions by zero', () => {
    expect(kpis([], flagsFrom({}))).toMatchObject({ avgOrder: 0, returnRate: 0, profit: 0 });
  });
  it('drops all-zero months', () => {
    expect(isEmptyMonth(row({ paid_amount: 10 }))).toBe(true);
    expect(isEmptyMonth(row({ expense_amount: 1 }))).toBe(false);
  });
  it('builds zero-filled monthly series and deltas', () => {
    expect(series([row({ month_str: '2026-09', sales_amount: 5 })], ['2026-08', '2026-09', '2026-10'], (r) => r.sales_amount || 0)).toEqual([0, 5, 0]);
    expect(delta(120, 100)).toBe(20);
    expect(delta(-50, -100)).toBe(50);
    expect(delta(10, 0)).toBeUndefined();
    expect(withoutVat(115, 15)).toBe(100);
  });
});

describe('payment mix', () => {
  it('sums methods, adds quotation payments only when accounted, sorts and drops zeros', () => {
    const rows = [row({ payment_cash: 10, payment_bank_transfer: 30, qtn_payment_cash: 5 }), row({ payment_cash: 15 })];
    expect(paymentMix(rows, flagsFrom({}))).toEqual([{ label: 'Bank transfer', value: 30 }, { label: 'Cash', value: 25 }]);
    expect(paymentMix(rows, flagsFrom({ enable_sales_in_quotation: true }))[0]).toEqual({ label: 'Cash', value: 30 });
  });
});

describe('receivables aging', () => {
  it('buckets open balances by age in days', () => {
    const a = aging([
      { date: '2026-10-01T10:00:00', balance_amount: 100 },
      { date: '2026-08-20T10:00:00', balance_amount: 50 },
      { date: '2026-07-20T10:00:00', balance_amount: 25 },
      { date: '2025-01-01T10:00:00', balance_amount: 10 },
      { date: '2026-10-01T10:00:00', balance_amount: 0 },
    ], NOW);
    expect(a.map((x) => [x.label, x.value, x.count])).toEqual([['0–30', 100, 1], ['31–60', 50, 1], ['61–90', 25, 1], ['90+', 10, 1]]);
  });
});

describe('needs-attention tasks', () => {
  const fmt = (x: number) => x.toFixed(2);
  it('orders tasks by urgency and skips empty ones', () => {
    const t = buildTasks({ zatcaFailed: 2, openSales: { count: 3, amount: 300 }, overdue: { count: 0, amount: 0 }, stock: { out_of_stock: 1, low_stock: 0 }, tb: { debit: 10, credit: 10 }, salaryOwed: 0 }, fmt);
    expect(t.map((x) => x.id)).toEqual(['zatca', 'oos', 'open']);
    expect(t[2]).toMatchObject({ count: 3, subArgs: { n: '300.00' }, path: '/sales/invoices?view=open' });
  });
  it('flags an unbalanced trial balance and salaries owed', () => {
    const t = buildTasks({ tb: { debit: 10, credit: 12.5 }, salaryOwed: 900 }, fmt);
    expect(t.map((x) => x.id)).toEqual(['tb', 'salary']);
    expect(t[0].subArgs).toEqual({ n: '2.50' });
  });
  it('returns nothing for a quiet store', () => {
    expect(buildTasks({}, fmt)).toEqual([]);
  });
  it('greets by time of day', () => {
    expect([greeting(8), greeting(13), greeting(20)]).toEqual(['Good morning', 'Good afternoon', 'Good evening']);
  });
});
