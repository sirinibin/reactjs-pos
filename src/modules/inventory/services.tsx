import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { AsyncPicker } from '@/ui/AsyncPicker';
import { Button } from '@/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/ui/Field';
import { Drawer } from '@/ui/Overlay';
import { Banner, Skeleton } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney } from '@/lib/format';
import { DeletedPill, Tx, loadOptions, useDeleteRestore } from './components/common';
import { ImageGallery, PriceGrid, deleteProductImage, uploadProductImage } from './components/ProductParts';
import { SERVICE_CATEGORY } from './masters';
import { PRODUCT, type Product } from './products';
import { SERVICE_UNITS, formatDuration, normalizeServiceUnit } from './lib/pricing';
import { serviceFromApi, serviceToApi, validateService, type ServiceForm } from './lib/serviceForm';

export { serviceFromApi, serviceToApi, validateService };

const DELIVERY = [
  { value: 'in_store', label: 'In store' },
  { value: 'remote', label: 'Remote / online' },
  { value: 'at_customer_location', label: 'At customer location' },
];
const CAT_FIELDS: FieldDef[] = [{ name: 'name', label: 'Name', type: 'text', required: true, span: 2 }];
const deliveryLabel = (v?: string) => DELIVERY.find((d) => d.value === v)?.label || '';
const unitLabel = (v?: string) => SERVICE_UNITS.find((u) => u.value === normalizeServiceUnit(v))?.label.replace(/ \(.*\)$/, '') || v || '';

export function serviceListConfig(storeId: string): ListConfig<Product> {
  const ps = (r: Product) => r.product_stores?.[storeId] || {};
  return {
    title: 'Services', subtitle: 'Labour, visits and other non-stock items', icon: 'wrench', endpoint: PRODUCT, resource: 'services',
    select: `id,name,name_in_arabic,item_code,unit,service_category_name,service_category_id,duration_minutes,duration_unit,delivery_mode,booking_required,deleted,created_at,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat`,
    baseSearch: { is_service: 1 }, defaultSort: { key: 'created_at', dir: -1 }, searchKey: 'search_text', searchPlaceholder: 'Name · item code · category',
    createLabel: 'New service',
    views: [{ id: 'all', label: 'Active' }, { id: 'deleted', label: 'Deleted', search: { deleted: 1 } }],
    filters: [
      { id: 'category', label: 'Category', type: 'picker', load: (q, s) => loadOptions(SERVICE_CATEGORY, storeId, q, s), toSearch: (v) => ({ service_category_id: v }) },
      { id: 'unit', label: 'Unit', type: 'select', options: SERVICE_UNITS },
      { id: 'delivery_mode', label: 'Delivery', type: 'select', options: DELIVERY },
      { id: 'booking_required', label: 'Booking', type: 'select', options: [{ value: '1', label: 'Required' }, { value: '0', label: 'Not required' }] },
      { id: 'duration_minutes', label: 'Duration', type: 'number', placeholder: 'e.g. >=60' },
    ],
    columns: [
      { key: 'name', header: <Tx k="Name" />, sortKey: 'name', className: 'two', render: (r) => <><b><bdi>{r.name}</bdi>{r.deleted && <> <DeletedPill /></>}</b>{r.name_in_arabic ? <span dir="rtl">{r.name_in_arabic}</span> : r.item_code ? <span className="mono">{r.item_code}</span> : null}</> },
      { key: 'category', header: <Tx k="Category" />, hideBelow: 'md', render: (r) => r.service_category_name || '—' },
      { key: 'unit', header: <Tx k="Unit" />, hideBelow: 'lg', render: (r) => <Tx k={unitLabel(r.unit)} /> },
      { key: 'price', header: <Tx k="Retail price" />, sortKey: 'stores.retail_unit_price', align: 'end', render: (r) => <span className="num">{fmtMoney(ps(r).retail_unit_price)}</span> },
      { key: 'duration', header: <Tx k="Duration" />, sortKey: 'duration_minutes', hideBelow: 'md', render: (r) => <span className="num">{formatDuration(r.duration_minutes, r.duration_unit) || '—'}</span> },
      { key: 'delivery', header: <Tx k="Delivery" />, hideBelow: 'lg', render: (r) => (r.delivery_mode ? <Tx k={deliveryLabel(r.delivery_mode)} /> : '—') },
      { key: 'booking', header: <Tx k="Booking" />, hideBelow: 'xl', render: (r) => (r.booking_required ? <Pill tone="info" icon="clock"><Tx k="Required" /></Pill> : <span className="muted"><Tx k="Not required" /></span>) },
      { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: fmtMoney(ps(r).retail_unit_price), subtitle: r.service_category_name || undefined, meta: r.deleted ? <DeletedPill /> : formatDuration(r.duration_minutes, r.duration_unit) || undefined }),
    exportColumns: [
      { header: 'Name', value: (r) => r.name }, { header: 'Name (Arabic)', value: (r) => r.name_in_arabic }, { header: 'Category', value: (r) => r.service_category_name },
      { header: 'Unit', value: (r) => normalizeServiceUnit(r.unit) }, { header: 'Retail Price', value: (r) => ps(r).retail_unit_price ?? 0 },
      { header: 'Duration', value: (r) => formatDuration(r.duration_minutes, r.duration_unit) }, { header: 'Delivery', value: (r) => r.delivery_mode },
      { header: 'Booking', value: (r) => (r.booking_required ? 'Required' : 'Not required') },
    ],
    exportName: 'services',
    showFooter: false,
  };
}

