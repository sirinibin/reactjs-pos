import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import type { FilterDef } from '@/framework/filters';
import { normalizeProductQuery } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { VBars } from '@/ui/charts/Charts';
import { Banner, EmptyState, ErrorState, Skeleton, Tabs, useConfirm } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel } from '@/ui/ObjectPage';
import { Pill, Tag } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { gates } from '@/shell/nav';
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtPercent, toApiDate } from '@/lib/format';
import { DeletedPill, Tx, loadOptions, useDeleteRestore, useWarehouses } from './components/common';
import { HISTORY, Movements, movementLink, signedQty, typeInfo, type MovementRow } from './components/Movements';
import { BarcodeCard, ImageGallery, deleteProductImage, uploadProductImage } from './components/ProductParts';
import { CATEGORY, BRAND } from './masters';
import { cleanEan, isKit, monthlyUnits, partLabel, reorderAdvice, soldInLast, stockByLocation, unitProfit } from './lib/pricing';
import { locationName } from './lib/transfer';

export const PRODUCT = '/v1/product';
const LIST = '/stock/products';

export type Product = Record<string, any> & { id: string; name: string };

const storeOf = (p: Product, sid: string) => (p.product_stores?.[sid] || {}) as Record<string, any>;

const LIST_SELECT = 'id,is_set,set.products,deleted,deleted_at,prefix_part_number,brand_name,country_name,item_code,ean_12,bar_code,part_number,name,name_in_arabic,category_name,category_id,created_by_name,created_at,rack,unit,images,product_stores';

/** Keyboard shortcuts on a focused product row (legacy index.js:1336, default store map). */
export const ROW_SHORTCUTS: Record<string, { tab: string; type?: string }> = {
  Digit1: { tab: 'movements', type: 'quotation_invoice' }, KeyP: { tab: 'movements', type: 'quotation_invoice' },
  Digit2: { tab: 'movements' }, KeyB: { tab: 'movements' },
  Digit3: { tab: 'movements', type: 'sales' }, Digit4: { tab: 'movements', type: 'sales_return' },
  Digit5: { tab: 'movements', type: 'purchase' }, Digit6: { tab: 'movements', type: 'purchase_return' },
  Digit7: { tab: 'movements', type: 'delivery_note' }, Digit8: { tab: 'movements', type: 'quotation' },
  Digit9: { tab: 'linked' }, Digit0: { tab: 'movements', type: 'quotation_sales_return' }, KeyZ: { tab: 'movements', type: 'quotation_sales_return' },
  KeyF: { tab: 'photos' },
};

