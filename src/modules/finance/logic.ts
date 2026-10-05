// Pure finance logic (no React): payment methods, trial balance tree, statement maths,
// ledger labels, expense report rows. Formulas follow specs/finance.md §1, §4–§7.
import { round } from '@/lib/format';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'bank_cheque', label: 'Bank cheque' },
];
/** Expenses can also be paid from the purchase fund (spec §0). */
export const EXPENSE_PAYMENT_METHODS = [...PAYMENT_METHODS, { value: 'purchase_fund', label: 'Purchase fund A/c' }];
export const BANK_METHODS = ['debit_card', 'credit_card', 'bank_card', 'bank_transfer', 'bank_cheque'];

export function paymentLabel(v: string | null | undefined): string {
  if (!v) return '—';
  return EXPENSE_PAYMENT_METHODS.find((m) => m.value === v)?.label || titleCase(v);
}

/** "sales_return" → "Sales Return" (legacy toTitleCaseFromUnderscore). */
export function titleCase(v: string | null | undefined): string {
  return String(v || '').split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export const ACCOUNT_TYPES = ['asset', 'liability', 'capital', 'drawing', 'revenue', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const ACCOUNT_REFS = ['customer', 'vendor', 'investor', 'withdrawer', 'expense_category', 'employee'];

/** Posting "Type" filter options (spec §7.2). */
export const POSTING_TYPES = ['sales', 'sales_return', 'quotation_sales', 'quotation_sales_return', 'purchase', 'purchase_return', 'capital', 'drawing', 'expense',
  'customer_deposit', 'vendor_deposit', 'customer_withdrawal', 'vendor_withdrawal', 'employee_deposit', 'employee_withdrawal'];

export interface Account {
  id: string;
  name: string;
  name_arabic?: string;
  number?: string | number;
  type?: string;
  balance?: number;
  debit_or_credit_balance?: string;
  reference_model?: string | null;
  reference_id?: string | null;
  phone?: string | null;
  vat_no?: string | null;
  open?: boolean;
  deleted?: boolean;
  search_label?: string;
  [k: string]: any;
}

/** Debit / credit balance columns of the accounts grid (balance is a magnitude; side is explicit). */
export function balanceSides(a: Pick<Account, 'balance' | 'debit_or_credit_balance'>): { debit: number; credit: number } {
  const b = Number(a.balance) || 0;
  if (a.debit_or_credit_balance === 'debit_balance') return { debit: b, credit: 0 };
  if (a.debit_or_credit_balance === 'credit_balance') return { debit: 0, credit: b };
  return { debit: 0, credit: 0 };
}

export const isBalanced = (debit: number, credit: number) => Math.abs(round(debit) - round(credit)) < 0.005;

// ---------------------------------------------------------------- trial balance tree

export interface TbNode {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  parent: string | null;
  debit: number;
  credit: number;
  account?: Account;
  count: number;
}

const GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'assets', label: 'Assets', types: ['asset'] },
  { id: 'liabilities', label: 'Liabilities', types: ['liability'] },
  { id: 'equity', label: 'Equity', types: ['capital', 'drawing'] },
  { id: 'income', label: 'Income', types: ['revenue'] },
  { id: 'expenses', label: 'Expenses', types: ['expense'] },
];

const SUBGROUP_LABEL: Record<string, string> = {
  customer: 'Customers', vendor: 'Vendors', investor: 'Owners’ capital', withdrawer: 'Drawings', expense_category: 'Expense categories', employee: 'Employees',
};

/**
 * Build the expandable trial-balance tree from accounts: type group → reference group → account.
 * System accounts (no reference model) sit directly under their type group.
 * Only accounts with a non-zero balance are included (closed accounts add nothing to a TB).
 */
