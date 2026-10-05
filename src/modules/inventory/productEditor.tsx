import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { searchProducts, productToOption } from '@/framework/doc/lookups';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox, Field, Input, Select, Textarea } from '@/ui/Field';
import { Banner, ErrorState, Skeleton } from '@/ui/Misc';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney, fmtNumber, parseNumber, toRfc3339 } from '@/lib/format';
import { MultiPicker, NumInput, loadOptions, useWarehouses } from './components/common';
import { ImageGallery, PriceGrid, deleteProductImage, uploadProductImage } from './components/ProductParts';
import { BRAND, CATEGORY } from './masters';
import { PRODUCT, type Product } from './products';
import { countryName, countryOptions } from './lib/countries';
import { PRODUCT_UNITS, priceFromLastPurchase, setTotals, stockByLocation } from './lib/pricing';
import {
  addSetLine, adjustmentTotals, effectivePrices, emptyProduct, newAdjustment, normalizeServerErrors, productFromApi, productToApi, validateProduct,
  type AdjustmentRow, type Opt, type ProductForm,
} from './lib/productForm';

const LIST = '/stock/products';
const toLocalInput = (iso: string) => (iso ? toRfc3339(new Date(iso)).slice(0, 16) : '');

export function ProductEditorPage() {
  const { id } = useParams();
  const q = useRecord<Product>(PRODUCT, id);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (id && !q.data) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <ProductEditor key={id || 'new'} id={id} existing={q.data} />;
}

const QUICK: Record<string, { endpoint: string; title: string; fields: FieldDef[] }> = {
  brand: { endpoint: BRAND, title: 'New brand', fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'code', label: 'Code', type: 'text', required: true }] },
  category: { endpoint: CATEGORY, title: 'New category', fields: [{ name: 'name', label: 'Name', type: 'text', required: true, span: 2 }] },
  arabic: { endpoint: '/v1/arabic-name', title: 'New Arabic name', fields: [{ name: 'name_in_english', label: 'Name in English', type: 'text', required: true, span: 2 }, { name: 'name_in_arabic', label: 'Name in Arabic', type: 'text', required: true, dir: 'rtl', span: 2 }] },
};
const upperCode = (v: Record<string, any>) => ({ ...v, code: String(v.code || '').toUpperCase() });

type QuickCreate = { kind: 'brand' | 'category' | 'arabic'; text: string } | null;

