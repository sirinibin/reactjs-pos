import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch, type CommandHit } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';

const qtn = () => import('./quotations');
const dn = () => import('./deliveryNotes');
const qsr = () => import('./quotationReturns');

export const routes: ModuleRoute[] = [
  { path: '/sales/quotations', navId: 'quotations', component: lazy(() => qtn().then((m) => ({ default: m.QuotationListPage }))) },
  { path: '/sales/quotations/new', navId: 'quotations', component: lazy(() => qtn().then((m) => ({ default: m.QuotationEditorPage }))) },
  { path: '/sales/quotations/:id', navId: 'quotations', component: lazy(() => qtn().then((m) => ({ default: m.QuotationViewPage }))) },
  { path: '/sales/quotations/:id/edit', navId: 'quotations', component: lazy(() => qtn().then((m) => ({ default: m.QuotationEditorPage }))) },
  { path: '/sales/delivery-notes', navId: 'delivery_notes', component: lazy(() => dn().then((m) => ({ default: m.DeliveryNoteListPage }))) },
  { path: '/sales/delivery-notes/new', navId: 'delivery_notes', component: lazy(() => dn().then((m) => ({ default: m.DeliveryNoteEditorPage }))) },
  { path: '/sales/delivery-notes/:id', navId: 'delivery_notes', component: lazy(() => dn().then((m) => ({ default: m.DeliveryNoteViewPage }))) },
  { path: '/sales/delivery-notes/:id/edit', navId: 'delivery_notes', component: lazy(() => dn().then((m) => ({ default: m.DeliveryNoteEditorPage }))) },
  { path: '/sales/quotation-returns', navId: 'qtn_sales_return', component: lazy(() => qsr().then((m) => ({ default: m.QsrListPage }))) },
  { path: '/sales/quotation-returns/new', navId: 'qtn_sales_return', component: lazy(() => qsr().then((m) => ({ default: m.QsrEditorPage }))) },
  { path: '/sales/quotation-returns/:id', navId: 'qtn_sales_return', component: lazy(() => qsr().then((m) => ({ default: m.QsrViewPage }))) },
  { path: '/sales/quotation-returns/:id/edit', navId: 'qtn_sales_return', component: lazy(() => qsr().then((m) => ({ default: m.QsrEditorPage }))) },
];

const hasDigit = (q: string) => /\d/.test(q);

/** Customer ids matching a name (used to search docs that have no customer-name search key). */
async function customerIds(q: string, storeId: string, signal: AbortSignal): Promise<string> {
  const r = await api.get<any[]>('/v1/customer', { search: { store_id: storeId, query: q }, limit: 5, select: 'id' }, signal);
  return (r.result || []).map((c) => c.id).join(',');
}

/** Search a document endpoint by number, or — for words — by matching customers. */
export function docSearch(o: { endpoint: string; group: string; icon: CommandHit['icon']; path: string; extra?: Record<string, string>; money?: boolean }) {
  return async (q: string, storeId: string, signal: AbortSignal): Promise<CommandHit[]> => {
    let search: Record<string, string> = { store_id: storeId, ...(o.extra || {}) };
    if (hasDigit(q)) search.code = q;
    else {
      const ids = await customerIds(q, storeId, signal);
      if (!ids) return [];
      search = { ...search, customer_id: ids };
    }
    const r = await api.get<any[]>(o.endpoint, { search, limit: 5, select: 'id,code,customer_name,net_total', sort: '-created_at' }, signal);
    return (r.result || []).map((d) => ({ id: `${o.endpoint}:${d.id}`, label: `${d.code} · ${d.customer_name || ''}`, sub: o.money === false ? undefined : fmtMoney(d.net_total), icon: o.icon, path: `${o.path}/${d.id}`, group: o.group }));
  };
}

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New quotation', path: '/sales/quotations/new', icon: 'clip', resource: 'quotations', navId: 'quotations' });
  registerCreate({ label: 'New delivery note', path: '/sales/delivery-notes/new', icon: 'truck', resource: 'delivery_notes', navId: 'delivery_notes' });
  registerCreate({ label: 'New quotation sales return', path: '/sales/quotation-returns/new', icon: 'undo', resource: 'qtn_sales_return', navId: 'qtn_sales_return' });
  registerSearch({ id: 'quotations', group: 'Quotations', resource: 'quotations', search: docSearch({ endpoint: '/v1/quotation', group: 'Quotations', icon: 'clip', path: '/sales/quotations' }) });
  registerSearch({ id: 'delivery_notes', group: 'Delivery notes', resource: 'delivery_notes', search: docSearch({ endpoint: '/v1/delivery-note', group: 'Delivery notes', icon: 'truck', path: '/sales/delivery-notes', money: false }) });
  registerSearch({ id: 'qtn_sales_return', group: 'Quotation sales returns', resource: 'qtn_sales_return', search: docSearch({ endpoint: '/v1/quotation-sales-return', group: 'Quotation sales returns', icon: 'undo', path: '/sales/quotation-returns' }) });
}
