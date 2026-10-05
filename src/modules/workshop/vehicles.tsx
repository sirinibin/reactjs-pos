import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord, useSave } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { searchParties, partyToOption, type Party } from '@/framework/doc/lookups';
import { ObjectBody, ObjectHeader, KeyValues } from '@/ui/ObjectPage';
import { Card } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { EmptyState, ErrorState, Skeleton, Tabs } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney, fmtNumber, parseNumber } from '@/lib/format';
import { t as tt } from '@/i18n';
import { loadBrands, VEHICLE, JOB, type Vehicle } from './lib/api';
import { FormShell } from './components/FormShell';
import { DocChips, JobStatusPill, Plate } from './components/bits';
import { loadBoard } from './lib/kanban';

const LIST = '/workshop/vehicles';
const SELECT = 'id,customer_id,customer_name,vehicle_number,brand,model,variant,year,istimara_no,chassis_number,current_km,color,created_at';
const crumbs = () => [{ label: tt('Workshop'), to: '/workshop/board' }, { label: tt('Vehicles'), to: LIST }];

export function vehicleListConfig(loadCustomers: (q: string, s: AbortSignal) => Promise<PickerOption[]>, nav: (p: string) => void, canEdit: boolean): ListConfig<Vehicle> {
  return {
    title: 'Vehicles',
    subtitle: 'Customer vehicles serviced by the workshop',
    icon: 'car',
    endpoint: VEHICLE,
    resource: 'vehicles',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'search',
    searchPlaceholder: 'Search plate, chassis, brand, model, istimara or customer…',
    createPath: `${LIST}/new`,
    createLabel: 'Create',
    detailPath: (r) => `${LIST}/${r.id}`,
    filters: [
      { id: 'customer', label: 'Customer', type: 'picker', load: loadCustomers, toSearch: (v) => ({ customer_id: v }) },
      { id: 'brand', label: 'Brand', type: 'text' },
      { id: 'istimara_no', label: 'Istimara No.', type: 'text' },
    ],
    columns: [
      { key: 'vehicle_number', header: tt('Vehicle #'), sortKey: 'vehicle_number', render: (r) => <span className="row" style={{ flexWrap: 'nowrap' }}><Plate value={r.vehicle_number} /></span> },
      { key: 'brand', header: tt('Brand / Model'), sortKey: 'brand', className: 'two', render: (r) => <><b>{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</b>{r.variant ? <span>{r.variant}</span> : null}</> },
      { key: 'year', header: tt('Year'), sortKey: 'year', hideBelow: 'lg', render: (r) => <span className="num">{r.year || '—'}</span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', render: (r) => <bdi>{r.customer_name || '—'}</bdi> },
      { key: 'istimara_no', header: tt('Istimara No.'), hideBelow: 'md', render: (r) => <span className="mono">{r.istimara_no || '—'}</span> },
      { key: 'chassis_number', header: tt('Chassis #'), hideBelow: 'lg', render: (r) => <span className="mono">{r.chassis_number || '—'}</span> },
      { key: 'current_km', header: tt('KM'), sortKey: 'current_km', align: 'end', render: (r) => <span className="num">{r.current_km ? fmtNumber(r.current_km, 0) : '—'}</span> },
      { key: 'color', header: tt('Color'), hideBelow: 'xl', render: (r) => r.color || '—' },
      { key: 'created_at', header: tt('Created At'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: canEdit ? (r) => <IconButton icon="edit" label={tt('Edit')} onClick={() => nav(`${LIST}/${r.id}/edit`)} /> : undefined,
    mobileCard: (r) => ({ title: <Plate value={r.vehicle_number} />, amount: r.current_km ? `${fmtNumber(r.current_km, 0)} km` : undefined, subtitle: <>{[r.brand, r.model, r.year || ''].filter(Boolean).join(' ')}</>, meta: <bdi>{r.customer_name}</bdi> }),
    exportColumns: [
      { header: 'Vehicle #', value: (r) => r.vehicle_number },
      { header: 'Brand', value: (r) => r.brand },
      { header: 'Model', value: (r) => r.model },
      { header: 'Variant', value: (r) => r.variant },
      { header: 'Year', value: (r) => r.year },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Istimara No.', value: (r) => r.istimara_no },
      { header: 'Chassis #', value: (r) => r.chassis_number },
      { header: 'KM', value: (r) => r.current_km },
      { header: 'Color', value: (r) => r.color },
    ],
    exportName: 'vehicles',
    empty: <EmptyState icon="car" title={tt('No Vehicles to display')} />,
  };
}

export function VehicleListPage() {
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can } = useAuth();
  const cfg = vehicleListConfig(async (q, s) => (await searchParties('customer', storeId, q, s)).map(partyToOption), nav, can('vehicles', 'update'));
  return <ListPage config={cfg} />;
}

// ---------------------------------------------------------------- editor

interface VForm {
  customer: PickerOption<Party> | null; vehicle_number: string; brand: string; model: string; variant: string; year: string;
  istimara_no: string; chassis_number: string; engine_number: string; current_km: string; color: string; remarks: string;
}
const blank: VForm = { customer: null, vehicle_number: '', brand: '', model: '', variant: '', year: '', istimara_no: '', chassis_number: '', engine_number: '', current_km: '', color: '', remarks: '' };

export function validateVehicle(v: Pick<VForm, 'customer' | 'vehicle_number'>): Record<string, string> {
  if (!v.customer) return { customer_id: 'Customer is required' };
  if (!v.vehicle_number.trim()) return { vehicle_number: 'Vehicle number is required' };
  return {};
}

export function vehicleBody(v: VForm, editing: boolean) {
  const body: Record<string, any> = {
    customer_id: v.customer?.id || null,
    vehicle_number: v.vehicle_number.trim(), brand: v.brand, model: v.model, variant: v.variant.trim(), year: parseInt(v.year, 10) || 0,
    istimara_no: v.istimara_no.trim(), chassis_number: v.chassis_number.trim(), engine_number: v.engine_number.trim(), color: v.color.trim(), remarks: v.remarks.trim(),
  };
  if (!editing) body.current_km = parseNumber(v.current_km);
  return body;
}

export function VehicleEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const q = useRecord<Vehicle>(VEHICLE, id);
  const save = useSave<Vehicle>(VEHICLE);
  const brands = useQuery({ queryKey: [VEHICLE, 'brands'], queryFn: loadBrands, staleTime: Infinity });
  const [v, setV] = useState<VForm>(() => {
    const cid = sp.get('customer_id');
    return cid ? { ...blank, customer: { id: cid, label: sp.get('customer_name') || cid, data: { id: cid, name: sp.get('customer_name') || '' } } } : blank;
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const editing = !!id;

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setV({
      customer: d.customer_id ? { id: d.customer_id, label: d.customer_name || d.customer_id, data: { id: d.customer_id, name: d.customer_name || '' } } : null,
      vehicle_number: d.vehicle_number || '', brand: d.brand || '', model: d.model || '', variant: d.variant || '', year: d.year ? String(d.year) : '',
      istimara_no: d.istimara_no || '', chassis_number: d.chassis_number || '', engine_number: d.engine_number || '', current_km: d.current_km ? String(d.current_km) : '',
      color: d.color || '', remarks: d.remarks || '',
    });
  }, [q.data]);

  const customerId = v.customer?.id;
  const custInfo = useQuery({
    queryKey: ['/v1/customer', 'one', customerId, storeId],
    queryFn: async () => (await api.get<Party>(`/v1/customer/${customerId}`, { search: { store_id: storeId } })).result,
    enabled: !!customerId && !!storeId,
  });
  const custVehicles = useQuery({
    queryKey: [VEHICLE, 'by-customer', customerId, storeId],
    queryFn: async () => (await api.get<Vehicle[]>(VEHICLE, { search: { store_id: storeId, customer_id: customerId }, limit: 50, sort: '-created_at', select: 'id,vehicle_number,brand,model,variant,year,color' })).result || [],
    enabled: !!customerId && !!storeId,
  });

  const set = <K extends keyof VForm>(k: K, val: VForm[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    const ek = k === 'customer' ? 'customer_id' : k;
    if (errs[ek as string]) setErrs((e) => ({ ...e, [ek]: '' }));
  };
  const brandModels = useMemo(() => brands.data?.find((b) => b.brand === v.brand)?.models || [], [brands.data, v.brand]);

  const submit = async () => {
    const local = validateVehicle(v);
    if (Object.keys(local).length) { setErrs(Object.fromEntries(Object.entries(local).map(([k, m]) => [k, t(m)]))); return; }
    try {
      const rec = await save.mutateAsync({ id, body: vehicleBody(v, editing) });
      toast.success(t(editing ? 'Vehicle updated successfully!' : 'Vehicle created successfully!'));
      nav(`${LIST}/${rec?.id || id}`, { replace: !editing });
    } catch (e) {
      if (e instanceof ApiError) { setErrs(e.errors); toast.error(t('Failed to process vehicle!')); }
      else toast.error((e as Error).message);
    }
  };

  if (editing && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (editing && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const title = editing ? `${t('Update Vehicle')} — ${q.data?.vehicle_number || [q.data?.brand, q.data?.model].filter(Boolean).join(' ')}` : t('Create New Vehicle');
  const known = new Set(['customer_id', 'vehicle_number', 'brand', 'model', 'year', 'current_km']);
  const c = custInfo.data;

  return (
    <FormShell title={title} crumbs={[...crumbs(), { label: editing ? q.data?.vehicle_number || '' : t('New') }]} icon="car" editing={editing} saving={save.isPending}
      canSave={can('vehicles', editing ? 'update' : 'create')} onSave={submit} onCancel={() => nav(editing ? `${LIST}/${id}` : LIST)}
      errors={Object.entries(errs).filter(([k, m]) => m && !known.has(k)).map(([, m]) => m)}
      side={
        <aside className="stack">
          <Card title={t('Customer')}>
            {!c ? <p className="muted" style={{ margin: 0 }}>{t('Select a customer to see details')}</p> : (
              <div className="stack" style={{ gap: 10 }}>
                <KeyValues items={[
                  { k: t('Name'), v: <bdi>{c.name}</bdi> },
                  ...(c.name_in_arabic ? [{ k: t('Name (Arabic)'), v: <bdi>{c.name_in_arabic}</bdi> }] : []),
                  ...(c.code ? [{ k: t('Code'), v: <span className="mono">{c.code}</span> }] : []),
                  ...(c.phone ? [{ k: t('Phone'), v: <span className="num">{c.phone}</span> }] : []),
                  ...(c.vat_no ? [{ k: t('VAT no.'), v: <span className="num">{c.vat_no}</span> }] : []),
                  { k: t('Balance'), v: <b className="num" style={{ color: (c.credit_balance || 0) > 0 ? 'var(--crit)' : 'var(--good)' }}>{fmtMoney(c.credit_balance || 0)}</b> },
                ]} />
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{t('Vehicles')} ({custVehicles.data?.length ?? 0})</div>
                  <div className="ws-veh-pills">
                    {(custVehicles.data || []).map((x) => (
                      <button type="button" key={x.id} aria-current={x.id === id ? 'true' : undefined} disabled={x.id === id} onClick={() => nav(`${LIST}/${x.id}/edit`)}>
                        {x.vehicle_number || [x.brand, x.model].join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </aside>
      }>
      <Card title={t('Customer')}>
        <Field label={t('Customer')} required error={errs.customer_id}>
          {(fid, d) => (
            <AsyncPicker<Party> id={fid} aria-describedby={d} value={v.customer} onChange={(o) => set('customer', o)} clearable eager invalid={!!errs.customer_id}
              placeholder={t('Search customer...')} load={async (s, sig) => (await searchParties('customer', storeId, s, sig)).map(partyToOption)} />
          )}
        </Field>
      </Card>
      <Card title={t('Vehicle Identification')}>
        <div className="fgrid">
          <Field label={t('Brand')} required error={errs.brand}>
            {(fid, d) => (
              <Select id={fid} aria-describedby={d} invalid={!!errs.brand} value={v.brand} onChange={(e) => { set('brand', e.target.value); set('model', ''); }} placeholder={t('Select Brand')}
                options={[...(brands.data || []).map((b) => ({ value: b.brand, label: b.brand })), ...(v.brand && !brands.data?.some((b) => b.brand === v.brand) ? [{ value: v.brand, label: v.brand }] : [])]} />
            )}
          </Field>
          <Field label={t('Model')} required error={errs.model}>
            {(fid, d) => (
              <Select id={fid} aria-describedby={d} invalid={!!errs.model} value={v.model} disabled={!v.brand} onChange={(e) => set('model', e.target.value)} placeholder={t('Select Model')}
                options={[...brandModels.map((m) => ({ value: m, label: m })), ...(v.model && !brandModels.includes(v.model) ? [{ value: v.model, label: v.model }] : [])]} />
            )}
          </Field>
          <Field label={t('Variant')}>{(fid) => <Input id={fid} value={v.variant} placeholder={t('e.g. GXL, Limited, LX')} onChange={(e) => set('variant', e.target.value)} />}</Field>
          <Field label={t('Manufacture Year')} error={errs.year}>{(fid, d) => <Input id={fid} aria-describedby={d} inputMode="numeric" maxLength={4} className="num" value={v.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} />}</Field>
        </div>
      </Card>
      <Card title={t('Registration & Technical')}>
        <div className="fgrid">
          <Field label={t('Vehicle Number (Plate)')} required error={errs.vehicle_number}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errs.vehicle_number} value={v.vehicle_number} placeholder={t('Plate number')} onChange={(e) => set('vehicle_number', e.target.value)} />}
          </Field>
          <Field label={t('Istimara No.')}>{(fid) => <Input id={fid} value={v.istimara_no} onChange={(e) => set('istimara_no', e.target.value)} />}</Field>
          <Field label={t('Chassis Number')}>{(fid) => <Input id={fid} value={v.chassis_number} placeholder={t('VIN / Chassis')} onChange={(e) => set('chassis_number', e.target.value)} />}</Field>
          <Field label={t('Engine Number')}>{(fid) => <Input id={fid} value={v.engine_number} onChange={(e) => set('engine_number', e.target.value)} />}</Field>
          <Field label={t('Current KM')} error={errs.current_km} hint={editing ? t('Updated automatically from the latest sales or quotation') : undefined}>
            {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="decimal" className="num" disabled={editing} value={v.current_km} onChange={(e) => set('current_km', e.target.value)} />}
          </Field>
          <Field label={t('Color')}>{(fid) => <Input id={fid} value={v.color} onChange={(e) => set('color', e.target.value)} />}</Field>
          <Field label={t('Remarks')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={v.remarks} placeholder={t('Optional notes')} onChange={(e) => set('remarks', e.target.value)} />}</Field>
        </div>
      </Card>
    </FormShell>
  );
}

// ---------------------------------------------------------------- view

type HistTab = 'details' | 'repairs' | 'sales' | 'quotations';

function useHistory(tab: HistTab, active: HistTab, vehicleId: string | undefined, storeId: string) {
  return useQuery({
    queryKey: [tab === 'repairs' ? JOB : tab === 'sales' ? '/v1/order' : '/v1/quotation', 'vehicle-history', vehicleId, storeId],
    queryFn: async () => {
      if (tab === 'repairs') return (await api.get<any[]>(JOB, { search: { store_id: storeId, vehicle_id: vehicleId }, limit: 200, sort: '-date', select: 'id,job_number,title,date,status,labour_charge,total,total_with_vat,km,order_id,order_code,order_net_total,quotation_id,quotation_code,quotation_net_total,quotation_type,non_vat_sales_id,non_vat_sales_code,non_vat_sales_net_total' })).result || [];
      const path = tab === 'sales' ? '/v1/order' : '/v1/quotation';
      return (await api.get<any[]>(path, { search: { store_id: storeId, vehicle_id: vehicleId }, limit: 200, sort: '-date', select: `id,code,date,customer_name,net_total,km_driven,${tab === 'sales' ? 'payment_status' : 'type'}` })).result || [];
    },
    enabled: tab === active && !!vehicleId && !!storeId,
  });
}

export function VehicleViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as HistTab) || 'details';
  const q = useRecord<Vehicle>(VEHICLE, id);
  const repairs = useHistory('repairs', tab, id, storeId);
  const sales = useHistory('sales', tab, id, storeId);
  const quotes = useHistory('quotations', tab, id, storeId);
  const d = q.data;
  usePageMeta(d ? d.vehicle_number || [d.brand, d.model].join(' ') : t('Vehicle'), 'car');
  const lists = loadBoard().lists;

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!d) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;

  const setTab = (x: HistTab) => setSp((p) => { const n = new URLSearchParams(p); if (x === 'details') n.delete('tab'); else n.set('tab', x); return n; }, { replace: true });
  const label = [d.vehicle_number, d.brand, d.model].filter(Boolean).join(' — ');
  const hist = (rows: any[] | undefined, loading: boolean, cols: { h: string; r?: boolean; v: (x: any) => React.ReactNode }[], onRow: (x: any) => void, empty: string) => (
    loading ? <Skeleton height={120} /> : !rows?.length ? <EmptyState title={t(empty)} /> : (
      <div className="ws-tbl-wrap">
        <table className="ws-tbl">
          <thead><tr>{cols.map((c) => <th key={c.h} className={c.r ? 'r' : undefined}>{t(c.h)}</th>)}</tr></thead>
          <tbody>{rows.map((x) => <tr key={x.id} onClick={() => onRow(x)} style={{ cursor: 'pointer' }}>{cols.map((c) => <td key={c.h} className={c.r ? 'r num' : undefined}>{c.v(x)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    ));

  return (
    <>
      <ObjectHeader
        crumbs={[...crumbs(), { label: d.vehicle_number || d.id }]}
        icon="car"
        title={<>{[d.brand, d.model].filter(Boolean).join(' ') || t('Vehicle')} {d.year ? <span className="muted num">{d.year}</span> : null}</>}
        pills={<Plate value={d.vehicle_number} />}
        subtitle={<bdi>{d.customer_name}</bdi>}
        actions={<>
          {can('repair_jobs', 'create') && <Button variant="primary" icon="wrench" onClick={() => nav(`/workshop/jobs/new?vehicle_id=${d.id}`)}>{t('New Repair Job')}</Button>}
          <Button icon="kanban" className="hide-sm" onClick={() => nav(`/workshop/board?vehicle_id=${d.id}&vehicle_label=${encodeURIComponent(label)}&customer_id=${d.customer_id || ''}&customer_name=${encodeURIComponent(d.customer_name || '')}`)}>{t('Repair Job Board')}</Button>
          {can('vehicles', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        </>}
        facets={[
          { label: t('Current KM'), value: d.current_km ? fmtNumber(d.current_km, 0) : '—' },
          { label: t('Istimara No.'), value: d.istimara_no || '—' },
          { label: t('Chassis #'), value: <span className="mono">{d.chassis_number || '—'}</span>, hideOnMobile: true },
          { label: t('Color'), value: d.color || '—', hideOnMobile: true },
        ]}
        tabs={<Tabs value={tab} onChange={setTab} label={t('Vehicle History')} tabs={[
          { id: 'details', label: t('Details') },
          { id: 'repairs', label: t('Repair Jobs'), count: repairs.data?.length },
          { id: 'sales', label: t('Sales History'), count: sales.data?.length },
          { id: 'quotations', label: t('Quotation History'), count: quotes.data?.length },
        ]} />}
      />
      <ObjectBody>
        {tab === 'details' && (
          <div className="grid-2c">
            <Card title={t('Vehicle Identification')}>
              <KeyValues items={[
                { k: t('Customer'), v: <bdi>{d.customer_name || '—'}</bdi> },
                { k: t('Brand'), v: d.brand || '—' }, { k: t('Model'), v: d.model || '—' }, { k: t('Variant'), v: d.variant || '—' },
                { k: t('Manufacture Year'), v: <span className="num">{d.year || '—'}</span> }, { k: t('Color'), v: d.color || '—' },
                { k: t('Current KM'), v: <span className="num">{d.current_km ? fmtNumber(d.current_km, 0) : '—'}</span> },
              ]} />
            </Card>
            <Card title={t('Registration & Technical')}>
              <KeyValues items={[
                { k: t('Vehicle Number (Plate)'), v: d.vehicle_number || '—' }, { k: t('Istimara No.'), v: d.istimara_no || '—' },
                { k: t('Chassis Number'), v: <span className="mono">{d.chassis_number || '—'}</span> }, { k: t('Engine Number'), v: <span className="mono">{d.engine_number || '—'}</span> },
                { k: t('Remarks'), v: d.remarks || '—' },
              ]} />
            </Card>
          </div>
        )}
        {tab === 'repairs' && <Card title={t('Repair Jobs')}>{hist(repairs.data, repairs.isLoading, [
          { h: 'Job #', v: (x) => <><b className="mono">{x.job_number}</b> <DocChips job={x} /></> },
          { h: 'Title', v: (x) => x.title },
          { h: 'Date', v: (x) => <span className="num">{fmtDate(x.date)}</span> },
          { h: 'Km', r: true, v: (x) => (x.km ? `${fmtNumber(x.km, 0)} km` : '—') },
          { h: 'Status', v: (x) => <JobStatusPill status={x.status} lists={lists} /> },
          { h: 'Labour', r: true, v: (x) => fmtMoney(x.labour_charge) },
          { h: 'Total', r: true, v: (x) => fmtMoney(x.total_with_vat || x.total) },
        ], (x) => nav(`/workshop/jobs/${x.id}`), 'No repair jobs found')}</Card>}
        {tab === 'sales' && <Card title={t('Sales History')}>{hist(sales.data, sales.isLoading, [
          { h: 'Code', v: (x) => <span className="mono">{x.code}</span> },
          { h: 'Date', v: (x) => <span className="num">{fmtDate(x.date)}</span> },
          { h: 'Customer', v: (x) => <bdi>{x.customer_name}</bdi> },
          { h: 'Km Driven', r: true, v: (x) => (x.km_driven ? fmtNumber(x.km_driven, 0) : '—') },
          { h: 'Total', r: true, v: (x) => fmtMoney(x.net_total) },
          { h: 'Payment', v: (x) => t(String(x.payment_status || '').replace(/_/g, ' ')) },
        ], (x) => nav(`/sales/invoices/${x.id}`), 'No sales found')}</Card>}
        {tab === 'quotations' && <Card title={t('Quotation History')}>{hist(quotes.data, quotes.isLoading, [
          { h: 'Code', v: (x) => <span className="mono">{x.code}</span> },
          { h: 'Date', v: (x) => <span className="num">{fmtDate(x.date)}</span> },
          { h: 'Customer', v: (x) => <bdi>{x.customer_name}</bdi> },
          { h: 'Type', v: (x) => <span className={`ws-chip ${x.type === 'invoice' ? 'inv' : 'qtn'}`}>{t(x.type === 'invoice' ? 'Invoice' : 'Quotation')}</span> },
          { h: 'Km Driven', r: true, v: (x) => (x.km_driven ? fmtNumber(x.km_driven, 0) : '—') },
          { h: 'Total', r: true, v: (x) => fmtMoney(x.net_total) },
        ], (x) => nav(`/sales/quotations/${x.id}`), 'No quotations found')}</Card>}
      </ObjectBody>
    </>
  );
}
