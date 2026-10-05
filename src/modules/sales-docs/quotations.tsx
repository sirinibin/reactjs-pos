import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentEditor, type DocConfig, type DocState } from '@/framework/doc/DocumentEditor';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { PaymentPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { Field, Input, Select } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { ShareActions } from '@/modules/sales/share';
import { loadCustomerPrefill } from '@/modules/sales/conversions';
import {
  isExpired, isInvoiced, linkedOrders, quotationDefaults, quotationToApi, QUOTATION_STATUSES, rfqPrefillToDocState, STATUS_LABEL, switchQuotationType, takeRfqPrefill,
  validateQuotationTerms, validUntil, type QuotationType,
} from './logic';

export const QUOTATION = '/v1/quotation';
export const QTN_LIST = '/sales/quotations';
const RETURNS = '/sales/quotation-returns';

type Quotation = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,type,status,customer_id,customer_name,customer_name_arabic,net_total,vat_price,total_payment_received,balance_amount,payment_status,payment_methods,cash_discount,discount,profit,net_profit,loss,net_loss,return_count,return_amount,order_id,order_code,order_ids,order_codes,reported_to_zatca,validity_days,delivery_days,rfq_received_code,created_by_name,created_at';

export function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const tone = status === 'accepted' || status === 'delivered' ? 'good' : status === 'rejected' || status === 'cancelled' ? 'crit' : status === 'pending' ? 'warn' : 'neutral';
  return <Pill tone={tone}>{tt(STATUS_LABEL[status] || status)}</Pill>;
}

export function TypePill({ type }: { type?: string }) {
  return type === 'invoice' ? <Pill tone="info" icon="receipt">{tt('Sales')}</Pill> : <Pill tone="neutral" icon="clip">{tt('Quotation')}</Pill>;
}

export function InvoicedPill({ d }: { d: Record<string, any> }) {
  return isInvoiced(d) ? <Pill tone="good" icon="checkc">{tt('Invoiced')}</Pill> : <Pill tone="neutral">{tt('Not invoiced')}</Pill>;
}

/** Free-text box: sales invoice numbers search the linked invoice, everything else the quotation number. */
export const quotationSearchKey = (q: string) => (/^(S-)?INV/i.test(q.trim()) ? { order_code: q.trim() } : { code: q.trim() });

