import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { PaymentPill, ZatcaPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { ReceivePaymentModal } from '@/framework/doc/ReceivePayment';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { Banner, ErrorState, Skeleton } from '@/ui/Misc';
import { Field, Input } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { clearWorkshopPrefill, loadInvoicePrefill, readWorkshopPrefill, stripPrivate, workshopToDocState, type InvoiceSource as Source } from './conversions';
import { InvoiceSource } from './importSource';
import { ShareActions } from './share';

export const ORDER = '/v1/order';
const LIST = '/sales/invoices';

type Order = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,customer_id,customer_name,customer_name_arabic,net_total,vat_price,total_payment_received,balance_amount,payment_status,payment_methods,cash_discount,discount,net_profit,net_loss,return_count,return_amount,zatca,created_by_name,created_at,phone,vat_no';

export function salesListConfig(opts: { zatcaLive: boolean; nav: (p: string) => void }): ListConfig<Order> {
  return {
    title: 'Sales invoices',
    subtitle: 'Tax and simplified invoices for the active store',
    icon: 'receipt',
    endpoint: ORDER,
    resource: 'sales',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/^\d|^[A-Za-z]+-/.test(q) ? { code: q } : { customer_name: q }),
    searchPlaceholder: 'Search invoice # or customer…',
    createPath: `${LIST}/new`,
    createLabel: 'New invoice',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All invoices' },
      { id: 'open', label: 'Open balance', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'unpaid', label: 'Unpaid', search: { payment_status: 'not_paid' } },
      { id: 'paid', label: 'Paid', search: { payment_status: 'paid' } },
      ...(opts.zatcaLive ? [{ id: 'zatca', label: 'ZATCA attention', search: { 'zatca.reporting_passed': 'reporting_failed' } }] : []),
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async () => [] },
      { id: 'payment_status', label: 'Payment status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: [{ value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'customer_account', label: 'Customer account' }] },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Sales', value: fmtMoney(m.total_sales) },
      { label: 'Paid', value: fmtMoney(m.paid_sales) },
      { label: 'Credit (unpaid)', value: fmtMoney(m.unpaid_sales), tone: m.unpaid_sales > 0 ? 'warn' : undefined },
      { label: 'VAT collected', value: fmtMoney(m.vat_price) },
      { label: 'Net profit', value: fmtMoney(m.net_profit), tone: 'good' },
      { label: 'Returns', value: fmtMoney(m.return_amount) },
    ],
    columns: [
      { key: 'code', header: tt('Invoice #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', className: 'two', render: (r) => <><b><bdi>{r.customer_name || '—'}</bdi></b><span>{r.vat_no ? `VAT ${r.vat_no}` : tt('Simplified · B2C')}</span></> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'vat', header: tt('VAT'), align: 'end', hideBelow: 'lg', render: (r) => <span className="num muted">{fmtMoney(r.vat_price)}</span> },
      { key: 'paid', header: tt('Paid'), sortKey: 'total_payment_received', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_received)}</span> },
      { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Payment'), render: (r) => <PaymentPill status={r.payment_status} /> },
      ...(opts.zatcaLive ? [{ key: 'zatca', header: tt('ZATCA'), render: (r: Order) => <ZatcaPill zatca={r.zatca} /> }] : []),
      { key: 'profit', header: tt('Net profit'), sortKey: 'net_profit', align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.net_profit)}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{r.customer_name}</bdi>, meta: <>{fmtDate(r.date)} <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Invoice #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'VAT no.', value: (r) => r.vat_no },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'VAT', value: (r) => r.vat_price },
      { header: 'Paid', value: (r) => r.total_payment_received },
      { header: 'Balance', value: (r) => r.balance_amount },
      { header: 'Payment status', value: (r) => r.payment_status },
      { header: 'Net profit', value: (r) => r.net_profit },
    ],
    exportName: 'sales-invoices',
    showFooter: false,
  };
}

export function SalesListPage() {
  const nav = useNavigate();
  const { store } = useAuth();
  const storeId = useStoreId();
  const cfg = salesListConfig({ zatcaLive: store?.zatca?.phase === '2' && !!store?.zatca?.connected, nav });
  // Customer filter loads real customers.
  cfg.filters = cfg.filters!.map((f) => (f.id === 'customer' && f.type === 'picker' ? { ...f, load: async (q: string, s: AbortSignal) => (await searchParties('customer', storeId, q, s)).map(partyToOption) } : f));
  return <ListPage config={cfg} />;
}

/** Link / workshop fields kept on edit so a PUT never drops them. */
const LINK_KEYS = ['quotation_id', 'quotation_code', 'quotation_ids', 'quotation_codes', 'delivery_note_id', 'vehicle_id', 'km_driven', 'repair_job_id', 'repair_job_ids'];