function ProductEditor({ id, existing }: { id?: string; existing?: Product }) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const storeId = useStoreId();
  const { store, can, setting } = useAuth();
  const [sp] = useSearchParams();
  const warehouses = useWarehouses();
  const vat = store?.vat_percent ?? 15;
  const settings = useMemo(() => store?.settings || {}, [store?.settings]);
  const warehouseModule = !!settings.enable_warehouse_module;
  const marginsOn = !!settings.enable_auto_update_prices_from_last_purchase;
  const [f, setF] = useState<ProductForm>(() => (existing ? productFromApi(existing, storeId, settings) : emptyProduct(settings)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [queued, setQueued] = useState<File[]>([]);
  const [images, setImages] = useState<string[]>(existing?.images || []);
  const [uploading, setUploading] = useState(false);
  const [quick, setQuick] = useState<QuickCreate>(null);
  const [adjQty, setAdjQty] = useState('');
  const [updatingFrom, setUpdatingFrom] = useState<'' | 'wholesale' | 'retail'>('');
  const linkTo = sp.get('link_to');
  usePageMeta(id ? `${t('Edit')} ${existing?.name || ''}` : t('New product'), id ? 'edit' : 'plus');

  const up = useCallback((patch: Partial<ProductForm>) => { setF((x) => ({ ...x, ...patch })); setDirty(true); }, []);
  const clearErr = (...keys: string[]) => setErrors((e) => { const n = { ...e }; keys.forEach((k) => delete n[k]); return n; });

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useCallback(async () => {
    const e = validateProduct(f);
    setErrors(e);
    if (Object.keys(e).length) { toast.error(t('Please fix the highlighted fields.')); return; }
    setSaving(true);
    try {
      const body = productToApi(f, { storeId, existingStore: existing?.product_stores?.[storeId] || null, warehouseModule, linkTo: id ? null : linkTo });
      const q = { search: { store_id: storeId } };
      const r = id ? await api.put<Product>(`${PRODUCT}/${id}`, body, q) : await api.post<Product>(PRODUCT, body, q);
      const saved = r.result as Product;
      if (!id && saved?.id && queued.length) {
        try {
          for (const file of queued) await uploadProductImage(saved.id, storeId, file);
        } catch (err) {
          toast.error(`${t('Some photos could not be uploaded')}: ${(err as Error).message}`);
        }
      }
      setDirty(false);
      qc.invalidateQueries({ queryKey: [PRODUCT] });
      toast.success(id ? t('Saved') : t('{{name}} created', { name: saved?.name || f.name }));
      nav(`${LIST}/${saved?.id || id}`, { replace: !id });
    } catch (err) {
      if (err instanceof ApiError) { setErrors(normalizeServerErrors(err.errors)); toast.error(err.message); }
      else toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [f, storeId, existing, warehouseModule, id, linkTo, queued, qc, toast, t, nav]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [save]);

  const translate = async () => {
    if (!setting('enable_auto_translation_to_arabic') || !f.name.trim() || f.name_in_arabic) return;
    try {
      const r = (await api.post<any>('/v1/translate', { text: f.name.trim() })) as any;
      const ar = r.translatedText || r.result?.translatedText;
      if (ar) setF((x) => (x.name_in_arabic ? x : { ...x, name_in_arabic: ar }));
    } catch { /* translation is best-effort */ }
  };

  const updateFromLastPurchase = async (tier: 'wholesale' | 'retail') => {
    const m = f.prices[`${tier}_margin_percent`];
    if (!m) { toast.error(t(tier === 'retail' ? 'Set Retail Margin % first' : 'Set Wholesale Margin % first')); return; }
    setUpdatingFrom(tier);
    try {
      const r = await api.get<any>(`${PRODUCT}/${id}/last-purchase-price`, { search: { store_id: storeId } });
      const lp = r.result?.purchase_unit_price;
      if (!lp) { toast.error(t('No purchase found for this product')); return; }
      const np = priceFromLastPurchase(lp, m, vat)!;
      up({ prices: { ...f.prices, [`${tier}_unit_price`]: np.price, [`${tier}_unit_price_with_vat`]: np.price_with_vat, [`${tier}_manual_price_updated_at`]: new Date().toISOString() } });
      toast.success(t('Price updated from {{code}}', { code: r.result?.purchase_code || t('last purchase') }));
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 200 ? t('No purchase found for this product') : (e as Error).message);
    } finally {
      setUpdatingFrom('');
    }
  };

  const addImages = async (files: File[]) => {
    if (!id) { setQueued((x) => [...x, ...files]); return; }
    setUploading(true);
    try {
      for (const file of files) { const url = await uploadProductImage(id, storeId, file); if (url) setImages((x) => [...x, url]); }
      qc.invalidateQueries({ queryKey: [PRODUCT] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const delImage = async (url: string) => {
    try { await deleteProductImage(id!, storeId, url); setImages((x) => x.filter((u) => u !== url)); qc.invalidateQueries({ queryKey: [PRODUCT] }); } catch (e) { toast.error((e as Error).message); }
  };

  const setAdj = (i: number, patch: Partial<AdjustmentRow>) => { up({ adjustments: f.adjustments.map((a, j) => (j === i ? { ...a, ...patch } : a)) }); clearErr(...Object.keys(patch).map((k) => `adjustment_${k === 'date_str' ? 'date' : k}_${i}`)); };
  const quickAdj = (type: 'adding' | 'removing') => {
    const n = parseNumber(adjQty);
    if (!(n > 0)) { toast.error(t('Enter a quantity greater than 0')); return; }
    up({ adjustments: [...f.adjustments, newAdjustment(type, n)] });
    setAdjQty('');
  };
  const adjTot = adjustmentTotals(f.adjustments);
  const kit = f.set_lines.length > 0;
  const kitTot = setTotals(f.set_lines);
  const eff = effectivePrices(f);
  const countries = useMemo(() => {
    const opts = countryOptions(i18n.language === 'ar' ? 'ar' : 'en');
    return f.country_name && !f.country_code ? [{ value: `name:${f.country_name}`, label: f.country_name }, ...opts] : opts;
  }, [i18n.language, f.country_name, f.country_code]);
  const canSave = can('products', id ? 'update' : 'create');
  const ps = existing?.product_stores?.[storeId];
  const otherErrors = Object.entries(errors).filter(([k]) => !/^(name|name_in_arabic|part_number|prefix_part_number|item_code|purchase_unit_price|wholesale_unit_price|retail_unit_price|adjustment_\w+_\d+|set_product_quantity_\d+|category_id_\d+)$/.test(k));

  const qf = quick ? QUICK[quick.kind] : null;
  const quickInitial = useMemo(() => (quick ? (quick.kind === 'arabic' ? { name_in_english: f.name, name_in_arabic: quick.text } : { name: quick.text, code: quick.text.slice(0, 4).toUpperCase() }) : null), [quick]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = (
    <div className="row doc-actions">
      <Button variant="ghost" onClick={() => nav(id ? `${LIST}/${id}` : LIST)}>{t(dirty ? 'Discard' : 'Close')}</Button>
      <Button variant="primary" icon="check" onClick={save} loading={saving} disabled={!canSave}>{t(id ? 'Save changes' : 'Create')} <kbd style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd></Button>
    </div>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Stock'), to: LIST }, { label: t('Products'), to: LIST }, { label: id ? existing?.name || '' : t('New') }]}
        icon="box"
        title={id ? <bdi>{existing?.name}</bdi> : t('New product')}
        pills={<>{!id && <Pill tone="neutral" icon="edit">{t('Draft')}</Pill>}{dirty && <Pill tone="warn" icon="clock">{t('Unsaved')}</Pill>}</>}
        subtitle={linkTo && !id ? t('Will be linked to the product you came from.') : undefined}
        actions={actions}
      />
      <ObjectBody>
        {otherErrors.length > 0 && <Banner tone="crit"><b>{t('Couldn’t save.')}</b> {otherErrors.map(([, m]) => t(m)).join(' · ')}</Banner>}

        <Card title={t('Identity')}>
          <div className="fgrid">
            <Field label={t('Name')} required error={errors.name ? t(errors.name) : undefined} className="span2">
              {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.name} value={f.name} maxLength={500} autoFocus={!id}
                onChange={(e) => { up({ name: e.target.value }); clearErr('name'); }} onBlur={translate} />}
            </Field>
            <Field label={t('Name in Arabic')} error={errors.name_in_arabic} className="span2">
              {(fid, d) => <Input id={fid} aria-describedby={d} dir="rtl" value={f.name_in_arabic} onChange={(e) => up({ name_in_arabic: e.target.value })} />}
            </Field>
            {!!settings.enable_arabic_names_list && (
              <Field label={t('Arabic names list')} className="span2" hint={t('Pick a saved translation or add a new one.')}>
                {(fid) => (
                  <AsyncPicker id={fid} value={null} eager placeholder={t('Search English or Arabic…')}
                    load={async (q, s) => ((await api.get<any[]>('/v1/arabic-name', { search: { store_id: storeId, name: q || undefined }, limit: 20, sort: '-created_at', select: 'id,name_in_english,name_in_arabic' }, s)).result || []).map((x) => ({ id: x.id, label: x.name_in_arabic, sub: x.name_in_english, data: x }))}
                    onChange={(o) => o && up({ name_in_arabic: o.label })}
                    onCreate={(q) => setQuick({ kind: 'arabic', text: q })} createLabel={t('Add new Arabic name')} />
                )}
              </Field>
            )}
          </div>
        </Card>

        <Card title={t('Classification')}>
          <div className="fgrid">
            <Field label={t('Part # prefix')} error={errors.prefix_part_number}>
              {(fid, d) => <Input id={fid} aria-describedby={d} value={f.prefix_part_number} onChange={(e) => up({ prefix_part_number: e.target.value })} />}
            </Field>
            <Field label={t('Part #')} error={errors.part_number} hint={!id ? t('Leave blank to auto-generate') : undefined}>
              {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.part_number} className="mono" value={f.part_number} onChange={(e) => { up({ part_number: e.target.value }); clearErr('part_number'); }} />}
            </Field>
            <Field label={t('Item code / SKU')} error={errors.item_code}>
              {(fid, d) => <Input id={fid} aria-describedby={d} value={f.item_code} onChange={(e) => up({ item_code: e.target.value })} />}
            </Field>
            <Field label={t('Barcode (EAN-12)')} hint={!id ? t('Assigned automatically') : undefined}>
              {(fid) => <Input id={fid} className="num" value={f.ean_12} readOnly disabled />}
            </Field>
            <Field label={t('Brand')} className="span2">
              {(fid) => (
                <AsyncPicker id={fid} value={f.brand ? { ...f.brand, data: null } : null} clearable eager placeholder={t('Search brands…')}
                  load={(q, s) => loadOptions(BRAND, storeId, q, s)} onChange={(o) => up({ brand: o ? { id: o.id, label: o.label } : null })}
                  onCreate={can('product_brand', 'create') ? (q) => setQuick({ kind: 'brand', text: q }) : undefined} createLabel={t('Create brand')} />
              )}
            </Field>
            <Field label={t('Categories')} className="span2" error={Object.entries(errors).find(([k]) => k.startsWith('category_id_'))?.[1]}>
              {(fid) => (
                <MultiPicker id={fid} label={t('Categories')} value={f.categories} onChange={(v) => up({ categories: v })} placeholder={t('Add category…')}
                  load={(q, s) => loadOptions(CATEGORY, storeId, q, s)}
                  onCreate={can('product_category', 'create') ? (q) => setQuick({ kind: 'category', text: q }) : undefined} createLabel={t('Create category')} />
              )}
            </Field>
            <Field label={t('Unit')}>
              {(fid) => <Select id={fid} value={f.unit} onChange={(e) => up({ unit: e.target.value })} options={[...PRODUCT_UNITS.map((u) => ({ value: u.value, label: t(u.label) })), ...(PRODUCT_UNITS.some((u) => u.value === f.unit) ? [] : [{ value: f.unit, label: f.unit }])]} />}
            </Field>
            <Field label={t('Country of origin')}>
              {(fid) => (
                <Select id={fid} value={f.country_code || (f.country_name ? `name:${f.country_name}` : '')} placeholder="—" options={countries}
                  onChange={(e) => { const v = e.target.value; up(v.startsWith('name:') ? {} : { country_code: v, country_name: v ? countryName(v) : '' }); }} />
              )}
            </Field>
          </div>
        </Card>

        <Card title={t('Unit prices')} sub={store?.name} actions={kit ? <Pill tone="info" icon="layers">{t('Priced from kit components')}</Pill> : undefined}>
          <PriceGrid prices={eff} vat={vat} errors={errors} marginsEditable={marginsOn} lockPurchaseRetail={kit}
            onChange={(p) => { up({ prices: kit ? { ...p, purchase_unit_price: f.prices.purchase_unit_price, purchase_unit_price_with_vat: f.prices.purchase_unit_price_with_vat, retail_unit_price: f.prices.retail_unit_price, retail_unit_price_with_vat: f.prices.retail_unit_price_with_vat } : p }); clearErr('purchase_unit_price', 'wholesale_unit_price', 'retail_unit_price'); }} />
          {marginsOn && (
            <div className="row" style={{ marginTop: 14, gap: 16 }}>
              <Checkbox label={t('Auto-update wholesale from last purchase')} checked={f.auto_update_wholesale} onChange={(e) => up({ auto_update_wholesale: e.target.checked })} />
              <Checkbox label={t('Auto-update retail from last purchase')} checked={f.auto_update_retail} onChange={(e) => up({ auto_update_retail: e.target.checked })} />
              {id && <>
                <Button size="sm" icon="refresh" loading={updatingFrom === 'wholesale'} onClick={() => updateFromLastPurchase('wholesale')}>{t('Update wholesale now')}</Button>
                <Button size="sm" icon="refresh" loading={updatingFrom === 'retail'} onClick={() => updateFromLastPurchase('retail')}>{t('Update retail now')}</Button>
              </>}
            </div>
          )}
          {ps?.last_purchase_code && <p className="hint" style={{ margin: '10px 0 0' }}>{t('Last purchase')}: <span className="mono">{ps.last_purchase_code}</span></p>}
        </Card>

        <Card title={t('Location & options')}>
          <div className="fgrid">
            {warehouseModule ? (
              [{ code: 'main_store', name: t('Main Store') }, ...warehouses].map((w) => (
                <Field key={w.code} label={`${t('Rack')} · ${w.code === 'main_store' ? w.name : w.code}`}>
                  {(fid) => <Input id={fid} className="mono" value={f.racks[w.code] || ''} onChange={(e) => up({ racks: { ...f.racks, [w.code]: e.target.value } })} />}
                </Field>
              ))
            ) : (
              <Field label={t('Rack')}>{(fid) => <Input id={fid} className="mono" value={f.rack} onChange={(e) => up({ rack: e.target.value })} />}</Field>
            )}
            <div className="span2" style={{ alignSelf: 'end' }}>
              <Checkbox label={t('Allow duplicates in sales, purchases etc.')} checked={f.allow_duplicates} onChange={(e) => up({ allow_duplicates: e.target.checked })} />
            </div>
            <Field label={t('Note')} className="span2">{(fid) => <Textarea id={fid} rows={2} value={f.note} onChange={(e) => up({ note: e.target.value })} />}</Field>
          </div>
        </Card>

        {id && ps && (
          <Card title={t('Current stock levels')}>
            <div className="wh" style={{ gridTemplateColumns: 'minmax(0,1fr) 100px' }}>
              <div className="h">{t('Location')}</div><div className="h r">{t('Stock')}</div>
              {stockByLocation(ps, warehouses, t('Main Store')).map((l) => (
                <div key={l.code} style={{ display: 'contents' }}><div>{l.code === 'main_store' ? l.name : `${l.code} · ${l.name}`}</div><div className="r num">{fmtNumber(l.stock, 0)}</div></div>
              ))}
            </div>
          </Card>
        )}

        <Card title={t('Stock adjustments')} sub={t('Opening stock, damages, counts — saved with the product.')}>
          <div className="inv-adj-q">
            <input className="inp num" inputMode="decimal" aria-label={t('Adjustment quantity')} placeholder={t('Enter quantity')} value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdj('adding'); } }} />
            <Button icon="plus" onClick={() => quickAdj('adding')}>{t('Add stock')}</Button>
            <Button icon="trash" onClick={() => quickAdj('removing')}>{t('Remove stock')}</Button>
          </div>
          {f.adjustments.length > 0 && (
            <div className="inv-scroll">
              <table className="inv-tbl" aria-label={t('Stock adjustments')}>
                <thead><tr><th>{t('Date')}</th><th className="r">{t('Qty')}</th><th>{t('Type')}</th>{warehouseModule && warehouses.length > 0 && <th>{t('Location')}</th>}<th>{t('Reason')}</th><th aria-label={t('Remove')} /></tr></thead>
                <tbody>
                  {f.adjustments.map((a, i) => (
                    <tr key={a.key}>
                      <td><input className={`inp${errors[`adjustment_date_${i}`] ? ' err' : ''}`} type="datetime-local" aria-label={t('Adjustment date')} value={toLocalInput(a.date_str)} onChange={(e) => setAdj(i, { date_str: e.target.value ? toRfc3339(new Date(e.target.value)) : '' })} />
                        {errors[`adjustment_date_${i}`] && <div className="errmsg">{t(errors[`adjustment_date_${i}`])}</div>}</td>
                      <td style={{ width: 110 }}><NumInput label={t('Adjustment quantity')} value={a.quantity} invalid={!!errors[`adjustment_quantity_${i}`]} onValue={(n) => setAdj(i, { quantity: n })} />
                        {errors[`adjustment_quantity_${i}`] && <div className="errmsg">{t(errors[`adjustment_quantity_${i}`])}</div>}</td>
                      <td><select className={`inp${errors[`adjustment_type_${i}`] ? ' err' : ''}`} aria-label={t('Adjustment type')} value={a.type} onChange={(e) => setAdj(i, { type: e.target.value as AdjustmentRow['type'] })}>
                        <option value="">—</option><option value="adding">{t('Add')}</option><option value="removing">{t('Remove')}</option></select>
                        {errors[`adjustment_type_${i}`] && <div className="errmsg">{t(errors[`adjustment_type_${i}`])}</div>}</td>
                      {warehouseModule && warehouses.length > 0 && (
                        <td><select className="inp" aria-label={t('Location')} value={a.warehouse_id || ''} onChange={(e) => { const w = warehouses.find((x) => x.id === e.target.value); setAdj(i, { warehouse_id: w?.id || null, warehouse_code: w?.code || null }); }}>
                          <option value="">{t('Main Store')}</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></td>
                      )}
                      <td><input className="inp" aria-label={t('Reason')} value={a.reason} onChange={(e) => setAdj(i, { reason: e.target.value })} /></td>
                      <td><IconButton icon="trash" label={`${t('Remove')} ${i + 1}`} onClick={() => up({ adjustments: f.adjustments.filter((_, j) => j !== i) })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="inv-foot"><span>{t('Added')}: <b className="num" style={{ color: 'var(--good)' }}>+{fmtNumber(adjTot.added, 0)}</b></span><span>{t('Removed')}: <b className="num" style={{ color: 'var(--crit)' }}>−{fmtNumber(adjTot.removed, 0)}</b></span></div>
        </Card>

        <Card title={t('Kit / set')} sub={t('Sell several products as one; their prices make up this product’s price.')}>
          <div className="fgrid" style={{ marginBottom: 12 }}>
            <Field label={t('Set name')} className="span2">{(fid) => <Input id={fid} value={f.set_name} onChange={(e) => up({ set_name: e.target.value })} />}</Field>
            <Field label={t('Add component')} className="span2">
              {(fid) => <AsyncPicker id={fid} value={null} resetOnPick placeholder={t('Search products…')}
                load={async (q, s) => (await searchProducts(storeId, q, s, { is_service: 0 })).filter((h) => h.id !== id).map((h) => productToOption(h, storeId, 'retail'))}
                onChange={(o: PickerOption | null) => o && up({ set_lines: addSetLine(f.set_lines, o.data, storeId, vat) })} />}
            </Field>
          </div>
          {kit && (
            <div className="inv-scroll">
              <table className="inv-tbl" aria-label={t('Kit components')}>
                <thead><tr><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Retail')}</th><th className="r">{t('Retail incl. VAT')}</th><th className="r">{t('Cost')}</th><th className="r">{t('Line')}</th><th aria-label={t('Remove')} /></tr></thead>
                <tbody>
                  {f.set_lines.map((l, i) => {
                    const setLine = (patch: Partial<typeof l>) => up({ set_lines: f.set_lines.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                    return (
                      <tr key={l.product_id}>
                        <td><b>{l.name}</b> <span className="mono muted">{l.part_number}</span></td>
                        <td style={{ width: 90 }}><NumInput label={`${t('Quantity')} ${l.name}`} value={l.quantity} invalid={!!errors[`set_product_quantity_${i}`]} onValue={(n) => { setLine({ quantity: n }); clearErr(`set_product_quantity_${i}`); }} />
                          {errors[`set_product_quantity_${i}`] && <div className="errmsg">{t(errors[`set_product_quantity_${i}`])}</div>}</td>
                        <td style={{ width: 110 }}><NumInput label={`${t('Retail')} ${l.name}`} value={l.retail_unit_price} onValue={(n) => setLine({ retail_unit_price: n, retail_unit_price_with_vat: Math.round(n * (1 + vat / 100) * 1e8) / 1e8 })} /></td>
                        <td style={{ width: 110 }}><NumInput label={`${t('Retail incl. VAT')} ${l.name}`} value={l.retail_unit_price_with_vat} onValue={(n) => setLine({ retail_unit_price_with_vat: n, retail_unit_price: Math.round((n / (1 + vat / 100)) * 1e8) / 1e8 })} /></td>
                        <td className="r num muted">{fmtMoney(l.purchase_unit_price)}</td>
                        <td className="r num">{fmtMoney(l.retail_unit_price * l.quantity)}</td>
                        <td><IconButton icon="trash" label={`${t('Remove')} ${l.name}`} onClick={() => up({ set_lines: f.set_lines.filter((_, j) => j !== i) })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="inv-foot"><span>{t('Qty')}: <b className="num">{fmtNumber(kitTot.total_quantity, 0)}</b></span><span>{t('Cost')}: <b className="num">{fmtMoney(kitTot.purchase_total)}</b></span><span>{t('Retail')}: <b className="num">{fmtMoney(kitTot.total)}</b> / <b className="num">{fmtMoney(kitTot.total_with_vat)}</b> {t('incl. VAT')}</span></div>
            </div>
          )}
        </Card>

        <Card title={t('Linked products')} sub={t('Alternatives and accessories — links are kept on both products.')}>
          <MultiPicker label={t('Linked products')} value={f.linked} onChange={(v: Opt[]) => up({ linked: v })} placeholder={t('Search products to link…')}
            load={async (q, s) => (await searchProducts(storeId, q, s)).filter((h) => h.id !== id).map((h) => productToOption(h, storeId, 'retail'))} />
        </Card>

        <Card title={t('Photos')} sub={!id ? t('Photos upload right after the product is created.') : undefined}>
          <ImageGallery images={images} queued={queued} busy={uploading} onAdd={addImages} onDelete={id ? delImage : undefined} onRemoveQueued={(i) => setQueued((x) => x.filter((_, j) => j !== i))} />
        </Card>
      </ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Retail')}</span><b className="num">{fmtMoney(eff.retail_unit_price)}</b></div>
        <Button variant="primary" icon="check" onClick={save} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
      {qf && (
        <EntityForm open={!!quick} modal onClose={() => setQuick(null)} endpoint={qf.endpoint} title={qf.title} fields={qf.fields} initial={quickInitial}
          toBody={quick?.kind === 'brand' ? upperCode : undefined}
          onSaved={(rec: any) => {
            if (!rec?.id) return;
            if (quick?.kind === 'brand') up({ brand: { id: rec.id, label: rec.name } });
            else if (quick?.kind === 'category') up({ categories: [...f.categories, { id: rec.id, label: rec.name }] });
            else if (quick?.kind === 'arabic') up({ name_in_arabic: rec.name_in_arabic });
          }} />
      )}
    </>
  );
}
