import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { DocumentView, type ViewConfig } from '@/framework/doc/DocumentView';
import { PaymentPill, PAYMENT_STATUS_OPTIONS } from '@/framework/doc/status';
import { partyToOption, searchParties } from '@/framework/doc/lookups';
import { Button } from '@/ui/Button';
import { useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { NON_VAT, NON_VAT_RETURN, PATHS, searchNonVatSales } from './api';
import { ReturnEditorPage } from './components/ReturnEditor';
import { ShareActions } from './components/ShareActions';
import { looksLikeCode, nonVatDisplayDoc } from './logic';

type NR = Record<string, any> & { id: string; code: string };
const LIST = PATHS.nonVatReturns;
const SELECT = 'id,code,date,non_vat_sales_id,non_vat_sales_code,customer_id,customer_name,net_total,total_payment_paid,balance_amount,payment_status,cash_discount,net_profit,created_by_name,created_at';

export function nonVatReturnListConfig(storeId: string): ListConfig<NR> {
  return {
    title: 'Non-VAT sales returns',
    subtitle: 'Returns against non-VAT sales',
    icon: 'undo',
    endpoint: NON_VAT_RETURN,
    resource: 'non_vat_sales_return',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: (q) => (looksLikeCode(q) ? { code: q } : { customer_name: q }),
    searchPlaceholder: 'Search return # or customer…',
    createPath: `${LIST}/new`,
    createLabel: 'New return',
    detailPath: (r) => `${LIST}/${r.id}`,
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async (q, s) => (await searchParties('customer', storeId, q, s)).map(partyToOption) },
      { id: 'sale', label: 'Non-VAT sale', type: 'picker', toSearch: (v) => ({ non_vat_sales_id: v }), load: (q, s) => searchNonVatSales(storeId, q, s) },
      { id: 'payment_status', label: 'Refund status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
    ],
    summary: (m) => [
      { label: 'Returns', value: fmtMoney(m.total_non_vat_sales_return) },
      { label: 'Refunded', value: fmtMoney(m.paid_non_vat_sales_return) },
      { label: 'Credit (not refunded)', value: fmtMoney(m.unpaid_non_vat_sales_return), tone: m.unpaid_non_vat_sales_return > 0 ? 'warn' : undefined },
      { label: 'Cash refunds', value: fmtMoney(m.cash_non_vat_sales_return) },
      { label: 'Bank refunds', value: fmtMoney(m.bank_account_non_vat_sales_return) },
      { label: 'Discount returned', value: fmtMoney(m.discount) },
      { label: 'Cash discount returned', value: fmtMoney(m.cash_discount) },
      { label: 'Net profit returned', value: fmtMoney(m.net_profit) },
    ],
    columns: [
      { key: 'code', header: tt('Return #'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'sale', header: tt('Sale #'), sortKey: 'non_vat_sales_code', render: (r) => <span className="mono">{r.non_vat_sales_code || '—'}</span> },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'customer', header: tt('Customer'), sortKey: 'customer_name', render: (r) => <b><bdi>{r.customer_name || '—'}</bdi></b> },
      { key: 'net_total', header: tt('Total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'paid', header: tt('Refunded'), sortKey: 'total_payment_paid', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(r.total_payment_paid)}</span> },
      { key: 'balance', header: tt('Credit balance'), sortKey: 'balance_amount', align: 'end', render: (r) => <span className="num">{fmtMoney(r.balance_amount)}</span> },
      { key: 'status', header: tt('Refund'), render: (r) => <PaymentPill status={r.payment_status} /> },
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
    ],
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <><span className="mono">{r.non_vat_sales_code}</span> · <bdi>{r.customer_name}</bdi></>, meta: <>{fmtDate(r.date)} <PaymentPill status={r.payment_status} /></> }),
    exportColumns: [
      { header: 'Return #', value: (r) => r.code },
      { header: 'Sale #', value: (r) => r.non_vat_sales_code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Total', value: (r) => r.net_total },
      { header: 'Refunded', value: (r) => r.total_payment_paid },
      { header: 'Credit balance', value: (r) => r.balance_amount },
    ],
    exportName: 'non-vat-sales-returns',
    showFooter: false,
  };
}

export function NonVatReturnListPage() {
  const storeId = useStoreId();
  return <ListPage config={nonVatReturnListConfig(storeId)} />;
}

export function NonVatReturnEditorPage() {
  return <ReturnEditorPage mode="non_vat" />;
}

export function NonVatReturnViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const q = useRecord<NR>(NON_VAT_RETURN, id);
  const [busy, setBusy] = useState(false);
  const [confirmEl, ask] = useConfirm();

  const del = async (d: NR) => {
    if (!(await ask(t('Delete return {{code}}?', { code: d.code }), { danger: true, confirmLabel: t('Delete'), body: t('Stock added by this return is removed again.') }))) return;
    setBusy(true);
    try {
      await api.del(`${NON_VAT_RETURN}/${d.id}`, { search: { store_id: storeId } });
      [NON_VAT_RETURN, NON_VAT].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Return deleted'));
      nav(LIST);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const view: ViewConfig = {
    icon: 'undo',
    crumbs: [{ label: 'Sales', to: PATHS.invoices }, { label: 'Non-VAT sales returns', to: LIST }],
    partyLabel: 'Customer',
    partyName: (d) => d.customer_name,
    hideVat: true,
    showPayments: true,
    pills: (d) => <PaymentPill status={d.payment_status} />,
    facets: (d) => [
      { label: t('Return total'), value: <>{fmtMoney(d.net_total)} <small>SAR</small></> },
      { label: t('Refunded'), value: fmtMoney(d.total_payment_paid) },
      { label: t('Credit balance'), value: fmtMoney(d.balance_amount), tone: d.balance_amount > 0 ? 'warn' : undefined },
    ],
    flow: (d) => [
      ...(d.non_vat_sales_id ? [{ kind: t('Sale'), icon: 'receipt' as const, code: d.non_vat_sales_code, to: `${PATHS.nonVat}/${d.non_vat_sales_id}` }] : []),
      { kind: t('Return'), icon: 'undo' as const, code: d.code, current: true, status: <PaymentPill status={d.payment_status} /> },
    ],
    actions: (d) => (
      <>
        <Button icon="print" onClick={() => window.open(`/print/non_vat_sales_return/${d.id}`, '_blank', 'noopener')}>{t('Print')}</Button>
        <ShareActions doc={d} modelName="non_vat_sales_return" />
        {can('non_vat_sales_return', 'update') && <Button icon="edit" onClick={() => nav(`${LIST}/${d.id}/edit`)}>{t('Edit')}</Button>}
        {can('non_vat_sales_return', 'delete') && <Button variant="danger" icon="trash" loading={busy} onClick={() => del(d)}>{t('Delete')}</Button>}
      </>
    ),
  };
  return (
    <>
      <DocumentView doc={nonVatDisplayDoc(q.data)} loading={q.isLoading} error={q.error} refetch={() => q.refetch()} config={view} />
      {confirmEl}
    </>
  );
}
