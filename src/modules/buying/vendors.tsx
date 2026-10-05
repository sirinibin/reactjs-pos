import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useList, useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { PaymentPill } from '@/framework/doc/status';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DataGrid, Pager, type Column } from '@/ui/DataGrid';
import { Input } from '@/ui/Field';
import { EmptyState, ErrorState, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtDateTime, fmtMoney, toRfc3339 } from '@/lib/format';
import { t as tt } from '@/i18n';
import { EP, PATHS, validateVendor, vendorFromForm, vendorStats, vendorToForm } from './api';
import { PoStatusPill } from './components';

type Vendor = Record<string, any> & { id: string };
const LIST = PATHS.vendors;
const SELECT = 'id,code,credit_limit,email,deleted,name,name_in_arabic,credit_balance,account,phone,vat_no,created_by_name,created_at,stores,category_name';

const stat = (r: Vendor, sid: string, k: string) => Number(vendorStats(r, sid)[k]) || 0;

export function vendorListConfig(storeId: string): ListConfig<Vendor> {
  return {
    title: 'Vendors',
    subtitle: 'Suppliers you buy from, with balances for the active store',
    icon: 'building',
    endpoint: EP.vendor,
    resource: 'vendors',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/^[A-Za-z]-?\d/.test(q) ? { code: q } : { query: q }),
    searchPlaceholder: 'Search name, phone, VAT no., code…',
    createLabel: 'New vendor',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All vendors' },
      { id: 'balance', label: 'With balance', search: { ignore_zero_credit_balance: 1 } },
      { id: 'unpaid', label: 'Unpaid bills', search: { purchase_balance_amount: '>0' } },
      { id: 'deleted', label: 'Deleted', search: { deleted: 1 } },
    ],
    filters: [
      { id: 'category', label: 'Category', type: 'picker', toSearch: (v) => ({ category_id: v }), load: async () => [] },
      { id: 'credit_balance', label: 'Balance', type: 'number', placeholder: 'e.g. >0' },
      { id: 'vat_no', label: 'VAT no.', type: 'text' },
      { id: 'created_at', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    summary: (m) => [
      { label: 'Purchases', value: fmtMoney(m.purchase) },
      { label: 'Paid', value: fmtMoney(m.purchase_paid) },
      { label: 'Payable', value: fmtMoney(m.purchase_credit_balance), tone: m.purchase_credit_balance > 0 ? 'warn' : undefined },
      { label: 'Unpaid bills', value: (m.sales_unpaid_count ?? 0).toLocaleString() },
      { label: 'Returns', value: fmtMoney(m.purchase_return) },
      { label: 'Refund due', value: fmtMoney(m.purchase_return_credit_balance) },
    ],
    columns: [
      { key: 'code', header: tt('Code'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'name', header: tt('Vendor'), sortKey: 'name', className: 'two', render: (r) => <><b><bdi>{r.name}</bdi></b><span><bdi>{r.name_in_arabic || (r.category_name || []).join(', ')}</bdi></span></> },
      { key: 'purchase_amount', header: tt('Purchases'), sortKey: 'stores.purchase_amount', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(stat(r, storeId, 'purchase_amount'))}</span> },
      { key: 'paid', header: tt('Paid'), sortKey: 'stores.purchase_paid_amount', align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{fmtMoney(stat(r, storeId, 'purchase_paid_amount'))}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'credit_balance', align: 'end', render: (r) => <b className="num" style={r.credit_balance > 0 ? { color: 'var(--crit)' } : undefined}>{fmtMoney(r.credit_balance)}</b> },
      { key: 'count', header: tt('Bills'), sortKey: 'stores.purchase_count', align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{stat(r, storeId, 'purchase_count')}</span> },
      { key: 'phone', header: tt('Phone'), hideBelow: 'md', render: (r) => <span className="num">{r.phone || '—'}</span> },
      { key: 'vat_no', header: tt('VAT no.'), hideBelow: 'xl', render: (r) => <span className="num">{r.vat_no || '—'}</span> },
      { key: 'credit_limit', header: tt('Credit limit'), sortKey: 'credit_limit', align: 'end', hideBelow: 'xl', render: (r) => <span className="num muted">{r.credit_limit ? fmtMoney(r.credit_limit) : '—'}</span> },
    ],
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: fmtMoney(r.credit_balance), subtitle: <span className="mono">{r.code}</span>, meta: <>{r.phone}{r.deleted && <> <Pill tone="crit">{tt('Deleted')}</Pill></>}</> }),
    exportColumns: [
      { header: 'Code', value: (r) => r.code },
      { header: 'Vendor', value: (r) => r.name },
      { header: 'Arabic name', value: (r) => r.name_in_arabic },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'VAT no.', value: (r) => r.vat_no },
      { header: 'Balance', value: (r) => r.credit_balance },
      { header: 'Purchases', value: (r) => stat(r, storeId, 'purchase_amount') },
      { header: 'Paid', value: (r) => stat(r, storeId, 'purchase_paid_amount') },
    ],
    exportName: 'vendors',
  };
}