export function buildTrialBalance(accounts: Account[]): { nodes: TbNode[]; debit: number; credit: number } {
  const nodes: TbNode[] = [];
  let debit = 0, credit = 0;
  const open = accounts.filter((a) => !a.deleted && (Number(a.balance) || 0) !== 0);
  const groups = [...GROUPS, { id: 'other', label: 'Other', types: [] as string[] }];
  const known = new Set(GROUPS.flatMap((g) => g.types));
  for (const g of groups) {
    const members = open.filter((a) => (g.id === 'other' ? !known.has(String(a.type || '')) : g.types.includes(String(a.type || ''))));
    if (!members.length) continue;
    const gNode: TbNode = { id: g.id, label: g.label, level: 0, parent: null, debit: 0, credit: 0, count: members.length };
    nodes.push(gNode);
    const byRef = new Map<string, Account[]>();
    members.forEach((a) => {
      const k = a.reference_model || '';
      if (!byRef.has(k)) byRef.set(k, []);
      byRef.get(k)!.push(a);
    });
    const sortAcc = (x: Account[]) => [...x].sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true }));
    const leaf = (a: Account, parent: string, level: 1 | 2) => {
      const s = balanceSides(a);
      gNode.debit += s.debit;
      gNode.credit += s.credit;
      debit += s.debit;
      credit += s.credit;
      const n: TbNode = { id: a.id, label: a.name, level, parent, debit: s.debit, credit: s.credit, account: a, count: 1 };
      nodes.push(n);
      return n;
    };
    // System accounts first, then reference groups.
    sortAcc(byRef.get('') || []).forEach((a) => leaf(a, g.id, 1));
    for (const [ref, list] of byRef) {
      if (!ref) continue;
      const sub: TbNode = { id: `${g.id}:${ref}`, label: SUBGROUP_LABEL[ref] || titleCase(ref), level: 1, parent: g.id, debit: 0, credit: 0, count: list.length };
      nodes.push(sub);
      sortAcc(list).forEach((a) => {
        const n = leaf(a, sub.id, 2);
        sub.debit += n.debit;
        sub.credit += n.credit;
      });
    }
  }
  return { nodes, debit: round(debit), credit: round(credit) };
}

/** Ids of every ancestor of a node (for collapse/expand). */
export function ancestors(nodes: TbNode[], id: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  let p = byId.get(id)?.parent;
  while (p) {
    out.push(p);
    p = byId.get(p)?.parent ?? null;
  }
  return out;
}

// ---------------------------------------------------------------- ledger

export interface Journal {
  date?: string;
  account_id?: string;
  account_name?: string;
  account_number?: string | number;
  debit_or_credit?: 'debit' | 'credit' | string;
  debit?: number;
  credit?: number;
}

/** "CASH A/c #1000 Dr." / "To SALES A/c #1007 Cr." (spec §5). */
export function journalLabel(j: Journal): string {
  return j.debit_or_credit === 'debit' ? `${j.account_name} A/c #${j.account_number ?? ''} Dr.` : `To ${j.account_name} A/c #${j.account_number ?? ''} Cr.`;
}

export const journalTotals = (js: Journal[] | null | undefined) =>
  (js || []).reduce<{ debit: number; credit: number }>((a, j) => ({ debit: a.debit + (j.debit_or_credit === 'debit' ? Number(j.debit) || 0 : 0), credit: a.credit + (j.debit_or_credit === 'credit' ? Number(j.credit) || 0 : 0) }), { debit: 0, credit: 0 });

// ---------------------------------------------------------------- statement (postings)

export interface Post {
  id?: string;
  date?: string;
  account_id?: string;
  account_name?: string;
  account_number?: string | number;
  debit_or_credit?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  reference_code?: string | null;
  reference_model?: string | null;
  reference_id?: string | null;
}
export interface Posting {
  id: string;
  date?: string;
  reference_id?: string;
  reference_model?: string;
  reference_code?: string;
  posts?: Post[];
}
export interface StatementMeta {
  debit_total?: number;
  credit_total?: number;
  debit_balance?: number;
  credit_balance?: number;
  debit_balance_bought_down?: number;
  credit_balance_bought_down?: number;
  account?: Account;
}
export interface StatementRow {
  key: string;
  date?: string;
  code: string;
  refModel?: string;
  refId?: string;
  side: 'debit' | 'credit';
  contra: string;
  debit: number;
  credit: number;
  balance: number;
}
export interface Statement {
  rows: StatementRow[];
  opening: { side: 'debit' | 'credit'; amount: number } | null;
  debitTotal: number;
  creditTotal: number;
  /** "To Closing Balance" (debit column) — present when credits exceed debits. */
  debitBalance: number;
  /** "By Closing Balance" (credit column) — present when debits exceed credits. */
  creditBalance: number;
  /** Final balance and its natural side (Dr = debits exceed credits). */
  closing: { amount: number; side: 'Dr' | 'Cr' };
  accountType?: string;
}

