import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import type { FilterDef } from '@/framework/filters';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Field';
import { Drawer } from '@/ui/Overlay';
import { KeyValues } from '@/ui/ObjectPage';
import { EmptyState } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { attachmentUrl, FileDrop, loadUsers, Money, PayTag, Thumb, useOnce } from './components';
import { PAYMENT_METHODS } from './logic';
import { EQUITY, equityBody, toLocalInput, type EquityKind } from './bodies';

export { EQUITY, equityBody, type EquityKind };

type Row = Record<string, any> & { id: string; code: string };

export function equityListConfig(k: EquityKind, storeId: string, h: { onOpen: (r: Row) => void; onCreate: () => void }): ListConfig<Row> {
  const filters: FilterDef[] = [
    { id: 'date', label: 'Date', type: 'daterange' },
    { id: 'payment_method', label: 'Payment method', type: 'select', options: PAYMENT_METHODS },
    ...(k.userFilter ? [{ id: k.userField, label: k.userLabel, type: 'picker' as const, load: (q: string, s: AbortSignal) => loadUsers(storeId, q, s) }] : []),
    { id: 'amount', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    { id: 'description', label: 'Description', type: 'text' },
    { id: 'created_by', label: 'Created by', type: 'picker', load: (q, s) => loadUsers(storeId, q, s) },
    { id: 'created', label: 'Created at', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
  ];
  return {
    title: k.title,
    subtitle: k.subtitle,
    icon: k.icon,
    endpoint: k.endpoint,
    resource: k.resource,
    select: `id,code,date,amount,payment_method,description,${k.userField},${k.userName},created_by_name,created_at,images`,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/\d/.test(q) ? { code: q } : { description: q }),
    searchPlaceholder: 'Search # or description…',
    createLabel: `New ${k.singular}`,
    onCreate: h.onCreate,
    onRowClick: h.onOpen,
    filters,
    // Totals are always computed by these endpoints (no stats gate).
    summary: (m) => [{ label: 'Total', value: fmtMoney(m.total) }],
    columns: [
      { key: 'code', header: tt('ID'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'amount', header: tt('Amount'), sortKey: 'amount', align: 'end', render: (r) => <Money value={r.amount} strong /> },
      { key: 'pm', header: tt('Payment method'), sortKey: 'payment_method', render: (r) => <PayTag method={r.payment_method} /> },
      { key: 'desc', header: tt('Description'), hideBelow: 'md', className: 'wrap', render: (r) => <bdi>{r.description}</bdi> },
      { key: 'user', header: tt(k.userLabel), sortKey: k.userName, render: (r) => <bdi>{r[k.userName] || '—'}</bdi> },
      { key: 'created_by', header: tt('Created by'), sortKey: 'created_by_name', hideBelow: 'lg', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.amount), subtitle: <bdi>{r[k.userName]}</bdi>, meta: <>{fmtDate(r.date)} <PayTag method={r.payment_method} /></> }),
    exportColumns: [
      { header: 'ID', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Payment method', value: (r) => r.payment_method },
      { header: 'Description', value: (r) => r.description },
      { header: k.userLabel, value: (r) => r[k.userName] },
    ],
    exportName: k.id,
    empty: <EmptyState icon={k.icon} title={tt(`No ${k.title.toLowerCase()} yet`)}>{tt(k.subtitle)}</EmptyState>,
  };
}


function ImageField({ value, onChange, storeId, folder }: { value: any; onChange: (v: any) => void; storeId: string; folder: string }) {
  const { t } = useTranslation();
  const existing: string[] = value?.keep || [];
  return (
    <div className="stack" style={{ gap: 8 }}>
      {value?.dataUrl ? <div className="thumbs"><Thumb src={value.dataUrl} name={value.name} onRemove={() => onChange({ keep: existing })} /></div>
        : existing.length ? <div className="thumbs">{existing.map((x) => <Thumb key={x} src={attachmentUrl(x, storeId, folder)} name={x.split('/').pop() || x} onRemove={() => onChange({ keep: existing.filter((y) => y !== x) })} />)}</div> : null}
      <FileDrop multiple={false} accept="image/*" resize={400} label={t('Image (optional)')} onFiles={([f]) => onChange({ keep: existing, dataUrl: f.dataUrl, name: f.name })} />
    </div>
  );
}

export function EquityPage({ kind }: { kind: EquityKind['id'] }) {
  const k = EQUITY[kind];
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can } = useAuth();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const [form, setForm] = useState<{ open: boolean; initial: Row | null }>({ open: false, initial: null });
  const [view, setView] = useState<Row | null>(null);
  const openNew = useCallback(() => setForm({ open: true, initial: null }), []);
  const openId = sp.get('open');
  useOnce(sp.get('new') === '1' && can(k.resource, 'create'), openNew);
  const openById = useCallback(() => {
    api.get<Row>(`${k.endpoint}/${openId}`, { search: { store_id: storeId } }).then((r) => r.result && setView(r.result)).catch((e) => toast.error(e.message));
  }, [k.endpoint, openId, storeId, toast]);
  useOnce(!!openId && !!storeId, openById);
  const clearParams = () => {
    if (sp.has('new') || sp.has('open')) setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); n.delete('open'); return n; }, { replace: true });
  };

  const fields = useMemo<FieldDef[]>(() => [
    { name: k.userField, label: k.userLabel, type: 'picker', labelField: k.userName, required: true, span: 2, load: (q, s) => loadUsers(storeId, q, s) },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'date_str', label: 'Date', type: 'custom', required: true, render: (v, set) => <Input type="datetime-local" aria-label={tt('Date')} value={v || ''} onChange={(e) => set(e.target.value)} /> },
    { name: 'payment_method', label: 'Payment method', type: 'select', required: true, options: PAYMENT_METHODS },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'image', label: 'Image', type: 'custom', span: 2, render: (v, set) => <ImageField value={v} onChange={set} storeId={storeId} folder={k.imageFolder} /> },
  ], [k, storeId]);

  // EntityForm hydrates from `initial`: convert API fields to form values (datetime-local, image holder).
  const initial = useMemo(() => {
    const r = form.initial;
    if (!r) return { date_str: toLocalInput(new Date()), payment_method: 'cash' } as Record<string, any>;
    return { ...r, date_str: toLocalInput(r.date), image: { keep: r.images || [] } };
  }, [form.initial]);

  const cfg = equityListConfig(k, storeId, { onOpen: setView, onCreate: openNew });
  const canEdit = can(k.resource, 'update');

  return (
    <>
      <ListPage config={cfg} />
      <EntityForm open={form.open} onClose={() => { setForm({ open: false, initial: null }); clearParams(); }} endpoint={k.endpoint}
        title={form.initial ? `${t('Edit')} ${form.initial.code}` : t(`New ${k.singular}`)} fields={fields} initial={initial as any}
        toBody={(b) => equityBody(k, b)} />
      <Drawer open={!!view} onClose={() => { setView(null); clearParams(); }} title={view ? `${t(k.title)} · ${view.code}` : ''} width={480}
        footer={view && canEdit ? <Button variant="primary" icon="edit" onClick={() => { setForm({ open: true, initial: view }); setView(null); }}>{t('Edit')}</Button> : undefined}>
        {view && (
          <div className="stack">
            <KeyValues items={[
              { k: t('ID'), v: <span className="mono">{view.code}</span> },
              { k: t('Date'), v: fmtDateTime(view.date) },
              { k: t('Amount'), v: <Money value={view.amount} strong /> },
              { k: t('Payment method'), v: <PayTag method={view.payment_method} /> },
              { k: t(k.userLabel), v: <bdi>{view[k.userName] || '—'}</bdi> },
              { k: t('Description'), v: <bdi>{view.description}</bdi> },
              { k: t('Created by'), v: view.created_by_name || '—' },
              { k: t('Created at'), v: fmtDateTime(view.created_at) },
              ...(view.updated_at ? [{ k: t('Last updated'), v: fmtDateTime(view.updated_at) }] : []),
            ]} />
            {view.images?.length > 0 && <div className="thumbs">{view.images.map((x: string) => <Thumb key={x} src={attachmentUrl(x, storeId, k.imageFolder)} name={x.split('/').pop() || x} />)}</div>}
          </div>
        )}
      </Drawer>
    </>
  );
}

export const CapitalPage = () => <EquityPage kind="capital" />;
export const DrawingsPage = () => <EquityPage kind="drawing" />;
export const CapitalWithdrawalsPage = () => <EquityPage kind="withdrawal" />;