// ───────────────────────────── form ─────────────────────────────

function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft(''); };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="btags">
        {value.map((x) => <span className="btag" key={x}>{x}<button type="button" aria-label={`${t('Remove')} ${x}`} onClick={() => onChange(value.filter((y) => y !== x))}>×</button></span>)}
      </div>
      <Input aria-label={t('Product categories')} value={draft} placeholder={t('Type a category and press Enter')} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

function CategoryChecks({ value, onChange }: { value: { id: string; label: string }[]; onChange: (v: { id: string; label: string }[]) => void }) {
  const { t } = useTranslation();
  const q = useList<any>(EP.vcat, { limit: 200, sort: 'name', select: 'id,name' });
  const rows = q.data?.rows || [];
  if (!rows.length) return <div className="hint">{q.isLoading ? t('Loading…') : t('No vendor categories yet.')}</div>;
  const on = new Set(value.map((x) => x.id));
  return (
    <div className="btags" role="group" aria-label={t('Categories')}>
      {rows.map((c) => (
        <label key={c.id} className="checkline btag" style={{ paddingInlineEnd: 10 }}>
          <input type="checkbox" className="chk" checked={on.has(c.id)} onChange={(e) => onChange(e.target.checked ? [...value, { id: c.id, label: c.name }] : value.filter((x) => x.id !== c.id))} />
          <span>{c.name}</span>
        </label>
      ))}
    </div>
  );
}

const VENDOR_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'name_in_arabic', label: 'Name (Arabic)', type: 'text', dir: 'rtl' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'phone2', label: 'Phone 2', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'contact_person', label: 'Contact person', type: 'text' },
  { name: 'vat_no', label: 'VAT no.', type: 'text', maxLength: 15, hint: '15 digits, starts and ends with 3' },
  { name: 'registration_number', label: 'C.R. no.', type: 'text' },
  { name: 'vat_percent', label: 'VAT %', type: 'number', min: 0, max: 100 },
  { name: 'credit_limit', label: 'Credit limit', type: 'number', min: 0 },
  { name: 'category_id', label: 'Categories', type: 'custom', span: 2, render: (v, set) => <CategoryChecks value={v || []} onChange={set} /> },
  { name: 'product_categories', label: 'Product categories', type: 'custom', span: 2, render: (v, set) => <TagsInput value={v || []} onChange={set} /> },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'na_building_no', label: 'Building no.', type: 'text', maxLength: 4 },
  { name: 'na_street_name', label: 'Street', type: 'text' },
  { name: 'na_district_name', label: 'District', type: 'text' },
  { name: 'na_city_name', label: 'City', type: 'text' },
  { name: 'na_zipcode', label: 'Postal code', type: 'text', maxLength: 5 },
  { name: 'na_additional_no', label: 'Additional no.', type: 'text' },
  { name: 'na_unit_no', label: 'Unit no.', type: 'text' },
  { name: 'use_remarks_in_purchases', label: 'Use remarks in purchases', type: 'checkbox', span: 2 },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
  { name: 'opening_balance', label: 'Opening balance', type: 'number', min: 0 },
  { name: 'opening_balance_type', label: 'Balance direction', type: 'select', options: [{ value: 'payable', label: 'Store owes vendor' }, { value: 'receivable', label: 'Vendor owes store' }] },
  { name: 'opening_balance_date', label: 'Opening balance as of', type: 'custom', render: (v, set) => <Input type="datetime-local" aria-label={tt('Opening balance as of')} value={v || ''} onChange={(e) => set(e.target.value)} /> },
];

