import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig, type DocState } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { ErrorState, Skeleton } from '@/ui/Misc';
import { Field, Input } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { ShareActions } from '@/modules/sales/share';
import { defaultNotifyAt, deliveryNoteToApi, isInvoiced, reminderDue } from './logic';

export const DELIVERY_NOTE = '/v1/delivery-note';
export const DN_LIST = '/sales/delivery-notes';

type DeliveryNote = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,customer_id,customer_name,customer_name_arabic,net_total,vat_price,total_quantity,order_id,order_code,notify_at,remarks,created_by_name,created_at';

export function DnInvoicedPill({ d }: { d: Record<string, any> }) {
  if (isInvoiced(d)) return <Pill tone="good" icon="checkc">{tt('Invoiced')}</Pill>;
  if (reminderDue(d)) return <Pill tone="warn" icon="bell">{tt('Reminder due')}</Pill>;
  return <Pill tone="neutral">{tt('Not invoiced')}</Pill>;
}

export const dnSearchKey = (q: string) => (/^(S-)?INV/i.test(q.trim()) ? { order_code: q.trim() } : { code: q.trim() });

export function deliveryNoteListConfig(opts: { prices: boolean }): ListConfig<DeliveryNote> {
  return {
    title: 'Delivery notes',
    subtitle: 'Goods handed over to customers, before or without an invoice',
    icon: 'truck',
    endpoint: DELIVERY_NOTE,
    resource: 'delivery_notes',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: dnSearchKey,
    searchPlaceholder: 'Search delivery note # or sales invoice #…',
    createPath: `${DN_LIST}/new`,
    createLabel: 'New delivery note',
    detailPath: (r) => `${DN_LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All' },
      { id: 'open', label: 'Not invoiced', search: { invoiced: '0' } },
      { id: 'invoiced', label: 'Invoiced', search: { invoiced: '1' }, count: (m) => m.invoiced_count },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async () => [] },
      { id: 'order_code', label: 'Sales invoice #', type: 'text' },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Delivery notes', value: fmtMoney(m.total_deliverynote) },
      { label: 'VAT', value: fmtMoney(m.vat_price) },
      { label: 'Discount', value: fmtMoney(m.discount) },
      { label: 'Shipping & handling', value: fmtMoney(m.shipping_handling_fees) },
      { label: 'Invoiced', value: String(m.invoiced_count ?? 0) },
    ],
    columns: [
      { key: 'code', header: tt('Delivery note #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', className: 'two', render: (r) => <><b><bdi>{r.customer_name || '—'}</bdi></b>{r.customer_name_arabic ? <span><bdi>{r.customer_name_arabic}</bdi></span> : null}</> },
      ...(opts.prices ? [{ key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end' as const, render: (r: DeliveryNote) => <b className="num">{fmtMoney(r.net_total)}</b> }] : []),
      { key: 'invoiced', header: tt('Invoiced'), render: (r) => <DnInvoicedPill d={r} /> },
      { key: 'order_code', header: tt('Sales invoice'), sortKey: 'order_code', hideBelow: 'md', render: (r) => (r.order_code ? <span className="mono">{r.order_code}</span> : <span className="muted">—</span>) },
      { key: 'notify_at', header: tt('Reminder'), sortKey: 'notify_at', hideBelow: 'lg', render: (r) => (r.notify_at ? <span className="num">{fmtDateTime(r.notify_at)}</span> : <span className="muted">—</span>) },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: opts.prices ? fmtMoney(r.net_total) : undefined, subtitle: <bdi>{r.customer_name}</bdi>, meta: <>{fmtDate(r.date)} <DnInvoicedPill d={r} /></> }),
    exportColumns: [
      { header: 'Delivery note #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Invoiced', value: (r) => (isInvoiced(r) ? 'YES' : 'NO') },
      { header: 'Sales invoice', value: (r) => r.order_code },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'delivery-notes',
    showFooter: false,
  };
}

export function DeliveryNoteListPage() {
  const { store } = useAuth();
  const storeId = useStoreId();
  const cfg = deliveryNoteListConfig({ prices: !!store?.settings?.add_price_details_in_delivery_note });
  cfg.filters = cfg.filters!.map((f) => (f.id === 'customer' && f.type === 'picker' ? { ...f, load: async (q: string, s: AbortSignal) => (await searchParties('customer', storeId, q, s)).map(partyToOption) } : f));
  return <ListPage config={cfg} />;
}

export function deliveryNoteDocConfig(o: { prices: boolean; userId?: string }): DocConfig {
  return {
    kind: 'delivery_note',
    endpoint: DELIVERY_NOTE,
    calcEndpoint: `${DELIVERY_NOTE}/calculate-net-total`,
    resource: 'delivery_notes',
    icon: 'truck',
    titleNew: 'New delivery note',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Sales', to: DN_LIST }, { label: 'Delivery notes', to: DN_LIST }],
    listPath: DN_LIST,
    viewPath: (id) => `${DN_LIST}/${id}`,
    party: { kind: 'customer', idField: 'customer_id', nameField: 'customer_name', label: 'Customer', allowFreeText: true },
    priceSource: 'retail',
    // Price columns and discounts only with settings.add_price_details_in_delivery_note (sales.md §5.2).
    lineColumns: o.prices ? ['unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'] : [],
    checkStock: true,
    allowZeroPrice: true,
    features: { payments: false, shipping: o.prices, discount: o.prices, rounding: o.prices, hideVat: !o.prices, vatEditable: o.prices, contactFields: false },
    renderExtra: (s: DocState, set, errors) => (
      <Field label={tt('Reminder (notify at)')} error={errors.notify_at} hint={tt('Reminds you to invoice this delivery.')}>
        {(id, d) => <Input id={id} aria-describedby={d} type="datetime-local" value={s.extra.notify_at || ''} onChange={(e) => set({ notify_at: e.target.value })} />}
      </Field>
    ),
    fromApi: (d) => ({ notify_at: d.notify_at ? toLocalInput(d.notify_at) : '', delivered_by: d.delivered_by, status: d.status || 'delivered' }),
    prefill: () => ({ extra: { notify_at: defaultNotifyAt(), status: 'delivered' } }),
    toApi: (b, s) => {
      const out = deliveryNoteToApi(b, s);
      if (!out.delivered_by && o.userId) out.delivered_by = o.userId;
      return out;
    },
  };
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function DeliveryNoteEditorPage() {
  const { id } = useParams();
  const { store, user } = useAuth();
  const prices = !!store?.settings?.add_price_details_in_delivery_note;
  const q = useRecord<DeliveryNote>(DELIVERY_NOTE, id);
  const cfg = useMemo(() => deliveryNoteDocConfig({ prices, userId: user?.id }), [prices, user?.id]);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if ((id && !q.data) || !store) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <DocumentEditor key={id || 'new'} config={cfg} id={id} existing={q.data} />;
}

export function DeliveryNoteViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { store, can } = useAuth();
  const prices = !!store?.settings?.add_price_details_in_delivery_note;
  const q = useRecord<DeliveryNote>(DELIVERY_NOTE, id);

  const view: ViewConfig = {
    icon: 'truck',
    crumbs: [{ label: 'Sales', to: DN_LIST }, { label: 'Delivery notes', to: DN_LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    hideVat: !prices,
    pills: (d) => <DnInvoicedPill d={d} />,
    facets: (d) => [
      { label: t('Items'), value: `${(d.products || []).length} · ${d.total_quantity ?? (d.products || []).reduce((a: number, p: any) => a + (p.quantity || 0), 0)} ${t('qty')}` },
      ...(prices ? [{ label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> }] : []),
      { label: t('Reminder'), value: d.notify_at ? fmtDateTime(d.notify_at) : '—', tone: reminderDue(d) ? 'warn' as const : undefined, hideOnMobile: true },
      { label: t('Sales invoice'), value: d.order_code || '—' },
    ],
    steps: (d) => ({ steps: ['Created', 'Delivered', 'Invoiced'], current: isInvoiced(d) ? 3 : 2 }),
    flow: (d) => [
      { kind: t('Delivery note'), icon: 'truck' as const, code: d.code, current: true, status: <DnInvoicedPill d={d} /> },
      isInvoiced(d)
        ? { kind: t('Invoice'), icon: 'receipt' as const, code: d.order_code, to: `/sales/invoices/${d.order_id}` }
        : { kind: t('Invoice'), icon: 'receipt' as const, code: t('Create invoice'), ghost: true, to: `/sales/invoices/new?delivery_note_id=${d.id}` },
    ],
    actions: (d) => (
      <>
        {!isInvoiced(d) && can('sales', 'create') && <Button variant="primary" icon="receipt" onClick={() => nav(`/sales/invoices/new?delivery_note_id=${d.id}`)}>{t('Create invoice')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/delivery_note/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="delivery_note" compact />
        {can('delivery_notes', 'update') && <Button icon="edit" onClick={() => nav(`${DN_LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
      </>
    ),
  };

  return <DocumentView doc={q.data} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />;
}