export function ServiceListPage() {
  const storeId = useStoreId();
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useState<{ id?: string } | null>(null);
  const dr = useDeleteRestore<Product>({ endpoint: PRODUCT, resource: 'services', label: (r) => r.name, canRestore: true, noun: 'service' });

  useEffect(() => {
    const nw = sp.get('new') === '1';
    const ed = sp.get('edit');
    if (nw || ed) {
      setOpen(nw ? {} : { id: ed! });
      setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); n.delete('edit'); return n; }, { replace: true });
    }
  }, [sp, setSp]);

  const cfg = serviceListConfig(storeId);
  cfg.onCreate = () => setOpen({});
  cfg.onRowClick = (r) => { if (!r.deleted) setOpen({ id: r.id }); };
  cfg.rowActions = dr.canDelete ? dr.rowActions : undefined;
  return (
    <>
      <ListPage config={cfg} />
      {open && <ServiceDrawer id={open.id} onClose={() => setOpen(null)} />}
      {dr.confirmEl}
    </>
  );
}

function ServiceDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can } = useAuth();
  const vat = store?.vat_percent ?? 15;
  const [existing, setExisting] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [f, setF] = useState<ServiceForm>(() => serviceFromApi(null, storeId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const catInitial = useMemo(() => (newCat !== null ? { name: newCat } : null), [newCat]);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    api.get<Product>(`${PRODUCT}/${id}`, { search: { store_id: storeId } }, ac.signal)
      .then((r) => { setExisting(r.result!); setF(serviceFromApi(r.result!, storeId)); setImages(r.result?.images || []); })
      .catch((e) => { if (e?.name !== 'AbortError') toast.error((e as Error).message); })
      .finally(() => !ac.signal.aborted && setLoading(false));
    return () => ac.abort();
  }, [id, storeId, toast]);

  const up = (patch: Partial<ServiceForm>) => { setF((x) => ({ ...x, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  const save = async () => {
    const e = validateService(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = serviceToApi(f, storeId, existing?.product_stores?.[storeId]);
      const q = { search: { store_id: storeId } };
      const r = id ? await api.put<Product>(`${PRODUCT}/${id}`, body, q) : await api.post<Product>(PRODUCT, body, q);
      qc.invalidateQueries({ queryKey: [PRODUCT] });
      toast.success(id ? t('Saved') : t('{{name}} created', { name: r.result?.name || f.name }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.errors);
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addImages = async (files: File[]) => {
    if (!id) return;
    setUploading(true);
    try { for (const file of files) { const u = await uploadProductImage(id, storeId, file); if (u) setImages((x) => [...x, u]); } } catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  };

  const known = ['name', 'name_in_arabic', 'unit', 'item_code', 'purchase_unit_price', 'wholesale_unit_price', 'retail_unit_price'];
  const other = Object.entries(errors).filter(([k]) => !known.includes(k));
  const canSave = can('services', id ? 'update' : 'create');

  return (
    <>
      <Drawer open onClose={onClose} title={id ? `${t('Edit')} · ${existing?.name || ''}` : t('New service')} width={640}
        footer={<><Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" icon="check" loading={saving} disabled={loading || !canSave} onClick={save}>{id ? t('Save changes') : t('Create')}</Button></>}>
        {loading ? <div className="stack"><Skeleton height={34} /><Skeleton height={34} /><Skeleton height={120} /></div> : (
          <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } }}>
            {other.length > 0 && <Banner tone="crit">{other.map(([, m]) => t(m)).join(' · ')}</Banner>}
            <div className="grid-2c">
              <Field label={t('Name')} required error={errors.name && t(errors.name)} className="span2">{(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.name} value={f.name} onChange={(e) => up({ name: e.target.value })} />}</Field>
              <Field label={t('Name in Arabic')} className="span2">{(fid) => <Input id={fid} dir="rtl" value={f.name_in_arabic} onChange={(e) => up({ name_in_arabic: e.target.value })} />}</Field>
              <Field label={t('Service category')} className="span2">
                {(fid) => <AsyncPicker id={fid} value={f.category ? { ...f.category, data: null } : null} clearable eager placeholder={t('Search categories…')}
                  load={(q, s) => loadOptions(SERVICE_CATEGORY, storeId, q, s)} onChange={(o) => up({ category: o ? { id: o.id, label: o.label } : null })}
                  onCreate={can('service_category', 'create') ? (q) => setNewCat(q) : undefined} createLabel={t('Create category')} />}
              </Field>
              <Field label={t('Unit')} required error={errors.unit && t(errors.unit)}>{(fid) => <Select id={fid} value={f.unit} onChange={(e) => up({ unit: e.target.value })} options={SERVICE_UNITS.map((u) => ({ value: u.value, label: t(u.label) }))} />}</Field>
              <Field label={t('Item code / SKU')}>{(fid) => <Input id={fid} value={f.item_code} onChange={(e) => up({ item_code: e.target.value })} />}</Field>
              <Field label={t('Duration')} hint={formatDuration(f.duration_minutes, f.duration_unit) || undefined}>
                {(fid, d) => (
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <Input id={fid} aria-describedby={d} inputMode="numeric" className="num" value={f.duration_minutes || ''} placeholder="0" onChange={(e) => up({ duration_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                    <select className="inp" style={{ width: 'auto', minWidth: 104, flex: 'none' }} aria-label={t('Duration unit')} value={f.duration_unit} onChange={(e) => up({ duration_unit: e.target.value })}>
                      <option value="minutes">{t('Minutes')}</option><option value="hours">{t('Hours')}</option><option value="days">{t('Days')}</option><option value="weeks">{t('Weeks')}</option>
                    </select>
                  </div>
                )}
              </Field>
              <Field label={t('Delivery mode')}>{(fid) => <Select id={fid} value={f.delivery_mode} placeholder={t('— Not specified —')} onChange={(e) => up({ delivery_mode: e.target.value })} options={DELIVERY.map((d) => ({ ...d, label: t(d.label) }))} />}</Field>
              <div className="span2"><Checkbox label={t('Booking required')} checked={f.booking_required} onChange={(e) => up({ booking_required: e.target.checked })} /></div>
              <Field label={t('Description / notes')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={f.note} onChange={(e) => up({ note: e.target.value })} />}</Field>
            </div>
            <div>
              <h4 className="inv-sec-t">{t('Unit prices')}</h4>
              <PriceGrid prices={f.prices} vat={vat} errors={errors} onChange={(p) => up({ prices: p })} />
            </div>
            {id && <div><h4 className="inv-sec-t">{t('Photos')}</h4><ImageGallery images={images} busy={uploading} onAdd={addImages} onDelete={async (u) => { try { await deleteProductImage(id, storeId, u); setImages((x) => x.filter((y) => y !== u)); } catch (e) { toast.error((e as Error).message); } }} /></div>}
            <button type="submit" hidden />
          </form>
        )}
      </Drawer>
      <EntityForm open={newCat !== null} modal onClose={() => setNewCat(null)} endpoint={SERVICE_CATEGORY} title="New service category"
        fields={CAT_FIELDS} initial={catInitial}
        onSaved={(rec: any) => rec?.id && up({ category: { id: rec.id, label: rec.name } })} />
    </>
  );
}
