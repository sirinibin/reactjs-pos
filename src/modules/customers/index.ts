import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';
import { customerSearchKey } from './searchKey';

const list = () => import('./CustomerList');
const form = () => import('./CustomerForm');
const c360 = () => import('./Customer360');
const mList = () => import('./MoneyList');
const mEdit = () => import('./MoneyEditor');
const mView = () => import('./MoneyView');
const rcpt = () => import('./Receipt');
const pkg = () => import('./Packages');

export const routes: ModuleRoute[] = [
  { path: '/sales/customers', navId: 'customers', component: lazy(() => list().then((m) => ({ default: m.CustomerListPage }))) },
  { path: '/sales/customers/new', navId: 'customers', component: lazy(() => form().then((m) => ({ default: m.CustomerEditorPage }))) },
  { path: '/sales/customers/:id', navId: 'customers', component: lazy(() => c360().then((m) => ({ default: m.Customer360Page }))) },
  { path: '/sales/customers/:id/edit', navId: 'customers', component: lazy(() => form().then((m) => ({ default: m.CustomerEditorPage }))) },

  { path: '/sales/receivables', navId: 'receivables', component: lazy(() => mList().then((m) => ({ default: m.ReceivableListPage }))) },
  { path: '/sales/receivables/new', navId: 'receivables', component: lazy(() => mEdit().then((m) => ({ default: m.ReceivableEditorPage }))) },
  { path: '/sales/receivables/:id', navId: 'receivables', component: lazy(() => mView().then((m) => ({ default: m.ReceivableViewPage }))) },
  { path: '/sales/receivables/:id/edit', navId: 'receivables', component: lazy(() => mEdit().then((m) => ({ default: m.ReceivableEditorPage }))) },
  { path: '/sales/receivables/:id/print', navId: 'receivables', bare: true, component: lazy(() => rcpt().then((m) => ({ default: m.ReceivablePrintPage }))) },

  { path: '/buying/payables', navId: 'payables', component: lazy(() => mList().then((m) => ({ default: m.PayableListPage }))) },
  { path: '/buying/payables/new', navId: 'payables', component: lazy(() => mEdit().then((m) => ({ default: m.PayableEditorPage }))) },
  { path: '/buying/payables/:id', navId: 'payables', component: lazy(() => mView().then((m) => ({ default: m.PayableViewPage }))) },
  { path: '/buying/payables/:id/edit', navId: 'payables', component: lazy(() => mEdit().then((m) => ({ default: m.PayableEditorPage }))) },
  { path: '/buying/payables/:id/print', navId: 'payables', bare: true, component: lazy(() => rcpt().then((m) => ({ default: m.PayablePrintPage }))) },

  /** Server-side receipt PDF render target (POST /v1/receipt/pdf → headless Chrome). */
  { path: '/receipt-print', bare: true, public: true, component: lazy(() => rcpt().then((m) => ({ default: m.ServerReceiptPrint }))) },

  { path: '/sales/customer-packages', navId: 'customer_packages', component: lazy(() => pkg().then((m) => ({ default: m.CustomerPackagesPage }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New customer', path: '/sales/customers/new', icon: 'users', resource: 'customers', navId: 'customers' });
  registerCreate({ label: 'New receivable', path: '/sales/receivables/new', icon: 'cash', resource: 'receivables', navId: 'receivables' });
  registerCreate({ label: 'New payable', path: '/buying/payables/new', icon: 'card', resource: 'payables', navId: 'payables' });
  registerSearch({
    id: 'customers', group: 'Customers', resource: 'customers',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/customer', { search: { store_id: storeId, ...customerSearchKey(q) }, limit: 6, select: 'id,code,name,name_in_arabic,phone,vat_no,credit_balance' }, signal);
      return (r.result || []).map((c) => ({
        id: `customer:${c.id}`, label: `${c.name}${c.name_in_arabic ? ` · ${c.name_in_arabic}` : ''}`,
        sub: [c.code, c.phone, c.vat_no && `VAT ${c.vat_no}`, c.credit_balance ? `Bal ${fmtMoney(c.credit_balance)}` : ''].filter(Boolean).join(' · '),
        icon: 'users' as const, path: `/sales/customers/${c.id}`, group: 'Customers',
      }));
    },
  });
  for (const [id, endpoint, path, group, icon] of [
    ['receivables', '/v1/customer-deposit', '/sales/receivables', 'Receivables', 'cash'],
    ['payables', '/v1/customer-withdrawal', '/buying/payables', 'Payables', 'card'],
  ] as const) {
    registerSearch({
      id, group, resource: id,
      search: async (q, storeId, signal) => {
        if (!/\d/.test(q)) return [];
        const r = await api.get<any[]>(endpoint, { search: { store_id: storeId, code: q }, limit: 5, select: 'id,code,customer_name,vendor_name,employee_name,net_total', sort: '-date' }, signal);
        return (r.result || []).map((d) => ({ id: `${id}:${d.id}`, label: `${d.code} · ${d.customer_name || d.vendor_name || d.employee_name || ''}`, sub: fmtMoney(d.net_total), icon, path: `${path}/${d.id}`, group }));
      },
    });
  }
}
