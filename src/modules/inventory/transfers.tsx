import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig, type DocState } from '@/framework/doc/DocumentEditor';
import { productToLine, type ProductHit } from '@/framework/doc/lookups';
import { lineTotal, lineTotalWithVat } from '@/framework/doc/calc';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Select } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Banner, ErrorState, Skeleton, Tabs } from '@/ui/Misc';
import { KeyValues, ObjectBody, ObjectHeader, SidePanel } from '@/ui/ObjectPage';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { Tx, useWarehouses, useWarehousesState } from './components/common';
import { PRODUCT } from './products';
import { MAIN_STORE } from './lib/pricing';
import { endsFromSelect, locationName, stockWarnings, validateEnds, type Warehouse } from './lib/transfer';

export const TRANSFER = '/v1/stock-transfer';
const LIST = '/stock/transfers';
type Transfer = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,net_total,total_quantity,created_by_name,from_warehouse_code,to_warehouse_code,from_warehouse_id,to_warehouse_id,created_at,store_id,remarks';

export function transferListConfig(warehouses: Warehouse[]): ListConfig<Transfer> {
  const locOpts = [{ value: 'main store', label: 'Main Store' }, ...warehouses.map((w) => ({ value: w.code, label: `${w.code} · ${w.name}` }))];
  const loc = (c?: string | null) => locationName(c, warehouses, tt('Main Store'));
  return {
    title: 'Stock transfers', subtitle: 'Move stock between the main store and warehouses', icon: 'swap', endpoint: TRANSFER, resource: 'stock_transfers',
    select: SELECT, defaultSort: { key: 'created_at', dir: -1 }, searchKey: 'code', searchPlaceholder: 'Search transfer #…',
    createPath: `${LIST}/new`, createLabel: 'New transfer', detailPath: (r) => `${LIST}/${r.id}`,
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'from_warehouse_code', label: 'From', type: 'select', options: locOpts },
      { id: 'to_warehouse_code', label: 'To', type: 'select', options: locOpts },
      { id: 'total_quantity', label: 'Quantity', type: 'number', placeholder: 'e.g. >=10' },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Transferred value', value: fmtMoney(m.total_stocktransfer) },
      { label: 'Transferred qty', value: fmtNumber(m.total_quantity, 0) },
    ],
    columns: [
      { key: 'code', header: <Tx k="Transfer #" />, sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: <Tx k="Date" />, sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'from', header: <Tx k="From" />, render: (r) => loc(r.from_warehouse_code) },
      { key: 'to', header: <Tx k="To" />, render: (r) => loc(r.to_warehouse_code) },
      { key: 'qty', header: <Tx k="Qty" />, sortKey: 'total_quantity', align: 'end', render: (r) => <span className="num">{fmtNumber(r.total_quantity, 0)}</span> },
      { key: 'net_total', header: <Tx k="Value" />, sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'created_by', header: <Tx k="Created by" />, hideBelow: 'lg', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: <Tx k="Created at" />, sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDateTime(r.created_at)}</span> },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <>{loc(r.from_warehouse_code)} → {loc(r.to_warehouse_code)}</>, meta: <>{fmtDate(r.date)} · {fmtNumber(r.total_quantity, 0)} <Tx k="units" /></> }),
    exportColumns: [
      { header: 'Transfer #', value: (r) => r.code }, { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'From', value: (r) => loc(r.from_warehouse_code) }, { header: 'To', value: (r) => loc(r.to_warehouse_code) },
      { header: 'Total qty', value: (r) => r.total_quantity }, { header: 'Net total', value: (r) => r.net_total }, { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'stock-transfers',
    showFooter: false,
  };
}

export function TransferListPage() {
  const warehouses = useWarehouses();
  return <ListPage config={transferListConfig(warehouses)} />;
}

/** Non-blocking "available stock at source" warnings (create only, masters.md §9.3). */
function StockWarnings({ lines, fromCode, warehouses }: { lines: DocState['lines']; fromCode: string | null; warehouses: Warehouse[] }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const ids = Array.from(new Set(lines.map((l) => l.product_id).filter(Boolean))).sort().join(',');
  const q = useQuery({
    queryKey: [PRODUCT, 'wh-stock', storeId, ids],
    queryFn: async ({ signal }) => {
      const r = await api.get<any[]>(PRODUCT, { search: { store_id: storeId, ids }, limit: 200, select: `id,product_stores.${storeId}.stock,product_stores.${storeId}.warehouse_stocks` }, signal);
      return Object.fromEntries((r.result || []).map((p) => {
        const ps = p.product_stores?.[storeId] || {};
        return [p.id, { [MAIN_STORE]: ps.stock ?? 0, ...(ps.warehouse_stocks || {}) }];
      })) as Record<string, Record<string, number>>;
    },
    enabled: !!ids,
    staleTime: 15_000,
  });
  const w = stockWarnings(lines, q.data || {}, fromCode);
  const msgs = Object.entries(w).map(([k, v]) => {
    const i = Number(k.split('_')[1]);
    return `${lines[i]?.name}: ${t('available stock in {{loc}} is {{n}}', { loc: locationName(v.code, warehouses, t('Main Store')), n: fmtNumber(v.have, 0) })}`;
  });
  if (!msgs.length) return null;
  return <div style={{ gridColumn: '1/-1' }}><Banner tone="warn"><b>{t('Warning')}:</b> {msgs.join(' · ')}</Banner></div>;
}

