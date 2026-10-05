import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig, type ListView } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import type { FilterDef } from '@/framework/filters';
import type { Column, MobileCard } from '@/ui/DataGrid';
import type { IconName } from '@/ui/Icon';
import { fmtDate, fmtNumber } from '@/lib/format';
import { t as tt } from '@/i18n';
import { DeletedPill, Tx, loadOptions, useDeleteRestore } from './components/common';
import { countryName, countryOptions } from './lib/countries';
import { toArabicDigits } from './lib/pricing';

export const CATEGORY = '/v1/product-category';
export const BRAND = '/v1/product-brand';
export const SERVICE_CATEGORY = '/v1/service-category';
export const WAREHOUSE = '/v1/warehouse';

type Row = Record<string, any> & { id: string; deleted?: boolean };

interface MasterCfg {
  title: string;
  subtitle: string;
  icon: IconName;
  endpoint: string;
  resource: string;
  noun: string;
  formTitle: string;
  createLabel: string;
  select?: string;
  restore: boolean;
  /** No delete in the legacy app / API has no restore (warehouses). */
  noDelete?: boolean;
  searchKey: string;
  searchPlaceholder: string;
  columns: Column<Row>[];
  mobileCard: (r: Row) => MobileCard;
  fields: (storeId: string) => FieldDef[];
  filters?: FilterDef[];
  toBody?: (v: Record<string, any>) => Record<string, any>;
  /** Flatten an API record for the form. */
  toForm?: (r: Row) => Record<string, any>;
  validate?: (v: Record<string, any>) => Record<string, string>;
  exportName: string;
  exportColumns: { header: string; value: (r: Row) => string | number | null | undefined }[];
  invalidate?: string[];
}

const createdFilter: FilterDef = { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' };
const nameCell = (r: Row, sub?: string) => (
  <><b><bdi>{r.name}</bdi></b>{r.deleted ? <> <DeletedPill /></> : null}{sub ? <span>{sub}</span> : null}</>
);

export function masterListConfig(c: MasterCfg, extra: Partial<ListConfig<Row>>): ListConfig<Row> {
  const views: ListView[] | undefined = c.restore ? [{ id: 'all', label: 'Active' }, { id: 'deleted', label: 'Deleted', search: { deleted: 1 } }] : undefined;
  return {
    title: c.title, subtitle: c.subtitle, icon: c.icon, endpoint: c.endpoint, resource: c.resource, select: c.select,
    defaultSort: { key: 'created_at', dir: -1 }, searchKey: c.searchKey, searchPlaceholder: c.searchPlaceholder,
    createLabel: c.createLabel, views, filters: [...(c.filters || []), createdFilter], columns: c.columns, mobileCard: c.mobileCard,
    exportColumns: c.exportColumns, exportName: c.exportName, showFooter: false,
    ...extra,
  };
}

/** List + drawer create/edit + delete/restore for simple master data. */
export function MasterListPage({ cfg }: { cfg: MasterCfg }) {
  const storeId = useStoreId();
  const [sp, setSp] = useSearchParams();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const fields = useMemo(() => cfg.fields(storeId), [cfg, storeId]);
  const dr = useDeleteRestore<Row>({ endpoint: cfg.endpoint, resource: cfg.resource, label: (r) => r.name, canRestore: cfg.restore, noun: cfg.noun, invalidate: cfg.invalidate });

  // Shell "Create" actions land here with ?new=1.
  useEffect(() => {
    if (sp.get('new') === '1') {
      setEditing(null);
      setOpen(true);
      setSp((p) => { const n = new URLSearchParams(p); n.delete('new'); return n; }, { replace: true });
    }
  }, [sp, setSp]);

  const list = masterListConfig(cfg, {
    onCreate: () => { setEditing(null); setOpen(true); },
    onRowClick: (r) => { if (!r.deleted) { setEditing(r); setOpen(true); } },
    rowActions: dr.canDelete && !cfg.noDelete ? dr.rowActions : undefined,
  });
  const initial = useMemo(() => (editing ? (cfg.toForm ? cfg.toForm(editing) : editing) : null), [editing, cfg]);

  return (
    <>
      <ListPage config={list} />
      <EntityForm open={open} onClose={() => setOpen(false)} endpoint={cfg.endpoint} title={editing ? `${tt('Edit')} · ${editing.name}` : cfg.formTitle}
        fields={fields} initial={initial} toBody={cfg.toBody} validate={cfg.validate} invalidate={cfg.invalidate} />
      {dr.confirmEl}
    </>
  );
}

// ------------------------------------------------------------------ product categories

const parentPicker = (endpoint: string, storeId: string): FieldDef => ({
  name: 'parent_id', label: 'Parent category', type: 'picker', labelField: 'parent_name', span: 2,
  load: (q, s) => loadOptions(endpoint, storeId, q, s),
});

export const categoryCfg: MasterCfg = {
  title: 'Product categories', subtitle: 'Group products for search, reports and pricing', icon: 'tag',
  endpoint: CATEGORY, resource: 'product_category', noun: 'category', formTitle: 'New product category', createLabel: 'New category',
  select: 'id,name,parent_name,parent_id,created_by_name,created_at,deleted', restore: true,
  searchKey: 'name', searchPlaceholder: 'Search categories…',
  filters: [{ id: 'parent_name', label: 'Parent', type: 'text' }],
  columns: [
    { key: 'name', header: <Tx k="Name" />, sortKey: 'name', className: 'two', render: (r) => nameCell(r) },
    { key: 'parent', header: <Tx k="Parent" />, sortKey: 'parent_name', render: (r) => r.parent_name || <span className="muted">—</span> },
    { key: 'created_by', header: <Tx k="Created by" />, hideBelow: 'md', render: (r) => r.created_by_name || '—' },
    { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'sm', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
  ],
  mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, subtitle: r.parent_name || undefined, meta: r.deleted ? <DeletedPill /> : fmtDate(r.created_at) }),
  fields: (sid) => [{ name: 'name', label: 'Name', type: 'text', required: true, span: 2 }, parentPicker(CATEGORY, sid)],
  exportName: 'product-categories',
  exportColumns: [{ header: 'Name', value: (r) => r.name }, { header: 'Parent', value: (r) => r.parent_name }, { header: 'Created at', value: (r) => fmtDate(r.created_at) }],
  invalidate: ['/v1/product'],
};