export const salesDocConfig = (zatcaLockSetting: boolean | undefined, opts: { isNew?: boolean; prefill?: DocConfig['prefill'] } = {}): DocConfig => ({
  kind: 'sales',
  endpoint: ORDER,
  calcEndpoint: `${ORDER}/calculate-net-total`,
  resource: 'sales',
  icon: 'receipt',
  titleNew: 'New sales invoice',
  titleEdit: (code) => `${tt('Edit')} ${code}`,
  crumbs: [{ label: 'Sales', to: LIST }, { label: 'Sales invoices', to: LIST }],
  listPath: LIST,
  viewPath: (id) => `${LIST}/${id}`,
  party: { kind: 'customer', idField: 'customer_id', nameField: 'customer_name', label: 'Customer', allowFreeText: true },
  priceSource: 'retail',
  lineColumns: ['warehouse', 'unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'],
  checkStock: true,
  features: { payments: true, shipping: true, discount: true, rounding: true, cashDiscount: true, zatca: true, warehouse: true },
  renderExtra: (s, set, errors) => (
    <>
      <Field label={tt('Customer PO #')} error={errors.customer_po_no}>{(id) => <Input id={id} value={s.extra.customer_po_no || ''} onChange={(e) => set({ customer_po_no: e.target.value })} />}</Field>
      <InvoiceSource s={s} isNew={!!opts.isNew} />
    </>
  ),
  fromApi: (d) => {
    const x: Record<string, any> = { customer_po_no: d.customer_po_no || '', quotation_id: d.quotation_id || null, delivery_note_id: d.delivery_note_id || null };
    for (const k of LINK_KEYS) if (d[k] !== undefined && d[k] !== null && !(k in x)) x[k] = d[k];
    return x;
  },
  toApi: (b) => stripPrivate(b),
  prefill: opts.prefill,
  isLocked: (d) => !!d?.zatca?.reporting_passed && zatcaLockSetting !== false,
});

/**
 * Sales invoice editor. New invoices can start from a quotation (?quotation_id=), a delivery note
 * (?delivery_note_id=) or a workshop job-card hand-over (sessionStorage `workshop_invoice_prefill`).
 */
export function SalesEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { store } = useAuth();
  const storeId = useStoreId();
  const { t } = useTranslation();
  const vat = store?.vat_percent ?? 15;
  const quotationId = !id ? sp.get('quotation_id') : null;
  const dnId = !id ? sp.get('delivery_note_id') : null;
  const customerId = !id ? sp.get('customer_id') : null;
  const source = useMemo<Source | null>(
    () => (quotationId ? { kind: 'quotation', id: quotationId } : dnId ? { kind: 'delivery_note', id: dnId } : customerId ? { kind: 'customer', id: customerId } : null),
    [quotationId, dnId, customerId],
  );
  // Read without removing (StrictMode runs initialisers twice); the key is cleared after mount.
  const [workshop] = useState(() => (!id && !source ? readWorkshopPrefill() : null));
  useEffect(() => { if (workshop) clearWorkshopPrefill(); }, [workshop]);
  const q = useRecord<Order>(ORDER, id);
  const pre = useQuery({
    queryKey: ['invoice-prefill', source?.kind, source?.id, storeId],
    queryFn: ({ signal }) => loadInvoicePrefill(source!, storeId, vat, signal),
    enabled: !!source && !!storeId,
    gcTime: 0,
  });
  const prefill = useMemo(() => (source ? pre.data || null : workshop ? workshopToDocState(workshop, vat) : null), [source, pre.data, workshop, vat]);
  const cfg = useMemo(() => salesDocConfig(store?.settings?.disable_sales_edit_once_reported_to_zatca, { isNew: !id, prefill: () => prefill }), [store?.settings?.disable_sales_edit_once_reported_to_zatca, id, prefill]);
  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (source && pre.isError) return <div className="pad"><ErrorState error={pre.error} onRetry={() => pre.refetch()} /></div>;
  if ((id && !q.data) || (source && !pre.data)) return <div className="pad stack" aria-busy="true" aria-label={t('Loading')}><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <DocumentEditor key={id || `new:${source?.kind || ''}:${source?.id || ''}:${workshop ? 'w' : ''}`} config={cfg} id={id} existing={q.data} />;
}

/** Quotations an invoice was created from (single legacy link + multi-import arrays), de-duplicated. */
export function linkedQuotations(d: Record<string, any>): { id?: string; code: string }[] {
  const out: { id?: string; code: string }[] = [];
  const add = (id: string | undefined, code: string | undefined) => {
    if (!code && !id) return;
    if (out.some((x) => (id && x.id === id) || (code && x.code === code))) return;
    out.push({ id: id || undefined, code: code || '' });
  };
  add(d.quotation_id, d.quotation_code);
  (d.quotation_codes || []).forEach((c: string, i: number) => add(d.quotation_ids?.[i], c));
  return out.filter((x) => x.code);
}

