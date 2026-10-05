import { describe, expect, it } from 'vitest';
import {
  ancestors, balanceSides, buildStatement, buildTrialBalance, documentPath, expenseReport, expenseReportName, expenseVat, isBalanced, journalLabel, journalTotals,
  paymentLabel, stripDataUrl, titleCase, validateExpense, vatPortion, type Account,
} from './logic';
import { reportPrintRows, statementPrintRows, sumRows } from './printModel';

const acc = (p: Partial<Account>): Account => ({ id: p.id || Math.random().toString(36).slice(2), name: 'X', ...p });

describe('account balances', () => {
  it('splits the magnitude into the debit or credit column by debit_or_credit_balance', () => {
    expect(balanceSides({ balance: 100, debit_or_credit_balance: 'debit_balance' })).toEqual({ debit: 100, credit: 0 });
    expect(balanceSides({ balance: 40, debit_or_credit_balance: 'credit_balance' })).toEqual({ debit: 0, credit: 40 });
    expect(balanceSides({ balance: 0, debit_or_credit_balance: '' })).toEqual({ debit: 0, credit: 0 });
  });
  it('treats sub-cent differences as balanced', () => {
    expect(isBalanced(100.001, 100)).toBe(true);
    expect(isBalanced(265346.75, 265443.35)).toBe(false);
  });
});

describe('trial balance tree', () => {
  const accounts = [
    acc({ id: 'cash', name: 'CASH', number: '1000', type: 'asset', balance: 500, debit_or_credit_balance: 'debit_balance' }),
    acc({ id: 'c1', name: 'AL NOOR', number: '1010', type: 'asset', reference_model: 'customer', balance: 115, debit_or_credit_balance: 'debit_balance' }),
    acc({ id: 'v1', name: 'BOSCH', number: '1006', type: 'liability', reference_model: 'vendor', balance: 300, debit_or_credit_balance: 'credit_balance' }),
    acc({ id: 'sales', name: 'SALES', number: '1007', type: 'revenue', balance: 315, debit_or_credit_balance: 'credit_balance' }),
    acc({ id: 'zero', name: 'CASH DISCOUNT RECEIVED', number: '1003', type: 'revenue', balance: 0, debit_or_credit_balance: '' }),
    acc({ id: 'del', name: 'OLD', type: 'expense', balance: 9, debit_or_credit_balance: 'debit_balance', deleted: true }),
  ];
  const tb = buildTrialBalance(accounts);

  it('groups by account type, then reference model; skips zero and deleted accounts', () => {
    expect(tb.nodes.map((n) => `${n.level}:${n.id}`)).toEqual(['0:assets', '1:cash', '1:assets:customer', '2:c1', '0:liabilities', '1:liabilities:vendor', '2:v1', '0:income', '1:sales']);
  });
  it('rolls balances up to groups and totals both sides', () => {
    const assets = tb.nodes.find((n) => n.id === 'assets')!;
    expect(assets.debit).toBe(615);
    expect(tb.nodes.find((n) => n.id === 'assets:customer')!.debit).toBe(115);
    expect(tb.debit).toBe(615);
    expect(tb.credit).toBe(615);
    expect(isBalanced(tb.debit, tb.credit)).toBe(true);
  });
  it('lists every ancestor of a leaf for collapse handling', () => {
    expect(ancestors(tb.nodes, 'c1')).toEqual(['assets:customer', 'assets']);
  });
  it('puts accounts with an unknown type under "Other"', () => {
    const t2 = buildTrialBalance([acc({ id: 'u', type: '', balance: 5, debit_or_credit_balance: 'debit_balance' })]);
    expect(t2.nodes[0].id).toBe('other');
  });
});

describe('ledger journal labels', () => {
  it('formats debit and credit lines like the legacy ledger', () => {
    expect(journalLabel({ account_name: 'CASH', account_number: '1000', debit_or_credit: 'debit' })).toBe('CASH A/c #1000 Dr.');
    expect(journalLabel({ account_name: 'SALES', account_number: 1007, debit_or_credit: 'credit' })).toBe('To SALES A/c #1007 Cr.');
    expect(journalTotals([{ debit_or_credit: 'debit', debit: 10 }, { debit_or_credit: 'credit', credit: 10 }, { debit_or_credit: 'debit', debit: 5 }])).toEqual({ debit: 15, credit: 10 });
  });
});

