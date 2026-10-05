import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord, useSave } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { searchParties, partyToOption, searchProducts, type Party, type ProductHit } from '@/framework/doc/lookups';
import { ObjectBody, ObjectHeader, KeyValues, DocFlow, SidePanel, type FlowNode } from '@/ui/ObjectPage';
import { Card } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Banner, EmptyState, ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { Icon } from '@/ui/Icon';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney, fmtNumber, parseNumber, toInputDate } from '@/lib/format';
import { t as tt } from '@/i18n';
import { JOB, VEHICLE, searchEmployees, employeeToOption, searchVehicles, vehicleToOption, type Vehicle, type Employee } from './lib/api';
import { computeSummary, lineDiscountWithVat, makePart, setPartLineDiscount, setPartQty, setPartTotalWithVat, setPartUnitPrice, setPartUnitPriceWithVat, type Part } from './lib/jobCalc';
import { initials, loadBoard, saveBoard, statusToListId, type KList } from './lib/kanban';
import { FormShell } from './components/FormShell';
import { DocChips, JobStatusPill, NumCell, OpenClosedPill, Plate, tzOffsetHours } from './components/bits';
import { useCreateInvoice } from './components/invoice';

const LIST = '/workshop/jobs';
const crumbs = () => [{ label: tt('Workshop'), to: '/workshop/board' }, { label: tt('Repair Jobs'), to: LIST }];

export interface RepairJob {
  id: string; job_number?: string; title?: string; date?: string; customer_id?: string | null; customer_name?: string; vehicle_id?: string | null; vehicle_number?: string;
  brand?: string; model?: string; km?: number; technician_id?: string | null; technician_name?: string; technician_ids?: string[] | null; technician_names?: string[] | null;
  labour_charge?: number; vat_percent?: number; parts?: Part[] | null; parts_total?: number; parts_total_with_vat?: number; total?: number; total_with_vat?: number;
  estimated_delivery?: string | null; status?: string; archived?: boolean; complaint?: string; inspection?: string; work_done?: string; created_at?: string;
  order_id?: string | null; order_code?: string; order_net_total?: number; quotation_id?: string | null; quotation_code?: string; quotation_net_total?: number; quotation_type?: string;
  non_vat_sales_id?: string | null; non_vat_sales_code?: string; non_vat_sales_net_total?: number;
}

export const STD_STATUSES = ['open', 'in_progress', 'completed', 'delivered', 'cancelled', 'closed'];
export const statusOptions = (lists: KList[]) => {
  const seen = new Set<string>();
  return [...lists.map((l) => ({ value: l.id, label: l.name })), ...STD_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) }))]
    .filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
};

const SELECT = 'id,job_number,title,date,customer_id,customer_name,vehicle_id,vehicle_number,brand,model,km,technician_name,labour_charge,parts_total,total,total_with_vat,status,estimated_delivery,created_at,order_id,order_code,order_net_total,quotation_id,quotation_code,quotation_net_total,quotation_type,non_vat_sales_id,non_vat_sales_code,non_vat_sales_net_total';