export function SalesViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can } = useAuth();
  const q = useRecord<Order>(ORDER, id);
  const [pay, setPay] = useState(false);
  const [reporting, setReporting] = useState(false);
  const zatcaLive = store?.zatca?.phase === '2' && !!store?.zatca?.connected;

  const report = async (d: Order) => {
    setReporting(true);
    try {
      await api.post(`${ORDER}/zatca/report/${d.id}`, {}, { search: { store_id: storeId } });
      toast.success(t('Reported to ZATCA'));
      qc.invalidateQueries({ queryKey: [ORDER] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setReporting(false);
    }
  };

  const view: ViewConfig = {
    icon: 'receipt',
    crumbs: [{ label: 'Sales', to: LIST }, { label: 'Sales invoices', to: LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    showPayments: true,
    pills: (d) => <><PaymentPill status={d.payment_status} />{zatcaLive && <ZatcaPill zatca={d.zatca} />}</>,
    facets: (d) => [
      { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Paid'), value: fmtMoney(d.total_payment_received) },
      { label: t('Balance due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'crit' : undefined },
      { label: t('Net profit'), value: fmtMoney(d.net_profit), hideOnMobile: true },
      ...(d.return_count ? [{ label: t('Returns'), value: `${d.return_count} · ${fmtMoney(d.return_amount)}`, hideOnMobile: true }] : []),
    ],
    steps: (d) => {
      const steps = ['Created', ...(zatcaLive ? ['Reported to ZATCA'] : []), 'Partially paid', 'Paid'];
      const reported = zatcaLive ? (d.zatca?.reporting_passed ? 1 : 0) : 0;
      const cur = d.payment_status === 'paid' ? steps.length : d.payment_status === 'paid_partially' ? steps.length - 1 : 1 + reported;
      return { steps, current: Math.min(cur, steps.length) };
    },
    flow: (d) => [
      ...linkedQuotations(d).map((x) => ({ kind: t('Quotation'), icon: 'clip' as const, code: x.code, to: x.id ? `/sales/quotations/${x.id}` : undefined })),
      ...(d.delivery_note_id && d.delivery_note_id !== '000000000000000000000000' ? [{ kind: t('Delivery note'), icon: 'truck' as const, code: d.delivery_note_code || t('View'), to: `/sales/delivery-notes/${d.delivery_note_id}` }] : []),
      { kind: t('Invoice'), icon: 'receipt' as const, code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      ...(d.payments_count ? [{ kind: t('Payments'), icon: 'cash' as const, code: `${d.payments_count} × ${fmtMoney(d.total_payment_received)}` }] : []),
      ...(d.return_count ? [{ kind: t('Returns'), icon: 'undo' as const, code: `${d.return_count} · ${fmtMoney(d.return_amount)}`, to: `/sales/returns?f.order=${d.id}` }] : [{ kind: t('Return'), icon: 'undo' as const, code: t('Create return'), ghost: true, to: `/sales/returns/new?order_id=${d.id}` }]),
    ],
    banner: (d) => {
      const errs = [...(d.zatca?.reporting_errors || []), ...(d.zatca?.compliance_check_errors || [])];
      return zatcaLive && errs.length && !d.zatca?.reporting_passed ? <Banner tone="crit"><b>{t('ZATCA rejected this invoice.')}</b> {errs.join(' · ')}</Banner> : null;
    },
    actions: (d) => (
      <>
        {d.balance_amount > 0 && can('sales', 'update') && <Button variant="primary" icon="cash" onClick={() => setPay(true)}>{t('Receive payment')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/sales/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="sales" compact />
        {zatcaLive && !d.zatca?.reporting_passed && <Button icon="send" loading={reporting} onClick={() => report(d)}>{t('Report to ZATCA')}</Button>}
        <Button icon="undo" className="hide-sm" onClick={() => nav(`/sales/returns/new?order_id=${d.id}`)}>{t('Return')}</Button>
        {can('sales', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
      </>
    ),
    sideExtra: (d) => (zatcaLive && d.zatca ? [{ title: 'ZATCA', body: <div className="kv" style={{ gridTemplateColumns: 'auto 1fr' }}><dt>{t('Status')}</dt><dd><ZatcaPill zatca={d.zatca} /></dd>{d.zatca.reporting_invoice_hash && <><dt>{t('Hash')}</dt><dd className="mono" style={{ fontSize: 11 }}>{String(d.zatca.reporting_invoice_hash).slice(0, 12)}…</dd></>}</div> }] : []),
  };

  return (
    <>
      <DocumentView doc={q.data} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {q.data && (
        <ReceivePaymentModal open={pay} onClose={() => setPay(false)} endpoint="/v1/sales-payment" title={`${t('Receive payment')} · ${q.data.code}`}
          parent={{ order_id: q.data.id, order_code: q.data.code }} balance={q.data.balance_amount} invalidate={[ORDER]} />
      )}
    </>
  );
}