/** Flatten postings[].posts[] into statement rows and apply the legacy client toggles (spec §7.2–7.3). */
export function buildStatement(postings: Posting[], meta: StatementMeta, opts: { ignoreOpening?: boolean; ignoreDiscount?: boolean } = {}): Statement {
  const dBD = Number(meta.debit_balance_bought_down) || 0;
  const cBD = Number(meta.credit_balance_bought_down) || 0;
  let accountType = meta.account?.type;
  let rows: StatementRow[] = [];
  for (const p of postings) {
    for (const [i, post] of (p.posts || []).entries()) {
      const isDebit = post.debit_or_credit === 'debit';
      rows.push({
        key: `${p.id}:${post.id || i}`,
        date: post.date || p.date,
        code: [p.reference_code, post.reference_code].filter(Boolean).join(' / '),
        refModel: p.reference_model,
        refId: p.reference_id,
        side: isDebit ? 'debit' : 'credit',
        contra: `${isDebit ? 'To' : 'By'} ${post.account_name} A/c #${post.account_number ?? ''} ${isDebit ? 'Dr.' : 'Cr.'}`,
        debit: isDebit ? Number(post.debit) || 0 : 0,
        credit: isDebit ? 0 : Number(post.credit) || 0,
        balance: Number(post.balance) || 0,
        _name: post.account_name,
      } as StatementRow & { _name?: string });
    }
  }
  let debitTotal = Number(meta.debit_total) || 0;
  let creditTotal = Number(meta.credit_total) || 0;
  let debitBalance = Number(meta.debit_balance) || 0;
  let creditBalance = Number(meta.credit_balance) || 0;
  if (opts.ignoreOpening) {
    debitTotal -= dBD;
    creditTotal -= cBD;
    rows = rows.map((r) => {
      let b = r.balance;
      if (dBD > 0) b -= dBD;
      else if (cBD > 0) b = accountType === 'revenue' || accountType === 'capital' ? b - cBD : b + cBD;
      return { ...r, balance: round(b) };
    });
    if (rows.length && rows[rows.length - 1].balance > 0 && accountType === 'liability') accountType = 'asset';
    debitBalance = 0;
    creditBalance = 0;
    if (debitTotal > creditTotal) creditBalance = debitTotal - creditTotal;
    else if (debitTotal < creditTotal) debitBalance = creditTotal - debitTotal;
  }
  if (opts.ignoreDiscount) {
    const merged: StatementRow[] = [];
    for (const r of rows as (StatementRow & { _name?: string })[]) {
      const prev = merged[merged.length - 1];
      if (r._name === 'CASH DISCOUNT ALLOWED' && prev) {
        prev.credit = round(prev.credit + r.credit);
        prev.balance = round(prev.balance - r.credit);
      } else merged.push({ ...r });
    }
    rows = merged;
  }
  rows.forEach((r) => delete (r as any)._name);
  const opening = !opts.ignoreOpening && (dBD > 0 || cBD > 0) ? { side: dBD > 0 ? 'debit' as const : 'credit' as const, amount: dBD > 0 ? dBD : cBD } : null;
  return {
    rows,
    opening,
    debitTotal: round(debitTotal),
    creditTotal: round(creditTotal),
    debitBalance: round(debitBalance),
    creditBalance: round(creditBalance),
    closing: { amount: round(Math.abs(debitTotal - creditTotal)), side: debitTotal >= creditTotal ? 'Dr' : 'Cr' },
    accountType,
  };
}

/** Where a posting's source document lives in v2 (null = not clickable, e.g. salary_due). */
export function documentPath(model: string | null | undefined, id: string | null | undefined): string | null {
  if (!model || !id) return null;
  const map: Record<string, string> = {
    sales: '/sales/invoices', sales_return: '/sales/returns', quotation_sales: '/sales/quotations', quotation: '/sales/quotations',
    quotation_sales_return: '/sales/quotation-returns', non_vat_sales: '/sales/non-vat', non_vat_sales_return: '/sales/non-vat-returns',
    purchase: '/buying/purchases', purchase_return: '/buying/returns', expense: '/finance/expenses',
    customer_deposit: '/sales/receivables', vendor_deposit: '/sales/receivables', customer_withdrawal: '/buying/payables', vendor_withdrawal: '/buying/payables',
  };
  if (map[model]) return `${map[model]}/${id}`;
  if (model === 'capital') return `/finance/capital?open=${id}`;
  if (model === 'drawing' || model === 'divident') return `/finance/drawings?open=${id}`;
  return null;
}

