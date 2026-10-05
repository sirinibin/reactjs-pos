import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig, type DocState } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Field';
import { Banner, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS, normalizeDocLines, poFromPr, poProductsToApi, poReceivedBody, type Doc } from './api';
import { PO_STATUS_OPTIONS, PoStatusPill, ShareActions } from './components';
import { vendorFilterLoad } from './purchases';

const LIST = PATHS.orders;
const SELECT = 'id,code,date,expected_date,vendor_id,vendor_name,vendor_invoice_no,status,net_total,vat_price,total_quantity,created_by_name,created_at,remarks,purchase_request_code,purchase_code';

export function poListConfig(): ListConfig<Doc> {
  return {
    title: 'Purchase orders',
    subtitle: 'Orders sent to vendors before goods arrive',
    icon: 'file',
    endpoint: EP.po,
    resource: 'purchase_orders',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/^\d|^[A-Za-z]+-/.test(q) ? { code: q } : { vendor_name: q }),
    searchPlaceholder: 'Search PO # or vendor…',
    createPath: `${LIST}/new`,
    createLabel: 'New purchase order',
    detailPath: (r) => `${LIST}/${r.id}`,
    // The PO list parser honours a single status value only (purchase.md §3.1) — one view per status.
    views: [{ id: 'all', label: 'All orders' }, ...PO_STATUS_OPTIONS.map((o) => ({ id: o.value, label: o.label, search: { status: o.value } }))],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'vendor', label: 'Vendor', type: 'picker', toSearch: (v) => ({ vendor_id: v }), load: async () => [] },
      { id: 'created_by_name', label: 'Created by', type: 'text' },
    ],
    summary: (m) => [
      { label: 'Orders', value: (m.count ?? 0).toLocaleString() },
      { label: 'Order value', value: fmtMoney(m.total_purchase_order) },
      { label: 'VAT', value: fmtMoney(m.vat_price) },
      { label: 'Discount', value: fmtMoney(m.discount) },
    ],
    columns: [
      { key: 'code', header: tt('PO #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)}</span> },
      { key: 'vendor', header: tt('Vendor'), sortKey: 'vendor_name', className: 'two', render: (r) => <><b><bdi>{r.vendor_name || '—'}</bdi></b><span>{r.vendor_invoice_no || ''}</span></> },
      { key: 'status', header: tt('Status'), sortKey: 'status', render: (r) => <PoStatusPill status={r.status} /> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'qty', header: tt('Qty'), sortKey: 'total_quantity', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{r.total_quantity ?? '—'}</span> },
      { key: 'expected', header: tt('Expected'), sortKey: 'expected_date', hideBelow: 'lg', render: (r) => <span className="num">{r.expected_date ? fmtDate(r.expected_date) : '—'}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.vendor_name}</bdi>, meta: <>{fmtDate(r.date)} <PoStatusPill status={r.status} /></> }),
    exportColumns: [
      { header: 'PO #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Vendor', value: (r) => r.vendor_name },
      { header: 'Status', value: (r) => r.status },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Qty', value: (r) => r.total_quantity },
      { header: 'Expected', value: (r) => (r.expected_date ? fmtDate(r.expected_date) : '') },
    ],
    exportName: 'purchase-orders',
    showFooter: false,
  };
}

export function PoListPage() {
  const storeId = useStoreId();
  const cfg = poListConfig();
  cfg.filters = cfg.filters!.map((f) => (f.id === 'vendor' && f.type === 'picker' ? { ...f, load: vendorFilterLoad(storeId) } : f));
  return <ListPage config={cfg} />;
}

// ───────────────────────────── editor ─────────────────────────────

