import { lazy, type ComponentType } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch, type CommandHit } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';
import { EP, PATHS } from './api';

type Loader = () => Promise<Record<string, unknown>>;
const page = (load: Loader, name: string) => lazy(() => load().then((m) => ({ default: m[name] as ComponentType<any> })));

const pur = () => import('./purchases');
const ret = () => import('./returns');
const po = () => import('./orders');
const pr = () => import('./requests');
const pay = () => import('./payments');
const ven = () => import('./vendors');
const bil = () => import('./billImages');

/** list, /new, /:id, /:id/edit for one document type. */
const docRoutes = (base: string, navId: string, load: Loader, names: [string, string, string]): ModuleRoute[] => [
  { path: base, navId, component: page(load, names[0]) },
  { path: `${base}/new`, navId, component: page(load, names[1]) },
  { path: `${base}/:id`, navId, component: page(load, names[2]) },
  { path: `${base}/:id/edit`, navId, component: page(load, names[1]) },
];

export const routes: ModuleRoute[] = [
  ...docRoutes(PATHS.purchases, 'purchases', pur, ['PurchaseListPage', 'PurchaseEditorPage', 'PurchaseViewPage']),
  ...docRoutes(PATHS.returns, 'purchase_return', ret, ['ReturnListPage', 'ReturnEditorPage', 'ReturnViewPage']),
  ...docRoutes(PATHS.orders, 'purchase_orders', po, ['PoListPage', 'PoEditorPage', 'PoViewPage']),
  ...docRoutes(PATHS.requests, 'purchase_requests', pr, ['PrListPage', 'PrEditorPage', 'PrViewPage']),
  { path: PATHS.payments, navId: 'purchase_payments', component: page(pay, 'PurchasePaymentsPage') },
  { path: PATHS.returnPayments, navId: 'purchase_return_payments', component: page(pay, 'ReturnPaymentsPage') },
  { path: PATHS.cashDiscounts, navId: 'purchase_cash_discounts', component: page(pay, 'CashDiscountsPage') },
  { path: PATHS.vendors, navId: 'vendors', component: page(ven, 'VendorListPage') },
  { path: `${PATHS.vendors}/new`, navId: 'vendors', component: page(ven, 'VendorNewPage') },
  { path: `${PATHS.vendors}/:id`, navId: 'vendors', component: page(ven, 'VendorViewPage') },
  { path: PATHS.bills, navId: 'purchase_bill_images', component: page(bil, 'BillImagesPage') },
];

const looksLikeCode = (q: string) => /\d/.test(q);

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New purchase bill', path: `${PATHS.purchases}/new`, icon: 'cart', resource: 'purchases', navId: 'purchases' });
  registerCreate({ label: 'New purchase return', path: `${PATHS.returns}/new`, icon: 'undo', resource: 'purchase_return', navId: 'purchase_return' });
  registerCreate({ label: 'New purchase order', path: `${PATHS.orders}/new`, icon: 'file', resource: 'purchase_orders', navId: 'purchase_orders' });
  registerCreate({ label: 'New purchase request', path: `${PATHS.requests}/new`, icon: 'clip', resource: 'purchase_requests', navId: 'purchase_requests' });
  registerCreate({ label: 'New vendor', path: `${PATHS.vendors}/new`, icon: 'building', resource: 'vendors', navId: 'vendors' });

  const docSearch = (id: string, group: string, resource: string, endpoint: string, path: string, icon: CommandHit['icon'], nameKey?: string) =>
    registerSearch({
      id, group, resource,
      search: async (q, storeId, signal) => {
        if (!looksLikeCode(q) && !nameKey) return [];
        const r = await api.get<any[]>(endpoint, { search: { store_id: storeId, ...(looksLikeCode(q) || !nameKey ? { code: q } : { [nameKey]: q }) }, limit: 5, select: 'id,code,vendor_name,net_total', sort: '-created_at' }, signal);
        return (r.result || []).map((o) => ({ id: `${id}:${o.id}`, label: `${o.code} · ${o.vendor_name || ''}`, sub: fmtMoney(o.net_total), icon, path: `${path}/${o.id}`, group }));
      },
    });
  docSearch('purchases', 'Purchase bills', 'purchases', EP.purchase, PATHS.purchases, 'cart');
  docSearch('purchase_returns', 'Purchase returns', 'purchase_return', EP.ret, PATHS.returns, 'undo');
  docSearch('purchase_orders', 'Purchase orders', 'purchase_orders', EP.po, PATHS.orders, 'file', 'vendor_name');
  registerSearch({
    id: 'vendors', group: 'Vendors', resource: 'vendors',
    search: async (q, storeId, signal) => {
      const r = await api.get<any[]>(EP.vendor, { search: { store_id: storeId, query: q }, limit: 5, select: 'id,code,name,phone,credit_balance' }, signal);
      return (r.result || []).map((v) => ({ id: `vendor:${v.id}`, label: v.name, sub: [v.code, v.phone, fmtMoney(v.credit_balance)].filter(Boolean).join(' · '), icon: 'building' as const, path: `${PATHS.vendors}/${v.id}`, group: 'Vendors' }));
    },
  });
}