export function jobListConfig(lists: KList[], loadCustomers: (q: string, s: AbortSignal) => Promise<PickerOption[]>, nav: (p: string) => void, canEdit: boolean): ListConfig<RepairJob> {
  return {
    title: 'Repair Jobs',
    subtitle: 'Job cards for the workshop',
    icon: 'wrench',
    endpoint: JOB,
    resource: 'repair_jobs',
    select: SELECT,
    baseSearch: { timezone_offset: tzOffsetHours() },
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'search',
    searchPlaceholder: 'Search job #, plate, brand, model or technician…',
    createPath: `${LIST}/new`,
    createLabel: 'New Repair Job',
    detailPath: (r) => `${LIST}/${r.id}`,
    headerActions: <Button icon="kanban" onClick={() => nav('/workshop/board')}>{tt('Repair Jobs Board')}</Button>,
    views: [
      { id: 'all', label: 'All' },
      { id: 'archived', label: 'Archived', search: { archived: 1 } },
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', load: loadCustomers, toSearch: (v) => ({ customer_id: v }) },
      { id: 'vehicle_number', label: 'Vehicle', type: 'text' },
      { id: 'technician_name', label: 'Technician', type: 'text' },
      { id: 'status', label: 'Status', type: 'select', options: statusOptions(lists) },
      { id: 'est', label: 'Est. Delivery', type: 'daterange', fromKey: 'estimated_delivery_from', toKey: 'estimated_delivery_to' },
    ],
    columns: [
      { key: 'job', header: tt('Job'), sortKey: 'job_number', render: (r) => <div className="ws-two"><b className="mono">{r.job_number}</b><span>{r.title}</span><DocChips job={r} /></div> },
      { key: 'date', header: tt('Date'), sortKey: 'date', hideBelow: 'md', render: (r) => <span className="num">{fmtDate(r.date)}</span> },
      { key: 'vehicle', header: tt('Vehicle'), render: (r) => (r.vehicle_number ? <div className="ws-two"><span style={{ color: 'inherit' }}><Plate value={r.vehicle_number} /></span><span>{[r.brand, r.model].filter(Boolean).join(' ')}</span></div> : '—') },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', render: (r) => <bdi>{r.customer_name || '—'}</bdi> },
      { key: 'km', header: tt('KM'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{r.km ? fmtNumber(r.km, 0) : '—'}</span> },
      { key: 'tech', header: tt('Technician'), hideBelow: 'lg', render: (r) => r.technician_name || '—' },
      { key: 'labour', header: tt('Labour'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.labour_charge)}</span> },
      { key: 'parts', header: tt('Parts'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.parts_total)}</span> },
      { key: 'total', header: tt('Net Total'), sortKey: 'total_with_vat', align: 'end', render: (r) => <b className="num">{fmtMoney(r.total_with_vat || r.total)}</b> },
      { key: 'status', header: tt('Status'), render: (r) => <JobStatusPill status={r.status} lists={lists} /> },
      { key: 'oc', header: tt('Open/Closed'), hideBelow: 'lg', render: (r) => <OpenClosedPill status={r.status} /> },
      { key: 'est', header: tt('Est. Delivery'), sortKey: 'estimated_delivery', hideBelow: 'md', render: (r) => <span className="num">{r.estimated_delivery ? fmtDate(r.estimated_delivery) : '—'}</span> },
    ],
    rowActions: canEdit ? (r) => <IconButton icon="edit" label={tt('Edit')} onClick={() => nav(`${LIST}/${r.id}/edit`)} /> : undefined,
    mobileCard: (r) => ({ title: <span className="mono">{r.job_number}</span>, amount: fmtMoney(r.total_with_vat || r.total), subtitle: <>{r.title}</>, meta: <>{r.vehicle_number && <Plate value={r.vehicle_number} />} <bdi>{r.customer_name}</bdi> <JobStatusPill status={r.status} lists={lists} /></> }),
    exportColumns: [
      { header: 'Job Number', value: (r) => r.job_number },
      { header: 'Title', value: (r) => r.title },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Vehicle Number', value: (r) => r.vehicle_number },
      { header: 'Brand', value: (r) => r.brand },
      { header: 'Model', value: (r) => r.model },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Technician', value: (r) => r.technician_name },
      { header: 'Labour', value: (r) => r.labour_charge },
      { header: 'Parts', value: (r) => r.parts_total },
      { header: 'Net Total', value: (r) => r.total_with_vat || r.total },
      { header: 'Status', value: (r) => r.status },
      { header: 'Est. Delivery', value: (r) => (r.estimated_delivery ? fmtDate(r.estimated_delivery) : '') },
    ],
    exportName: 'repair-jobs',
    empty: <EmptyState icon="wrench" title={tt('No Repair Jobs to display')} />,
  };
}

export function JobListPage() {
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const lists = useMemo(() => loadBoard().lists, []);
  const cfg = jobListConfig(lists, async (q, s) => (await searchParties('customer', storeId, q, s)).map(partyToOption), nav, can('repair_jobs', 'update'));
  return <ListPage config={cfg} />;
}

/** GET /v1/repair-job/{id} doesn't back-fill customer_name (only the list does) — resolve it when missing. */
export function useCustomerName(customerId?: string | null, name?: string) {
  const storeId = useStoreId();
  const q = useQuery({
    queryKey: ['/v1/customer', 'name', customerId, storeId],
    queryFn: async () => (await api.get<{ name: string }>(`/v1/customer/${customerId}`, { search: { store_id: storeId }, select: 'id,name' })).result?.name || '',
    enabled: !!customerId && !name && !!storeId,
    staleTime: 60_000,
  });
  return name || q.data || '';
}

