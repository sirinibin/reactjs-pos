import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { DataGrid, Pager, type Column } from '@/ui/DataGrid';
import { EmptyState, ErrorState, Tabs, useConfirm } from '@/ui/Misc';
import { SearchInput } from '@/ui/Field';
import { Tag } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { useDebounced, useListState } from '@/framework/useListState';
import { fmtDateTime } from '@/lib/format';
import { papi } from '../api';
import { RFQ_STATUSES, normPhone, repliesLabel, rfqPhones, rfqUnread, statusMeta } from '../logic';
import type { RFQ } from '../types';
import { RfqStatusPill, useRfqEvents } from '../components/common';
import { LiveProgress, type Progress } from '../components/LiveProgress';
import { RFQ_PATH, useInvalidateRfq, useRfqList, useThreadsForPhones } from './hooks';
import { downloadRfqPdf } from './print';

const TYPE_ICON: Record<string, 'file' | 'paper' | 'layers' | 'mail' | 'wa'> = { text: 'file', image: 'paper', document: 'paper', mixed: 'layers' };

export function RfqListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can, isAdmin, setting } = useAuth();
  usePageMeta(t('RFQ inbox'), 'inbox');
  const [sp] = useSearchParams();
  const { state, update } = useListState({ size: 10, view: 'all' });
  const [qDraft, setQDraft] = useState(state.q);
  const dq = useDebounced(qDraft, 300);
  useEffect(() => { if (dq !== state.q) update({ q: dq }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);
  const q = useRfqList({ q: state.q, status: state.view, page: state.page, size: state.size });
  const rows = useMemo(() => q.data?.rows || [], [q.data]);
  const threads = useThreadsForPhones(rfqPhones(rows)).data || [];
  const invalidate = useInvalidateRfq();
  const [progress, setProgress] = useState<Progress | null>(null);
  const clearProgress = useCallback(() => setProgress(null), []);
  const [confirmEl, ask] = useConfirm();
  const rfqModule = !!setting('enable_rfq_module');

  // Legacy deep links (?id=, ?edit=) open the record.
  useEffect(() => {
    const id = sp.get('id');
    const edit = sp.get('edit');
    if (id) nav(`${RFQ_PATH}/${id}`, { replace: true });
    else if (edit) nav(`${RFQ_PATH}/${edit}/edit`, { replace: true });
  }, [sp, nav]);

  useRfqEvents(storeId, {
    rfq_received: () => invalidate(),
    rfq_updated: () => invalidate(),
    rfq_progress: (d) => { setProgress(d); if (['done', 'suppliers_found', 'ai_skipped', 'failed', 'categories_identified'].includes(d?.stage)) invalidate(); },
  });

  const reprocess = async (r: RFQ) => {
    try {
      await papi.post(`/v1/rfq-received/${r.id}/process`, {}, { store_id: storeId });
      toast.success(t('Re-processing {{code}}…', { code: r.code }));
      setTimeout(invalidate, 2000);
    } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (r: RFQ) => {
    if (!(await ask(t('Delete {{code}}?', { code: r.code }), { danger: true, confirmLabel: t('Delete'), body: t('Permanently delete {{code}}? This will also unlink it from any connected email or WhatsApp message.', { code: r.code }) }))) return;
    try { await papi.del(`/v1/rfq-received/${r.id}`, { store_id: storeId }); toast.success(t('Deleted {{code}}', { code: r.code })); invalidate(); } catch (e) { toast.error((e as Error).message); }
  };
  const removeAll = async () => {
    if (!(await ask(t('Delete all RFQs?'), { danger: true, confirmLabel: t('Delete all'), body: t('This permanently deletes every RFQ in this store. This cannot be undone.') }))) return;
    try { const r = await papi.del<{ deleted: number }>('/v1/rfq-received', { store_id: storeId }); toast.success(t('Deleted {{n}} RFQs', { n: r.deleted ?? 0 })); invalidate(); } catch (e) { toast.error((e as Error).message); }
  };
  const pdf = useCallback(async (r: RFQ) => {
    try { await downloadRfqPdf(r, storeId); } catch (e) { toast.error((e as Error).message); }
  }, [storeId, toast]);

  const columns: Column<RFQ>[] = [
    { key: 'code', header: t('RFQ #'), className: 'code', render: (r) => <span className="mono">{r.code}</span> },
    { key: 'received_at', header: t('Received'), render: (r) => <span className="num">{fmtDateTime(r.received_at)}</span> },
    { key: 'customer', header: t('Customer'), className: 'two', render: (r) => <><b><bdi>{r.customer_name || r.from_name || '—'}</bdi></b><span><bdi>{r.customer_company || ''}</bdi></span></> },
    { key: 'customer_rfq_id', header: t('Customer RFQ ID'), hideBelow: 'xl', render: (r) => r.customer_rfq_id || '—' },
    { key: 'contact', header: t('Contact'), hideBelow: 'lg', className: 'two', render: (r) => <>{r.customer_email ? <a href={`mailto:${r.customer_email}`} onClick={(e) => e.stopPropagation()}>{r.customer_email}</a> : <span />}{r.customer_phone ? <a className="num" href={`tel:${r.customer_phone}`} onClick={(e) => e.stopPropagation()}>{r.customer_phone}</a> : <span />}</> },
    { key: 'type', header: t('Type'), hideBelow: 'xl', render: (r) => <span className="row" style={{ gap: 4 }}><Icon name={TYPE_ICON[r.message_type || ''] || 'file'} size="s" />{t(r.message_type || 'text')}</span> },
    { key: 'categories', header: t('Categories'), hideBelow: 'md', render: (r) => <span className="pr-cats">{(r.categories || []).slice(0, 3).map((c) => <Tag key={c}>{c}</Tag>)}{(r.categories || []).length > 3 && <Tag>+{(r.categories || []).length - 3}</Tag>}</span> },
    { key: 'status', header: t('Status'), render: (r) => <RfqStatusPill status={r.status} /> },
    { key: 'forwarded', header: t('Forwarded to'), align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{(r.forwarded_to || []).length || '—'}</span> },
    { key: 'replies', header: t('Replies'), hideBelow: 'xl', render: (r) => { const x = repliesLabel(r.supplier_replies); return x.n ? (x.quotes ? t('{{n}} quotes', { n: x.n }) : t('{{n}} replies', { n: x.n })) : '—'; } },
    ...(rfqModule ? [{ key: 'quotations', header: t('Quotations'), hideBelow: 'lg' as const, render: (r: RFQ) => <span className="pr-cats">{(r.quotation_codes || []).map((c, i) => r.quotation_ids?.[i] ? <Link key={c} to={`/sales/quotations/${r.quotation_ids[i]}`} onClick={(e) => e.stopPropagation()} className="tag">{c}</Link> : <Tag key={c}>{c}</Tag>)}</span> }] : []),
    { key: 'message', header: t('Message'), hideBelow: 'xl', render: (r) => r.procurement_message_id ? (
      <Link className="row link" style={{ gap: 4 }} onClick={(e) => e.stopPropagation()} to={r.source === 'whatsapp' ? `/procurement/whatsapp?phone=${normPhone(r.from_phone)}` : `/procurement/emails?msg=${r.procurement_message_id}`}>
        <Icon name={r.source === 'whatsapp' ? 'wa' : 'mail'} size="s" />{r.procurement_message_code || t('Open')}
      </Link>) : '—' },
  ];

  const rowActions = (r: RFQ) => {
    const unread = rfqUnread(r, threads);
    return (
      <span className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
        {unread > 0 && <span className="pr-badge" title={t('Unread WhatsApp messages')}>{unread}</span>}
        {can('rfq_received', 'update') && <IconButton icon="edit" label={`${t('Edit')} ${r.code}`} onClick={() => nav(`${RFQ_PATH}/${r.id}/edit`)} />}
        <IconButton icon="download" label={`${t('PDF')} ${r.code}`} onClick={() => pdf(r)} />
        {r.status === 'ready_to_send' && <IconButton icon="send" label={`${t('Send to suppliers')} ${r.code}`} onClick={() => nav(`${RFQ_PATH}/${r.id}?tab=send`)} />}
        {(r.status === 'failed' || r.status === 'received') && <IconButton icon="refresh" label={`${t('Re-process')} ${r.code}`} onClick={() => reprocess(r)} />}
        {can('rfq_received', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${r.code}`} onClick={() => remove(r)} />}
      </span>
    );
  };

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('RFQ inbox')}</h1><p>{t('Requests for quotation from WhatsApp, email and manual entry')}</p></div>
        <div className="acts">
          {isAdmin && can('rfq_received', 'delete') && <Button variant="danger" icon="trash" onClick={removeAll}>{t('Delete all')}</Button>}
          <Button icon="gear" onClick={() => nav('/procurement/settings')}>{t('Settings')}</Button>
          {can('rfq_received', 'create') && <Button variant="primary" icon="plus" onClick={() => nav(`${RFQ_PATH}/new`)}>{t('New RFQ')}</Button>}
        </div>
      </div>
      <div className="card">
        <Tabs className="vtabs" label={t('Status')} value={state.view} onChange={(v) => update({ view: v })}
          tabs={[{ id: 'all', label: t('All') }, ...RFQ_STATUSES.filter((s) => s !== 'ignored').map((s) => ({ id: s, label: t(statusMeta(s).label) }))]} />
        <div className="gridbar">
          <SearchInput value={qDraft} onChange={setQDraft} placeholder={t('Search code, customer, phone, category…')} aria-label={t('Search')} />
          <span className="spacer" />
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => q.refetch()} />
        </div>
        {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
          <DataGrid<RFQ> label={t('RFQ inbox')} columns={columns} rows={rows} rowKey={(r) => r.id} loading={q.isPending}
            onRowClick={(r) => nav(`${RFQ_PATH}/${r.id}`)} rowActions={rowActions}
            mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: <RfqStatusPill status={r.status} />, subtitle: <bdi>{r.customer_name || r.from_name || '—'}</bdi>, meta: <>{fmtDateTime(r.received_at)}{(r.categories || []).length > 0 && ` · ${(r.categories || []).slice(0, 2).join(', ')}`}</> })}
            empty={<EmptyState icon="inbox" title={t('No RFQs yet')} action={can('rfq_received', 'create') ? <Button variant="primary" icon="plus" onClick={() => nav(`${RFQ_PATH}/new`)}>{t('New RFQ')}</Button> : undefined}>{t('RFQs arrive automatically from the bot WhatsApp number and connected email accounts, or create one manually.')}</EmptyState>} />
        )}
        <Pager page={state.page} pageSize={state.size} total={q.data?.total || 0} sizes={[10, 25, 50, 100]} onPage={(p) => update({ page: p }, false)} onPageSize={(n) => update({ size: n })} />
      </div>
      <LiveProgress progress={progress} onClose={clearProgress} />
      {confirmEl}
    </section>
  );
}
