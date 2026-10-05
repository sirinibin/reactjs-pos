import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { DocumentEditor, type DocConfig } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { useDebounced } from '@/framework/useListState';
import { Button, IconButton } from '@/ui/Button';
import { DataGrid, Pager, type Column, type SortState } from '@/ui/DataGrid';
import { Field, SearchInput } from '@/ui/Field';
import { ErrorState, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS, normalizeDocLines, prListQuery, prToApi, type Doc } from './api';
import { PR_STATUS_OPTIONS, PrStatusPill, ShareActions, UserPicker } from './components';

const LIST = PATHS.requests;
type Tab = 'received' | 'sent' | 'all';

/** Purchase-request actions shared by the list and the view. */
function usePrActions() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [confirmEl, ask] = useConfirm();
  const [busy, setBusy] = useState('');
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      qc.invalidateQueries({ queryKey: [EP.pr] });
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
      return false;
    } finally { setBusy(''); }
  };
  const S = { search: { store_id: storeId } };
  return {
    confirmEl, busy,
    accept: (d: Doc, partial: boolean) => run(`accept:${d.id}`, () => api.post(`${EP.pr}/${d.id}/accept`, { partial }, S), partial ? t('{{code}} partially accepted', { code: d.code }) : t('{{code}} accepted', { code: d.code })),
    reject: async (d: Doc) => (await ask(t('Reject {{code}}?', { code: d.code }), { danger: true, confirmLabel: t('Reject') })) && run(`reject:${d.id}`, () => api.post(`${EP.pr}/${d.id}/reject`, {}, S), t('{{code}} rejected', { code: d.code })),
    remove: async (d: Doc) => (await ask(t('Delete {{code}}?', { code: d.code }), { body: t('The request is permanently deleted. This can’t be undone.'), danger: true, confirmLabel: t('Delete') })) && run(`del:${d.id}`, () => api.del(`${EP.pr}/${d.id}`, S), t('{{code}} deleted', { code: d.code })),
  };
}

const canAct = (d: Doc, userId?: string, isAdmin?: boolean) => d.status === 'pending' && (isAdmin || d.assigned_to === userId);
const canMakePo = (d: Doc) => (d.status === 'accepted' || d.status === 'partially_accepted') && !d.purchase_order_id;

