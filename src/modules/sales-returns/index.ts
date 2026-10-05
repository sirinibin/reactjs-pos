import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';
import { PATHS } from './api';

const sr = () => import('./salesReturns');
const nv = () => import('./nonVat');
const nr = () => import('./nonVatReturns');
const pay = () => import('./payments');

const R = PATHS.returns, N = PATHS.nonVat, NR = PATHS.nonVatReturns;

export const routes: ModuleRoute[] = [
  { path: R, navId: 'sales_return', component: lazy(() => sr().then((m) => ({ default: m.SalesReturnListPage }))) },
  { path: `${R}/new`, navId: 'sales_return', component: lazy(() => sr().then((m) => ({ default: m.SalesReturnEditorPage }))) },
  { path: `${R}/:id`, navId: 'sales_return', component: lazy(() => sr().then((m) => ({ default: m.SalesReturnViewPage }))) },
  { path: `${R}/:id/edit`, navId: 'sales_return', component: lazy(() => sr().then((m) => ({ default: m.SalesReturnEditorPage }))) },
  { path: N, navId: 'non_vat_sales', component: lazy(() => nv().then((m) => ({ default: m.NonVatListPage }))) },
  { path: `${N}/new`, navId: 'non_vat_sales', component: lazy(() => nv().then((m) => ({ default: m.NonVatEditorPage }))) },
  { path: `${N}/:id`, navId: 'non_vat_sales', component: lazy(() => nv().then((m) => ({ default: m.NonVatViewPage }))) },
  { path: `${N}/:id/edit`, navId: 'non_vat_sales', component: lazy(() => nv().then((m) => ({ default: m.NonVatEditorPage }))) },
  { path: NR, navId: 'non_vat_sales_return', component: lazy(() => nr().then((m) => ({ default: m.NonVatReturnListPage }))) },
  { path: `${NR}/new`, navId: 'non_vat_sales_return', component: lazy(() => nr().then((m) => ({ default: m.NonVatReturnEditorPage }))) },
  { path: `${NR}/:id`, navId: 'non_vat_sales_return', component: lazy(() => nr().then((m) => ({ default: m.NonVatReturnViewPage }))) },
  { path: `${NR}/:id/edit`, navId: 'non_vat_sales_return', component: lazy(() => nr().then((m) => ({ default: m.NonVatReturnEditorPage }))) },
  { path: PATHS.payments, navId: 'sales_payments', component: lazy(() => pay().then((m) => ({ default: m.SalesPaymentsPage }))) },
  { path: PATHS.returnPayments, navId: 'sales_return_payments', component: lazy(() => pay().then((m) => ({ default: m.ReturnPaymentsPage }))) },
  { path: PATHS.cashDiscounts, navId: 'sales_cash_discounts', component: lazy(() => pay().then((m) => ({ default: m.CashDiscountsPage }))) },
];

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New sales return', path: `${R}/new`, icon: 'undo', resource: 'sales_return', navId: 'sales_return' });
  registerCreate({ label: 'New non-VAT sale', path: `${N}/new`, icon: 'receipt', resource: 'non_vat_sales', navId: 'non_vat_sales' });
  registerCreate({ label: 'New non-VAT sales return', path: `${NR}/new`, icon: 'undo', resource: 'non_vat_sales_return', navId: 'non_vat_sales_return' });
  registerCreate({ label: 'Receive sales payment', path: `${PATHS.payments}?new=1`, icon: 'cash', resource: 'sales', navId: 'sales_payments' });
  registerCreate({ label: 'Record return refund', path: `${PATHS.returnPayments}?new=1`, icon: 'cash', resource: 'sales_return', navId: 'sales_return_payments' });
  registerCreate({ label: 'New cash discount', path: `${PATHS.cashDiscounts}?new=1`, icon: 'tag', resource: 'sales', navId: 'sales_cash_discounts' });

  registerSearch({
    id: 'sales_return', group: 'Sales returns', resource: 'sales_return',
    search: async (q, storeId, signal) => {
      const r = await (await sr()).salesReturnSearch(storeId, q, signal);
      return (r.result || []).map((o) => ({ id: `sales_return:${o.id}`, label: `${o.code} · ${o.order_code || ''}`, sub: [o.customer_name, fmtMoney(o.net_total)].filter(Boolean).join(' · '), icon: 'undo' as const, path: `${R}/${o.id}`, group: 'Sales returns' }));
    },
  });
  registerSearch({
    id: 'non_vat_sales', group: 'Non-VAT sales', resource: 'non_vat_sales',
    search: async (q, storeId, signal) => {
      const r = await (await nv()).nonVatSearch(storeId, q, signal);
      return (r.result || []).map((o) => ({ id: `non_vat_sales:${o.id}`, label: `${o.code} · ${o.customer_name || ''}`, sub: fmtMoney(o.net_total), icon: 'receipt' as const, path: `${N}/${o.id}`, group: 'Non-VAT sales' }));
    },
  });
  registerSearch({
    id: 'non_vat_sales_return', group: 'Non-VAT sales returns', resource: 'non_vat_sales_return',
    search: async (q, storeId, signal) => {
      const r = await (await nv()).nonVatReturnSearch(storeId, q, signal);
      return (r.result || []).map((o) => ({ id: `non_vat_sales_return:${o.id}`, label: `${o.code} · ${o.customer_name || ''}`, sub: fmtMoney(o.net_total), icon: 'undo' as const, path: `${NR}/${o.id}`, group: 'Non-VAT sales returns' }));
    },
  });
}