export function poDocConfig(prefill?: () => Partial<DocState> | null, userId?: string): DocConfig {
  return {
    kind: 'purchase_order',
    endpoint: EP.po,
    calcEndpoint: `${EP.po}/calculate-net-total`,
    resource: 'purchase_orders',
    icon: 'file',
    titleNew: 'New purchase order',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase orders', to: LIST }],
    listPath: LIST,
    viewPath: (id) => `${LIST}/${id}`,
    party: { kind: 'vendor', idField: 'vendor_id', nameField: 'vendor_name', label: 'Vendor', allowFreeText: true },
    priceSource: 'purchase',
    lineColumns: ['unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'],
    features: { payments: false, shipping: true, discount: true, rounding: true, cashDiscount: false, warehouse: false },
    renderExtra: (s, set, errors) => (
      <>
        <Field label={tt('Expected date')} error={errors.expected_date_str}>{(id) => <Input id={id} type="date" value={s.extra.expected_date || ''} onChange={(e) => set({ expected_date: e.target.value })} />}</Field>
        <Field label={tt('Status')}>{(id) => <Select id={id} value={s.extra.status || 'draft'} onChange={(e) => set({ status: e.target.value })} options={PO_STATUS_OPTIONS.map((o) => ({ ...o, label: tt(o.label) }))} />}</Field>
        <Field label={tt('Vendor invoice #')}>{(id) => <Input id={id} value={s.extra.vendor_invoice_no || ''} onChange={(e) => set({ vendor_invoice_no: e.target.value })} />}</Field>
        {s.extra.purchase_request_code && <Field label={tt('Purchase request')}>{(id) => <Input id={id} readOnly className="mono" value={s.extra.purchase_request_code} />}</Field>}
      </>
    ),
    fromApi: (d) => ({
      status: d.status || 'draft', expected_date: d.expected_date ? String(toRfc3339(new Date(d.expected_date))).slice(0, 10) : '', vendor_invoice_no: d.vendor_invoice_no || '',
      purchase_request_id: d.purchase_request_id || undefined, purchase_request_code: d.purchase_request_code || undefined,
      purchase_id: d.purchase_id || undefined, purchase_code: d.purchase_code || undefined, order_placed_by: d.order_placed_by || undefined,
    }),
    toApi: (body, s) => {
      const { expected_date, cash_discount: _cd, ...rest } = body;
      const out: Record<string, any> = { ...rest, products: poProductsToApi(rest.products || [], s.lines), status: rest.status || 'draft', order_placed_by: rest.order_placed_by || userId };
      if (expected_date) out.expected_date_str = toRfc3339(new Date(`${expected_date}T00:00:00`));
      Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
      return out;
    },
    prefill,
  };
}

export function PoEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { store, user } = useAuth();
  const fromPr = sp.get('from_pr') || undefined;
  const q = useRecord<Doc>(EP.po, id);
  const pr = useRecord<Doc>(EP.pr, id ? undefined : fromPr);
  const existing = useMemo(() => (q.data ? normalizeDocLines(q.data, 'purchase') : undefined), [q.data]);
  const failed = (id && q.isError && q) || (fromPr && pr.isError && pr) || null;
  if (failed) return <div className="pad"><ErrorState error={failed.error} onRetry={() => failed.refetch()} /></div>;
  if ((id && !q.data) || (fromPr && !pr.data)) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  const vat = store?.vat_percent ?? 15;
  const prefill = id ? undefined : () => {
    const base = { status: 'draft', order_placed_by: user?.id };
    if (pr.data) { const p = poFromPr(pr.data, vat); return { ...p, extra: { ...base, ...(p.extra || {}) } }; }
    return { extra: base };
  };
  return (
    <>
      {pr.data && !id && <div className="pad" style={{ paddingBottom: 0 }}><Banner tone="info" icon="clip">{tt('Creating an order for request')} <b className="mono">{pr.data.code}</b>.</Banner></div>}
      <DocumentEditor key={`${id || 'new'}:${fromPr || ''}`} config={poDocConfig(prefill, user?.id)} id={id} existing={existing} />
    </>
  );
}

// ───────────────────────────── view ─────────────────────────────

const STEP_ORDER = ['draft', 'sent', 'confirmed', 'partially_received', 'received'];

