import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';

const exp = () => import('./expenses');
const cat = () => import('./categories');
const eq = () => import('./equity');
const acc = () => import('./accounts');
const st = () => import('./statement');
const led = () => import('./ledger');
const prn = () => import('./print');

export const routes: ModuleRoute[] = [
  { path: '/finance/accounts', navId: 'accounts', component: lazy(() => acc().then((m) => ({ default: m.AccountsPage }))) },
  { path: '/finance/accounts/:id', navId: 'accounts', component: lazy(() => st().then((m) => ({ default: m.AccountStatementPage }))) },
  { path: '/finance/ledger', navId: 'ledger', component: lazy(() => led().then((m) => ({ default: m.LedgerPage }))) },
  { path: '/finance/postings', navId: 'postings', component: lazy(() => st().then((m) => ({ default: m.PostingsPage }))) },
  { path: '/finance/expenses', navId: 'expenses', component: lazy(() => exp().then((m) => ({ default: m.ExpensesListPage }))) },
  { path: '/finance/expenses/new', navId: 'expenses', component: lazy(() => exp().then((m) => ({ default: m.ExpenseEditorPage }))) },
  { path: '/finance/expenses/:id', navId: 'expenses', component: lazy(() => exp().then((m) => ({ default: m.ExpenseViewPage }))) },
  { path: '/finance/expenses/:id/edit', navId: 'expenses', component: lazy(() => exp().then((m) => ({ default: m.ExpenseEditorPage }))) },
  { path: '/finance/expense-categories', navId: 'expense_category', component: lazy(() => cat().then((m) => ({ default: m.ExpenseCategoriesPage }))) },
  { path: '/finance/capital', navId: 'capitals', component: lazy(() => eq().then((m) => ({ default: m.CapitalPage }))) },
  { path: '/finance/capital-withdrawals', navId: 'capital_withdrawals', component: lazy(() => eq().then((m) => ({ default: m.CapitalWithdrawalsPage }))) },
  { path: '/finance/drawings', navId: 'dividents', component: lazy(() => eq().then((m) => ({ default: m.DrawingsPage }))) },
  // Chrome-less pages the Go API's headless Chrome renders for server-side PDFs (finance.md §7.4, §12).
  { path: '/posting-print', bare: true, public: true, component: lazy(() => prn().then((m) => ({ default: m.PostingPrintPage }))) },
  { path: '/report-print', bare: true, public: true, component: lazy(() => prn().then((m) => ({ default: m.ReportPrintPage }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New expense', path: '/finance/expenses/new', icon: 'wallet', resource: 'expenses', navId: 'expenses' });
  registerCreate({ label: 'New expense category', path: '/finance/expense-categories?new=1', icon: 'tag', resource: 'expense_category', navId: 'expense_category' });
  registerCreate({ label: 'New capital entry', path: '/finance/capital?new=1', icon: 'bank', resource: 'capitals', navId: 'capitals' });
  registerCreate({ label: 'New drawing', path: '/finance/drawings?new=1', icon: 'wallet', resource: 'dividents', navId: 'dividents' });
  registerSearch({
    id: 'expenses', group: 'Expenses', resource: 'expenses',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/expense', { search: { store_id: storeId, ...(/^\d|^EXP/i.test(q) ? { code: q } : { description: q }) }, limit: 5, select: 'id,code,description,amount', sort: '-created_at' }, signal);
      return (r.result || []).map((e) => ({ id: `expense:${e.id}`, label: `${e.code} · ${e.description || ''}`, sub: fmtMoney(e.amount), icon: 'wallet' as const, path: `/finance/expenses/${e.id}`, group: 'Expenses' }));
    },
  });
  registerSearch({
    id: 'accounts', group: 'Accounts', resource: 'accounts',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/account', { search: { store_id: storeId, search: q }, limit: 5, select: 'id,name,number,balance,debit_or_credit_balance' }, signal);
      return (r.result || []).map((a) => ({ id: `account:${a.id}`, label: `${a.name} · #${a.number}`, sub: `${fmtMoney(a.balance)} ${a.debit_or_credit_balance === 'debit_balance' ? 'Dr' : 'Cr'}`, icon: 'calc' as const, path: `/finance/accounts/${a.id}`, group: 'Accounts' }));
    },
  });
}
