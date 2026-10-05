import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';

const inv = () => import('./invoices');
const prn = () => import('./print');

export const routes: ModuleRoute[] = [
  { path: '/sales/invoices', navId: 'sales', component: lazy(() => inv().then((m) => ({ default: m.SalesListPage }))) },
  { path: '/sales/invoices/new', navId: 'sales', component: lazy(() => inv().then((m) => ({ default: m.SalesEditorPage }))) },
  { path: '/sales/invoices/:id', navId: 'sales', component: lazy(() => inv().then((m) => ({ default: m.SalesViewPage }))) },
  { path: '/sales/invoices/:id/edit', navId: 'sales', component: lazy(() => inv().then((m) => ({ default: m.SalesEditorPage }))) },
  { path: '/print/:kind/:id', bare: true, component: lazy(() => prn().then((m) => ({ default: m.PrintPage }))) },
  { path: '/invoice-print', bare: true, public: true, component: lazy(() => prn().then((m) => ({ default: m.ServerInvoicePrint }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New sales invoice', path: '/sales/invoices/new', icon: 'receipt', resource: 'sales', navId: 'sales' });
  registerSearch({
    id: 'sales', group: 'Sales invoices', resource: 'sales',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>('/v1/order', { search: { store_id: storeId, ...(/\d/.test(q) ? { code: q } : { customer_name: q }) }, limit: 5, select: 'id,code,customer_name,net_total', sort: '-created_at' }, signal);
      return (r.result || []).map((o) => ({ id: `order:${o.id}`, label: `${o.code} · ${o.customer_name || ''}`, sub: fmtMoney(o.net_total), icon: 'receipt' as const, path: `/sales/invoices/${o.id}`, group: 'Sales invoices' }));
    },
  });
}