export function transferDocConfig(o: { editing: boolean; warehouses: Warehouse[]; prefillLines?: DocState['lines'] }): DocConfig {
  const { warehouses } = o;
  return {
    kind: 'stock_transfer',
    endpoint: TRANSFER,
    calcEndpoint: `${TRANSFER}/calculate-net-total`,
    resource: 'stock_transfers',
    icon: 'swap',
    titleNew: 'New stock transfer',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Stock', to: LIST }, { label: 'Stock transfers', to: LIST }],
    listPath: LIST,
    viewPath: (id) => `${LIST}/${id}`,
    priceSource: 'purchase',
    lineColumns: ['purchase_price', 'unit_price', 'unit_price_with_vat', 'line_total', 'line_total_with_vat'],
    checkStock: false,
    features: { payments: false, shipping: false, discount: false, rounding: true, cashDiscount: false, zatca: false, warehouse: false, contactFields: false, vatEditable: false },
    fromApi: (d) => ({ from_warehouse_id: d.from_warehouse_id || null, from_warehouse_code: d.from_warehouse_code || null, to_warehouse_id: d.to_warehouse_id || null, to_warehouse_code: d.to_warehouse_code || null }),
    prefill: () => ({
      extra: { from_warehouse_id: null, from_warehouse_code: null, to_warehouse_id: warehouses[0]?.id || null, to_warehouse_code: warehouses[0]?.code || null },
      ...(o.prefillLines?.length ? { lines: o.prefillLines } : {}),
    }),
    renderExtra: (s, set, errors) => {
      const fromId = s.extra.from_warehouse_id || '';
      const toId = s.extra.to_warehouse_id || '';
      const opts = [{ value: '', label: tt('Main Store') }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))];
      const change = (from: string, to: string) => set(endsFromSelect(from, to, warehouses) as Record<string, any>);
      return (
        <>
          <Field label={tt('From')} required error={errors.from_warehouse_id ? tt(errors.from_warehouse_id) : undefined}>
            {(id, d) => <Select id={id} aria-describedby={d} invalid={!!errors.from_warehouse_id} value={fromId} options={opts} onChange={(e) => change(e.target.value, toId)} />}
          </Field>
          <Field label={tt('To')} required error={errors.to_warehouse_id ? tt(errors.to_warehouse_id) : undefined}>
            {(id, d) => <Select id={id} aria-describedby={d} invalid={!!errors.to_warehouse_id} value={toId} options={opts} onChange={(e) => change(fromId, e.target.value)} />}
          </Field>
          {!o.editing && <StockWarnings lines={s.lines} fromCode={s.extra.from_warehouse_code || null} warehouses={warehouses} />}
        </>
      );
    },
    extraValidate: (s) => Object.fromEntries(Object.entries(validateEnds(s.extra as any)).map(([k, v]) => [k, tt(v)])),
  };
}

export function TransferEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const storeId = useStoreId();
  const { store } = useAuth();
  const { warehouses, ready } = useWarehousesState();
  const q = useRecord<Transfer>(TRANSFER, id);
  const productId = !id ? sp.get('product_id') : null;
  const pq = useQuery({
    queryKey: [PRODUCT, 'one', productId, storeId, 'prefill'],
    queryFn: async ({ signal }) => (await api.get<ProductHit>(`${PRODUCT}/${productId}`, { search: { store_id: storeId } }, signal)).result!,
    enabled: !!productId && !!storeId,
  });
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const waiting = (id && !q.data) || (productId && pq.isLoading) || !ready;
  if (waiting) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  const vat = store?.vat_percent ?? 15;
  const prefillLines = pq.data ? [productToLine(pq.data, storeId, 'purchase', vat)] : undefined;
  const cfg = transferDocConfig({ editing: !!id, warehouses, prefillLines });
  return <DocumentEditor key={id || 'new'} config={cfg} id={id} existing={q.data} />;
}