export const serviceCategoryCfg: MasterCfg = {
  ...categoryCfg,
  title: 'Service categories', subtitle: 'Group services for search and reports', endpoint: SERVICE_CATEGORY, resource: 'service_category',
  noun: 'service category', formTitle: 'New service category', createLabel: 'New category', select: 'id,name,parent_name,parent_id,created_by_name,created_at,deleted',
  fields: (sid) => [{ name: 'name', label: 'Name', type: 'text', required: true, span: 2, placeholder: 'Service category name' }, parentPicker(SERVICE_CATEGORY, sid)],
  exportName: 'service-categories',
};

export const brandCfg: MasterCfg = {
  title: 'Brands', subtitle: 'Manufacturers and product lines', icon: 'star',
  endpoint: BRAND, resource: 'product_brand', noun: 'brand', formTitle: 'Brand details', createLabel: 'New brand',
  select: 'id,code,name,created_at,deleted', restore: true, searchKey: 'name', searchPlaceholder: 'Search brands…',
  filters: [{ id: 'code', label: 'Code', type: 'text' }],
  columns: [
    { key: 'code', header: <Tx k="Code" />, sortKey: 'code', className: 'code', render: (r) => r.code || '—' },
    { key: 'name', header: <Tx k="Name" />, sortKey: 'name', className: 'two', render: (r) => nameCell(r) },
    { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'sm', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
  ],
  mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: <span className="mono">{r.code}</span>, meta: r.deleted ? <DeletedPill /> : fmtDate(r.created_at) }),
  fields: () => [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'code', label: 'Code', type: 'text', required: true, maxLength: 20 }],
  toBody: (v) => ({ ...v, code: String(v.code || '').trim().toUpperCase() }),
  exportName: 'brands',
  exportColumns: [{ header: 'Code', value: (r) => r.code }, { header: 'Name', value: (r) => r.name }, { header: 'Created at', value: (r) => fmtDate(r.created_at) }],
  invalidate: ['/v1/product'],
};

// ------------------------------------------------------------------ warehouses

const NA = ['short_code', 'building_no', 'street_name', 'district_name', 'city_name', 'zipcode', 'additional_no', 'unit_no'] as const;
const NA_ARABIC_TEXT = ['street_name', 'district_name', 'city_name'] as const;
const NA_DIGITS = ['building_no', 'zipcode', 'additional_no', 'unit_no'] as const;

export function warehouseToBody(v: Record<string, any>): Record<string, any> {
  const na: Record<string, string> = {};
  NA.forEach((k) => { na[k] = String(v[`national_address_${k}`] || '').trim(); });
  NA_ARABIC_TEXT.forEach((k) => { na[`${k}_arabic`] = String(v[`national_address_${k}_arabic`] || '').trim(); });
  NA_DIGITS.forEach((k) => { na[`${k}_arabic`] = toArabicDigits(na[k]); });
  const out: Record<string, any> = {
    name: v.name, name_in_arabic: v.name_in_arabic, phone: v.phone, phone_in_arabic: toArabicDigits(v.phone), email: v.email,
    address: v.address, address_in_arabic: v.address_in_arabic, country_code: v.country_code || '',
    country_name: v.country_code ? countryName(v.country_code) : '', zipcode: na.zipcode, national_address: na,
  };
  return out;
}

