import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { IconButton } from '@/ui/Button';
import { Pill, Tag } from '@/ui/Pill';
import { useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDate, fmtMoney, fmtNumber } from '@/lib/format';
import { t as tt } from '@/i18n';
import { CUSTOMER } from './api';
import { stat, type Customer } from './logic';
import { customerSearchKey } from './searchKey';
import './customers.css';

export const CUSTOMERS_PATH = '/sales/customers';

const SELECT = 'id,code,deleted,name,name_in_arabic,email,phone,vat_no,credit_limit,credit_balance,account,stores,churn_risk_tier,lifetime_value_segment_for_12months,last_purchase_at,created_by_name,created_at';

export const CHURN_TIERS = ['Critical', 'High', 'Medium', 'Low'];
export const CLV_SEGMENTS = ['High Value', 'Mid Value', 'Low Value'];

export function ChurnPill({ tier }: { tier?: string }) {
  if (!tier) return <span className="muted">—</span>;
  const tone = tier === 'Critical' || tier === 'High' ? 'crit' : tier === 'Medium' ? 'warn' : 'good';
  return <Pill tone={tone} icon={tone === 'good' ? 'checkc' : 'alert'}>{tt(tier)}</Pill>;
}


export function customerListConfig(o: { storeId: string; qtnInvoices: boolean; canUpdate: boolean; canDelete: boolean; onDelete: (c: Customer) => void; onRestore: (c: Customer) => void; nav: (p: string) => void }): ListConfig<Customer> {
  const s = (c: Customer, k: string) => stat(c, o.storeId, k);
  return {
    title: 'Customers',
    subtitle: 'People and companies you sell to — balances, credit and history',
    icon: 'users',
    endpoint: CUSTOMER,
    resource: 'customers',
    select: SELECT,
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: customerSearchKey,
    searchPlaceholder: 'Search name, phone, VAT no. or code…',
    createPath: `${CUSTOMERS_PATH}/new`,
    createLabel: 'New customer',
    detailPath: (r) => `${CUSTOMERS_PATH}/${r.id}`,
    views: [
      { id: 'all', label: 'All customers' },
      { id: 'balance', label: 'With balance', search: { ignore_zero_credit_balance: 1 } },
      { id: 'unpaid', label: 'Unpaid invoices', search: { sales_balance_amount: '>0' } },
      ...(o.qtnInvoices ? [{ id: 'qtn', label: 'Qtn. invoice balance', search: { ignore_zero_qtn_credit_balance: 1 } }] : []),
      { id: 'deleted', label: 'Deleted', search: { deleted: 1 } },
    ],
    filters: [
      { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
      { id: 'credit_balance', label: 'Credit balance', type: 'number' },
      { id: 'credit_limit', label: 'Credit limit', type: 'number' },
      { id: 'sales_amount', label: 'Sales', type: 'number' },
      { id: 'churn_risk_tier', label: 'Churn risk', type: 'select', options: CHURN_TIERS.map((x) => ({ value: x, label: x })) },
      { id: 'lifetime_value_segment_for_12months', label: 'CLV segment', type: 'select', options: CLV_SEGMENTS.map((x) => ({ value: x, label: x })) },
    ],
    summary: (m) => [
      { label: 'Credit balance', value: fmtMoney(m.credit_balance), tone: m.credit_balance > 0 ? 'warn' : undefined },
      { label: 'Sales', value: fmtMoney(m.sales) },
      { label: 'Paid', value: fmtMoney(m.sales_paid) },
      { label: 'Unpaid sales', value: fmtMoney(m.sales_credit_balance), tone: m.sales_credit_balance > 0 ? 'crit' : undefined },
      { label: 'Profit', value: fmtMoney(m.sales_profit), tone: 'good' },
      { label: 'Returns', value: fmtMoney(m.sales_return) },
      ...(o.qtnInvoices ? [{ label: 'Qtn. sales', value: fmtMoney(m.quotation_sales) }] : []),
    ],
    columns: [
      { key: 'code', header: tt('ID'), sortKey: 'code', className: 'code', render: (r) => r.code || '—' },
      {
        key: 'name', header: tt('Customer'), sortKey: 'name', className: 'two', render: (r) => (
          <>
            <b><bdi>{r.name}</bdi>{r.deleted && <> <Pill tone="crit" icon="trash">{tt('Deleted')}</Pill></>}</b>
            <span>{r.name_in_arabic ? <bdi dir="rtl">{r.name_in_arabic}</bdi> : r.vat_no ? `VAT ${r.vat_no}` : tt('Individual')}</span>
          </>
        ),
      },
      { key: 'phone', header: tt('Phone'), hideBelow: 'md', render: (r) => <span className="num">{r.phone || '—'}</span> },
      { key: 'vat_no', header: tt('VAT no.'), hideBelow: 'lg', render: (r) => <span className="num">{r.vat_no || '—'}</span> },
      { key: 'sales', header: tt('Sales'), sortKey: 'stores.sales_amount', align: 'end', hideBelow: 'md', render: (r) => <span className="num">{fmtMoney(s(r, 'sales_amount'))}</span> },
      { key: 'count', header: tt('Invoices'), sortKey: 'stores.sales_count', align: 'end', hideBelow: 'lg', render: (r) => <span className="num">{fmtNumber(s(r, 'sales_count'), 0)}</span> },
      {
        key: 'credit_balance', header: tt('Credit balance'), sortKey: 'credit_balance', align: 'end', render: (r) => {
          const over = (r.credit_limit || 0) > 0 && (r.credit_balance || 0) > (r.credit_limit || 0);
          return <span className="num" style={(r.credit_balance || 0) > 0 ? { color: over ? 'var(--crit)' : 'var(--warn)', fontWeight: 600 } : { color: 'var(--text-4)' }}>{fmtMoney(r.credit_balance)}</span>;
        },
      },
      { key: 'credit_limit', header: tt('Credit limit'), sortKey: 'credit_limit', align: 'end', hideBelow: 'lg', render: (r) => <span className="num muted">{r.credit_limit ? fmtMoney(r.credit_limit) : '—'}</span> },
      { key: 'churn', header: tt('Churn risk'), sortKey: 'churn_risk_tier', hideBelow: 'xl', render: (r) => <ChurnPill tier={r.churn_risk_tier} /> },
      { key: 'clv', header: tt('CLV segment'), hideBelow: 'xl', render: (r) => (r.lifetime_value_segment_for_12months ? <Tag>{tt(r.lifetime_value_segment_for_12months)}</Tag> : <span className="muted">—</span>) },
      { key: 'last', header: tt('Last purchase'), sortKey: 'last_purchase_at', hideBelow: 'xl', render: (r) => <span className="num">{fmtDate(r.last_purchase_at)}</span> },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: (r) => (
      <span className="row" style={{ gap: 2, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        {!r.deleted && o.canUpdate && <IconButton icon="edit" label={tt('Edit')} onClick={() => o.nav(`${CUSTOMERS_PATH}/${r.id}/edit`)} />}
        {!r.deleted && o.canDelete && <IconButton icon="trash" label={tt('Delete')} onClick={() => o.onDelete(r)} />}
        {r.deleted && o.canUpdate && <IconButton icon="undo" label={tt('Restore')} onClick={() => o.onRestore(r)} />}
      </span>
    ),
    mobileCard: (r) => ({
      title: <bdi>{r.name}</bdi>,
      amount: <span style={(r.credit_balance || 0) > 0 ? { color: 'var(--warn)' } : undefined}>{fmtMoney(r.credit_balance)}</span>,
      subtitle: <span className="mono">{[r.code, r.phone].filter(Boolean).join(' · ')}</span>,
      meta: r.deleted ? <Pill tone="crit" icon="trash">{tt('Deleted')}</Pill> : <>{tt('Sales')} <span className="num">{fmtMoney(s(r, 'sales_amount'))}</span></>,
    }),
    exportColumns: [
      { header: 'ID', value: (r) => r.code },
      { header: 'Name', value: (r) => r.name },
      { header: 'Name (Arabic)', value: (r) => r.name_in_arabic },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Email', value: (r) => r.email },
      { header: 'VAT no.', value: (r) => r.vat_no },
      { header: 'Sales', value: (r) => s(r, 'sales_amount') },
      { header: 'Invoices', value: (r) => s(r, 'sales_count') },
      { header: 'Credit balance', value: (r) => r.credit_balance },
      { header: 'Credit limit', value: (r) => r.credit_limit },
      { header: 'Churn risk', value: (r) => r.churn_risk_tier },
      { header: 'Created at', value: (r) => fmtDate(r.created_at) },
    ],
    exportName: 'customers',
  };
}

/** Soft delete / restore with confirmation + toast (masters.md §0). Shared by the list and Customer 360. */
export function useCustomerDeleteRestore() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const [dialog, ask] = useConfirm();
  const run = async (c: Customer, mode: 'delete' | 'restore') => {
    const ok = await ask(mode === 'delete' ? t('Delete customer?') : t('Restore customer?'), {
      body: mode === 'delete' ? <p><bdi>{c.name}</bdi> — {t('The customer is hidden from lists and pickers. You can restore it later from the “Deleted” view.')}</p> : <p><bdi>{c.name}</bdi></p>,
      danger: mode === 'delete', confirmLabel: mode === 'delete' ? t('Delete') : t('Restore'),
    });
    if (!ok) return false;
    try {
      if (mode === 'delete') await api.del(`${CUSTOMER}/${c.id}`, { search: { store_id: storeId } });
      else await api.post(`${CUSTOMER}/restore/${c.id}`, {}, { search: { store_id: storeId } });
      qc.invalidateQueries({ queryKey: [CUSTOMER] });
      toast.success(mode === 'delete' ? t('Customer deleted') : t('Customer restored'));
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
      return false;
    }
  };
  return { dialog, remove: (c: Customer) => run(c, 'delete'), restore: (c: Customer) => run(c, 'restore') };
}

export function CustomerListPage() {
  const nav = useNavigate();
  const storeId = useStoreId();
  const { can, setting } = useAuth();
  const dr = useCustomerDeleteRestore();
  const cfg = customerListConfig({
    storeId, nav, qtnInvoices: !!setting('enable_sales_in_quotation'),
    canUpdate: can('customers', 'update'), canDelete: can('customers', 'delete'),
    onDelete: (c) => { void dr.remove(c); }, onRestore: (c) => { void dr.restore(c); },
  });
  return <>{<ListPage config={cfg} />}{dr.dialog}</>;
}
