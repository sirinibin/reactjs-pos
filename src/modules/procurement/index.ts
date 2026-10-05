import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { registerTopbarItem } from '@/shell/topbarItems';
import { KEYS, session } from '@/api/session';
import { fmtDate } from '@/lib/format';
import { papi } from './api';
import type { RFQ, RFQSupplier } from './types';
import { EmailUnreadButton, WhatsAppUnreadButton } from './topbar';
import { ar } from './ar';

const rfqList = () => import('./rfq/list');
const rfqEditor = () => import('./rfq/editor');
const rfqDetail = () => import('./rfq/detail');
const rfqPrint = () => import('./rfq/print');
const suppliers = () => import('./suppliers');
const emails = () => import('./emails');
const whatsapp = () => import('./whatsapp');
const settings = () => import('./settings');

export const routes: ModuleRoute[] = [
  { path: '/procurement/rfq', navId: 'rfq_received', component: lazy(() => rfqList().then((m) => ({ default: m.RfqListPage }))) },
  { path: '/procurement/rfq/new', navId: 'rfq_received', component: lazy(() => rfqEditor().then((m) => ({ default: m.RfqEditorPage }))) },
  { path: '/procurement/rfq/:id', navId: 'rfq_received', component: lazy(() => rfqDetail().then((m) => ({ default: m.RfqDetailPage }))) },
  { path: '/procurement/rfq/:id/edit', navId: 'rfq_received', component: lazy(() => rfqEditor().then((m) => ({ default: m.RfqEditorPage }))) },
  { path: '/procurement/rfq/:id/print', navId: 'rfq_received', bare: true, component: lazy(() => rfqPrint().then((m) => ({ default: m.RfqPrintView }))) },
  { path: '/procurement/suppliers', navId: 'rfq_suppliers', component: lazy(() => suppliers().then((m) => ({ default: m.SuppliersPage }))) },
  { path: '/procurement/emails', navId: 'procurement_emails', component: lazy(() => emails().then((m) => ({ default: m.EmailInboxPage }))) },
  { path: '/procurement/whatsapp', navId: 'procurement_whatsapp', component: lazy(() => whatsapp().then((m) => ({ default: m.WhatsAppInboxPage }))) },
  { path: '/procurement/settings', navId: 'stores', component: lazy(() => settings().then((m) => ({ default: m.ProcurementSettingsPage }))) },
  // Backend contract: headless Chrome renders /rfq-print?key=… for send / generate-pdf / generate-image / download-pdf.
  { path: '/rfq-print', bare: true, public: true, component: lazy(() => rfqPrint().then((m) => ({ default: m.RfqServerPrint }))) },
];

const rfqEnabled = () => {
  const s = session.getJSON<Record<string, any> | null>(KEYS.storeSettings, null);
  return !!s?.enable_ai_rfq_bot && !!s?.enable_rfq_module;
};

export function setup() {
  registerArabic(ar);
  registerTopbarItem('procurement-whatsapp-unread', WhatsAppUnreadButton, 40);
  registerTopbarItem('procurement-email-unread', EmailUnreadButton, 41);
  registerCreate({ label: 'New RFQ', path: '/procurement/rfq/new', icon: 'inbox', resource: 'rfq_received', navId: 'rfq_received' });
  registerCreate({ label: 'New RFQ supplier', path: '/procurement/suppliers?new=1', icon: 'building', resource: 'rfq_suppliers', navId: 'rfq_suppliers' });
  registerSearch({
    id: 'rfq', group: 'RFQs', resource: 'rfq_received',
    search: async (q, storeId, signal) => {
      if (!rfqEnabled()) return [];
      const r = await papi.get<{ items: RFQ[] | null }>('/v1/rfq-received', { store_id: storeId, search: q, limit: 5 }, signal);
      return (r.items || []).map((x) => ({ id: `rfq:${x.id}`, label: `${x.code} · ${x.customer_name || x.from_name || ''}`, sub: [fmtDate(x.received_at), x.status].filter(Boolean).join(' · '), icon: 'inbox' as const, path: `/procurement/rfq/${x.id}`, group: 'RFQs' }));
    },
  });
  registerSearch({
    id: 'rfq_suppliers', group: 'RFQ suppliers', resource: 'rfq_suppliers',
    search: async (q, storeId, signal) => {
      if (!rfqEnabled()) return [];
      const r = await papi.get<{ result: RFQSupplier[] | null }>('/v1/rfq-suppliers', { store_id: storeId, search: q, limit: 5 }, signal);
      return (r.result || []).map((s) => ({ id: `rfqsup:${s.id}`, label: s.name, sub: [s.phone, s.purchase_market].filter(Boolean).join(' · '), icon: 'building' as const, path: `/procurement/suppliers?q=${encodeURIComponent(s.name)}`, group: 'RFQ suppliers' }));
    },
  });
}