export function TransferViewPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const { can } = useAuth();
  const warehouses = useWarehouses();
  const q = useRecord<Transfer>(TRANSFER, id);
  const [tab, setTab] = useState('overview');
  const [moving, setMoving] = useState<'' | 'previous' | 'next'>('');
  usePageMeta(q.data?.code, 'swap');
  if (q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const d = q.data;
  if (!d) return <div className="pad stack"><Skeleton width={240} height={22} /><Skeleton height={120} /><Skeleton height={240} /></div>;

  const loc = (c?: string | null) => locationName(c, warehouses, t('Main Store'));
  const go = async (dir: 'previous' | 'next') => {
    setMoving(dir);
    try {
      const r = await api.get<Transfer>(`/v1/${dir}-stock-transfer/${d.id}`, { search: { store_id: storeId }, select: 'id' });
      if (r.result?.id && r.result.id !== d.id) nav(`${LIST}/${r.result.id}`);
      else toast.info(t(dir === 'next' ? 'This is the latest transfer.' : 'This is the first transfer.'));
    } catch {
      toast.info(t(dir === 'next' ? 'This is the latest transfer.' : 'This is the first transfer.'));
    } finally {
      setMoving('');
    }
  };

  const lines = (
    <Card title={t('Items')} bodyClass="card-b-tight">
      <div style={{ overflowX: 'auto' }}>
        <table className="lines" aria-label={t('Items')}>
          <thead><tr><th>#</th><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Unit price')}</th><th className="r hide-sm">{t('Disc.')}</th><th className="r hide-sm">{t('VAT')}</th><th className="r">{t('Amount')}</th></tr></thead>
          <tbody>
            {(d.products || []).map((p: any, i: number) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td className="pn"><b>{p.product_id ? <a className="link" href={`/stock/products/${p.product_id}`} onClick={(e) => { e.preventDefault(); nav(`/stock/products/${p.product_id}`); }}>{p.name}</a> : p.name}</b><span>{p.part_number && <span className="mono">{[p.prefix_part_number, p.part_number].filter(Boolean).join('-')}</span>}</span></td>
                <td className="r num">{p.quantity} {p.unit}</td>
                <td className="r num">{fmtMoney(p.unit_price)}</td>
                <td className="r num hide-sm">{p.unit_discount ? `${fmtMoney(p.unit_discount)} (${fmtNumber(p.unit_discount_percent || 0)}%)` : '—'}</td>
                <td className="r num hide-sm">{fmtMoney(lineTotalWithVat(p) - lineTotal(p))}</td>
                <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(lineTotalWithVat(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 10px 6px' }}>
        <div className="sum" style={{ width: 'min(320px,100%)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Subtotal')}</span><b className="num">{fmtMoney(d.total)}</b></div>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('VAT')} {d.vat_percent}%</span><b className="num">{fmtMoney(d.vat_price)}</b></div>
          {!!d.rounding_amount && <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{t('Rounding')}</span><b className="num">{fmtMoney(d.rounding_amount)}</b></div>}
          <div className="tot"><span>{t('Total')}</span><b className="num">{fmtMoney(d.net_total)}</b></div>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <ObjectHeader
        crumbs={[{ label: t('Stock'), to: LIST }, { label: t('Stock transfers'), to: LIST }, { label: d.code }]}
        icon="swap"
        title={<span className="mono" style={{ fontSize: 20 }}>{d.code}</span>}
        subtitle={<span className="inv-dir">{loc(d.from_warehouse_code)} <Icon name="arrowr" size="xs" flip /> {loc(d.to_warehouse_code)} · {fmtDateTime(d.date)}</span>}
        actions={
          <>
            <IconButton icon="chevr" label={t('Previous transfer')} disabled={!!moving} onClick={() => go('previous')} style={{ transform: 'scaleX(-1)' }} />
            <IconButton icon="chevr" label={t('Next transfer')} disabled={!!moving} onClick={() => go('next')} />
            <Button icon="print" className="hide-sm" onClick={() => window.print()}>{t('Print')}</Button>
            {can('stock_transfers', 'create') && <Button className="hide-sm" icon="plus" onClick={() => nav(`${LIST}/new`)}>{t('New transfer')}</Button>}
            {can('stock_transfers', 'update') && <Button variant="primary" icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
          </>
        }
        facets={[
          { label: t('From'), value: loc(d.from_warehouse_code) },
          { label: t('To'), value: loc(d.to_warehouse_code) },
          { label: t('Items'), value: (d.products || []).length },
          { label: t('Total qty'), value: fmtNumber(d.total_quantity, 0) },
          { label: t('Value incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></>, hideOnMobile: true },
        ]}
        tabs={<Tabs tabs={[{ id: 'overview', label: t('Overview') }, { id: 'lines', label: t('Items'), count: (d.products || []).length }]} value={tab} onChange={setTab} label={t('Sections')} />}
      />
      <ObjectBody side={
        <SidePanel sections={[
          { title: t('Transfer'), body: <KeyValues items={[{ k: t('From'), v: loc(d.from_warehouse_code) }, { k: t('To'), v: loc(d.to_warehouse_code) }, { k: t('Date'), v: fmtDateTime(d.date) }, ...(d.uuid ? [{ k: 'UUID', v: <span className="mono" style={{ fontSize: 11 }}>{String(d.uuid).slice(0, 13)}…</span> }] : [])]} /> },
          { title: t('Record'), body: <KeyValues items={[{ k: t('Created by'), v: d.created_by_name || '—' }, { k: t('Created at'), v: fmtDateTime(d.created_at) }, { k: t('Updated by'), v: d.updated_by_name || '—' }, { k: t('Updated at'), v: fmtDateTime(d.updated_at) }]} /> },
        ]} />
      }>
        {lines}
        {tab === 'overview' && d.remarks && <Card title={t('Remarks')}><div style={{ whiteSpace: 'pre-wrap' }}>{d.remarks}</div></Card>}
      </ObjectBody>
    </>
  );
}
