import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { METHOD_LABEL, PaymentPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { ReceivePaymentModal } from '@/framework/doc/ReceivePayment';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { Banner, useConfirm } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { ORDER, PATHS, RETURN_PAYMENT, SALES_PAY_METHODS, SALES_RETURN, searchOrders } from './api';
import { ReturnEditorPage } from './components/ReturnEditor';
import { ShareActions } from './components/ShareActions';
import { ZatcaBadge } from './components/ZatcaBadge';
import { isReturnLocked, looksLikeCode, zatcaState } from './logic';

type SR = Record<string, any> & { id: string; code: string };
const LIST = PATHS.returns;
const SELECT = 'id,code,date,order_id,order_code,customer_id,customer_name,net_total,vat_price,total_payment_paid,balance_amount,payment_status,payment_methods,cash_discount,discount,commission,net_profit,net_loss,zatca,created_by_name,created_at,deleted';

const METHOD_OPTS = [...SALES_PAY_METHODS, { value: 'sales', label: 'Sales' }];

export function salesReturnListConfig(opts: { zatcaLive: boolean; admin: boolean; storeId: string }): ListConfig<SR> {
  return {
    title: 'Sales returns',
    subtitle: 'Credit notes issued against sales invoices',
    icon: 'undo',
    endpoint: SALES_RETURN,
    resource: 'sales_return',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (/^S-INV|INV-/i.test(q) ? { order_code: q } : { code: q }),
    searchPlaceholder: 'Search return # or invoice #…',
    createPath: `${LIST}/new`,
    createLabel: 'New return',
    detailPath: (r) => `${LIST}/${r.id}`,
    views: [
      { id: 'all', label: 'All returns' },
      { id: 'credit', label: 'Not refunded', search: { payment_status: 'not_paid,paid_partially' } },
      { id: 'refunded', label: 'Refunded', search: { payment_status: 'paid' } },
      ...(opts.zatcaLive ? [{ id: 'zatca', label: 'ZATCA attention', search: { 'zatca.reporting_passed': 'reporting_failed' } }] : []),
      ...(opts.admin ? [{ id: 'deleted', label: 'Deleted', search: { deleted: 1 } }] : []),
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async (q, s) => (await searchParties('customer', opts.storeId, q, s)).map(partyToOption) },
      { id: 'order', label: 'Sales invoice', type: 'picker', toSearch: (v) => ({ order_id: v }), load: (q, s) => searchOrders(opts.storeId, q, s) },
      { id: 'payment_status', label: 'Refund status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: METHOD_OPTS },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
    ],
    summary: (m) => [
      { label: 'Sales returns', value: fmtMoney(m.total_sales_return) },
      { label: 'Refunded', value: fmtMoney(m.paid_sales_return) },
      { label: 'Credit (not refunded)', value: fmtMoney(m.unpaid_sales_return), tone: m.unpaid_sales_return > 0 ? 'warn' : undefined },
      { label: 'Cash refunds', value: fmtMoney(m.cash_sales_return) },
      { label: 'Bank refunds', value: fmtMoney(m.bank_account_sales_return) },
      { label: 'Settled against sales', value: fmtMoney(m.sales_sales_return) },
      { label: 'VAT returned', value: fmtMoney(m.vat_price) },
      { label: 'Discount returned', value: fmtMoney(m.discount) },
      { label: 'Cash discount returned', value: fmtMoney(m.cash_discount) },
      { label: 'Net profit returned', value: fmtMoney(m.net_profit) },
      { label: 'Net loss returned', value: fmtMoney(m.net_loss) },
    ],
    columns: [
      { key: 'code', header: tt('Return #'), sortKey: 'code', className: 'code', render: (r) => <>{r.code}{r.deleted && <> <Pill tone="crit">{tt('Deleted')}</Pill></>}</> },
      { key: 'order', header: tt('Invoice #'), sortKey: 'order_code', render: (r) => <span className="mono">{r.order_code || '—'}</span> },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', render: (r) => <b><bdi>{r.customer_name || '—'}</bdi></b> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Refunded'), sortKey: 'total_payment_paid', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_paid)}</span> },
      { key: 'balance', header: tt('Credit balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num" style={r.balance_amount > 0 ? { color: 'var(--warn)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Refund'), render: (r) => <PaymentPill status={r.payment_status} /> },
      ...(opts.zatcaLive ? [{ key: 'zatca', header: tt('ZATCA'), render: (r: SR) => <ZatcaBadge zatca={r.zatca} /> }] : []),
      { key: 'cash_discount', header: tt('Cash discount'), align: 'end', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtMoney(r.cash_discount)}</span> },
      { key: 'profit', header: tt('Net profit'), sortKey: 'net_profit', align: 'end', hideBelow: 'xl', render: (r) => <span className="num">{fmtMoney(r.net_profit)}</span> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <><span className="mono">{r.order_code}</span> · <bdi>{r.customer_name}</bdi></>, meta: <>{fmtDate(r.date)} <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Return #', value: (r) => r.code },
      { header: 'Invoice #', value: (r) => r.order_code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'VAT', value: (r) => r.vat_price },
      { header: 'Refunded', value: (r) => r.total_payment_paid },
      { header: 'Credit balance', value: (r) => r.balance_amount },
      { header: 'Refund status', value: (r) => r.payment_status },
      { header: 'Cash discount', value: (r) => r.cash_discount },
      { header: 'Net profit', value: (r) => r.net_profit },
      { header: 'Net loss', value: (r) => r.net_loss },
    ],
    exportName: 'sales-returns',
    showFooter: false,
  };
}