describe('account statement', () => {
  const postings = [
    { id: 'p1', reference_model: 'sales', reference_id: 's1', reference_code: 'S-1', posts: [{ id: 'a', date: '2026-10-01', account_name: 'SALES', account_number: '1007', debit_or_credit: 'debit', debit: 100, balance: 150 }] },
    { id: 'p2', reference_model: 'sales_return', reference_id: 'r1', reference_code: 'R-1', posts: [
      { id: 'b', date: '2026-10-02', account_name: 'SALES RETURN', account_number: '1025', debit_or_credit: 'credit', credit: 20, balance: 130, reference_code: 'X' },
      { id: 'c', date: '2026-10-02', account_name: 'CASH DISCOUNT ALLOWED', account_number: '1008', debit_or_credit: 'credit', credit: 5, balance: 125 },
    ] },
  ];
  const meta = { debit_total: 150, credit_total: 25, credit_balance: 125, debit_balance_bought_down: 50, account: acc({ type: 'asset' }) };

  it('flattens posts with contra labels, codes and an opening balance row', () => {
    const s = buildStatement(postings, meta);
    expect(s.rows).toHaveLength(3);
    expect(s.rows[0]).toMatchObject({ code: 'S-1', side: 'debit', contra: 'To SALES A/c #1007 Dr.', debit: 100, balance: 150 });
    expect(s.rows[1]).toMatchObject({ code: 'R-1 / X', side: 'credit', contra: 'By SALES RETURN A/c #1025 Cr.', credit: 20 });
    expect(s.opening).toEqual({ side: 'debit', amount: 50 });
    expect(s).toMatchObject({ debitTotal: 150, creditTotal: 25, creditBalance: 125, debitBalance: 0, closing: { amount: 125, side: 'Dr' } });
  });
  it('"Ignore opening balance" removes the bought-down amount from totals and running balances', () => {
    const s = buildStatement(postings, meta, { ignoreOpening: true });
    expect(s.opening).toBeNull();
    expect(s.debitTotal).toBe(100);
    expect(s.rows.map((r) => r.balance)).toEqual([100, 80, 75]);
    expect(s.creditBalance).toBe(75);
    expect(s.closing).toEqual({ amount: 75, side: 'Dr' });
  });
  it('credit bought-down: revenue accounts subtract, others add', () => {
    const m = { debit_total: 0, credit_total: 60, credit_balance_bought_down: 10 };
    const ps = [{ id: 'p', posts: [{ debit_or_credit: 'credit', credit: 50, balance: 60, account_name: 'A', account_number: 1 }] }];
    expect(buildStatement(ps, { ...m, account: acc({ type: 'revenue' }) }, { ignoreOpening: true }).rows[0].balance).toBe(50);
    expect(buildStatement(ps, { ...m, account: acc({ type: 'liability' }) }, { ignoreOpening: true }).rows[0].balance).toBe(70);
  });
  it('"Ignore discount allowed" merges the discount post into the previous row', () => {
    const s = buildStatement(postings, meta, { ignoreDiscount: true });
    expect(s.rows).toHaveLength(2);
    expect(s.rows[1]).toMatchObject({ credit: 25, balance: 125 });
  });
  it('defaults missing meta keys to zero', () => {
    const s = buildStatement([], {});
    expect(s).toMatchObject({ debitTotal: 0, creditTotal: 0, debitBalance: 0, creditBalance: 0, opening: null });
  });
});

describe('document links', () => {
  it('maps posting reference models to v2 routes', () => {
    expect(documentPath('sales', 'x')).toBe('/sales/invoices/x');
    expect(documentPath('purchase_return', 'x')).toBe('/buying/returns/x');
    expect(documentPath('expense', 'x')).toBe('/finance/expenses/x');
    expect(documentPath('drawing', 'x')).toBe('/finance/drawings?open=x');
    expect(documentPath('salary_due', 'x')).toBeNull();
    expect(documentPath('sales', null)).toBeNull();
  });
});

