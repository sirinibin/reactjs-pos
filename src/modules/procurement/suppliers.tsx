import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Banner, EmptyState, ErrorState, useConfirm } from '@/ui/Misc';
import { SearchInput } from '@/ui/Field';
import { DataGrid, Pager, type Column } from '@/ui/DataGrid';
import { Pill, Tag } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { useDebounced, useListState } from '@/framework/useListState';
import { fmtDate } from '@/lib/format';
import { papi } from './api';
import { normPhone } from './logic';
import type { RFQSupplier } from './types';
import { SupplierForm, SUPPLIERS } from './components/SupplierForm';
import { useRfqEvents } from './components/common';
import './procurement.css';

const KEY = 'procurement-suppliers';

export function SuppliersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const qc = useQueryClient();
  usePageMeta(t('RFQ suppliers'), 'building');
  const { state, update } = useListState({ size: 20 });
  const [qDraft, setQDraft] = useState(state.q);
  const dq = useDebounced(qDraft, 300);
  useEffect(() => { if (dq !== state.q) update({ q: dq }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);
  const q = useQuery<{ rows: RFQSupplier[]; total: number }>({
    queryKey: [KEY, storeId, state.q, state.page, state.size],
    // Standard envelope here — the legacy page read `items` and was broken (§10.1).
    queryFn: ({ signal }) => papi.get<{ result: RFQSupplier[] | null; total_count: number }>(SUPPLIERS, { store_id: storeId, page: state.page, limit: state.size, search: state.q || undefined }, signal)
      .then((r) => ({ rows: r.result || [], total: r.total_count || 0 })),
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => q.data?.rows || [], [q.data]);
  const [sp, setSp] = useSearchParams();
  const [edit, setEdit] = useState<Partial<RFQSupplier> | null>(() => (sp.get('new') ? { name: '', phone: '', is_active: true } : null));
  useEffect(() => { if (sp.get('new')) { setEdit({ name: '', phone: '', is_active: true }); setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); return n; }, { replace: true }); } }, [sp, setSp]);
  const [busy, setBusy] = useState('');
  const [populate, setPopulate] = useState<{ percent: number; message: string } | null>(null);
  const [confirmEl, ask] = useConfirm();
  const reload = () => qc.invalidateQueries({ queryKey: [KEY] });
  useRfqEvents(storeId, {
    supplier_updated: () => reload(),
    populate_progress: (d) => { setPopulate(d?.done ? null : { percent: d?.percent || 0, message: d?.message || '' }); if (d?.done) { reload(); toast.success(t('Supplier population finished')); } },
  });

  const run = async (id: string, path: string, ok: (r: any) => string) => {
    setBusy(id);
    try { const r = await papi.post(path, {}, { store_id: storeId }); toast.success(ok(r)); reload(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(''); }
  };
  const refetchMaps = async (s: RFQSupplier) => {
    try {
      const r = await papi.post<{ status: string; message?: string }>(`${SUPPLIERS}/${s.id}/refetch-maps`, {}, { store_id: storeId });
      if (r.status === 'no_match') toast.info(r.message || t('No Google Maps match found'));
      else toast.success(t('Updated from Google Maps'));
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (s: RFQSupplier) => {
    if (!(await ask(t('Delete {{name}}?', { name: s.name }), { danger: true, confirmLabel: t('Delete'), body: t('The supplier will no longer receive RFQs.') }))) return;
    try { await papi.del(`${SUPPLIERS}/${s.id}`, { store_id: storeId }); toast.success(t('Supplier deleted')); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  const columns: Column<RFQSupplier>[] = [
    { key: 'code', header: t('ID'), hideBelow: 'xl', render: (s) => <span className="mono">{s.code || s.id?.slice(-6)}</span> },
    { key: 'name', header: t('Supplier'), className: 'two', render: (s) => <><b><bdi>{s.name}</bdi></b><span>{s.google_maps_url ? <a className="link" href={s.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="pin" size="xs" /> {t('Google Maps')}</a> : ''}</span></> },
    { key: 'phone', header: t('WhatsApp'), className: 'two', render: (s) => <><Link className="link num" to={`/procurement/whatsapp?phone=${normPhone(s.phone)}`} onClick={(e) => e.stopPropagation()}>{s.phone}</Link><span className="num">{s.phone2 || ''}</span></> },
    { key: 'categories', header: t('Categories'), render: (s) => <span className="pr-cats">{(s.categories || []).slice(0, 4).map((c) => <Tag key={c}>{c}</Tag>)}{(s.categories || []).length > 4 && <Tag>+{s.categories!.length - 4}</Tag>}</span> },
    { key: 'rating', header: t('Rating'), align: 'end', hideBelow: 'lg', render: (s) => <span className="num">{s.rating ? `★ ${s.rating}` : '—'}</span> },
    { key: 'market', header: t('Purchase market'), hideBelow: 'md', render: (s) => s.purchase_market || '—' },
    { key: 'address', header: t('Address'), hideBelow: 'xl', render: (s) => <span title={s.address}>{(s.address || '').length > 50 ? `${s.address!.slice(0, 50)}…` : s.address || '—'}</span> },
    { key: 'email', header: t('Email'), hideBelow: 'lg', render: (s) => s.email ? <Link className="link" to={`/procurement/emails?view=conv&email=${encodeURIComponent(s.email.toLowerCase())}`} onClick={(e) => e.stopPropagation()}>{s.email}</Link> : '—' },
    { key: 'status', header: t('Status'), render: (s) => s.is_active ? <Pill tone="good">{t('Active')}</Pill> : <Pill tone="neutral" icon="xc">{t('Inactive')}</Pill> },
    { key: 'added', header: t('Created'), hideBelow: 'xl', render: (s) => <span className="num">{fmtDate(s.added_at)}</span> },
  ];

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('RFQ suppliers')}</h1><p>{t('Suppliers that receive RFQs on WhatsApp, matched by category and market')}</p></div>
        <div className="acts">
          <Button icon="pin" loading={busy === 'markets'} onClick={() => run('markets', `${SUPPLIERS}/backfill-markets`, (r) => t('Markets filled: {{u}} updated, {{s}} skipped, {{f}} failed', { u: r.updated ?? 0, s: r.skipped ?? 0, f: r.failed ?? 0 }))}>{t('Fill markets')}</Button>
          <Button icon="mail" loading={busy === 'emails'} onClick={() => run('emails', `${SUPPLIERS}/backfill-emails`, (r) => t('Email crawl started for {{n}} supplier(s)…', { n: r.queued ?? 0 }))}>{t('Backfill emails')}</Button>
          <Button icon="layers" loading={busy === 'dedupe'} onClick={() => run('dedupe', `${SUPPLIERS}/deduplicate`, (r) => t('Removed {{n}} duplicates', { n: r.removed ?? 0 }))}>{t('Remove duplicates')}</Button>
          {can('rfq_suppliers', 'create') && <Button variant="primary" icon="plus" onClick={() => setEdit({ name: '', phone: '', is_active: true })}>{t('Add supplier')}</Button>}
        </div>
      </div>
      <Banner tone="info">{t('Categories drive matching: an RFQ is sent to active suppliers whose categories match the RFQ’s AI-identified categories.')}</Banner>
      {populate && <div className="card pad" role="status" style={{ marginTop: 12 }}><b>{t('Populating suppliers…')}</b> {populate.message}<div className="pr-bar"><i style={{ width: `${populate.percent}%` }} /></div></div>}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="gridbar">
          <SearchInput value={qDraft} onChange={setQDraft} placeholder={t('Search name, phone, address, category…')} aria-label={t('Search')} />
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => q.refetch()} />
        </div>
        {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
          <DataGrid<RFQSupplier> label={t('RFQ suppliers')} columns={columns} rows={rows} rowKey={(s) => s.id || s.phone} loading={q.isPending}
            onRowClick={can('rfq_suppliers', 'update') ? (s) => setEdit(s) : undefined}
            rowActions={(s) => <span className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
              {can('rfq_suppliers', 'update') && <IconButton icon="edit" label={`${t('Edit')} ${s.name}`} onClick={() => setEdit(s)} />}
              <IconButton icon="refresh" label={`${t('Refetch from Google Maps')} ${s.name}`} onClick={() => refetchMaps(s)} />
              {can('rfq_suppliers', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${s.name}`} onClick={() => remove(s)} />}
            </span>}
            mobileCard={(s) => ({ title: <bdi>{s.name}</bdi>, amount: s.is_active ? t('Active') : t('Inactive'), subtitle: <span className="num">{s.phone}</span>, meta: <>{s.purchase_market || ''} {(s.categories || []).slice(0, 3).join(', ')}</> })}
            empty={<EmptyState icon="building" title={t('No suppliers yet')} action={can('rfq_suppliers', 'create') ? <Button variant="primary" icon="plus" onClick={() => setEdit({ name: '', phone: '', is_active: true })}>{t('Add supplier')}</Button> : undefined}>{t('Add suppliers manually, fetch them from Google Maps on an RFQ, or populate them from your vendors in Procurement settings.')}</EmptyState>} />
        )}
        <Pager page={state.page} pageSize={state.size} total={q.data?.total || 0} onPage={(p) => update({ page: p }, false)} onPageSize={(n) => update({ size: n })} />
      </div>
      <SupplierForm open={!!edit} supplier={edit} onClose={() => setEdit(null)} onSaved={reload} />
      {confirmEl}
    </section>
  );
}