export function SalesReturnListPage() {
  const { store, isAdmin } = useAuth();
  const storeId = useStoreId();
  return <ListPage config={salesReturnListConfig({ zatcaLive: store?.zatca?.phase === '2' && !!store?.zatca?.connected, admin: isAdmin, storeId })} />;
}

export function SalesReturnEditorPage() {
  return <ReturnEditorPage mode="sales" />;
}

/** Print/PDF model: only the returned lines (sales.md §2.6). */
export const returnedOnly = (d: any) => (d ? { ...d, products: (d.products || []).filter((p: any) => p.selected) } : d);

export function SalesReturnViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { store, can, isAdmin } = useAuth();
  const q = useRecord<SR>(SALES_RETURN, id);
  const [refund, setRefund] = useState(false);
  const [busy, setBusy] = useState('');
  const [confirmEl, ask] = useConfirm();
  const zatcaLive = store?.zatca?.phase === '2' && !!store?.zatca?.connected;
  const doc = returnedOnly(q.data);

  const run = async (what: string, fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    setBusy(what);
    try {
      await fn();
      toast.success(t(ok));
      [SALES_RETURN, ORDER, RETURN_PAYMENT].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      after?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const S = { search: { store_id: storeId } };
  const del = async (d: SR) => {
    if (!(await ask(t('Delete return {{code}}?', { code: d.code }), { danger: true, confirmLabel: t('Delete'), body: t('Stock and the invoice’s returned quantities are reversed. An admin can restore it later.') }))) return;
    run('del', () => api.del(`${SALES_RETURN}/${d.id}`, S), 'Return deleted');
  };

  const view: ViewConfig = {
    icon: 'undo',
    crumbs: [{ label: 'Sales', to: PATHS.invoices }, { label: 'Sales returns', to: LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    partyLink: (d) => (d.customer_id ? `/sales/customers/${d.customer_id}` : undefined),
    showPayments: true,
    pills: (d) => <>{d.deleted && <Pill tone="crit" icon="trash">{t('Deleted')}</Pill>}<PaymentPill status={d.payment_status} />{zatcaLive && <ZatcaBadge zatca={d.zatca} />}{isReturnLocked(d, store) && <Pill tone="info" icon="lock">{t('Locked by ZATCA')}</Pill>}</>,
    facets: (d) => [
      { label: t('Return total'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Refunded'), value: fmtMoney(d.total_payment_paid) },
      { label: t('Credit balance'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'warn' : undefined },
      { label: t('VAT'), value: fmtMoney(d.vat_price), hideOnMobile: true },
      { label: t('Net profit'), value: fmtMoney(d.net_profit), hideOnMobile: true },
    ],
    flow: (d) => [
      { kind: t('Invoice'), icon: 'receipt' as const, code: d.order_code, to: d.order_id ? `${PATHS.invoices}/${d.order_id}` : undefined },
      { kind: t('Return'), icon: 'undo' as const, code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
      ...(d.payments_count ? [{ kind: t('Refunds'), icon: 'cash' as const, code: `${d.payments_count} × ${fmtMoney(d.total_payment_paid)}`, to: `${PATHS.returnPayments}?f.return=${d.id}|${encodeURIComponent(d.code)}` }] : []),
    ],
    banner: (d) => {
      if (d.deleted) return <Banner tone="warn" icon="trash">{t('This return was deleted. Stock and invoice quantities were reversed.')}</Banner>;
      const errs = [...(d.zatca?.reporting_errors || []), ...(d.zatca?.compliance_check_errors || [])];
      return zatcaLive && errs.length && !d.zatca?.reporting_passed ? <Banner tone="crit"><b>{t('ZATCA rejected this credit note.')}</b> {errs.join(' · ')}</Banner> : null;
    },
    actions: (d) => (
      <>
        {!d.deleted && d.balance_amount > 0 && can('sales_return', 'update') && <Button variant="primary" icon="cash" onClick={() => setRefund(true)}>{t('Refund')}</Button>}
        <Button icon="print" onClick={() => window.open(`/print/sales_return/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={returnedOnly(d)} modelName="sales_return" />
        {zatcaLive && !d.deleted && zatcaState(d.zatca) !== 'reported' && <Button icon="send" loading={busy === 'zatca'} onClick={() => run('zatca', () => api.post(`${SALES_RETURN}/zatca/report/${d.id}`, {}, S), 'Reported to ZATCA')}>{t('Report to ZATCA')}</Button>}
        {!d.deleted && can('sales_return', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {isAdmin && can('sales_return', 'delete') && (d.deleted
          ? <Button icon="undo" loading={busy === 'restore'} onClick={() => run('restore', () => api.post(`${SALES_RETURN}/restore/${d.id}`, {}, S), 'Return restored')}>{t('Restore')}</Button>
          : <Button variant="danger" icon="trash" loading={busy === 'del'} onClick={() => del(d)}>{t('Delete')}</Button>)}
      </>
    ),
    sideExtra: (d) => [
      { title: t('Return'), body: <div className="kv"><dt>{t('Invoice #')}</dt><dd className="mono">{d.order_code}</dd><dt>{t('Methods')}</dt><dd>{(d.payment_methods || []).map((m: string) => t(METHOD_LABEL[m] || m)).join(', ') || '—'}</dd>{d.cash_discount ? <><dt>{t('Cash discount')}</dt><dd className="num">{fmtMoney(d.cash_discount)}</dd></> : null}</div> },
      ...(zatcaLive && d.zatca ? [{ title: 'ZATCA', body: <div className="kv"><dt>{t('Status')}</dt><dd><ZatcaBadge zatca={d.zatca} /></dd>{d.invoice_count_value ? <><dt>ICV</dt><dd className="num">{d.invoice_count_value}</dd></> : null}{d.zatca.reporting_invoice_hash && <><dt>{t('Hash')}</dt><dd className="mono" style={{ fontSize: 11 }}>{String(d.zatca.reporting_invoice_hash).slice(0, 12)}…</dd></>}</div> }] : []),
    ],
  };

  return (
    <>
      <DocumentView doc={doc} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {q.data && (
        <ReceivePaymentModal open={refund} onClose={() => setRefund(false)} endpoint={RETURN_PAYMENT} title={`${t('Refund')} · ${q.data.code}`} methods={SALES_PAY_METHODS}
          parent={{ sales_return_id: q.data.id, sales_return_code: q.data.code, order_id: q.data.order_id, order_code: q.data.order_code }} balance={q.data.balance_amount} invalidate={[SALES_RETURN, ORDER]} />
      )}
      {confirmEl}
    </>
  );
}

export const salesReturnSearch = (storeId: string, q: string, signal: AbortSignal) =>
  api.get<any[]>(SALES_RETURN, { search: { store_id: storeId, ...(looksLikeCode(q) ? { code: q } : { order_code: q }) }, limit: 5, select: 'id,code,order_code,customer_name,net_total', sort: '-created_at' }, signal);