export function VendorForm({ open, onClose, vendor, onSaved }: { open: boolean; onClose: () => void; vendor?: Vendor | null; onSaved?: (v: any) => void }) {
  const initial = useMemo(() => (vendor ? vendorToForm(vendor) : { vat_percent: 15, opening_balance_type: 'payable', category_id: [], product_categories: [] }), [vendor]);
  return (
    <EntityForm open={open} onClose={onClose} endpoint={EP.vendor} title={vendor?.id ? 'Edit vendor' : 'New vendor'} fields={VENDOR_FIELDS} initial={initial}
      validate={(v) => Object.fromEntries(Object.entries(validateVendor(v)).map(([k, m]) => [k, tt(m)]))}
      toBody={(b) => vendorFromForm(b, toRfc3339)} onSaved={onSaved} invalidate={[EP.purchase]} />
  );
}

// ───────────────────────────── categories ─────────────────────────────

export function VendorCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirmEl, ask] = useConfirm();
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const q = useList<any>(EP.vcat, { limit: 200, sort: 'name', select: 'id,name,created_by_name,created_at' }, { enabled: open });
  const rows = (q.data?.rows || []).filter((c) => !filter || String(c.name).toLowerCase().includes(filter.toLowerCase()));
  const remove = async (c: any) => {
    if (!(await ask(t('Delete category “{{n}}”?', { n: c.name }), { danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${EP.vcat}/${c.id}`, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [EP.vcat] });
      toast.success(t('Category deleted'));
    } catch (e) { toast.error(e instanceof ApiError ? e.message : (e as Error).message); }
  };
  return (
    <>
      <Modal open={open && !edit} onClose={onClose} title={t('Vendor categories')} width={520}
        footer={<>{can('vendors', 'create') && <Button variant="primary" icon="plus" onClick={() => setEdit({})}>{t('New category')}</Button>}<Button variant="ghost" onClick={onClose}>{t('Close')}</Button></>}>
        <div className="stack" style={{ gap: 10 }}>
          <Input aria-label={t('Filter categories')} placeholder={t('Filter…')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState icon="tag" title={q.isLoading ? t('Loading…') : t('No categories')} /> : (
            <div className="bcats">
              {rows.map((c) => (
                <div key={c.id}>
                  <span className="grow"><b>{c.name}</b> <span className="muted">· {c.created_by_name || '—'}</span></span>
                  {can('vendors', 'update') && <IconButton icon="edit" label={`${t('Edit')} ${c.name}`} onClick={() => setEdit(c)} />}
                  {can('vendors', 'delete') && <IconButton icon="trash" label={`${t('Delete')} ${c.name}`} onClick={() => remove(c)} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      <EntityForm open={!!edit} onClose={() => setEdit(null)} endpoint={EP.vcat} modal title={edit?.id ? 'Edit category' : 'New category'} initial={edit}
        fields={[{ name: 'name', label: 'Name', type: 'text', required: true }]} />
      {confirmEl}
    </>
  );
}

// ───────────────────────────── list page ─────────────────────────────

function useVendorDelete() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirmEl, ask] = useConfirm();
  const toggle = async (v: Vendor) => {
    if (!v.deleted && !(await ask(t('Delete {{n}}?', { n: v.name }), { body: t('The vendor is hidden from lists. You can restore it later.'), danger: true, confirmLabel: t('Delete') }))) return false;
    try {
      if (v.deleted) await api.post(`${EP.vendor}/restore/${v.id}`, {}, { search: { store_id: storeId } });
      else await api.del(`${EP.vendor}/${v.id}`, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [EP.vendor] });
      toast.success(v.deleted ? t('{{n}} restored', { n: v.name }) : t('{{n}} deleted', { n: v.name }));
      return true;
    } catch (e) { toast.error(e instanceof ApiError ? e.message : (e as Error).message); return false; }
  };
  return { confirmEl, toggle };
}

export function VendorListPage({ startNew = false }: { startNew?: boolean }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const nav = useNavigate();
  const { can } = useAuth();
  const [form, setForm] = useState(startNew);
  const [cats, setCats] = useState(false);
  const del = useVendorDelete();
  const cfg = vendorListConfig(storeId);
  cfg.onCreate = () => setForm(true);
  cfg.headerActions = <Button icon="tag" onClick={() => setCats(true)}>{t('Categories')}</Button>;
  cfg.filters = cfg.filters!.map((f) => (f.id === 'category' && f.type === 'picker'
    ? { ...f, load: async (q: string, s: AbortSignal) => ((await api.get<any[]>(EP.vcat, { search: { store_id: storeId, ...(q ? { name: q } : {}) }, limit: 30, select: 'id,name' }, s)).result || []).map((c) => ({ id: c.id, label: c.name, data: c })) }
    : f));
  cfg.rowActions = (r) => (r.deleted
    ? (can('vendors', 'update') ? <IconButton icon="undo" label={`${tt('Restore')} ${r.name}`} onClick={() => del.toggle(r)} /> : null)
    : (can('vendors', 'delete') ? <IconButton icon="trash" label={`${tt('Delete')} ${r.name}`} onClick={() => del.toggle(r)} /> : null));
  return (
    <>
      <ListPage config={cfg} />
      <VendorForm open={form} onClose={() => { setForm(false); if (startNew) nav(LIST, { replace: true }); }} onSaved={(v) => v?.id && nav(`${LIST}/${v.id}`)} />
      <VendorCategoriesModal open={cats} onClose={() => setCats(false)} />
      {del.confirmEl}
    </>
  );
}

export function VendorNewPage() {
  return <VendorListPage startNew />;
}

// ───────────────────────────── vendor 360 ─────────────────────────────

function DocTab({ endpoint, vendorId, select, columns, path, sort = '-date', label }: { endpoint: string; vendorId: string; select: string; columns: Column<any>[]; path: string; sort?: string; label: string }) {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const q = useList<any>(endpoint, { search: { vendor_id: vendorId }, page, limit: size, sort, select });
  return (
    <Card bodyClass="card-b-tight">
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
        <DataGrid label={label} columns={columns} rows={q.data?.rows || []} rowKey={(r) => r.id} loading={q.isLoading} onRowClick={(r) => nav(`${path}/${r.id}`)}
          mobileCard={(r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), meta: fmtDate(r.date) })} />
      )}
      <Pager page={page} pageSize={size} total={q.data?.total || 0} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
    </Card>
  );
}

const docCols = (status: (r: any) => ReactNode): Column<any>[] => [
  { key: 'code', header: tt('Number'), className: 'code', render: (r) => r.code },
  { key: 'date', header: tt('Date'), render: (r) => <span className="num">{fmtDate(r.date)}</span> },
  { key: 'net_total', header: tt('Total'), align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
  { key: 'balance', header: tt('Balance'), align: 'end', hideBelow: 'md', render: (r) => (r.balance_amount === undefined ? '—' : <span className="num">{fmtMoney(r.balance_amount)}</span>) },
  { key: 'status', header: tt('Status'), render: status },
];

export function VendorViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  const q = useRecord<Vendor>(EP.vendor, id);
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const del = useVendorDelete();
  usePageMeta(q.data?.name, 'building');
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <div className="pad stack"><Skeleton width={240} height={22} /><Skeleton height={120} /><Skeleton height={240} /></div>;
  const v = q.data;
  const s = vendorStats(v, storeId);
  const na = v.national_address || {};
  const kv = (items: [string, ReactNode][]) => <dl className="bkv">{items.map(([k, val]) => <Fragment key={k}><dt>{t(k)}</dt><dd>{val || '—'}</dd></Fragment>)}</dl>;
  const naLine = [na.building_no, na.street_name, na.district_name, na.city_name, na.zipcode, na.additional_no && `${t('Add. no.')} ${na.additional_no}`].filter(Boolean).join(', ');

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Buying'), to: LIST }, { label: t('Vendors'), to: LIST }, { label: v.name }]}
        avatar={<div className="obj-ic" aria-hidden>{String(v.name || '?').slice(0, 1)}</div>}
        title={<bdi>{v.name}</bdi>}
        pills={<>{v.deleted && <Pill tone="crit">{t('Deleted')}</Pill>}{(v.category_name || []).map((c: string) => <Pill key={c} tone="neutral">{c}</Pill>)}</>}
        subtitle={<><span className="mono">{v.code}</span>{v.name_in_arabic && <> · <bdi>{v.name_in_arabic}</bdi></>}{v.vat_no && <> · {t('VAT')} <span className="num">{v.vat_no}</span></>}</>}
        actions={<>
          {can('purchases', 'create') && !v.deleted && <Button variant="primary" icon="cart" onClick={() => nav(`${PATHS.purchases}/new?vendor_id=${v.id}`)}>{t('New purchase')}</Button>}
          {can('purchase_orders', 'create') && !v.deleted && store?.settings?.enable_purchase_order_module && <Button icon="file" className="hide-sm" onClick={() => nav(`${PATHS.orders}/new`)}>{t('New order')}</Button>}
          {can('vendors', 'update') && <Button icon="edit" onClick={() => setEdit(true)}>{t('Edit')}</Button>}
          {v.deleted ? can('vendors', 'update') && <Button icon="undo" onClick={() => del.toggle(v)}>{t('Restore')}</Button>
            : can('vendors', 'delete') && <IconButton icon="trash" label={t('Delete')} onClick={async () => { if (await del.toggle(v)) nav(LIST, { replace: true }); }} />}
        </>}
        facets={[
          { label: t('Balance'), value: fmtMoney(v.credit_balance), tone: v.credit_balance > 0 ? 'crit' : undefined },
          { label: t('Purchases'), value: `${s.purchase_count || 0} · ${fmtMoney(s.purchase_amount)}` },
          { label: t('Paid'), value: fmtMoney(s.purchase_paid_amount) },
          { label: t('Unpaid bills'), value: fmtMoney(s.purchase_balance_amount), tone: s.purchase_balance_amount > 0 ? 'warn' : undefined, hideOnMobile: true },
          { label: t('Returns'), value: `${s.purchase_return_count || 0} · ${fmtMoney(s.purchase_return_amount)}`, hideOnMobile: true },
          ...(v.credit_limit ? [{ label: t('Credit limit'), value: fmtMoney(v.credit_limit), hideOnMobile: true }] : []),
        ]}
        tabs={<Tabs label={t('Sections')} value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: t('Overview') }, { id: 'purchases', label: t('Purchase bills'), count: s.purchase_count || 0 },
          { id: 'returns', label: t('Returns'), count: s.purchase_return_count || 0 },
          { id: 'orders', label: t('Purchase orders'), hidden: !store?.settings?.enable_purchase_order_module },
        ]} />}
      />
      <ObjectBody>
        {tab === 'overview' && (
          <div className="grid-2c">
            <Card title={t('Contact')}>{kv([['Phone', v.phone && <span className="num">{v.phone}</span>], ['Phone 2', v.phone2], ['Email', v.email], ['Contact person', v.contact_person], ['Address', v.address]])}</Card>
            <Card title={t('Tax & registration')}>{kv([['VAT no.', v.vat_no && <span className="num">{v.vat_no}</span>], ['VAT %', v.vat_percent ?? '—'], ['C.R. no.', v.registration_number], ['National address', naLine]])}</Card>
            <Card title={t('Purchasing')}>{kv([
              ['Bills', `${s.purchase_count || 0} (${t('paid')} ${s.purchase_paid_count || 0} · ${t('partially')} ${s.purchase_paid_partially_count || 0} · ${t('unpaid')} ${s.purchase_not_paid_count || 0})`],
              ['Purchases', fmtMoney(s.purchase_amount)], ['Paid', fmtMoney(s.purchase_paid_amount)], ['Unpaid bills', fmtMoney(s.purchase_balance_amount)],
              ['Returns', fmtMoney(s.purchase_return_amount)], ['Refund due', fmtMoney(s.purchase_return_balance_amount)],
            ])}</Card>
            <Card title={t('Classification')}>{kv([
              ['Categories', (v.category_name || []).join(', ')],
              ['Product categories', (v.product_categories || []).length ? <span className="btags">{v.product_categories.map((x: string) => <span className="btag" key={x} style={{ paddingInlineEnd: 10 }}>{x}</span>)}</span> : ''],
              ['Remarks', v.remarks && <span style={{ whiteSpace: 'pre-wrap' }}>{v.remarks}{v.use_remarks_in_purchases && <span className="muted"> · {t('copied onto purchases')}</span>}</span>],
              ['Created', `${v.created_by_name || '—'} · ${fmtDateTime(v.created_at)}`],
            ])}</Card>
          </div>
        )}
        {tab === 'purchases' && <DocTab label={t('Purchase bills')} endpoint={EP.purchase} vendorId={v.id} path={PATHS.purchases} select="id,code,date,net_total,balance_amount,payment_status" columns={docCols((r) => <PaymentPill status={r.payment_status} />)} />}
        {tab === 'returns' && <DocTab label={t('Returns')} endpoint={EP.ret} vendorId={v.id} path={PATHS.returns} select="id,code,date,net_total,balance_amount,payment_status" columns={docCols((r) => <PaymentPill status={r.payment_status} />)} />}
        {tab === 'orders' && <DocTab label={t('Purchase orders')} endpoint={EP.po} vendorId={v.id} path={PATHS.orders} sort="-created_at" select="id,code,date,net_total,status" columns={docCols((r) => <PoStatusPill status={r.status} />)} />}
      </ObjectBody>
      <VendorForm open={edit} onClose={() => setEdit(false)} vendor={v} />
      {del.confirmEl}
    </>
  );
}
