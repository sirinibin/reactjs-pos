import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useList } from '@/api/hooks';
import { FilterChip, filtersToSearch, type FilterDef } from '@/framework/filters';
import { Card } from '@/ui/Card';
import { DataGrid, Pager, type Column } from '@/ui/DataGrid';
import { ErrorState } from '@/ui/Misc';
import type { IconName } from '@/ui/Icon';
import { fmtDate, fmtMoney, fmtNumber, fmtTime } from '@/lib/format';
import type { Warehouse } from '../lib/transfer';
import { locationName } from '../lib/transfer';
import { Tx } from './common';

export const HISTORY = '/v1/product/history';

export interface MovementRow {
  id: string;
  date: string;
  reference_type: string;
  reference_id?: string;
  reference_code?: string;
  customer_name?: string;
  vendor_name?: string;
  warehouse_code?: string | null;
  from_warehouse_code?: string | null;
  to_warehouse_code?: string | null;
  quantity: number;
  stock?: number;
  unit?: string;
  unit_price?: number;
  unit_price_with_vat?: number;
  discount?: number;
  discount_percent?: number;
  price?: number;
  vat_price?: number;
  net_price?: number;
  profit?: number;
  loss?: number;
}

export const MOVEMENT_TYPES: { value: string; label: string; icon: IconName; sign: 1 | -1 | 0; path?: string }[] = [
  { value: 'sales', label: 'Sales', icon: 'receipt', sign: -1, path: '/sales/invoices' },
  { value: 'sales_return', label: 'Sales return', icon: 'undo', sign: 1, path: '/sales/returns' },
  { value: 'purchase', label: 'Purchase', icon: 'cart', sign: 1, path: '/buying/purchases' },
  { value: 'purchase_return', label: 'Purchase return', icon: 'undo', sign: -1, path: '/buying/returns' },
  { value: 'quotation', label: 'Quotation', icon: 'clip', sign: 0, path: '/sales/quotations' },
  { value: 'quotation_invoice', label: 'Quotation sale', icon: 'clip', sign: -1, path: '/sales/quotations' },
  { value: 'quotation_sales_return', label: 'Quotation sales return', icon: 'undo', sign: 1, path: '/sales/quotation-returns' },
  { value: 'delivery_note', label: 'Delivery note', icon: 'truck', sign: 0, path: '/sales/delivery-notes' },
  { value: 'stock_transfer', label: 'Stock transfer', icon: 'swap', sign: 0, path: '/stock/transfers' },
  { value: 'stock_adjustment_by_adding', label: 'Stock added', icon: 'plus', sign: 1 },
  { value: 'stock_adjustment_by_removing', label: 'Stock removed', icon: 'trash', sign: -1 },
];
export const typeInfo = (v: string) => MOVEMENT_TYPES.find((x) => x.value === v);

/** Link to the source document of a movement, if it has a screen. */
export function movementLink(r: Pick<MovementRow, 'reference_type' | 'reference_id'>): string | undefined {
  const ti = typeInfo(r.reference_type);
  return ti?.path && r.reference_id ? `${ti.path}/${r.reference_id}` : undefined;
}

/** Signed quantity for display (+ in, − out, unsigned for documents that don't move stock). */
export function signedQty(r: Pick<MovementRow, 'reference_type' | 'quantity'>): string {
  const s = typeInfo(r.reference_type)?.sign ?? 0;
  const q = fmtNumber(r.quantity, Number.isInteger(r.quantity) ? 0 : 2);
  return s > 0 ? `+${q}` : s < 0 ? `−${q}` : q;
}

const TOTALS: { key: string; label: string }[] = [
  { key: 'total_sales', label: 'Sales' }, { key: 'total_sales_profit', label: 'Sales profit' }, { key: 'total_sales_return', label: 'Sales returns' },
  { key: 'total_purchase', label: 'Purchases' }, { key: 'total_purchase_return', label: 'Purchase returns' }, { key: 'total_quotation', label: 'Quotations' },
  { key: 'total_quotation_sales', label: 'Quotation sales' }, { key: 'total_delivery_note_quantity', label: 'Delivered qty' },
];