export function PoViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { can, store } = useAuth();
  const storeId = useStoreId();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirmEl, ask] = useConfirm();
  const [busy, setBusy] = useState('');
  const q = useRecord<Doc>(EP.po, id);
  const doc = useMemo(() => (q.data ? normalizeDocLines(q.data, 'purchase') : undefined), [q.data]);

  const setStatus = async (d: Doc, status: string) => {
    setBusy('status');
    try {
      await api.put(`${EP.po}/${d.id}`, { ...poReceivedBody(q.data, storeId), status }, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [EP.po] });
      toast.success(t('Status changed to {{s}}', { s: t(PO_STATUS_OPTIONS.find((o) => o.value === status)?.label || status) }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally { setBusy(''); }
  };
  const remove = async (d: Doc) => {
    if (!(await ask(t('Delete {{code}}?', { code: d.code }), { body: t('The purchase order is permanently deleted. This can’t be undone.'), danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${EP.po}/${d.id}`, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [EP.po] });
      toast.success(t('{{code}} deleted', { code: d.code }));
      nav(LIST, { replace: true });
    } catch (e) { toast.error(e instanceof ApiError ? e.message : (e as Error).message); }
  };
  const step = async (dir: 'previous' | 'next') => {
    setBusy(dir);
    try {
      const r = await api.get<any>(`/v1/${dir}-purchase-order/${id}`, { search: { store_id: storeId } });
      if (r.result?.id) nav(`${LIST}/${r.result.id}`);
      else toast.info(t('No more orders.'));
    } catch {
      toast.info(t('No more orders.'));
    } finally { setBusy(''); }
  };
  const convert = async (d: Doc) => {
    if (!(await ask(t('Convert {{code}} to a purchase bill?', { code: d.code }), { body: t('A new purchase bill opens with the order’s lines. The order is marked as received when you save the bill.'), confirmLabel: t('Continue') }))) return;
    nav(`${PATHS.purchases}/new?from_po=${d.id}`);
  };

  const view: ViewConfig = {
    icon: 'file',
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase orders', to: LIST }],
    partyLabel: 'Vendor',
    partyName: (d) => d.vendor_name,
    partyLink: (d) => (d.vendor_id ? `${PATHS.vendors}/${d.vendor_id}` : undefined),
    pills: (d) => <PoStatusPill status={d.status} />,
    facets: (d) => [
      { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('VAT'), value: fmtMoney(d.vat_price), hideOnMobile: true },
      { label: t('Qty'), value: d.total_quantity ?? '—' },
      { label: t('Expected'), value: d.expected_date ? fmtDate(d.expected_date) : '—' },
    ],
    steps: (d) => (d.status === 'cancelled' ? null : { steps: ['Draft', 'Sent', 'Confirmed', 'Partially received', 'Received'], current: Math.max(0, STEP_ORDER.indexOf(d.status || 'draft')) + (d.status === 'received' ? 1 : 0) }),
    banner: (d) => (d.status === 'cancelled' ? <Banner tone="crit">{t('This order was cancelled.')}</Banner> : null),
    flow: (d) => [
      ...(d.purchase_request_id ? [{ kind: t('Purchase request'), icon: 'clip' as const, code: d.purchase_request_code, to: `${PATHS.requests}/${d.purchase_request_id}` }] : []),
      { kind: t('Purchase order'), icon: 'file', code: d.code, current: true, status: <PoStatusPill status={d.status} /> },
      ...(d.purchase_id ? [{ kind: t('Purchase bill'), icon: 'cart' as const, code: d.purchase_code, to: `${PATHS.purchases}/${d.purchase_id}` }]
        : d.status !== 'cancelled' && can('purchases', 'create') ? [{ kind: t('Purchase bill'), icon: 'cart' as const, code: t('Convert to purchase'), ghost: true, onClick: () => convert(d) }] : []),
    ],
    actions: (d) => (
      <>
        {!['received', 'cancelled'].includes(d.status) && can('purchases', 'create') && store?.settings?.enable_purchase_order_module !== false && <Button variant="primary" icon="cart" onClick={() => convert(d)}>{t('Convert to purchase')}</Button>}
        {can('purchase_orders', 'update') && (
          <select className="inp" style={{ width: 'auto', height: 34 }} aria-label={t('Change status')} value={d.status || 'draft'} disabled={busy === 'status'} onChange={(e) => setStatus(d, e.target.value)}>
            {PO_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
          </select>
        )}
        <Button icon="print" onClick={() => window.open(`/print/purchase_order/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="purchase_order" phone={d.phone} />
        {can('purchase_orders', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {can('purchase_orders', 'delete') && <IconButton icon="trash" label={t('Delete')} onClick={() => remove(d)} />}
        <IconButton icon="chevr" label={t('Previous order')} onClick={() => step('previous')} disabled={!!busy} style={{ transform: 'scaleX(-1)' }} />
        <IconButton icon="chevr" label={t('Next order')} onClick={() => step('next')} disabled={!!busy} />
      </>
    ),
  };
  return (
    <>
      <DocumentView doc={doc} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {confirmEl}
    </>
  );
}