export function warehouseToForm(r: Row): Record<string, any> {
  const f: Record<string, any> = { ...r };
  NA.forEach((k) => { f[`national_address_${k}`] = r.national_address?.[k] || ''; });
  NA_ARABIC_TEXT.forEach((k) => { f[`national_address_${k}_arabic`] = r.national_address?.[`${k}_arabic`] || ''; });
  return f;
}

export function validateWarehouse(v: Record<string, any>): Record<string, string> {
  const e: Record<string, string> = {};
  const phone = String(v.phone || '').trim();
  if (phone && !/^(?:\+966|0)5\d{8}$/.test(phone)) e.phone = tt('Invalid phone no.');
  const email = String(v.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = tt('Invalid email');
  const b = String(v.national_address_building_no || '').trim();
  if (b && !/^\d{4}$/.test(b)) e.national_address_building_no = tt('Building number must be 4 digits');
  const z = String(v.national_address_zipcode || '').trim();
  if (z && !/^\d{5}$/.test(z)) e.national_address_zipcode = tt('Zip code must be 5 digits');
  return e;
}

export const warehouseCfg: MasterCfg = {
  title: 'Warehouses', subtitle: 'Stock locations besides the main store', icon: 'wh',
  endpoint: WAREHOUSE, resource: 'warehouses', noun: 'warehouse', formTitle: 'New warehouse', createLabel: 'New warehouse',
  restore: false, noDelete: true, searchKey: 'name', searchPlaceholder: 'Search warehouses…',
  filters: [{ id: 'code', label: 'Code', type: 'text' }],
  columns: [
    { key: 'code', header: <Tx k="Code" />, sortKey: 'code', className: 'code', render: (r) => r.code },
    { key: 'name', header: <Tx k="Name" />, sortKey: 'name', className: 'two', render: (r) => nameCell(r, r.name_in_arabic) },
    { key: 'phone', header: <Tx k="Phone" />, hideBelow: 'md', render: (r) => <span className="num">{r.phone || '—'}</span> },
    { key: 'city', header: <Tx k="City" />, hideBelow: 'lg', render: (r) => r.national_address?.city_name || '—' },
    { key: 'sent', header: <Tx k="Transfers out" />, align: 'end', hideBelow: 'md', render: (r) => <span className="num">{r.stock_transfer_sent_count || 0} · {fmtNumber(r.stock_transfer_sent_quantity || 0, 0)}</span> },
    { key: 'received', header: <Tx k="Transfers in" />, align: 'end', hideBelow: 'md', render: (r) => <span className="num">{r.stock_transfer_received_count || 0} · {fmtNumber(r.stock_transfer_received_quantity || 0, 0)}</span> },
    { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'lg', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
  ],
  mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, amount: <span className="mono">{r.code}</span>, subtitle: r.national_address?.city_name || r.phone || undefined }),
  fields: () => [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'name_in_arabic', label: 'Name in Arabic', type: 'text', dir: 'rtl' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '05XXXXXXXX / +9665XXXXXXXX' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'country_code', label: 'Country', type: 'select', options: countryOptions(), placeholder: '—' },
    { name: 'national_address_short_code', label: 'Short code', type: 'text', maxLength: 8 },
    { name: 'national_address_building_no', label: 'Building no.', type: 'text', maxLength: 4, hint: '4 digits' },
    { name: 'national_address_street_name', label: 'Street', type: 'text' },
    { name: 'national_address_street_name_arabic', label: 'Street (Arabic)', type: 'text', dir: 'rtl' },
    { name: 'national_address_district_name', label: 'District', type: 'text' },
    { name: 'national_address_district_name_arabic', label: 'District (Arabic)', type: 'text', dir: 'rtl' },
    { name: 'national_address_city_name', label: 'City', type: 'text' },
    { name: 'national_address_city_name_arabic', label: 'City (Arabic)', type: 'text', dir: 'rtl' },
    { name: 'national_address_zipcode', label: 'Zip code', type: 'text', maxLength: 5, hint: '5 digits' },
    { name: 'national_address_additional_no', label: 'Additional no.', type: 'text', maxLength: 4 },
    { name: 'national_address_unit_no', label: 'Unit no.', type: 'text', maxLength: 6 },
  ],
  toBody: warehouseToBody,
  toForm: warehouseToForm,
  validate: validateWarehouse,
  exportName: 'warehouses',
  exportColumns: [
    { header: 'Code', value: (r) => r.code }, { header: 'Name', value: (r) => r.name }, { header: 'Name in Arabic', value: (r) => r.name_in_arabic },
    { header: 'Phone', value: (r) => r.phone }, { header: 'City', value: (r) => r.national_address?.city_name },
  ],
};

export const CategoryListPage = () => <MasterListPage cfg={categoryCfg} />;
export const ServiceCategoryListPage = () => <MasterListPage cfg={serviceCategoryCfg} />;
export const BrandListPage = () => <MasterListPage cfg={brandCfg} />;
export const WarehouseListPage = () => <MasterListPage cfg={warehouseCfg} />;