/** Product stock ledger (GET /v1/product/history/{id} — the path id is ignored; search[product_id] filters). */
export function Movements({ productId, warehouses, initialType = '' }: { productId: string; warehouses: Warehouse[]; initialType?: string }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Record<string, string>>(initialType ? { reference_type: initialType } : {});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const defs: FilterDef[] = [
    { id: 'reference_type', label: 'Type', type: 'select', options: MOVEMENT_TYPES.map((m) => ({ value: m.value, label: m.label })) },
    { id: 'date', label: 'Date', type: 'daterange' },
  ];
  const search = { product_id: productId, stats: 1, ...filtersToSearch(defs, filters) };
  const q = useList<MovementRow>(`${HISTORY}/${productId}`, { search, page, limit: size, sort: '-date' });
  const meta = q.data?.meta || {};
  const tiles = TOTALS.filter((x) => Number(meta[x.key]));

  const loc = (r: MovementRow) => r.reference_type === 'stock_transfer'
    ? `${locationName(r.from_warehouse_code, warehouses, t('Main Store'))} → ${locationName(r.to_warehouse_code, warehouses, t('Main Store'))}`
    : locationName(r.warehouse_code, warehouses, t('Main Store'));
  const cols: Column<MovementRow>[] = [
    { key: 'date', header: <Tx k="Date" />, render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
    { key: 'type', header: <Tx k="Type" />, render: (r) => t(typeInfo(r.reference_type)?.label || r.reference_type) },
    { key: 'ref', header: <Tx k="Reference" />, className: 'code', render: (r) => { const to = movementLink(r); return to ? <Link className="link mono" to={to} onClick={(e) => e.stopPropagation()}>{r.reference_code}</Link> : <span className="mono">{r.reference_code || '—'}</span>; } },
    { key: 'party', header: <Tx k="Customer / vendor" />, hideBelow: 'md', render: (r) => <bdi>{r.customer_name || r.vendor_name || '—'}</bdi> },
    ...(warehouses.length ? [{ key: 'loc', header: <Tx k="Location" />, hideBelow: 'lg' as const, render: loc }] : []),
    { key: 'qty', header: <Tx k="Qty" />, align: 'end', render: (r) => <b className="num">{signedQty(r)}</b> },
    { key: 'stock', header: <Tx k="Stock after" />, align: 'end', hideBelow: 'sm', render: (r) => <span className="num">{fmtNumber(r.stock ?? 0, 0)}</span> },
    { key: 'unit_price', header: <Tx k="Unit price" />, align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.unit_price)}</span> },
    { key: 'discount', header: <Tx k="Discount" />, align: 'end', hideBelow: 'xl', render: (r) => <span className="num muted">{r.discount ? `${fmtMoney(r.discount)} (${fmtNumber(r.discount_percent || 0, 2)}%)` : '—'}</span> },
    { key: 'price', header: <Tx k="Price" />, align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{fmtMoney(r.price)}</span> },
    { key: 'vat', header: <Tx k="VAT" />, align: 'end', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtMoney(r.vat_price)}</span> },
    { key: 'net', header: <Tx k="Net" />, align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{fmtMoney(r.net_price)}</span> },
    { key: 'pl', header: <Tx k="Profit / loss" />, align: 'end', hideBelow: 'xl', render: (r) => (r.loss ? <span className="num" style={{ color: 'var(--crit)' }}>−{fmtMoney(r.loss)}</span> : <span className="num" style={{ color: r.profit ? 'var(--good)' : undefined }}>{fmtMoney(r.profit || 0)}</span>) },
  ];

  return (
    <Card title={t('Stock movements')} bodyClass="card-b-tight" actions={<span className="muted num">{(q.data?.total ?? 0).toLocaleString()}</span>}>
      <div className="gridbar" style={{ borderTop: 0 }}>
        {defs.map((d) => <FilterChip key={d.id} def={d} value={filters[d.id]} onChange={(v) => { setFilters((f) => ({ ...f, [d.id]: v })); setPage(1); }} />)}
      </div>
      {tiles.length > 0 && (
        <div className="inv-history-tot" aria-label={t('Totals')}>
          {tiles.map((x) => <div key={x.key}><span>{t(x.label)}</span><b className="num">{x.key.endsWith('quantity') ? fmtNumber(meta[x.key], 0) : fmtMoney(meta[x.key])}</b></div>)}
        </div>
      )}
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
        <DataGrid<MovementRow> label={t('Stock movements')} columns={cols} rows={q.data?.rows || []} rowKey={(r) => r.id} loading={q.isLoading}
          mobileCard={(r) => ({ title: <span className="mono">{r.reference_code || t(typeInfo(r.reference_type)?.label || r.reference_type)}</span>, amount: signedQty(r), subtitle: <>{t(typeInfo(r.reference_type)?.label || r.reference_type)} · <bdi>{r.customer_name || r.vendor_name || loc(r)}</bdi></>, meta: fmtDate(r.date) })} />
      )}
      <Pager page={page} pageSize={size} total={q.data?.total || 0} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} sizes={[20, 50, 100, 500]} />
    </Card>
  );
}