export function productListConfig(o: { storeId: string; warehouseCode?: string; warehouses: { code: string; name: string }[]; isService?: boolean }): ListConfig<Product> {
  const sid = o.storeId;
  const wc = o.warehouseCode;
  const ps = (r: Product) => storeOf(r, sid);
  const stockOf = (r: Product) => (wc ? ps(r).warehouse_stocks?.[wc] ?? 0 : ps(r).stock ?? 0);
  const stockSort = wc ? `stores.warehouse_stocks.${wc}` : 'stores.stock';
  const metric = (m: string) => (wc ? `stores.product_warehouses.${wc}.${m}` : `stores.${m}`);
  const rackOf = (r: Product) => ps(r).warehouse_racks?.[wc || 'main_store'] || r.rack || '';
  const filters: FilterDef[] = [
    ...(o.warehouses.length ? [{ id: 'warehouse', label: 'Location', type: 'select' as const, options: [{ value: 'main_store', label: 'Main Store' }, ...o.warehouses.map((w) => ({ value: w.code, label: `${w.code} · ${w.name}` }))], toSearch: (v: string) => ({ warehouse_code: v }) }] : []),
    { id: 'category', label: 'Category', type: 'picker', load: async () => [], toSearch: (v) => ({ category_id: v }) },
    { id: 'brand', label: 'Brand', type: 'picker', load: async () => [], toSearch: (v) => ({ brand_id: v }) },
    { id: 'stock', label: 'Stock', type: 'number', placeholder: 'e.g. <=5' },
    { id: 'retail_unit_price', label: 'Retail price', type: 'number', placeholder: 'e.g. >=100' },
    { id: 'part_number', label: 'Part #', type: 'text' },
    { id: 'country_name', label: 'Country', type: 'text' },
    { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
  ];
  return {
    title: 'Products',
    subtitle: wc ? `${locationName(wc, o.warehouses as any)}` : 'Catalog, prices and stock for the active store',
    icon: 'box',
    endpoint: PRODUCT,
    resource: 'products',
    select: LIST_SELECT,
    baseSearch: { is_service: 0 },
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => ({ search_text: normalizeProductQuery(q) }),
    searchPlaceholder: 'Search name, part #, brand, barcode…',
    createPath: `${LIST}/new`,
    createLabel: 'New product',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All products' },
      { id: 'out', label: 'Out of stock', search: { stock: '<=0' } },
      // BE stores is_set inverted (true when there are no components) — 0 lists real kits.
      { id: 'kits', label: 'Kits & sets', search: { is_set: 0 } },
      { id: 'deleted', label: 'Deleted', search: { deleted: 1 } },
    ],
    filters,
    summary: (m) => [
      { label: 'Units in stock', value: fmtNumber(m.stock, 0) },
      { label: 'Stock value (cost)', value: fmtMoney(m.purchase_stock_value) },
      { label: 'Stock value (retail)', value: fmtMoney(m.retail_stock_value) },
      { label: 'Stock value (wholesale)', value: fmtMoney(m.wholesale_stock_value) },
      { label: 'Sales', value: fmtMoney(m.sales) },
      { label: 'Sales profit', value: fmtMoney(m.sales_profit), tone: 'good' },
      { label: 'Sales returns', value: fmtMoney(m.sales_return) },
    ],
    columns: [
      { key: 'part', header: <Tx k="Part #" />, sortKey: 'part_number', className: 'code', render: (r) => partLabel(r) || '—' },
      { key: 'name', header: <Tx k="Name" />, sortKey: 'name', className: 'two', render: (r) => <><b><bdi>{r.name}</bdi>{isKit(r) && <> <Tag><Tx k="Kit" /></Tag></>}{r.deleted && <> <DeletedPill /></>}</b>{r.name_in_arabic ? <span dir="rtl">{r.name_in_arabic}</span> : null}</> },
      { key: 'barcode', header: <Tx k="Barcode" />, hideBelow: 'lg', render: (r) => <span className="num muted">{cleanEan(r.ean_12) || r.bar_code || '—'}</span> },
      { key: 'category', header: <Tx k="Category" />, hideBelow: 'lg', render: (r) => (r.category_name || []).join(', ') || '—' },
      { key: 'brand', header: <Tx k="Brand" />, sortKey: 'brand_name', hideBelow: 'md', render: (r) => r.brand_name || '—' },
      { key: 'stock', header: <Tx k={wc ? 'Stock here' : 'Stock'} />, sortKey: stockSort, align: 'end', render: (r) => { const s = stockOf(r); return <b className="num" style={s <= 0 ? { color: 'var(--crit)' } : undefined}>{fmtNumber(s, Number.isInteger(s) ? 0 : 2)}</b>; } },
      { key: 'purchase', header: <Tx k="Cost" />, sortKey: 'stores.purchase_unit_price', align: 'end', hideBelow: 'md', render: (r) => <span className="num muted">{fmtMoney(ps(r).purchase_unit_price)}</span> },
      { key: 'wholesale', header: <Tx k="Wholesale" />, sortKey: 'stores.wholesale_unit_price', align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(ps(r).wholesale_unit_price)}</span> },
      { key: 'retail', header: <Tx k="Retail" />, sortKey: 'stores.retail_unit_price', align: 'end', render: (r) => <span className="num">{fmtMoney(ps(r).retail_unit_price)}</span> },
      { key: 'sales_qty', header: <Tx k="Sold" />, sortKey: metric('sales_quantity'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtNumber((wc ? ps(r).product_warehouses?.[wc]?.sales_quantity : ps(r).sales_quantity) || 0, 0)}</span> },
      { key: 'sales', header: <Tx k="Sales" />, sortKey: metric('sales'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney((wc ? ps(r).product_warehouses?.[wc]?.sales : ps(r).sales) || 0)}</span> },
      { key: 'profit', header: <Tx k="Profit" />, sortKey: metric('sales_profit'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num" style={{ color: 'var(--good)' }}>{fmtMoney((wc ? ps(r).product_warehouses?.[wc]?.sales_profit : ps(r).sales_profit) || 0)}</span> },
      { key: 'country', header: <Tx k="Country" />, sortKey: 'country_name', hideBelow: 'xl', render: (r) => r.country_name || '—' },
      { key: 'rack', header: <Tx k="Rack" />, hideBelow: 'lg', render: (r) => <span className="mono">{rackOf(r) || '—'}</span> },
      { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({
      title: <bdi>{r.name}</bdi>,
      amount: fmtMoney(ps(r).retail_unit_price),
      subtitle: <span className="mono">{partLabel(r) || cleanEan(r.ean_12)}</span>,
      meta: <><Tx k="Stock" />: <b className="num">{fmtNumber(stockOf(r), 0)}</b>{r.deleted && <> <DeletedPill /></>}</>,
    }),
    exportColumns: [
      { header: 'Name', value: (r) => r.name },
      { header: 'Name (Arabic)', value: (r) => r.name_in_arabic },
      { header: 'Part Number', value: (r) => partLabel(r) },
      { header: 'Barcode', value: (r) => cleanEan(r.ean_12) },
      { header: 'Category', value: (r) => (r.category_name || []).join(', ') },
      { header: 'Brand', value: (r) => r.brand_name },
      { header: 'Country', value: (r) => r.country_name },
      { header: 'Rack', value: (r) => rackOf(r) },
      { header: 'Unit', value: (r) => r.unit },
      { header: 'Purchase Price', value: (r) => ps(r).purchase_unit_price ?? 0 },
      { header: 'Wholesale Price', value: (r) => ps(r).wholesale_unit_price ?? 0 },
      { header: 'Retail Price', value: (r) => ps(r).retail_unit_price ?? 0 },
      { header: 'Stock', value: (r) => stockOf(r) },
      { header: 'Created At', value: (r) => fmtDate(r.created_at) },
    ],
    exportName: 'products',
    showFooter: false,
  };
}

export function ProductListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { isAdmin } = useAuth();
  const [sp] = useSearchParams();
  const warehouses = useWarehouses();
  const [confirmEl, ask] = useConfirm();
  const [migrating, setMigrating] = useState(false);
  const dr = useDeleteRestore<Product>({ endpoint: PRODUCT, resource: 'products', label: (r) => r.name, canRestore: true, noun: 'product' });
  const wcRaw = sp.get('f.warehouse') || undefined;
  const cfg = productListConfig({ storeId, warehouses, warehouseCode: wcRaw === 'main_store' ? 'main_store' : wcRaw });
  cfg.filters = cfg.filters!.map((f) => {
    if (f.type !== 'picker') return f;
    if (f.id === 'category') return { ...f, load: (q: string, s: AbortSignal) => loadOptions(CATEGORY, storeId, q, s) };
    if (f.id === 'brand') return { ...f, load: (q: string, s: AbortSignal) => loadOptions(BRAND, storeId, q, s) };
    return f;
  });
  // data-pid lets row keyboard shortcuts find the focused product.
  cfg.rowActions = (r) => <span data-pid={r.id} style={{ display: 'inline-flex' }}>{dr.rowActions(r)}</span>;

  const migrate = async () => {
    if (!(await ask(t('Copy legacy racks to Main Store?'), { body: t('Each product’s old rack value is copied into its Main Store rack location.'), confirmLabel: t('Migrate') }))) return;
    setMigrating(true);
    try {
      const r = await api.post<any>(`${PRODUCT}/migrate-rack`, {}, { search: { store_id: storeId } });
      toast.success(t('{{n}} products updated', { n: r.result?.count ?? (r as any).count ?? 0 }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setMigrating(false);
    }
  };
  if (isAdmin && warehouses.length) cfg.headerActions = <Button className="hide-sm" icon="layers" loading={migrating} onClick={migrate}>{t('Migrate racks')}</Button>;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const sc = ROW_SHORTCUTS[e.code];
      const tr = (document.activeElement as HTMLElement | null)?.closest('tr');
      const pid = tr?.querySelector('[data-pid]')?.getAttribute('data-pid');
      if (!sc || !pid) return;
      e.preventDefault();
      nav(`${LIST}/${pid}?tab=${sc.tab}${sc.type ? `&type=${sc.type}` : ''}`);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [nav]);

  return <><ListPage config={cfg} />{dr.confirmEl}{confirmEl}</>;
}

// ------------------------------------------------------------------------------------ view

const ANALYTICS_SELECT = 'id,date,reference_type,reference_id,reference_code,quantity,customer_name,vendor_name,warehouse_code,from_warehouse_code,to_warehouse_code';

/** Last 12 months of movements for the chart, demand and recent-activity feed. */
function useMovementsYear(productId: string | undefined) {
  const storeId = useStoreId();
  return useQuery({
    queryKey: [HISTORY, 'year', productId, storeId],
    queryFn: async ({ signal }) => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const r = await api.get<MovementRow[]>(`${HISTORY}/${productId}`, { search: { store_id: storeId, product_id: productId, from_date: toApiDate(from) }, limit: 1000, sort: '-date', select: ANALYTICS_SELECT }, signal);
      return r.result || [];
    },
    enabled: !!productId && !!storeId,
  });
}

const FEED_ICON = (type: string) => typeInfo(type)?.icon || 'layers';

export function ProductViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can, store } = useAuth();
  const [sp, setSp] = useSearchParams();
  const warehouses = useWarehouses();
  const q = useRecord<Product>(PRODUCT, id);
  const mv = useMovementsYear(id);
  const bi = useQuery({
    queryKey: [PRODUCT, 'bi', id, storeId],
    queryFn: async ({ signal }) => (await api.get<any>(`${PRODUCT}/${id}/bi-history`, { search: { store_id: storeId } }, signal)).result || {},
    enabled: !!id && !!storeId && sp.get('tab') === 'insights',
  });
  const [uploading, setUploading] = useState(false);
  const dr = useDeleteRestore<Product>({ endpoint: PRODUCT, resource: 'products', label: (r) => r.name, canRestore: true, noun: 'product', invalidate: [PRODUCT] });
  const tab = sp.get('tab') || 'overview';
  const setTab = (v: string) => setSp((p) => { const n = new URLSearchParams(p); n.set('tab', v); n.delete('type'); return n; }, { replace: true });
  usePageMeta(q.data?.name || t('Product'), 'box');

  const p = q.data;
  const ps = p ? storeOf(p, storeId) : {};
  const rows = useMemo(() => mv.data || [], [mv.data]);
  const advice = useMemo(() => reorderAdvice(ps.stock ?? 0, rows), [ps.stock, rows]);
  const months = useMemo(() => monthlyUnits(rows, 12), [rows]);
  const sold30 = useMemo(() => soldInLast(rows, 30), [rows]);
  const lastVendor = rows.find((r) => r.reference_type === 'purchase' && r.vendor_name)?.vendor_name;

  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!p) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={140} /><Skeleton height={240} /></div>;

  const unit = p.unit || t('pcs');
  const kit = isKit(p);
  const locs = stockByLocation(ps, warehouses, t('Main Store'));
  const totalStock = ps.stock ?? 0;
  const retailProfit = unitProfit(ps.retail_unit_price, ps.purchase_unit_price);
  const wholesaleProfit = unitProfit(ps.wholesale_unit_price, ps.purchase_unit_price);
  const images: string[] = p.images || [];
  const canEdit = can('products', 'update');
  const poPath = store?.settings && gates.purchaseOrders(store.settings) ? '/buying/orders/new' : '/buying/purchases/new';

  const addImages = async (files: File[]) => {
    setUploading(true);
    try {
      for (const f of files) await uploadProductImage(p.id, storeId, f);
      toast.success(t('Photos uploaded'));
      qc.invalidateQueries({ queryKey: [PRODUCT] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const delImage = async (url: string) => {
    try {
      await deleteProductImage(p.id, storeId, url);
      toast.success(t('Photo deleted'));
      qc.invalidateQueries({ queryKey: [PRODUCT] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const tabs = [
    { id: 'overview', label: t('Overview') },
    { id: 'movements', label: t('Stock movements') },
    { id: 'prices', label: t('Prices') },
    { id: 'kit', label: t('Kit components'), count: p.set?.products?.length || 0, hidden: !kit },
    { id: 'linked', label: t('Linked products'), count: p.linked_products?.length || 0 },
    { id: 'photos', label: t('Photos'), count: images.length },
    { id: 'insights', label: t('Insights') },
  ];

  const statusPill = p.deleted ? <DeletedPill />
    : advice.out ? <Pill tone="crit" icon="alert">{t('Out of stock')}</Pill>
      : advice.low ? <Pill tone="warn" icon="alert">{t('Low stock')}</Pill> : null;

  const subtitle = (
    <>
      {partLabel(p) && <span className="mono">{partLabel(p)}</span>}
      {(p.category_name || []).length > 0 && <> · {(p.category_name || []).join(', ')}</>}
      {p.brand_name && <> · <bdi>{p.brand_name}</bdi></>}
      {cleanEan(p.ean_12) && <> · {t('Barcode')} <span className="num">{cleanEan(p.ean_12)}</span></>}
    </>
  );

  const actions = (
    <>
      {!p.deleted && can('purchases', 'create') && (
        <Button variant={advice.low ? 'primary' : 'default'} icon="cart" onClick={() => nav(`${poPath}?product_id=${p.id}${advice.suggest ? `&quantity=${advice.suggest}` : ''}`)}>{t(poPath.includes('orders') ? 'Create purchase order' : 'Create purchase')}</Button>
      )}
      {!p.deleted && warehouses.length > 0 && can('stock_transfers', 'create') && <Button className="hide-sm" icon="swap" onClick={() => nav(`/stock/transfers/new?product_id=${p.id}`)}>{t('Transfer')}</Button>}
      {!p.deleted && canEdit && <Button variant={advice.low ? 'default' : 'primary'} icon="edit" onClick={() => nav(`${LIST}/${p.id}/edit`)}>{t('Edit')}</Button>}
      {dr.canDelete && (p.deleted
        ? <Button icon="undo" onClick={() => dr.restore(p)}>{t('Restore')}</Button>
        : <Button variant="ghost" className="hide-sm" icon="trash" onClick={() => dr.remove(p)}>{t('Delete')}</Button>)}
    </>
  );

  const facets = [
    { label: t('On hand'), value: <>{fmtNumber(totalStock, Number.isInteger(totalStock) ? 0 : 2)} <small>{unit}</small></>, tone: advice.out ? 'crit' as const : advice.low ? 'warn' as const : undefined },
    { label: t('Days of cover'), value: Number.isFinite(advice.daysLeft) ? advice.daysLeft : '—' },
    { label: t('Selling price'), value: <>{fmtMoney(ps.retail_unit_price)} <small>SAR</small></> },
    { label: t('Cost'), value: <>{fmtMoney(ps.purchase_unit_price)} <small>SAR</small></> },
    { label: t('Sold (30d)'), value: fmtNumber(sold30, 0), hideOnMobile: true },
  ];

  const overview = (
    <>
      <Card bodyClass="card-b">
        <div className="prod-hero">
          <div className="prod-img">{images[0] ? <img src={images[0]} alt={p.name} /> : <Icon name="box" />}</div>
          <div style={{ minWidth: 0 }}>
            {!p.deleted && advice.low && (
              <div style={{ marginBottom: 14 }}>
                <Banner tone={advice.out ? 'crit' : 'warn'}>
                  <b>{advice.out ? t('Out of stock.') : t('{{n}} left — about {{d}} days of stock.', { n: fmtNumber(totalStock, 0), d: advice.daysLeft })}</b>{' '}
                  {lastVendor ? t('Suggested order: {{q}} {{u}} from {{v}}.', { q: advice.suggest, u: unit, v: lastVendor }) : t('Suggested order: {{q}} {{u}}.', { q: advice.suggest, u: unit })}
                </Banner>
              </div>
            )}
            <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{t('Units sold per month')}</h4>
            {mv.isLoading ? <Skeleton height={130} /> : <VBars height={130} data={months.map((m) => ({ label: m.label, value: m.value, title: `${m.key}: ${m.value} ${unit}` }))} format={(n) => (n ? String(n) : '')} />}
          </div>
        </div>
      </Card>
      <Card title={t('Stock by location')}>
        <div className="wh" role="table" aria-label={t('Stock by location')}>
          <div className="h" role="columnheader">{t('Location')}</div><div className="h r" role="columnheader">{t('On hand')}</div><div className="h r" role="columnheader">{t('Rack')}</div><div className="h r" role="columnheader">{t('Sold')}</div>
          {locs.map((l) => {
            const share = totalStock > 0 ? Math.max(0, Math.min(100, (l.stock / totalStock) * 100)) : 0;
            return (
              <div key={l.code} style={{ display: 'contents' }} role="row">
                <div className="nm" role="cell">{l.code === 'main_store' ? l.name : <><span className="mono">{l.code}</span> · <bdi>{l.name}</bdi></>}<div className="stockbar"><div style={{ width: `${share}%`, background: l.stock <= 0 ? 'var(--warn)' : undefined }} /></div></div>
                <div className="r num" role="cell" style={l.stock <= 0 ? { color: 'var(--warn)', fontWeight: 650 } : undefined}>{fmtNumber(l.stock, 0)}</div>
                <div className="r mono muted" role="cell">{ps.warehouse_racks?.[l.code] || (l.code === 'main_store' ? p.rack : '') || '—'}</div>
                <div className="r num muted" role="cell">{fmtNumber(ps.product_warehouses?.[l.code]?.sales_quantity || 0, 0)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid-2c">
        <Card title={t('Details')}>
          <KeyValues items={[
            { k: t('Name in Arabic'), v: p.name_in_arabic ? <span dir="rtl">{p.name_in_arabic}</span> : '—' },
            { k: t('Part #'), v: <span className="mono">{partLabel(p) || '—'}</span> },
            { k: t('Item code'), v: p.item_code || '—' },
            { k: t('EAN-12'), v: <span className="num">{cleanEan(p.ean_12) || '—'}</span> },
            ...(p.bar_code ? [{ k: t('Old barcode'), v: <span className="num">{p.bar_code}</span> }] : []),
            { k: t('Unit'), v: p.unit || t('Piece') },
            { k: t('Brand'), v: p.brand_name || '—' },
            { k: t('Country'), v: p.country_name || '—' },
            { k: t('Store code'), v: p.store_code || store?.code || '—' },
            { k: t('Duplicates allowed'), v: p.allow_duplicates ? t('Yes') : t('No') },
          ]} />
          {p.note && <p className="muted" style={{ whiteSpace: 'pre-wrap', margin: '12px 0 0' }}>{p.note}</p>}
        </Card>
        <Card title={t('Barcode label')}><BarcodeCard dataUrl={p.barcode_base64} name={p.name} code={cleanEan(p.ean_12)} /></Card>
      </div>
    </>
  );

  const prices = (
    <>
      <Card title={t('Unit prices')} sub={store?.name}>
        <div className="inv-scroll">
          <table className="inv-tbl">
            <thead><tr><th>{t('Tier')}</th><th className="r">{t('Excl. VAT')}</th><th className="r">{t('Incl. VAT')}</th><th className="r">{t('Profit')}</th><th className="r">{t('Margin')}</th><th>{t('Auto-update')}</th></tr></thead>
            <tbody>
              <tr><td>{t('Purchase')}</td><td className="r num">{fmtMoney(ps.purchase_unit_price)}</td><td className="r num">{fmtMoney(ps.purchase_unit_price_with_vat)}</td><td className="r">—</td><td className="r">—</td><td>—</td></tr>
              <tr><td>{t('Wholesale')}</td><td className="r num">{fmtMoney(ps.wholesale_unit_price)}</td><td className="r num">{fmtMoney(ps.wholesale_unit_price_with_vat)}</td><td className="r num">{fmtMoney(wholesaleProfit.profit)}</td><td className="r num">{fmtPercent(wholesaleProfit.percent, 2)}</td><td>{ps.auto_update_wholesale_price_from_last_purchase ? `${t('Yes')} · ${fmtPercent(ps.wholesale_margin_percent, 2)}` : t('No')}</td></tr>
              <tr><td>{t('Retail')}</td><td className="r num">{fmtMoney(ps.retail_unit_price)}</td><td className="r num">{fmtMoney(ps.retail_unit_price_with_vat)}</td><td className="r num">{fmtMoney(retailProfit.profit)}</td><td className="r num">{fmtPercent(retailProfit.percent, 2)}</td><td>{ps.auto_update_retail_price_from_last_purchase ? `${t('Yes')} · ${fmtPercent(ps.retail_margin_percent, 2)}` : t('No')}</td></tr>
            </tbody>
          </table>
        </div>
        {ps.last_purchase_code && <p className="muted" style={{ margin: '12px 0 0' }}>{t('Last purchase')}: <Link className="link mono" to={`/buying/purchases/${ps.last_purchase_id}`}>{ps.last_purchase_code}</Link>{ps.last_purchase_price_updated_at && <> · {fmtDateTime(ps.last_purchase_price_updated_at)}</>}</p>}
      </Card>
      <Card title={t('Stock adjustments')} bodyClass="card-b-tight">
        {(ps.stock_adjustments || []).length === 0 ? <EmptyState icon="layers" title={t('No adjustments')}>{t('Add or remove stock from the edit screen.')}</EmptyState> : (
          <div className="inv-scroll">
            <table className="inv-tbl">
              <thead><tr><th>{t('Date')}</th><th>{t('Type')}</th><th className="r">{t('Qty')}</th>{warehouses.length > 0 && <th>{t('Location')}</th>}<th>{t('Reason')}</th></tr></thead>
              <tbody>{(ps.stock_adjustments || []).map((a: any, i: number) => (
                <tr key={i}><td className="num">{fmtDateTime(a.date)}</td><td>{a.type === 'adding' ? t('Added') : t('Removed')}</td><td className="r num">{a.type === 'adding' ? '+' : '−'}{fmtNumber(a.quantity, 0)}</td>{warehouses.length > 0 && <td>{locationName(a.warehouse_code, warehouses, t('Main Store'))}</td>}<td>{a.reason || '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );

  const kitTab = (
    <Card title={<>{t('Kit components')}{p.set?.name ? <> · <bdi>{p.set.name}</bdi></> : null}</>} bodyClass="card-b-tight">
      <div className="inv-scroll">
        <table className="inv-tbl">
          <thead><tr><th>#</th><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Retail')}</th><th className="r">{t('Cost')}</th><th className="r">{t('Share')}</th></tr></thead>
          <tbody>
            {(p.set?.products || []).map((l: any, i: number) => (
              <tr key={i}><td className="muted">{i + 1}</td><td><Link className="link" to={`${LIST}/${l.product_id}`}>{l.name}</Link> <span className="mono muted">{l.part_number}</span></td><td className="r num">{l.quantity} {l.unit}</td><td className="r num">{fmtMoney(l.retail_unit_price)}</td><td className="r num">{fmtMoney(l.purchase_unit_price)}</td><td className="r num">{fmtPercent(l.retail_price_percent, 1)}</td></tr>
            ))}
            <tr><td /><td><b>{t('Total')}</b></td><td className="r num">{fmtNumber(p.set?.total_quantity || 0, 0)}</td><td className="r num"><b>{fmtMoney(p.set?.total)}</b></td><td className="r num">{fmtMoney(p.set?.purchase_total)}</td><td /></tr>
          </tbody>
        </table>
      </div>
    </Card>
  );

  const linked = (
    <Card title={t('Linked products')} actions={canEdit && !p.deleted ? <Button size="sm" icon="plus" onClick={() => nav(`${LIST}/new?link_to=${p.id}`)}>{t('New linked product')}</Button> : undefined} bodyClass="card-b-tight">
      {(p.linked_products || []).length === 0 ? <EmptyState icon="layers" title={t('No linked products')}>{t('Link alternatives or accessories from the edit screen.')}</EmptyState> : (
        <div className="inv-scroll">
          <table className="inv-tbl">
            <thead><tr><th>{t('Part #')}</th><th>{t('Name')}</th><th>{t('Brand')}</th><th className="r">{t('Stock')}</th><th className="r">{t('Retail')}</th></tr></thead>
            <tbody>{(p.linked_products || []).map((l: Product) => {
              const lps = storeOf(l, storeId);
              return <tr key={l.id}><td className="mono">{partLabel(l) || '—'}</td><td><Link className="link" to={`${LIST}/${l.id}`}><bdi>{l.name}</bdi></Link></td><td>{l.brand_name || '—'}</td><td className="r num">{fmtNumber(lps.stock || 0, 0)}</td><td className="r num">{fmtMoney(lps.retail_unit_price)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const biData = bi.data || {};
  const insights = (
    <>
      <Card title={t('Demand profile')}>
        <KeyValues items={[
          { k: t('Velocity trend'), v: p.sales_velocity_trend || '—' },
          { k: t('Reason'), v: p.sales_velocity_trend_reason || '—' },
          { k: t('Slope / month'), v: fmtPercent(p.slop_percent_per_month || 0, 1) },
          { k: t('Momentum / 3 months'), v: fmtPercent(p.momentum_percent_per_3month || 0, 1) },
          { k: t('Avg. monthly qty'), v: fmtNumber(p.avg_monthly_qty || 0, 1) },
          { k: t('Last 3 months qty'), v: fmtNumber(p.recent_3month_qty || 0, 0) },
          { k: t('ABC / XYZ tier'), v: `${p.abc_tier || '—'} / ${p.xyz_tier || '—'}` },
          { k: t('Class'), v: p.class ? `${p.class}${p.class_reason ? ` · ${p.class_reason}` : ''}` : '—' },
          { k: t('Stocking strategy'), v: p.stocking_strategy || '—' },
          { k: t('Revenue'), v: fmtMoney(p.revenue || 0) },
        ]} />
      </Card>
      <Card title={t('History')} bodyClass="card-b-tight">
        {bi.isLoading ? <Skeleton height={80} /> : (biData.velocity_history || []).length === 0 ? <EmptyState icon="chart" title={t('No history yet')} /> : (
          <div className="inv-scroll">
            <table className="inv-tbl">
              <thead><tr><th>{t('Month')}</th><th>{t('Velocity trend')}</th><th className="r">{t('Avg. monthly qty')}</th><th className="r">{t('Revenue')}</th></tr></thead>
              <tbody>{(biData.velocity_history || []).map((h: any) => <tr key={h.id}><td className="num">{fmtDate(h.date)}</td><td>{h.sales_velocity_trend}</td><td className="r num">{fmtNumber(h.avg_monthly_qty, 1)}</td><td className="r num">{fmtMoney(h.revenue)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );

  const side = (
    <SidePanel sections={[
      { title: t('Pricing'), body: <KeyValues items={[
        { k: t('Retail'), v: <span className="num">{fmtMoney(ps.retail_unit_price)}</span> },
        { k: t('Retail incl. VAT'), v: <span className="num">{fmtMoney(ps.retail_unit_price_with_vat)}</span> },
        { k: t('Wholesale'), v: <span className="num">{fmtMoney(ps.wholesale_unit_price)}</span> },
        { k: t('Cost'), v: <span className="num">{fmtMoney(ps.purchase_unit_price)}</span> },
        { k: t('Margin'), v: <span className="num" style={{ color: retailProfit.profit < 0 ? 'var(--crit)' : 'var(--good)' }}>{fmtPercent(retailProfit.percent, 1)}</span> },
      ]} /> },
      { title: t('Recent movements'), body: mv.isLoading ? <Skeleton height={60} /> : rows.length === 0 ? <div className="muted">{t('No movements yet.')}</div> : (
        <ul className="feed">
          {rows.slice(0, 5).map((r) => {
            const ti = typeInfo(r.reference_type);
            const to = movementLink(r);
            return (
              <li key={r.id}>
                <span className={`dot${ti && ti.sign > 0 ? ' g' : ''}`}><Icon name={FEED_ICON(r.reference_type)} size="xs" /></span>
                <div><b className="num">{signedQty(r)}</b> · {to ? <Link className="link mono" to={to}>{r.reference_code}</Link> : <span>{t(ti?.label || r.reference_type)}</span>}
                  <div className="m">{fmtDate(r.date)} · {r.reference_type === 'stock_transfer' ? `${locationName(r.from_warehouse_code, warehouses, t('Main Store'))} → ${locationName(r.to_warehouse_code, warehouses, t('Main Store'))}` : <bdi>{r.customer_name || r.vendor_name || t(ti?.label || '')}</bdi>}</div></div>
              </li>
            );
          })}
        </ul>
      ) },
      { title: t('Record'), body: <KeyValues items={[{ k: t('Created by'), v: p.created_by_name || '—' }, { k: t('Created at'), v: fmtDateTime(p.created_at) }, { k: t('Updated by'), v: p.updated_by_name || '—' }, { k: t('Updated at'), v: fmtDateTime(p.updated_at) }]} /> },
    ]} />
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Stock'), to: LIST }, { label: t('Products'), to: LIST }, { label: partLabel(p) || p.name }]}
        icon="box"
        title={<bdi>{p.name}</bdi>}
        pills={<>{' '}{statusPill}{kit && <> <Tag>{t('Kit')}</Tag></>}</>}
        subtitle={subtitle}
        actions={actions}
        facets={facets}
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Sections')} />}
      />
      <ObjectBody side={tab === 'overview' ? side : undefined}>
        {tab === 'overview' && overview}
        {tab === 'movements' && <Movements key={sp.get('type') || ''} productId={p.id} warehouses={warehouses} initialType={sp.get('type') || ''} />}
        {tab === 'prices' && prices}
        {tab === 'kit' && kitTab}
        {tab === 'linked' && linked}
        {tab === 'photos' && <Card title={t('Photos')}><ImageGallery images={images} readOnly={!canEdit || p.deleted} busy={uploading} onAdd={addImages} onDelete={delImage} /></Card>}
        {tab === 'insights' && insights}
      </ObjectBody>
      {dr.confirmEl}
    </>
  );
}