// ---------------------------------------------------------------- editor

export interface JForm {
  title: string; status: string; date: string; estimated_delivery: string;
  customer: PickerOption<Party> | null; vehicle: PickerOption<Vehicle> | null; km: string;
  techs: { id: string; name: string }[]; parts: Part[]; labour_charge: number;
  complaint: string; inspection: string; work_done: string;
}

const dateToIso = (v: string, keep?: string) => {
  if (!v) return null;
  if (keep && toInputDate(new Date(keep)) === v) return keep;
  const now = new Date();
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes()).toISOString();
};

/** Request body for POST/PUT /v1/repair-job (server recomputes totals; vat_percent makes them match the summary). */
export function jobBody(f: JForm, vat: number, original?: RepairJob | null) {
  const s = computeSummary(f.parts, f.labour_charge, vat);
  const first = f.techs[0];
  return {
    title: f.title.trim(),
    status: f.status || 'open',
    date: dateToIso(f.date, original?.date) || new Date().toISOString(),
    estimated_delivery: f.estimated_delivery ? dateToIso(f.estimated_delivery, original?.estimated_delivery || undefined) : null,
    customer_id: f.customer?.id || null,
    // The server never resolves customer_name from customer_id (only the list endpoint back-fills it), so send it.
    customer_name: f.customer ? f.customer.data?.name || f.customer.label : '',
    vehicle_id: f.vehicle?.id || null,
    vehicle_number: f.vehicle?.data?.vehicle_number || original?.vehicle_number || '',
    brand: f.vehicle?.data?.brand || original?.brand || '',
    model: f.vehicle?.data?.model || original?.model || '',
    km: parseNumber(f.km),
    technician_id: first?.id || null,
    technician_name: first?.name || '',
    technician_ids: f.techs.map((x) => x.id),
    technician_names: f.techs.map((x) => x.name),
    labour_charge: f.labour_charge,
    vat_percent: vat,
    parts: f.parts,
    parts_total: s.partsExcl,
    parts_total_with_vat: s.partsIncl,
    total: Math.round((f.labour_charge + s.partsExcl) * 100) / 100,
    total_with_vat: s.totalIncl,
    complaint: f.complaint.trim(),
    inspection: f.inspection.trim(),
    work_done: f.work_done.trim(),
  };
}

function formFromJob(j: RepairJob): JForm {
  const ids = j.technician_ids?.length ? j.technician_ids : j.technician_id ? [j.technician_id] : [];
  const names = j.technician_names?.length ? j.technician_names : j.technician_name ? [j.technician_name] : [];
  return {
    title: j.title || '', status: j.status || 'open', date: j.date ? toInputDate(new Date(j.date)) : '', estimated_delivery: j.estimated_delivery ? toInputDate(new Date(j.estimated_delivery)) : '',
    customer: j.customer_id ? { id: j.customer_id, label: j.customer_name || '', data: { id: j.customer_id, name: j.customer_name || '' } } : null,
    vehicle: j.vehicle_id ? { id: j.vehicle_id, label: [j.vehicle_number, [j.brand, j.model].filter(Boolean).join(' ')].filter(Boolean).join(' — '), data: { id: j.vehicle_id, vehicle_number: j.vehicle_number, brand: j.brand, model: j.model } } : null,
    km: j.km ? String(j.km) : '', techs: ids.map((id, i) => ({ id, name: names[i] || '' })).filter((x) => x.id && !/^0+$/.test(x.id)),
    parts: (j.parts || []).map((p) => ({ ...p })), labour_charge: Number(j.labour_charge) || 0,
    complaint: j.complaint || '', inspection: j.inspection || '', work_done: j.work_done || '',
  };
}

export function partFromProduct(p: ProductHit, storeId: string, vat: number): Part {
  const ps = p.product_stores?.[storeId] || {};
  return makePart({
    product_id: p.id, item_code: p.item_code, part_number: p.part_number, name: p.name, qty: 1,
    unit_price: ps.retail_unit_price ?? 0, unit_price_with_vat: ps.retail_unit_price_with_vat ?? 0,
    purchase_unit_price: ps.purchase_unit_price ?? 0, stock: ps.stock ?? 0, warehouse_stocks: ps.warehouse_stocks, is_service: !!p.is_service,
  }, vat);
}