export function quotationListConfig(opts: { siq: boolean; zatcaLive: boolean }): ListConfig<Quotation> {
  const { siq } = opts;
  return {
    title: 'Quotations',
    subtitle: siq ? 'Quotations and sales recorded as quotation invoices' : 'Price offers sent to customers',
    icon: 'clip',
    endpoint: QUOTATION,
    resource: 'quotations',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: quotationSearchKey,
    searchPlaceholder: 'Search quotation # or sales invoice #…',
    createPath: `${QTN_LIST}/new`,
    createLabel: 'New quotation',
    detailPath: (r) => `${QTN_LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All' },
      ...(siq ? [{ id: 'quotes', label: 'Quotations', search: { type: 'quotation' } }, { id: 'sales', label: 'Sales', search: { type: 'invoice' } }] : []),
      { id: 'open', label: 'Not invoiced', search: { invoiced: '0' } },
      { id: 'invoiced', label: 'Invoiced', search: { invoiced: '1' }, count: (m) => m.invoiced_count },
      ...(siq ? [{ id: 'unpaid', label: 'Unpaid sales', search: { type: 'invoice', payment_status: 'not_paid,paid_partially' } }] : []),
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async () => [] },
      { id: 'status', label: 'Status', type: 'select', options: QUOTATION_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
      ...(siq ? [
        { id: 'payment_status', label: 'Payment status', type: 'select' as const, options: PAYMENT_STATUS_OPTIONS },
        { id: 'payment_methods', label: 'Payment method', type: 'select' as const, options: [{ value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_card', label: 'Bank card' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'bank_cheque', label: 'Bank cheque' }, { value: 'customer_account', label: 'Customer account' }] },
      ] : []),
      ...(siq && opts.zatcaLive ? [{ id: 'reported_to_zatca', label: 'ZATCA', type: 'select' as const, options: [{ value: '1', label: 'Reported' }, { value: '0', label: 'Not reported' }] }] : []),
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Quotations', value: fmtMoney(m.total_quotation) },
      { label: 'Invoiced', value: `${m.invoiced_count ?? 0} · ${fmtMoney(m.invoiced_amount)}` },
      { label: 'Profit', value: fmtMoney(m.profit), tone: 'good' },
      { label: 'Profit %', value: m.total_quotation ? `${((m.profit / m.total_quotation) * 100).toFixed(1)}%` : '—' },
      { label: 'Loss', value: fmtMoney(m.loss), tone: m.loss > 0 ? 'crit' : undefined },
      ...(siq ? [
        { label: 'Sales', value: fmtMoney(m.invoice_total_sales) },
        { label: 'Paid sales', value: fmtMoney(m.invoice_paid_sales) },
        { label: 'Credit (unpaid)', value: fmtMoney(m.invoice_unpaid_sales), tone: m.invoice_unpaid_sales > 0 ? 'warn' as const : undefined },
        { label: 'VAT collected', value: fmtMoney(m.invoice_vat_price) },
        { label: 'Sales net profit', value: fmtMoney(m.invoice_net_profit), tone: 'good' as const },
      ] : []),
    ],
    columns: [
      { key: 'code', header: tt('Quotation #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', className: 'two', render: (r) => <><b><bdi>{r.customer_name || '—'}</bdi></b>{r.customer_name_arabic ? <span><bdi>{r.customer_name_arabic}</bdi></span> : null}</> },
      ...(siq ? [{ key: 'type', header: tt('Type'), render: (r: Quotation) => <TypePill type={r.type} /> }] : []),
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      ...(siq ? [
        { key: 'paid', header: tt('Paid'), sortKey: 'total_payment_received', align: 'end' as const, hideBelow: 'md' as const, render: (r: Quotation) => (r.type === 'invoice' ? <span className="num">{fmtMoney(r.total_payment_received)}</span> : <span className="muted">—</span>) },
        { key: 'balance', header: tt('Balance'), sortKey: 'balance_amount', align: 'end' as const, hideBelow: 'md' as const, render: (r: Quotation) => (r.type === 'invoice' ? <span className="num" style={r.balance_amount > 0 ? { color: 'var(--crit)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> : <span className="muted">—</span>) },
        { key: 'payment', header: tt('Payment'), hideBelow: 'lg' as const, render: (r: Quotation) => (r.type === 'invoice' ? <PaymentPill status={r.payment_status} /> : null) },
      ] : []),
      { key: 'invoiced', header: tt('Invoiced'), render: (r) => (isInvoiced(r) ? <span className="mono" title={linkedOrders(r).map((x) => x.code).join(', ')}>{linkedOrders(r).map((x) => x.code).join(', ') || tt('Yes')}</span> : <span className="muted">{tt('No')}</span>) },
      { key: 'status', header: tt('Status'), hideBelow: 'md', render: (r) => (isExpired(r) ? <Pill tone="warn" icon="clock">{tt('Expired')}</Pill> : <StatusPill status={r.status} />) },
      { key: 'profit', header: tt('Net profit'), sortKey: 'net_profit', align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.net_profit)}</span> },
      ...(siq ? [{ key: 'returns', header: tt('Returns'), sortKey: 'return_count', align: 'end' as const, hideBelow: 'xl' as const, render: (r: Quotation) => (r.return_count ? <span className="num">{r.return_count} · {fmtMoney(r.return_amount)}</span> : <span className="muted">—</span>) }] : []),
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({
      title: <span className="mono">{r.code}</span>,
      amount: fmtMoney(r.net_total),
      subtitle: <bdi>{r.customer_name}</bdi>,
      meta: <>{fmtDate(r.date)} {siq && <TypePill type={r.type} />} {r.type === 'invoice' ? <PaymentPill status={r.payment_status} /> : <InvoicedPill d={r} />}</>,
    }),
    exportColumns: [
      { header: 'Quotation #', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Type', value: (r) => r.type },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Paid', value: (r) => r.total_payment_received },
      { header: 'Balance', value: (r) => r.balance_amount },
      { header: 'Payment status', value: (r) => r.payment_status },
      { header: 'Invoiced', value: (r) => (isInvoiced(r) ? 'YES' : 'NO') },
      { header: 'Sales invoices', value: (r) => linkedOrders(r).map((x) => x.code).join(' ') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Net profit', value: (r) => r.net_profit },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: 'quotations',
    showFooter: false,
  };
}

export function QuotationListPage() {
  const { store } = useAuth();
  const storeId = useStoreId();
  const cfg = quotationListConfig({ siq: !!store?.settings?.enable_sales_in_quotation, zatcaLive: store?.zatca?.phase === '2' && !!store?.zatca?.connected });
  cfg.filters = cfg.filters!.map((f) => (f.id === 'customer' && f.type === 'picker' ? { ...f, load: async (q: string, s: AbortSignal) => (await searchParties('customer', storeId, q, s)).map(partyToOption) } : f));
  return <ListPage config={cfg} />;
}

/** Quotation-specific header fields (type, status, terms). */
function QuotationFields({ s, set, errors, siq, onType }: {
  s: DocState; set: (p: Record<string, any>) => void; errors: Record<string, string>; siq: boolean; onType: (to: QuotationType) => void;
}) {
  const { t } = useTranslation();
  const until = validUntil(s.date, Number(s.extra.validity_days));
  return (
    <>
      {(siq || s.extra.type === 'invoice') && (
        <Field label={t('Type')} error={errors.type}>
          {(id) => <Select id={id} value={s.extra.type || 'quotation'} onChange={(e) => onType(e.target.value as QuotationType)}
            options={[{ value: 'quotation', label: t('Quotation') }, { value: 'invoice', label: t('Sales (invoice)') }]} />}
        </Field>
      )}
      <Field label={t('Status')} error={errors.status}>
        {(id) => <Select id={id} value={s.extra.status || 'created'} onChange={(e) => set({ status: e.target.value })} options={QUOTATION_STATUSES.map((x) => ({ value: x, label: t(STATUS_LABEL[x]) }))} />}
      </Field>
      <Field label={t('Validity (days)')} required error={errors.validity_days} hint={until ? `${t('Valid until')} ${fmtDate(until)}` : undefined}>
        {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" className="num" value={s.extra.validity_days ?? ''} invalid={!!errors.validity_days} onChange={(e) => set({ validity_days: e.target.value.replace(/[^\d]/g, '') })} />}
      </Field>
      <Field label={t('Delivery (days)')} required error={errors.delivery_days}>
        {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" className="num" value={s.extra.delivery_days ?? ''} invalid={!!errors.delivery_days} onChange={(e) => set({ delivery_days: e.target.value.replace(/[^\d]/g, '') })} />}
      </Field>
      <Field label={t('Delivery from')} error={errors.delivery_from}>
        {(id) => <Input id={id} value={s.extra.delivery_from || ''} onChange={(e) => set({ delivery_from: e.target.value })} />}
      </Field>
      {s.extra.rfq_received_code && <Field label={t('RFQ')}>{() => <span className="mono">{s.extra.rfq_received_code}</span>}</Field>}
    </>
  );
}

export const QUOTATION_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }, { value: 'bank_card', label: 'Bank card' },
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'bank_cheque', label: 'Bank cheque' }, { value: 'customer_account', label: 'Customer account' },
];

export function quotationDocConfig(o: {
  type: QuotationType; siq: boolean; userId?: string; prefill?: () => Partial<DocState> | null; onType: (s: DocState, to: QuotationType, set: (p: Record<string, any>) => void) => void;
}): DocConfig {
  const inv = o.type === 'invoice';
  return {
    kind: 'quotation',
    endpoint: QUOTATION,
    calcEndpoint: `${QUOTATION}/calculate-net-total`,
    resource: 'quotations',
    icon: 'clip',
    titleNew: inv ? 'New sales (quotation invoice)' : 'New quotation',
    titleEdit: (code) => `${tt('Edit')} ${code}`,
    crumbs: [{ label: 'Sales', to: QTN_LIST }, { label: 'Quotations', to: QTN_LIST }],
    listPath: QTN_LIST,
    viewPath: (id) => `${QTN_LIST}/${id}`,
    party: { kind: 'customer', idField: 'customer_id', nameField: 'customer_name', label: 'Customer', allowFreeText: true },
    priceSource: 'retail',
    lineColumns: [...(inv ? ['warehouse' as const] : []), 'unit_price', 'unit_price_with_vat', 'unit_discount', 'line_total', 'line_total_with_vat'],
    checkStock: inv,
    features: { payments: inv, shipping: true, discount: true, rounding: true, cashDiscount: inv, warehouse: inv },
    renderExtra: (s, set, errors) => <QuotationFields s={s} set={set} errors={errors} siq={o.siq} onType={(to) => o.onType(s, to, set)} />,
    fromApi: (d) => ({
      type: d.type === 'invoice' ? 'invoice' : 'quotation',
      status: d.status || 'created',
      validity_days: d.validity_days ?? 2,
      delivery_days: d.delivery_days ?? 7,
      delivery_from: d.delivery_from || '',
      delivered_by: d.delivered_by,
      ...(d.vehicle_id ? { vehicle_id: d.vehicle_id, km_driven: d.km_driven || 0 } : {}),
      ...(d.repair_job_id ? { repair_job_id: d.repair_job_id, repair_job_ids: d.repair_job_ids } : {}),
      ...(d.rfq_received_id ? { rfq_received_id: d.rfq_received_id, rfq_received_code: d.rfq_received_code } : {}),
    }),
    prefill: o.prefill,
    toApi: (b) => quotationToApi(b, o.userId),
    extraValidate: (s) => {
      const e = validateQuotationTerms(s.extra);
      return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, tt(v)]));
    },
  };
}

export function QuotationEditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { store, user } = useAuth();
  const siq = !!store?.settings?.enable_sales_in_quotation;
  const storeVat = store?.vat_percent ?? 15;
  const noTax = !!store?.settings?.no_tax_for_quotation_invoice;
  const q = useRecord<Quotation>(QUOTATION, id);
  const storeId = useStoreId();
  // ?customer_id= (Customer 360 → "New quotation") prefills the party.
  const customerId = !id ? sp.get('customer_id') : null;
  const cust = useQuery({
    queryKey: ['quotation-customer-prefill', customerId, storeId],
    queryFn: ({ signal }) => loadCustomerPrefill(customerId!, storeId, signal),
    enabled: !!customerId && !!storeId,
    gcTime: 0,
  });
  const initialType: QuotationType = siq && sp.get('type') === 'invoice' ? 'invoice' : 'quotation';
  // AI procurement "Create quotation" (?from_rfq=) leaves a one-shot sessionStorage prefill.
  const [rfq] = useState(() => (!id ? takeRfqPrefill() : null));
  const [typeOverride, setTypeOverride] = useState<QuotationType | null>(null);
  // A type switch on a new draft remounts the editor with the transformed state (VAT / payments change).
  const [carry, setCarry] = useState<{ gen: number; state: DocState | null }>({ gen: 0, state: null });
  const type: QuotationType = typeOverride || (id ? (q.data?.type === 'invoice' ? 'invoice' : 'quotation') : initialType);

  const cfg = useMemo(() => quotationDocConfig({
    type, siq, userId: user?.id,
    prefill: () => {
      if (carry.state) return carry.state;
      const base = quotationDefaults(store?.settings, initialType);
      const vat = noTax && initialType === 'invoice' ? 0 : storeVat;
      const fromRfq = rfq ? rfqPrefillToDocState(rfq, vat) : {};
      return { ...(cust.data || {}), ...fromRfq, extra: { ...base, ...(fromRfq.extra || {}) }, summary: { vat_percent: vat, shipping_handling_fees: 0, discount: 0, discount_with_vat: 0, auto_rounding_amount: true, rounding_amount: 0, cash_discount: 0 } };
    },
    onType: (s, to, set) => {
      if (to === (s.extra.type || 'quotation')) return;
      if (id) { set({ type: to }); setTypeOverride(to); return; }
      setCarry((c) => ({ gen: c.gen + 1, state: switchQuotationType(s, to, { noTax, storeVat }) }));
      setTypeOverride(to);
    },
  }), [type, siq, user?.id, carry, store?.settings, initialType, noTax, storeVat, id, cust.data, rfq]);

  if (id && q.isError) return <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (customerId && cust.isError) return <div className="pad"><ErrorState error={cust.error} onRetry={() => cust.refetch()} /></div>;
  if ((id && !q.data) || !store || (customerId && !cust.data)) return <div className="pad stack"><Skeleton width={260} height={22} /><Skeleton height={300} /></div>;
  return <DocumentEditor key={id || `new:${initialType}:${carry.gen}`} config={cfg} id={id} existing={q.data} />;
}

/** Linked sales invoices with unlink (DELETE /v1/quotation/{id}/order/{order_id}). */
function LinkedInvoices({ d, canUnlink }: { d: Quotation; canUnlink: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [confirmEl, ask] = useConfirm();
  const [busy, setBusy] = useState('');
  const links = linkedOrders(d);
  const unlink = async (o: { id?: string; code: string }) => {
    if (!o.id) return;
    if (!(await ask(t('Unlink {{code}}?', { code: o.code }), { body: t('The sales invoice stays; it just won’t be linked to this quotation any more.'), danger: true, confirmLabel: t('Unlink') }))) return;
    setBusy(o.id);
    try {
      await api.del(`${QUOTATION}/${d.id}/order/${o.id}`, { search: { store_id: storeId } });
      toast.success(t('{{code}} unlinked', { code: o.code }));
      qc.invalidateQueries({ queryKey: [QUOTATION] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <Card title={t('Sales invoices')} sub={t('Invoices created from this quotation')} bodyClass="card-b-tight">
      {links.length === 0 ? <div className="muted" style={{ padding: 12 }}>{t('Not invoiced yet.')}</div> : (
        <table className="lines">
          <tbody>
            {links.map((o) => (
              <tr key={o.code}>
                <td><a className="link mono" href={o.id ? `/sales/invoices/${o.id}` : undefined} onClick={(e) => { e.preventDefault(); if (o.id) nav(`/sales/invoices/${o.id}`); }}>{o.code}</a></td>
                <td style={{ width: 44 }}>{canUnlink && o.id && <IconButton icon="x" label={`${t('Unlink')} ${o.code}`} disabled={busy === o.id} onClick={() => unlink(o)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {confirmEl}
    </Card>
  );
}

export function QuotationViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can } = useAuth();
  const q = useRecord<Quotation>(QUOTATION, id);
  const [confirmEl, ask] = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const siq = !!store?.settings?.enable_sales_in_quotation;
  const zatcaLive = store?.zatca?.phase === '2' && !!store?.zatca?.connected;

  const remove = async (d: Quotation) => {
    if (!(await ask(t('Delete {{code}}?', { code: d.code }), { body: t('The quotation will be removed from lists. This can’t be undone here.'), danger: true, confirmLabel: t('Delete') }))) return;
    setDeleting(true);
    try {
      await api.del(`${QUOTATION}/${d.id}`, { search: { store_id: storeId } });
      toast.success(t('{{code}} deleted', { code: d.code }));
      qc.invalidateQueries({ queryKey: [QUOTATION] });
      nav(QTN_LIST, { replace: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
      setDeleting(false);
    }
  };

  const view: ViewConfig = {
    icon: 'clip',
    crumbs: [{ label: 'Sales', to: QTN_LIST }, { label: 'Quotations', to: QTN_LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    showPayments: q.data?.type === 'invoice',
    hideVat: q.data?.type === 'invoice' && !!(store?.settings?.no_tax_for_quotation_invoice || store?.settings?.hide_quotation_invoice_vat),
    pills: (d) => (
      <>
        {(siq || d.type === 'invoice') && <TypePill type={d.type} />}
        {d.type === 'invoice' ? <PaymentPill status={d.payment_status} /> : isExpired(d) ? <Pill tone="warn" icon="clock">{t('Expired')}</Pill> : <StatusPill status={d.status} />}
        {d.type !== 'invoice' && <InvoicedPill d={d} />}
        {zatcaLive && isInvoiced(d) && (d.reported_to_zatca ? <Pill tone="good" icon="shield">{t('Reported')}</Pill> : <Pill tone="neutral">{t('Not reported')}</Pill>)}
      </>
    ),
    facets: (d) => {
      const until = validUntil(d.date, d.validity_days);
      return [
        { label: t('Total incl. VAT'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
        ...(d.type === 'invoice' ? [
          { label: t('Paid'), value: fmtMoney(d.total_payment_received) },
          { label: t('Balance due'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'crit' as const : undefined },
        ] : [
          { label: t('Valid until'), value: until ? fmtDate(until) : '—', tone: isExpired(d) ? 'warn' as const : undefined },
          { label: t('Delivery'), value: d.delivery_days ? `${d.delivery_days} ${t('days')}` : '—', hideOnMobile: true },
        ]),
        { label: t('Net profit'), value: fmtMoney(d.net_profit), hideOnMobile: true },
        ...(d.return_count ? [{ label: t('Returns'), value: `${d.return_count} · ${fmtMoney(d.return_amount)}`, hideOnMobile: true }] : []),
      ];
    },
    steps: (d) => {
      if (d.type === 'invoice') {
        const steps = ['Created', 'Partially paid', 'Paid'];
        return { steps, current: d.payment_status === 'paid' ? 3 : d.payment_status === 'paid_partially' ? 2 : 1 };
      }
      const steps = ['Created', 'Sent', 'Accepted', 'Invoiced'];
      const cur = isInvoiced(d) ? 4 : d.status === 'accepted' ? 3 : d.status === 'delivered' || d.status === 'pending' ? 2 : 1;
      return { steps, current: cur };
    },
    flow: (d) => [
      ...(d.rfq_received_code ? [{ kind: t('RFQ'), icon: 'mail' as const, code: d.rfq_received_code }] : []),
      { kind: d.type === 'invoice' ? t('Sales (invoice)') : t('Quotation'), icon: 'clip' as const, code: d.code, current: true, status: d.type === 'invoice' ? <PaymentPill status={d.payment_status} /> : <StatusPill status={d.status} /> },
      ...(linkedOrders(d).length
        ? linkedOrders(d).map((o) => ({ kind: t('Invoice'), icon: 'receipt' as const, code: o.code, to: o.id ? `/sales/invoices/${o.id}` : undefined }))
        : d.type !== 'invoice' && can('sales', 'create') ? [{ kind: t('Invoice'), icon: 'receipt' as const, code: t('Create invoice'), ghost: true, to: `/sales/invoices/new?quotation_id=${d.id}` }] : []),
      ...(d.type === 'invoice' && siq
        ? d.return_count
          ? [{ kind: t('Returns'), icon: 'undo' as const, code: `${d.return_count} · ${fmtMoney(d.return_amount)}`, to: `${RETURNS}?f.quotation=${d.id}|${encodeURIComponent(d.code)}` }]
          : can('qtn_sales_return', 'create') ? [{ kind: t('Return'), icon: 'undo' as const, code: t('Create return'), ghost: true, to: `${RETURNS}/new?quotation_id=${d.id}` }] : []
        : []),
    ],
    actions: (d) => (
      <>
        {d.type !== 'invoice' && can('sales', 'create') && <Button variant="primary" icon="receipt" onClick={() => nav(`/sales/invoices/new?quotation_id=${d.id}`)}>{t('Create invoice')}</Button>}
        {d.type === 'invoice' && d.balance_amount > 0 && can('quotations', 'update') && <Button variant="primary" icon="cash" onClick={() => nav(`${QTN_LIST}/${d.id}/edit`)}>{t('Receive payment')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/quotation/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="quotation" compact />
        {d.type === 'invoice' && siq && can('qtn_sales_return', 'create') && <Button icon="undo" className="hide-sm" onClick={() => nav(`${RETURNS}/new?quotation_id=${d.id}`)}>{t('Return')}</Button>}
        {can('quotations', 'update') && <Button icon="edit" onClick={() => nav(`${QTN_LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {can('quotations', 'delete') && <IconButton icon="trash" label={t('Delete')} title={t('Delete')} disabled={deleting} onClick={() => remove(d)} />}
      </>
    ),
    sideExtra: (d) => [{
      title: t('Terms'),
      body: (
        <div className="kv" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <dt>{t('Status')}</dt><dd><StatusPill status={d.status} /></dd>
          <dt>{t('Validity')}</dt><dd className="num">{d.validity_days ? `${d.validity_days} ${t('days')}` : '—'}</dd>
          <dt>{t('Delivery')}</dt><dd className="num">{d.delivery_days ? `${d.delivery_days} ${t('days')}` : '—'}</dd>
          <dt>{t('Delivery from')}</dt><dd>{d.delivery_from || '—'}</dd>
          <dt>{t('Delivered by')}</dt><dd>{d.delivered_by_name || '—'}</dd>
        </div>
      ),
    }],
    extraTabs: [{ id: 'invoices', label: 'Sales invoices', render: (d) => <LinkedInvoices d={d as Quotation} canUnlink={can('quotations', 'update')} /> }],
  };

  return (
    <>
      <DocumentView doc={q.data} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {confirmEl}
    </>
  );
}