// ---------------------------------------------------------------- expenses

/** VAT the server will compute for an expense (§1.2): only when a vendor is linked; amount is VAT-inclusive. */
export function expenseVat(amount: number, vatPercent: number, hasVendor: boolean): number {
  if (!hasVendor || !amount) return 0;
  return round(round(amount / (1 + vatPercent / 100)) * (vatPercent / 100));
}

/** VAT portion of a VAT-inclusive amount: X·p/(100+p). */
export const vatPortion = (x: number, p: number) => (x * p) / (100 + p);

export interface ExpenseRow {
  code: string;
  date: string;
  amount: number;
  vat_price?: number;
  vendor_invoice_no?: string;
  description?: string;
  category_name?: string[] | string | null;
  vendor_name?: string;
  vendor_name_arabic?: string;
  vendor?: { vat_no?: string } | null;
}

const ddMMMyyyy = (d: string) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${String(x.getDate()).padStart(2, '0')}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getMonth()]}-${x.getFullYear()}`;
};

export const EXPENSE_REPORT_HEADERS = [
  'S/L No. | الرقم', 'Date of Invoice | تاريخ الفاتورة', 'Invoice Number | رقم الفاتورة', 'Description | الوصف', 'Category | الفئة', 'Supplier Name | اسم المورد',
  'Supplier VAT No | الرقم الضريبي للمورد', 'Amount Before VAT | المبلغ قبل الضريبة', 'Discount | الخصم', 'Amount After Discount | المبلغ بعد الخصم', 'VAT Amount | مبلغ الضريبة', 'Total Amount after VAT | الإجمالي بعد الضريبة',
];

/** Rows for the legacy "Expense Report" export (spec §1.4) incl. blank row + TOTAL row. */
export function expenseReport(rows: ExpenseRow[]): (string | number)[][] {
  const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const tot = [0, 0, 0, 0, 0];
  const out: (string | number)[][] = sorted.map((r, i) => {
    const vat = Number(r.vat_price) || 0;
    const amt = Number(r.amount) || 0;
    const nums = [round(amt - vat), 0, amt, vat, amt];
    nums.forEach((n, k) => (tot[k] += n));
    const cat = Array.isArray(r.category_name) ? r.category_name[0] : r.category_name;
    const supplier = [r.vendor_name, r.vendor_name_arabic].filter(Boolean).join(' | ');
    return [i + 1, ddMMMyyyy(r.date), r.vendor_invoice_no ? `${r.vendor_invoice_no} / ${r.code}` : r.code, r.description || '', cat || '', supplier, r.vendor?.vat_no || 'N/A', ...nums.map((n) => n.toFixed(2))];
  });
  out.push([]);
  out.push(['TOTAL', '', '', '', '', '', '', ...tot.map((n) => n.toFixed(2))]);
  return out;
}

/** "Expense Report - From Oct 01 2026 to Oct 05 2026" style names (spec §1.4). */
export function expenseReportName(f: { date?: string; from?: string; to?: string }, today: string): string {
  if (f.date) return `Expense Report of ${f.date}`;
  if (f.from) return `Expense Report - From ${f.from} to ${f.to || today}`;
  if (f.to) return `Expense Report - Upto ${f.to}`;
  return 'Expense Report';
}

/** Validate the expense form the way the API does, so most errors show before a round-trip. */
export function validateExpense(v: { amount: string | number; description: string; payment_method: string; category_ids: string[]; date: string }): Record<string, string> {
  const e: Record<string, string> = {};
  const amt = typeof v.amount === 'number' ? v.amount : Number(String(v.amount).replace(/,/g, ''));
  if (!amt || Number.isNaN(amt)) e.amount = 'Amount is required';
  if (!v.description.trim()) e.description = 'Description is required';
  if (!v.payment_method) e.payment_method = 'Payment method is required';
  if (!v.category_ids.length) e.category_id = 'At least 1 category is required';
  if (!v.date) e.date_str = 'Date is required';
  return e;
}

/** Strip a data-URL prefix and return raw base64 (images_content). */
export const stripDataUrl = (s: string) => s.replace(/^data:[^;]+;base64,/, '');
