import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { ObjectBody, ObjectHeader, KeyValues } from '@/ui/ObjectPage';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Banner, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { Input } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtDateTime, fmtRelative } from '@/lib/format';
import { t as tt } from '@/i18n';
import { resolveImageUrl, serialPreview, SERIALS, zatcaState, type Rec } from '../lib/storeForm';
import { JOB_KINDS, type JobKind } from '../lib/misc';
import { STORE, STORES_PATH, StoreJobModal, useStorePerms, ZatcaConnectModal, ZatcaStatusPill } from './shared';
import '../admin.css';

type StoreRow = Rec & { id: string; name: string };

const LIST_SELECT = 'id,name,name_in_arabic,code,branch_name,country_code,vat_no,vat_percent,zatca,phone,email,created_by_name,created_at,deleted,deleted_at,marked_for_permanent_deletion,marked_for_permanent_deletion_at,permanent_deletion_after_days';

/** Days left before a store marked for permanent deletion is purged. */
export function daysUntilPurge(s: Rec, now = Date.now()): number | null {
  if (!s.marked_for_permanent_deletion || !s.marked_for_permanent_deletion_at) return null;
  const end = new Date(s.marked_for_permanent_deletion_at).getTime() + (Number(s.permanent_deletion_after_days) || 14) * 86400000;
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

export function storesListConfig(opts: { canCreate: boolean; activeId?: string; onSwitch: (r: StoreRow) => void }): ListConfig<StoreRow> {
  return {
    title: 'Stores',
    subtitle: 'Branches, tax registration, ZATCA and document settings',
    icon: 'store',
    endpoint: STORE,
    resource: 'stores',
    storeScoped: false,
    select: LIST_SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'name',
    searchPlaceholder: 'Search store name…',
    createPath: opts.canCreate ? `${STORES_PATH}/new` : undefined,
    createLabel: 'New store',
    detailPath: (r) => `${STORES_PATH}/${r.id}`,
    views: [
      { id: 'all', label: 'Active' },
      { id: 'deleted', label: 'Deleted', search: { deleted: 'yes' } },
      { id: 'any', label: 'All stores', search: { deleted: 'all' } },
    ],
    filters: [
      { id: 'code', label: 'Branch code', type: 'text' },
      { id: 'branch_name', label: 'Branch name', type: 'text' },
      { id: 'email', label: 'Email', type: 'text' },
      { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    columns: [
      { key: 'name', header: tt('Store'), sortKey: 'name', className: 'two', render: (r) => <><b><bdi>{r.name}</bdi>{r.id === opts.activeId && <> <Pill tone="info" icon="check">{tt('Current')}</Pill></>}</b><span dir="rtl"><bdi>{r.name_in_arabic || ''}</bdi></span></> },
      { key: 'code', header: tt('Branch code'), sortKey: 'code', className: 'code', render: (r) => r.code || '—' },
      { key: 'branch', header: tt('Branch'), sortKey: 'branch_name', render: (r) => <bdi>{r.branch_name || '—'}</bdi> },
      { key: 'vat', header: tt('VAT no.'), hideBelow: 'lg', render: (r) => <span className="num">{r.vat_no || '—'}</span> },
      { key: 'zatca', header: tt('ZATCA'), render: (r) => <ZatcaStatusPill zatca={r.zatca} /> },
      { key: 'status', header: tt('Status'), render: (r) => r.deleted ? <Pill tone="crit" icon="trash">{daysUntilPurge(r) !== null ? tt('Purge in {{n}}d', { n: daysUntilPurge(r) }) : tt('Deleted')}</Pill> : <Pill tone="good">{tt('Active')}</Pill> },
      { key: 'created', header: tt('Created'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: (r) => (!r.deleted && r.id !== opts.activeId ? <Button size="sm" onClick={() => opts.onSwitch(r)}>{tt('Switch to')}</Button> : null),
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, subtitle: <bdi>{r.name}{r.branch_name ? ` · ${r.branch_name}` : ''}</bdi>, meta: <><ZatcaStatusPill zatca={r.zatca} />{r.deleted && <Pill tone="crit" icon="trash">{tt('Deleted')}</Pill>}{r.id === opts.activeId && <Pill tone="info" icon="check">{tt('Current')}</Pill>}</> }),
    exportColumns: [
      { header: 'Store', value: (r) => r.name },
      { header: 'Name (Arabic)', value: (r) => r.name_in_arabic },
      { header: 'Branch code', value: (r) => r.code },
      { header: 'Branch', value: (r) => r.branch_name },
      { header: 'VAT no.', value: (r) => r.vat_no },
      { header: 'ZATCA', value: (r) => zatcaState(r.zatca) },
      { header: 'Created', value: (r) => fmtDate(r.created_at) },
    ],
    exportName: 'stores',
  };
}

export function StoresListPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { store, switchStore } = useAuth();
  const { canCreate } = useStorePerms();
  const onSwitch = async (r: StoreRow) => {
    try { await switchStore(r.id); toast.success(t('Switched to {{name}}', { name: r.name })); } catch (e) { toast.error((e as Error).message); }
  };
  return <ListPage config={storesListConfig({ canCreate, activeId: store?.id, onSwitch })} />;
}

/** GET /v1/store/{id} (full document). */
export function useStore(id: string | undefined) {
  return useQuery<Rec>({
    queryKey: [STORE, 'one', id],
    queryFn: async ({ signal }) => (await api.get<Rec>(`${STORE}/${id}`, undefined, signal)).result as Rec,
    enabled: !!id && id !== 'new',
  });
}

export function StoreProfilePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { store: active, switchStore, refreshStore } = useAuth();
  const { isAdmin, canEdit } = useStorePerms();
  const q = useStore(id);
  const s = q.data;
  usePageMeta(s?.name || t('Store'), 'store');
  const [confirmEl, ask] = useConfirm();
  const [job, setJob] = useState<JobKind | null>(null);
  const [zatca, setZatca] = useState(false);
  const [days, setDays] = useState('14');
  const [busy, setBusy] = useState('');

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!s) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={240} /></div>;

  const zs = zatcaState(s.zatca);
  const isActive = active?.id === s.id;
  const ageDays = s.created_at ? (Date.now() - new Date(s.created_at).getTime()) / 86400000 : 99;
  const purge = daysUntilPurge(s);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: [STORE] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const del = async () => {
    if (!(await ask(t('Delete “{{name}}”?', { name: s.name }), { body: t('It can be restored later from the Deleted view.'), danger: true, confirmLabel: t('Delete') }))) return;
    run('delete', () => api.del(`${STORE}/${s.id}`), t('Store deleted'));
  };
  const permanent = async () => {
    const ok = await ask(t('Delete “{{name}}” permanently?', { name: s.name }), {
      danger: true, confirmLabel: t('Delete permanently'),
      body: <ul style={{ margin: 0, paddingInlineStart: 18 }}><li>{t('The store database is dropped.')}</li><li>{t('Images and ZATCA files are removed.')}</li><li>{t('This cannot be undone.')}</li></ul>,
    });
    if (!ok) return;
    setBusy('permanent');
    try {
      await api.del(`${STORE}/${s.id}/permanent`);
      toast.success(t('Store permanently deleted'));
      qc.invalidateQueries({ queryKey: [STORE] });
      nav(STORES_PATH);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const na = s.national_address || {};
  const bank = s.bank_account || {};
  const logo = resolveImageUrl(s.logo, s.id, 'store');

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Admin'), to: STORES_PATH }, { label: t('Stores'), to: STORES_PATH }, { label: <bdi>{s.code || s.name}</bdi> }]}
        avatar={logo ? <img src={logo} alt="" className="obj-ic" style={{ objectFit: 'contain', background: '#fff' }} /> : undefined}
        icon="store"
        title={<bdi>{s.name}</bdi>}
        pills={<>{' '}<ZatcaStatusPill zatca={s.zatca} />{isActive && <Pill tone="info" icon="check">{t('Current store')}</Pill>}{s.deleted && <Pill tone="crit" icon="trash">{t('Deleted')}</Pill>}</>}
        subtitle={<><bdi dir="rtl">{s.name_in_arabic}</bdi>{s.branch_name ? <> · <bdi>{s.branch_name}</bdi></> : null}</>}
        actions={<>
          {!s.deleted && !isActive && <Button className="hide-sm" icon="swap" onClick={async () => { await switchStore(s.id); toast.success(t('Switched to {{name}}', { name: s.name })); }}>{t('Switch to')}</Button>}
          {zs !== 'phase1' && zs !== 'connected' && canEdit && !s.deleted && <Button icon="shield" onClick={() => setZatca(true)}>{zs === 'reconnect' ? t('Reconnect to ZATCA') : t('Connect to ZATCA')}</Button>}
          {canEdit && !s.deleted && <Button variant="primary" icon="gear" onClick={() => nav(`${STORES_PATH}/${s.id}/settings`)}>{t('Settings')}</Button>}
        </>}
        facets={[
          { label: t('VAT no.'), value: s.vat_no || '—' },
          { label: t('VAT %'), value: s.vat_percent ?? '—' },
          { label: t('CR no.'), value: s.registration_number || '—', hideOnMobile: true },
          { label: t('Phone'), value: s.phone || '—', hideOnMobile: true },
          { label: t('Email'), value: <span style={{ fontSize: 13 }}>{s.email || '—'}</span>, hideOnMobile: true },
        ]}
      />
      <ObjectBody side={
        <aside className="stack">
          <Card title={t('ZATCA')}>
            <KeyValues items={[
              { k: t('Phase'), v: s.zatca?.phase === '2' ? t('Phase 2') : t('Phase 1') },
              ...(s.zatca?.phase === '2' ? [
                { k: t('Environment'), v: s.zatca?.env || '—' },
                { k: t('Connected'), v: s.zatca?.connected ? t('Yes') : t('No') },
                { k: t('Last connected'), v: s.zatca?.last_connected_at ? fmtRelative(s.zatca.last_connected_at) : '—' },
                { k: t('Failed attempts'), v: s.zatca?.connection_failed_count ?? 0 },
              ] : []),
            ]} />
            {zs === 'reconnect' && <div style={{ marginTop: 10 }}><Banner tone="warn">{t('ZATCA-sensitive fields changed. Reconnect before reporting invoices.')}</Banner></div>}
          </Card>
          {isAdmin && (
            <Card title={t('Data')}>
              <div className="stack" style={{ gap: 8 }}>
                <Button icon="download" onClick={() => setJob('backup')}>{t('Backup data')}</Button>
                {!s.deleted && JOB_KINDS.map((k) => <Button key={k.kind} icon="copy" onClick={() => setJob(k.kind)}>{t(k.label)}</Button>)}
              </div>
            </Card>
          )}
          {isAdmin && (
            <Card title={t('Danger zone')}>
              <div className="stack" style={{ gap: 8 }}>
                {!s.deleted && <Button variant="danger" icon="trash" loading={busy === 'delete'} onClick={del}>{t('Delete store')}</Button>}
                {s.deleted && <Button icon="undo" loading={busy === 'restore'} onClick={() => run('restore', () => api.post(`${STORE}/${s.id}/restore`), t('Store restored'))}>{t('Restore store')}</Button>}
                {s.deleted && !s.marked_for_permanent_deletion && (
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <Input aria-label={t('Days')} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 70 }} className="num" />
                    <Button loading={busy === 'mark'} onClick={() => run('mark', () => api.post(`${STORE}/${s.id}/mark-permanent-deletion`, { days: parseInt(days, 10) || 14 }), t('Store scheduled for permanent deletion'))}>{t('Purge after N days')}</Button>
                  </div>
                )}
                {s.marked_for_permanent_deletion && <><div className="hint">{t('Permanent deletion in {{n}} days', { n: purge })}</div><Button loading={busy === 'abort'} onClick={() => run('abort', () => api.post(`${STORE}/${s.id}/abort-permanent-deletion`), t('Permanent deletion aborted'))}>{t('Abort permanent deletion')}</Button></>}
                {s.deleted && ageDays <= 3 && <Button variant="danger" icon="trash" loading={busy === 'permanent'} onClick={permanent}>{t('Delete permanently')}</Button>}
              </div>
            </Card>
          )}
        </aside>
      }>
        <Card title={t('Company')}>
          <div className="grid-2c">
            <KeyValues items={[
              { k: t('Registered name'), v: <bdi>{s.name}</bdi> },
              { k: t('Name (Arabic)'), v: <bdi dir="rtl">{s.name_in_arabic || '—'}</bdi> },
              { k: t('Store name'), v: <bdi>{s.store_name || '—'}</bdi> },
              { k: t('Title'), v: <bdi>{s.title || '—'}</bdi> },
              { k: t('Business category'), v: s.business_category || '—' },
            ]} />
            <KeyValues items={[
              { k: t('Branch code'), v: <span className="mono">{s.code || '—'}</span> },
              { k: t('Branch name'), v: <bdi>{s.branch_name || '—'}</bdi> },
              { k: t('CR no.'), v: <span className="num">{s.registration_number || '—'}</span> },
              { k: t('VAT no.'), v: <span className="num">{s.vat_no || '—'}</span> },
              { k: t('Country'), v: s.country_code || '—' },
            ]} />
          </div>
        </Card>
        <Card title={t('National address')}>
          <div className="grid-2c">
            <KeyValues items={[
              { k: t('Building no.'), v: na.building_no || '—' }, { k: t('Street'), v: <bdi>{na.street_name || '—'}</bdi> },
              { k: t('District'), v: <bdi>{na.district_name || '—'}</bdi> }, { k: t('City'), v: <bdi>{na.city_name || '—'}</bdi> },
              { k: t('Zipcode'), v: na.zipcode || '—' }, { k: t('Additional no.'), v: na.additional_no || '—' },
            ]} />
            <KeyValues items={[
              { k: t('Street (Arabic)'), v: <bdi dir="rtl">{na.street_name_arabic || '—'}</bdi> },
              { k: t('District (Arabic)'), v: <bdi dir="rtl">{na.district_name_arabic || '—'}</bdi> },
              { k: t('City (Arabic)'), v: <bdi dir="rtl">{na.city_name_arabic || '—'}</bdi> },
              { k: t('Short code'), v: na.short_code || '—' }, { k: t('Unit no.'), v: na.unit_no || '—' },
            ]} />
          </div>
        </Card>
        <Card title={t('Document numbering')} bodyClass="card-b-tight">
          <div className="tw">
            <table className="dg" aria-label={t('Document numbering')}>
              <thead><tr><th>{t('Document')}</th><th>{t('Prefix')}</th><th className="r">{t('Padding')}</th><th className="r">{t('Starts at')}</th><th className="hide-sm">{t('Example')}</th></tr></thead>
              <tbody>
                {SERIALS.slice(0, 8).map((r) => {
                  const sn = s[`${r.key}_serial_number`];
                  return <tr key={r.key} style={{ cursor: 'default' }}><td>{t(r.label)}</td><td className="mono">{sn?.prefix || '—'}</td><td className="r num">{sn?.padding_count ?? '—'}</td><td className="r num">{sn?.start_from_count ?? '—'}</td><td className="mono muted hide-sm">{sn?.prefix ? serialPreview(sn) : '—'}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t('Bank account')}>
          <KeyValues items={[
            { k: t('Bank'), v: bank.bank_name || '—' }, { k: t('Account name'), v: bank.account_name || '—' },
            { k: t('Account no.'), v: <span className="num">{bank.account_no || '—'}</span> }, { k: 'IBAN', v: <span className="mono">{bank.iban || '—'}</span> },
            { k: t('Customer no.'), v: bank.customer_no || '—' },
          ]} />
        </Card>
        <Card title={t('Record')}>
          <KeyValues items={[
            { k: t('Created'), v: `${fmtDateTime(s.created_at)}${s.created_by_name ? ` · ${s.created_by_name}` : ''}` },
            { k: t('Updated'), v: `${fmtDateTime(s.updated_at)}${s.updated_by_name ? ` · ${s.updated_by_name}` : ''}` },
          ]} />
        </Card>
      </ObjectBody>
      {confirmEl}
      {job && <StoreJobModal kind={job} store={s} open={!!job} onClose={() => setJob(null)} />}
      <ZatcaConnectModal open={zatca} onClose={() => setZatca(false)} store={{ id: s.id, name: s.name }} reconnect={zs === 'reconnect'} onDone={() => { q.refetch(); if (isActive) refreshStore(); }} />
    </>
  );
}