describe('expenses', () => {
  it('computes VAT only when a vendor is linked (amount is VAT-inclusive)', () => {
    expect(expenseVat(115, 15, true)).toBe(15);
    expect(expenseVat(100, 15, true)).toBe(13.04);
    expect(expenseVat(115, 15, false)).toBe(0);
    expect(vatPortion(115, 15)).toBeCloseTo(15);
  });
  it('validates required fields like the API', () => {
    expect(validateExpense({ amount: '', description: ' ', payment_method: '', category_ids: [], date: '' })).toEqual({
      amount: 'Amount is required', description: 'Description is required', payment_method: 'Payment method is required', category_id: 'At least 1 category is required', date_str: 'Date is required',
    });
    expect(validateExpense({ amount: '-5', description: 'Refund', payment_method: 'cash', category_ids: ['c'], date: '2026-10-05T10:00' })).toEqual({});
  });
  it('builds the expense report rows with totals', () => {
    const rows = expenseReport([
      { code: 'EXP-2', date: '2026-10-02T10:00:00Z', amount: 115, vat_price: 15, vendor_invoice_no: 'V9', description: 'Oil', category_name: ['Car'], vendor_name: 'ACME', vendor_name_arabic: 'أكمي', vendor: { vat_no: '300' } },
      { code: 'EXP-1', date: '2026-10-01T10:00:00Z', amount: 50, description: 'Tea', category_name: ['Pantry'] },
    ]);
    expect(rows[0].slice(0, 7)).toEqual([1, '01-Oct-2026', 'EXP-1', 'Tea', 'Pantry', '', 'N/A']);
    expect(rows[1].slice(2, 12)).toEqual(['V9 / EXP-2', 'Oil', 'Car', 'ACME | أكمي', '300', '100.00', '0.00', '115.00', '15.00', '115.00']);
    expect(rows[2]).toEqual([]);
    expect(rows[3]).toEqual(['TOTAL', '', '', '', '', '', '', '150.00', '0.00', '165.00', '15.00', '165.00']);
  });
  it('names the report after the date filter', () => {
    expect(expenseReportName({}, 'Oct 05 2026')).toBe('Expense Report');
    expect(expenseReportName({ from: 'Oct 01 2026' }, 'Oct 05 2026')).toBe('Expense Report - From Oct 01 2026 to Oct 05 2026');
    expect(expenseReportName({ to: 'Oct 03 2026' }, 'x')).toBe('Expense Report - Upto Oct 03 2026');
    expect(expenseReportName({ date: 'Oct 03 2026' }, 'x')).toBe('Expense Report of Oct 03 2026');
  });
  it('labels payment methods and strips data-URL prefixes', () => {
    expect(paymentLabel('purchase_fund')).toBe('Purchase fund A/c');
    expect(paymentLabel('bank_transfer')).toBe('Bank transfer');
    expect(paymentLabel('weird_method')).toBe('Weird Method');
    expect(titleCase('quotation_sales_return')).toBe('Quotation Sales Return');
    expect(stripDataUrl('data:image/jpeg;base64,AAAA')).toBe('AAAA');
  });
});

describe('print payloads', () => {
  it('accepts legacy paginated statement rows', () => {
    const rows = statementPrintRows({ pages: [{ posts: [{ no: 1, date: 'd', debit_account_name: 'CASH', debit_account_number: '1000', debit_amount: 5, balance_amount: 5, reference_code: 'S-1' }, {}] }] });
    expect(rows).toEqual([expect.objectContaining({ no: 1, debit_account: 'To CASH A/c #1000 Dr.', debit_amount: 5, reference_code: 'S-1' })]);
  });
  it('accepts raw postings', () => {
    const rows = statementPrintRows({ posts: [{ reference_code: 'S-1', reference_model: 'sales', posts: [{ debit_or_credit: 'credit', credit: 7, account_name: 'SALES', account_number: 1, balance: 7 }] }] });
    expect(rows[0]).toMatchObject({ credit_account: 'By SALES A/c #1 Cr.', credit_amount: 7, reference_model: 'sales' });
  });
  it('flattens report pages and sums totals', () => {
    const rows = reportPrintRows({ pages: [{ models: [{ code: 'A', net_total: 10, total_payment_received: 4, balance_amount: 6, customer_name: 'X' }] }, { models: [{ code: 'B', net_total: 5, total_payment_received: 5, balance_amount: 0, vendor_name: 'V' }] }] });
    expect(rows.map((r) => r.party)).toEqual(['X', 'V']);
    expect(sumRows(rows)).toEqual({ net_total: 15, paid: 9, balance: 6 });
    expect(reportPrintRows(null)).toEqual([]);
  });
});