export function JobEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  const vat = store?.vat_percent ?? 15;
  const lists = useMemo(() => loadBoard().lists, []);
  const q = useRecord<RepairJob>(JOB, id);
  const save = useSave<RepairJob>(JOB);
  const editing = !!id;
  const [f, setF] = useState<JForm>(() => ({
    title: sp.get('title') || '', status: lists[0]?.id || 'open', date: toInputDate(new Date()), estimated_delivery: '', customer: null, vehicle: null, km: '',
    techs: [], parts: [], labour_charge: 0, complaint: '', inspection: '', work_done: '',
  }));
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => { if (q.data) setF(formFromJob(q.data)); }, [q.data]);
  const resolvedName = useCustomerName(q.data?.customer_id, q.data?.customer_name);
  useEffect(() => {
    if (resolvedName) setF((x) => (x.customer && !x.customer.label ? { ...x, customer: { ...x.customer, label: resolvedName, data: { ...x.customer.data, name: resolvedName } } } : x));
  }, [resolvedName]);

  // Prefill vehicle (and its owner) when opened from a vehicle page.
  const presetVehicle = sp.get('vehicle_id');
  useEffect(() => {
    if (editing || !presetVehicle || !storeId) return;
    let live = true;
    api.get<Vehicle>(`${VEHICLE}/${presetVehicle}`, { search: { store_id: storeId } }).then((r) => {
      const v = r.result;
      if (!live || !v) return;
      setF((x) => ({
        ...x, vehicle: vehicleToOption(v), km: v.current_km ? String(v.current_km) : x.km,
        customer: v.customer_id ? { id: v.customer_id, label: v.customer_name || '', data: { id: v.customer_id, name: v.customer_name || '' } } : x.customer,
      }));
    }).catch(() => {});
    return () => { live = false; };
  }, [editing, presetVehicle, storeId]);

  const set = <K extends keyof JForm>(k: K, v: JForm[K]) => { setF((x) => ({ ...x, [k]: v })); if (errs[k as string]) setErrs((e) => ({ ...e, [k]: '' })); };
  const updPart = (i: number, p: Part) => setF((x) => ({ ...x, parts: x.parts.map((y, j) => (j === i ? p : y)) }));
  const sum = computeSummary(f.parts, f.labour_charge, vat);

  const submit = async () => {
    if (!f.title.trim()) { setErrs({ title: t('Title is required') }); return; }
    try {
      const rec = await save.mutateAsync({ id, body: jobBody(f, vat, q.data) });
      const newId = rec?.id || id;
      if (newId) { const b = loadBoard(); saveBoard({ ...b, cardMap: { ...b.cardMap, [newId]: statusToListId(f.status, b.lists) } }); }
      toast.success(t(editing ? 'Repair job updated successfully!' : 'Repair job created successfully!'));
      nav(`${LIST}/${newId}`, { replace: !editing });
    } catch (e) {
      if (e instanceof ApiError) { setErrs(e.errors); toast.error(t('Failed to process repair job!')); }
      else toast.error((e as Error).message);
    }
  };

  if (editing && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (editing && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const title = editing ? `${t('Update Repair Job')} — ${q.data?.job_number || ''}` : t('Create New Repair Job');
  const known = new Set(['title', 'status', 'date', 'estimated_delivery', 'customer_id', 'vehicle_id', 'km']);

  return (
    <FormShell title={title} crumbs={[...crumbs(), { label: editing ? q.data?.job_number || '' : t('New') }]} icon="wrench" editing={editing} saving={save.isPending}
      canSave={can('repair_jobs', editing ? 'update' : 'create')} onSave={submit} onCancel={() => nav(editing ? `${LIST}/${id}` : LIST)}
      errors={Object.entries(errs).filter(([k, m]) => m && !known.has(k)).map(([, m]) => m)}
      mobileTotal={{ label: t('Total (incl. VAT)'), value: fmtMoney(sum.totalIncl) }}
      pills={editing ? <DocChips job={q.data!} /> : undefined}
      side={
        <aside className="stack" style={{ position: 'sticky', top: 16 }}>
          <Card title={t('Cost Summary')}><CostSummary s={sum} vat={vat} /></Card>
          <Card title={t('Customer & Vehicle')}>
            {!f.customer && !f.vehicle ? <p className="muted" style={{ margin: 0 }}>{t('Select customer & vehicle')}</p> : (
              <KeyValues items={[
                ...(f.customer ? [{ k: t('Customer'), v: <bdi>{f.customer.label}</bdi> }] : []),
                ...(f.customer?.data?.credit_balance ? [{ k: t('Balance'), v: <b className="num" style={{ color: f.customer.data.credit_balance > 0 ? 'var(--crit)' : undefined }}>{fmtMoney(f.customer.data.credit_balance)}</b> }] : []),
                ...(f.vehicle ? [{ k: t('Vehicle'), v: <Plate value={f.vehicle.data?.vehicle_number} /> }, { k: t('Brand / Model'), v: [f.vehicle.data?.brand, f.vehicle.data?.model, f.vehicle.data?.year || ''].filter(Boolean).join(' ') }] : []),
                ...(f.km ? [{ k: t('KM'), v: <span className="num">{fmtNumber(parseNumber(f.km), 0)} km</span> }] : []),
              ]} />
            )}
          </Card>
        </aside>
      }>
      <Card title={t('Job Information')}>
        <div className="fgrid">
          <Field label={t('Title')} required error={errs.title} className="span2">
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errs.title} autoFocus={!editing} value={f.title} placeholder={t('e.g. Engine overhaul, AC repair, Full service...')} onChange={(e) => set('title', e.target.value)} />}
          </Field>
          <Field label={t('Job Number')}>{(fid) => <Input id={fid} value={q.data?.job_number || ''} placeholder={t('Auto')} readOnly disabled />}</Field>
          <Field label={t('Status')} error={errs.status}>{(fid) => <Select id={fid} value={f.status} onChange={(e) => set('status', e.target.value)} options={statusOptions(lists).map((o) => ({ ...o, label: t(o.label) }))} />}</Field>
          <Field label={t('Job Date')} error={errs.date}>{(fid) => <Input id={fid} type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />}</Field>
          <Field label={t('Est. Delivery')} error={errs.estimated_delivery}>{(fid) => <Input id={fid} type="date" value={f.estimated_delivery} onChange={(e) => set('estimated_delivery', e.target.value)} />}</Field>
        </div>
      </Card>
      <Card title={t('Customer & Vehicle')}>
        <div className="fgrid">
          <Field label={t('Customer')} error={errs.customer_id} className="span2" hint={t('Leave empty for a walk-in (UNKNOWN) customer')}>
            {(fid, d) => (
              <AsyncPicker<Party> id={fid} aria-describedby={d} value={f.customer} clearable eager placeholder={t('Search customer...')}
                onChange={(o) => { set('customer', o); if (o && f.vehicle?.data?.customer_id && f.vehicle.data.customer_id !== o.id) set('vehicle', null); }}
                load={async (s, sig) => (await searchParties('customer', storeId, s, sig)).map(partyToOption)} />
            )}
          </Field>
          <Field label={t('Vehicle')} error={errs.vehicle_id} className="span2">
            {(fid, d) => (
              <AsyncPicker<Vehicle> id={fid} aria-describedby={d} value={f.vehicle} clearable eager placeholder={t('Search vehicle number, brand, model...')}
                onChange={(o) => {
                  set('vehicle', o);
                  const v = o?.data;
                  if (v && !f.customer && v.customer_id) set('customer', { id: v.customer_id, label: v.customer_name || '', data: { id: v.customer_id, name: v.customer_name || '' } });
                  if (v?.current_km && !f.km) set('km', String(v.current_km));
                }}
                load={async (s, sig) => (await searchVehicles(storeId, s, sig, f.customer?.id)).map(vehicleToOption)} />
            )}
          </Field>
          <Field label={t('KM')} error={errs.km}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" value={f.km} onChange={(e) => set('km', e.target.value)} />}</Field>
          <Field label={t('Technicians')} className="span2">
            {(fid) => (
              <div className="stack" style={{ gap: 8 }}>
                {f.techs.length > 0 && (
                  <div className="ws-chiprow">
                    {f.techs.map((x) => (
                      <span key={x.id} className="ws-techchip">
                        <span className="av sm" aria-hidden>{initials(x.name)}</span>{x.name}
                        <button type="button" aria-label={`${t('Remove')} ${x.name}`} onClick={() => set('techs', f.techs.filter((y) => y.id !== x.id))}><Icon name="x" size="xs" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <AsyncPicker<Employee> id={fid} value={null} resetOnPick eager placeholder={t('Search & add technician...')}
                  onChange={(o) => o && !f.techs.some((y) => y.id === o.id) && set('techs', [...f.techs, { id: o.id, name: o.data.name }])}
                  load={async (s, sig) => (await searchEmployees(storeId, s, sig)).map(employeeToOption)} />
              </div>
            )}
          </Field>
        </div>
      </Card>
      <Card title={t('Parts & Labour')}>
        <div className="stack" style={{ gap: 12 }}>
          <AsyncPicker<ProductHit> value={null} resetOnPick aria-label={t('Search products or services to add...')} placeholder={t('Search products or services to add...')}
            onChange={(o) => { if (o && !f.parts.some((p) => p.product_id === o.id)) set('parts', [...f.parts, partFromProduct(o.data, storeId, vat)]); }}
            load={async (s, sig) => (await searchProducts(storeId, s, sig)).map((p) => ({ id: p.id, label: p.name, sub: [p.part_number, p.is_service ? t('Service') : `${p.product_stores?.[storeId]?.stock ?? 0} ${t('in stock')}`].filter(Boolean).join(' · '), right: fmtMoney(p.product_stores?.[storeId]?.retail_unit_price_with_vat), data: p }))} />
          {f.parts.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('No parts added yet.')}</p> : (
            <div className="ws-tbl-wrap">
              <table className="lines ws-parts" aria-label={t('Parts')}>
                <thead><tr>
                  <th>{t('Part / Service Name')}</th><th className="r">{t('Stock')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Price (excl.)')}</th><th className="r">{t('Price (incl.)')}</th>
                  <th className="r">{t('L. Disc. (incl. VAT)')}</th><th className="r">{t('Total')}</th><th aria-label={t('Remove')} />
                </tr></thead>
                <tbody>{f.parts.map((p, i) => (
                  <tr className="ln" key={`${p.product_id || 'x'}-${i}`}>
                    <td className="pn"><input className="cell" style={{ textAlign: 'start' }} aria-label={t('Part / Service Name')} value={p.name} onChange={(e) => updPart(i, { ...p, name: e.target.value })} /></td>
                    <td className="r num muted" data-l={t('Stock')}>{p.is_service ? '—' : fmtNumber(p.stock || 0, 0)}</td>
                    <td data-l={t('Qty')}><NumCell label={t('Qty')} value={p.qty} onCommit={(n) => updPart(i, setPartQty(p, n))} /></td>
                    <td data-l={t('Price (excl.)')}><NumCell label={t('Price (excl.)')} value={p.unit_price} dp={4} onCommit={(n) => updPart(i, setPartUnitPrice(p, n, vat))} /></td>
                    <td data-l={t('Price (incl.)')}><NumCell label={t('Price (incl.)')} value={p.unit_price_with_vat} dp={4} onCommit={(n) => updPart(i, setPartUnitPriceWithVat(p, n, vat))} /></td>
                    <td data-l={t('L. Disc. (incl. VAT)')}><NumCell label={t('L. Disc. (incl. VAT)')} value={lineDiscountWithVat(p)} onCommit={(n) => updPart(i, setPartLineDiscount(p, n, vat))} /></td>
                    <td data-l={t('Total')}><NumCell label={t('Total (incl. VAT)')} value={p.total_price_with_vat} onCommit={(n) => updPart(i, setPartTotalWithVat(p, n, vat))} /></td>
                    <td><IconButton icon="trash" label={`${t('Remove')} ${p.name}`} onClick={() => set('parts', f.parts.filter((_, j) => j !== i))} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="fgrid">
            <Field label={`${t('Labour Charge')} (${t('incl. VAT')})`} hint={`${t('Labour (excl. VAT)')}: ${fmtMoney(sum.labourExcl)}`}>
              {() => <NumCell className="inp num" label={t('Labour Charge')} value={f.labour_charge} onCommit={(n) => set('labour_charge', Math.max(0, n))} />}
            </Field>
          </div>
        </div>
      </Card>
      <Card title={t('Service Details')}>
        <div className="grid-3c">
          <Field label={t('Complaint')}>{(fid) => <Textarea id={fid} rows={3} value={f.complaint} placeholder={t('Describe the customer complaint...')} onChange={(e) => set('complaint', e.target.value)} />}</Field>
          <Field label={t('Inspection')}>{(fid) => <Textarea id={fid} rows={3} value={f.inspection} placeholder={t('Inspection findings...')} onChange={(e) => set('inspection', e.target.value)} />}</Field>
          <Field label={t('Work Done')}>{(fid) => <Textarea id={fid} rows={3} value={f.work_done} placeholder={t('Work performed...')} onChange={(e) => set('work_done', e.target.value)} />}</Field>
        </div>
      </Card>
    </FormShell>
  );
}

export function CostSummary({ s, vat }: { s: ReturnType<typeof computeSummary>; vat: number }) {
  const { t } = useTranslation();
  return (
    <dl className="ws-sum" aria-label={t('Cost Summary')}>
      <dt>{t('Parts (excl. VAT)')}</dt><dd className="num">{fmtMoney(s.partsExcl)}</dd>
      <dt>{t('Labour (excl. VAT)')}</dt><dd className="num">{fmtMoney(s.labourExcl)}</dd>
      <dt>{t('Subtotal (excl. VAT)')}</dt><dd className="num">{fmtMoney(s.subtotal)}</dd>
      <dt>{t('VAT')} {vat}%</dt><dd className="num">{fmtMoney(s.vat)}</dd>
      <dt className="tot">{t('Total (incl. VAT)')}</dt><dd className="tot num">{fmtMoney(s.totalIncl)}</dd>
    </dl>
  );
}

// ---------------------------------------------------------------- view

export function JobViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  const q = useRecord<RepairJob>(JOB, id);
  const [confirmEl, ask] = useConfirm();
  const inv = useCreateInvoice();
  const [busy, setBusy] = useState(false);
  const lists = useMemo(() => loadBoard().lists, []);
  const customerName = useCustomerName(q.data?.customer_id, q.data?.customer_name);
  const d = q.data ? { ...q.data, customer_name: customerName } : undefined;
  usePageMeta(d ? `${d.job_number} · ${d.title || ''}` : t('Repair Job'), 'wrench');

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!d) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const vat = d.vat_percent || store?.vat_percent || 15;
  const sum = computeSummary(d.parts || [], d.labour_charge || 0, vat);
  const total = d.total_with_vat || sum.totalIncl;

  const toggleArchive = async () => {
    if (!d.archived && !(await ask(t('Archive this repair job?'), { confirmLabel: t('Archive') }))) return;
    setBusy(true);
    try {
      await api.put(`${JOB}/${d.id}`, { archived: !d.archived }, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [JOB] });
      toast.success(t(d.archived ? 'Unarchived' : 'Archived'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const flow: FlowNode[] = [
    { kind: t('Repair Job'), icon: 'wrench', code: d.job_number, current: true, status: <JobStatusPill status={d.status} lists={lists} /> },
    ...(d.quotation_id ? [{ kind: t('Quotation'), icon: 'clip' as const, code: `${d.quotation_code} · ${fmtMoney(d.quotation_net_total)}`, to: `/sales/quotations/${d.quotation_id}` }] : []),
    ...(d.order_id ? [{ kind: t('Sales Invoice'), icon: 'receipt' as const, code: `${d.order_code} · ${fmtMoney(d.order_net_total)}`, to: `/sales/invoices/${d.order_id}` }]
      : [{ kind: t('Sales Invoice'), icon: 'receipt' as const, code: t('Create Sales Invoice'), ghost: true, onClick: total > 0 && can('sales', 'create') ? () => inv.run([d.id]) : undefined }]),
    ...(d.non_vat_sales_id ? [{ kind: t('Non VAT Invoice'), icon: 'receipt' as const, code: `${d.non_vat_sales_code} · ${fmtMoney(d.non_vat_sales_net_total)}`, to: `/sales/non-vat/${d.non_vat_sales_id}` }] : []),
  ];
  const techs = d.technician_names?.length ? d.technician_names : d.technician_name ? [d.technician_name] : [];

  return (
    <>
      <ObjectHeader
        crumbs={[...crumbs(), { label: d.job_number || '' }]}
        icon="wrench"
        title={<><span className="mono" style={{ fontSize: 20 }}>{d.job_number}</span> <span style={{ fontWeight: 600 }}>{d.title || t('No title')}</span></>}
        pills={<><JobStatusPill status={d.status} lists={lists} /> <OpenClosedPill status={d.status} />{d.archived && <span className="tag">{t('Archived')}</span>}</>}
        subtitle={<>{d.vehicle_number && <><Plate value={d.vehicle_number} /> {[d.brand, d.model].filter(Boolean).join(' ')} · </>}<bdi>{d.customer_name}</bdi></>}
        actions={<>
          {d.order_id ? <Button icon="receipt" onClick={() => nav(`/sales/invoices/${d.order_id}`)}>{d.order_code}</Button>
            : can('sales', 'create') && <Button variant="primary" icon="receipt" disabled={total <= 0} title={total <= 0 ? t('Total must be greater than 0') : undefined} loading={inv.busy} onClick={() => inv.run([d.id])}>{t('Create Sales Invoice')}</Button>}
          {can('repair_jobs', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
          {can('repair_jobs', 'update') && <Button icon={d.archived ? 'undo' : 'inbox'} className="hide-sm" loading={busy} onClick={toggleArchive}>{t(d.archived ? 'Unarchive' : 'Archive')}</Button>}
          <Button icon="kanban" className="hide-sm" onClick={() => nav('/workshop/board')}>{t('Repair Jobs Board')}</Button>
        </>}
        facets={[
          { label: t('Total (incl. VAT)'), value: <>{fmtMoney(total)} <small>SAR</small></> },
          { label: t('Parts (excl. VAT)'), value: fmtMoney(sum.partsExcl) },
          { label: t('Labour Charge'), value: fmtMoney(d.labour_charge) },
          { label: t('Est. Delivery'), value: d.estimated_delivery ? fmtDate(d.estimated_delivery) : '—', hideOnMobile: true },
        ]}
      />
      <ObjectBody side={<SidePanel sections={[
        { title: t('Cost Summary'), body: <CostSummary s={sum} vat={vat} /> },
        { title: t('Job Information'), body: <KeyValues items={[
          { k: t('Job Number'), v: <span className="mono">{d.job_number}</span> }, { k: t('Job Date'), v: fmtDate(d.date) },
          { k: t('Est. Delivery'), v: d.estimated_delivery ? fmtDate(d.estimated_delivery) : '—' },
          { k: t('Technicians'), v: techs.length ? techs.join(', ') : '—' },
        ]} /> },
      ]} />}>
        <Card title={t('Document flow')}><DocFlow nodes={flow} /></Card>
        {total <= 0 && !d.order_id && <Banner tone="info">{t('Total must be greater than 0')} — {t('add parts or labour before invoicing.')}</Banner>}
        <Card title={t('Vehicle & Technician')}>
          <KeyValues items={[
            { k: t('Customer'), v: <bdi>{d.customer_name || '—'}</bdi> },
            { k: t('Vehicle Number'), v: d.vehicle_id ? <a className="link" href={`/workshop/vehicles/${d.vehicle_id}`} onClick={(e) => { e.preventDefault(); nav(`/workshop/vehicles/${d.vehicle_id}`); }}>{d.vehicle_number || '—'}</a> : d.vehicle_number || '—' },
            { k: t('Brand / Model'), v: [d.brand, d.model].filter(Boolean).join(' ') || '—' },
            { k: t('KM'), v: <span className="num">{d.km ? `${fmtNumber(d.km, 0)} km` : '—'}</span> },
            { k: t('Technician'), v: techs.join(', ') || '—' },
          ]} />
        </Card>
        <Card title={t('Service Details')}>
          <KeyValues items={[
            { k: t('Complaint'), v: d.complaint || '—' }, { k: t('Inspection'), v: d.inspection || '—' }, { k: t('Work Done'), v: d.work_done || '—' },
          ]} />
        </Card>
        <Card title={t('Parts Used')}>
          {!(d.parts || []).length ? <p className="muted" style={{ margin: 0 }}>{t('No parts added yet.')}</p> : (
            <div className="ws-tbl-wrap">
              <table className="ws-tbl" aria-label={t('Parts Used')}>
                <thead><tr><th>{t('Part Name')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Price (excl.)')}</th><th className="r">{t('Price (incl.)')}</th><th className="r">{t('Total')}</th></tr></thead>
                <tbody>{(d.parts || []).map((p, i) => (
                  <tr key={i}><td>{p.name}{p.part_number && <span className="muted mono"> · {p.part_number}</span>}</td><td className="r num">{fmtNumber(p.qty, 2)}</td><td className="r num">{fmtMoney(p.unit_price)}</td><td className="r num">{fmtMoney(p.unit_price_with_vat)}</td><td className="r num">{fmtMoney(p.total_price_with_vat)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </ObjectBody>
      {confirmEl}
    </>
  );
}