export function PrListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { user, can, isAdmin, store } = useAuth();
  usePageMeta(t('Purchase requests'), 'clip');
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'received';
  const status = sp.get('status') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const size = Number(sp.get('size')) || 20;
  const [qDraft, setQDraft] = useState(sp.get('q') || '');
  const q = useDebounced(qDraft, 300);
  const [sort, setSort] = useState<SortState>({ key: 'created_at', dir: -1 });
  const set = (patch: Record<string, string | null>) => setSp((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); return n; }, { replace: true });
  const params = prListQuery({ storeId, page, limit: size, sortBy: sort.key, dir: sort.dir, tab, userId: user?.id, status, code: q });
  const res = useQuery({
    queryKey: [EP.pr, 'list', params],
    queryFn: async ({ signal }) => { const r = await api.get<Doc[]>(EP.pr, params, signal); return { rows: r.result || [], total: r.total_count || 0 }; },
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
  const act = usePrActions();
  const poOn = !!store?.settings?.enable_purchase_order_module;

  const columns: Column<Doc>[] = [
    { key: 'code', header: t('Request #'), sortKey: 'code', className: 'code', render: (r) => r.code },
    { key: 'date', header: t('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)}</span> },
    { key: 'from', header: tab === 'sent' ? t('To') : t('From'), className: 'two', render: (r) => <><b><bdi>{tab === 'sent' ? r.assigned_to_name : r.created_by_name || '—'}</bdi></b><span>{tab === 'all' ? `→ ${r.assigned_to_name || '—'}` : ''}</span></> },
    { key: 'items', header: t('Items'), align: 'end', hideBelow: 'md', render: (r) => <span className="num">{r.products?.length || 0}</span> },
    { key: 'net_total', header: t('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
    { key: 'status', header: t('Status'), sortKey: 'status', render: (r) => <PrStatusPill status={r.status} /> },
    { key: 'po', header: t('P.O.'), hideBelow: 'lg', render: (r) => (r.purchase_order_id ? <a className="link mono" href={`${PATHS.orders}/${r.purchase_order_id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(`${PATHS.orders}/${r.purchase_order_id}`); }}>{r.purchase_order_code}</a> : '—') },
  ];

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Purchase requests')}</h1><p>{t('Internal requests to buy stock, sent between users')}</p></div>
        <div className="acts">{can('purchase_requests', 'create') && <Button variant="primary" icon="plus" onClick={() => nav(`${LIST}/new`)}>{t('New request')}</Button>}</div>
      </div>
      <div className="card">
        <Tabs className="vtabs" label={t('Saved views')} value={tab} onChange={(v) => set({ tab: v === 'received' ? null : v })}
          tabs={[{ id: 'received', label: t('Received') }, { id: 'sent', label: t('Sent') }, { id: 'all', label: t('All requests'), hidden: !isAdmin }]} />
        <div className="gridbar">
          <SearchInput value={qDraft} onChange={setQDraft} placeholder={t('Search request #…')} aria-label={t('Search')} />
          <select className="inp" style={{ width: 'auto' }} aria-label={t('Status')} value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">{t('Any status')}</option>
            {PR_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
          </select>
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => res.refetch()} />
        </div>
        {res.isError ? <div style={{ padding: 12 }}><ErrorState error={res.error} onRetry={() => res.refetch()} /></div> : (
          <DataGrid<Doc> label={t('Purchase requests')} columns={columns} rows={res.data?.rows || []} rowKey={(r) => r.id} loading={res.isLoading}
            sort={sort} onSort={setSort} onRowClick={(r) => nav(`${LIST}/${r.id}`)}
            rowActions={(r) => (
              <div className="row" style={{ gap: 4, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                {canAct(r, user?.id, isAdmin) && <><Button size="sm" icon="check" loading={act.busy === `accept:${r.id}`} onClick={() => act.accept(r, false)}>{t('Accept')}</Button><IconButton icon="xc" label={t('Reject')} onClick={() => act.reject(r)} /></>}
                {canMakePo(r) && poOn && can('purchase_orders', 'create') && <Button size="sm" icon="file" onClick={() => nav(`${PATHS.orders}/new?from_pr=${r.id}`)}>{t('Create P.O.')}</Button>}
              </div>
            )}
            mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{tab === 'sent' ? r.assigned_to_name : r.created_by_name}</bdi>, meta: <>{fmtDate(r.date)} <PrStatusPill status={r.status} /></> })} />
        )}
        <Pager page={page} pageSize={size} total={res.data?.total || 0} onPage={(p) => set({ page: p > 1 ? String(p) : null })} onPageSize={(n) => set({ size: String(n) })} />
      </div>
      {act.confirmEl}
    </section>
  );
}

// ───────────────────────────── editor ─────────────────────────────

export function prDocConfig(): DocConfig {
  return {
    kind: 'purchase_request',
    endpoint: EP.pr,
    resource: 'purchase_requests',
    icon: 'clip',
    titleNew: 'New purchase request',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase requests', to: LIST }],
    listPath: LIST,
    viewPath: (id) => `${LIST}/${id}`,
    priceSource: 'purchase',
    lineColumns: ['unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'],
    features: { payments: false, shipping: true, discount: true, rounding: false, cashDiscount: false, warehouse: false, contactFields: false },
    allowZeroPrice: true,
    renderExtra: (s, set, errors) => (
      <Field label={tt('Assign to')} required error={errors.assigned_to} className="span2">
        {(id, d) => <UserPicker id={id} describedBy={d} invalid={!!errors.assigned_to} value={s.extra.assigned_to || null} onChange={(o) => set({ assigned_to: o })} />}
      </Field>
    ),
    fromApi: (d) => ({ assigned_to: d.assigned_to ? { id: d.assigned_to, label: d.assigned_to_name || '', data: null } : null }),
    toApi: prToApi,
    extraValidate: (s): Record<string, string> => (s.extra.assigned_to ? {} : { assigned_to: tt('Choose who should handle this request.') }),
  };
}

export function PrEditorPage() {
  const { id } = useParams();
  const { store } = useAuth();
  const q = useRecord<Doc>(EP.pr, id);
  const existing = useMemo(() => (q.data ? { ...normalizeDocLines(q.data, 'purchase'), remarks: q.data.notes || '', auto_rounding_amount: false } : undefined), [q.data]);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  const cfg = prDocConfig();
  const vat = store?.vat_percent ?? 15;
  if (!id) cfg.prefill = () => ({ extra: { assigned_to: null }, summary: { vat_percent: vat, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: false, rounding_amount: 0, cash_discount: 0 } });
  return <DocumentEditor key={id || 'new'} config={cfg} id={id} existing={existing} />;
}

// ───────────────────────────── view ─────────────────────────────

export function PrViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { can, user, isAdmin, store } = useAuth();
  const q = useRecord<Doc>(EP.pr, id);
  const act = usePrActions();
  const doc = useMemo(() => (q.data ? { ...normalizeDocLines(q.data, 'purchase'), remarks: q.data.notes } : undefined), [q.data]);
  const poOn = !!store?.settings?.enable_purchase_order_module;

  const view: ViewConfig = {
    icon: 'clip',
    crumbs: [{ label: 'Buying', to: LIST }, { label: 'Purchase requests', to: LIST }],
    partyLabel: 'Assigned to',
    partyName: (d) => d.assigned_to_name,
    pills: (d) => <PrStatusPill status={d.status} />,
    facets: (d) => [
      { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Items'), value: d.products?.length || 0 },
      { label: t('From'), value: d.created_by_name || '—' },
    ],
    steps: (d) => (d.status === 'rejected' ? null : { steps: ['Requested', 'Accepted', 'Ordered'], current: d.purchase_order_id ? 3 : d.status === 'pending' ? 1 : 2 }),
    flow: (d) => [
      { kind: t('Purchase request'), icon: 'clip', code: d.code, current: true, status: <PrStatusPill status={d.status} /> },
      ...(d.purchase_order_id ? [{ kind: t('Purchase order'), icon: 'file' as const, code: d.purchase_order_code, to: `${PATHS.orders}/${d.purchase_order_id}` }] : []),
    ],
    actions: (d) => (
      <>
        {canAct(d, user?.id, isAdmin) && (
          <>
            <Button variant="primary" icon="check" loading={act.busy === `accept:${d.id}`} onClick={() => act.accept(d, false)}>{t('Accept')}</Button>
            <Button onClick={() => act.accept(d, true)}>{t('Partially accept')}</Button>
            <Button icon="xc" onClick={() => act.reject(d)}>{t('Reject')}</Button>
          </>
        )}
        {canMakePo(d) && poOn && can('purchase_orders', 'create') && <Button variant="primary" icon="file" onClick={() => nav(`${PATHS.orders}/new?from_pr=${d.id}`)}>{t('Create P.O.')}</Button>}
        <ShareActions doc={d} modelName="purchase_request" />
        {can('purchase_requests', 'update') && d.status === 'pending' && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {can('purchase_requests', 'delete') && <IconButton icon="trash" label={t('Delete')} onClick={async () => { if (await act.remove(d)) nav(LIST, { replace: true }); }} />}
      </>
    ),
  };
  return (
    <>
      <DocumentView doc={doc} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {act.confirmEl}
    </>
  );
}
