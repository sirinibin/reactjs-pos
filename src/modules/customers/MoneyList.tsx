import { useNavigate } from 'react-router-dom';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { searchParties, partyToOption } from '@/framework/doc/lookups';
import { METHOD_LABEL, ZatcaPill } from '@/framework/doc/status';
import { IconButton } from '@/ui/Button';
import { Tag } from '@/ui/Pill';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { methodsFor, type MoneyKind } from './logic';
import { MONEY, partyName, zatcaEnabled, type MoneyDef } from './money';
import './customers.css';

type Money = Record<string, any> & { id: string; code: string };

const SELECT = 'id,code,date,type,customer_id,customer_name,customer_name_arabic,vendor_id,vendor_name,employee_id,employee_name,net_total,total,total_discount,payment_methods,description,created_by_name,created_at,zatca';

export const moneySearchKey = (q: string) => (/\d/.test(q) ? { code: q.trim() } : { description: q.trim() });

export function moneyListConfig(def: MoneyDef, o: { zatcaLive: boolean; employees: boolean; canUpdate: boolean; nav: (p: string) => void; storeId: string }): ListConfig<Money> {
  const methods = (r: Money) => (r.payment_methods || []).map((m: string) => tt(METHOD_LABEL[m] || (m === 'purchase_fund' ? 'Purchase fund A/c' : m))).join(', ') || '—';
  const isReceivable = def.kind === 'receivable';
  return {
    title: def.title,
    subtitle: def.subtitle,
    icon: def.icon,
    endpoint: def.endpoint,
    resource: def.resource,
    select: SELECT,
    defaultSort: { key: 'date', dir: -1 },
    searchKey: moneySearchKey,
    searchPlaceholder: 'Search ID or description…',
    createPath: `${def.listPath}/new`,
    createLabel: def.newLabel,
    detailPath: (r) => `${def.listPath}/${r.id}`,
    views: [
      { id: 'all', label: 'All' },
      { id: 'customer', label: 'Customers', search: { type: 'customer' } },
      { id: 'vendor', label: 'Vendors', search: { type: 'vendor' } },
      ...(o.employees ? [{ id: 'employee', label: 'Employees', search: { type: 'employee' } }] : []),
      ...(o.zatcaLive ? [{ id: 'zatca', label: 'Not reported to ZATCA', search: { zatca_reporting_passed: 'false' } }] : []),
    ],
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'customer', label: 'Customer', type: 'picker', toSearch: (v) => ({ customer_id: v }), load: async (q, s) => (await searchParties('customer', o.storeId, q, s)).map(partyToOption) },
      { id: 'vendor', label: 'Vendor', type: 'picker', toSearch: (v) => ({ vendor_id: v }), load: async (q, s) => (await searchParties('vendor', o.storeId, q, s)).map(partyToOption) },
      { id: 'payment_methods', label: 'Payment method', type: 'select', options: methodsFor(def.kind) },
      { id: 'net_total', label: 'Amount', type: 'number', placeholder: 'e.g. >=1000' },
      { id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    summary: (m) => [
      { label: 'Total', value: fmtMoney(m.total) },
      { label: 'Cash', value: fmtMoney(m.cash) },
      { label: 'Bank', value: fmtMoney(m.bank) },
      ...(isReceivable ? [{ label: 'Purchase fund', value: fmtMoney(m.purchase_fund) }] : []),
      { label: isReceivable ? 'From customers' : 'To customers', value: fmtMoney(m.total_customer) },
      { label: isReceivable ? 'From vendors' : 'To vendors', value: fmtMoney(m.total_vendor) },
    ],
    columns: [
      { key: 'code', header: tt('ID'), sortKey: 'code', className: 'code', render: (r) => r.code },
      { key: 'date', header: tt('Date'), sortKey: 'date', render: (r) => <span className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></span> },
      { key: 'type', header: tt('Type'), sortKey: 'type', hideBelow: 'md', render: (r) => <Tag>{tt(r.type === 'vendor' ? 'Vendor' : r.type === 'employee' ? 'Employee' : 'Customer')}</Tag> },
      { key: 'party', header: tt(isReceivable ? 'Received from' : 'Paid to'), className: 'two', render: (r) => <><b><bdi>{partyName(r) || '—'}</bdi></b>{r.description ? <span>{r.description}</span> : null}</> },
      { key: 'net_total', header: tt('Net total'), sortKey: 'net_total', align: 'end', render: (r) => <b className="num">{fmtMoney(r.net_total)}</b> },
      { key: 'methods', header: tt('Payment methods'), hideBelow: 'md', render: methods },
      ...(o.zatcaLive ? [{ key: 'zatca', header: tt('ZATCA'), hideBelow: 'lg' as const, render: (r: Money) => <ZatcaPill zatca={r.zatca} /> }] : []),
      { key: 'created_by', header: tt('Created by'), hideBelow: 'xl', render: (r) => r.created_by_name || '—' },
      { key: 'created_at', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: (r) => (
      <span className="row" style={{ gap: 2, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
        <IconButton icon="print" label={tt('Print receipt')} onClick={() => window.open(`${def.listPath}/${r.id}/print`, '_blank', 'noopener')} />
        {o.canUpdate && !r.zatca?.reporting_passed && <IconButton icon="edit" label={tt('Edit')} onClick={() => o.nav(`${def.listPath}/${r.id}/edit`)} />}
      </span>
    ),
    mobileCard: (r) => ({ title: <span className="mono">{r.code}</span>, amount: fmtMoney(r.net_total), subtitle: <bdi>{partyName(r)}</bdi>, meta: <>{fmtDate(r.date)} · {methods(r)}</> }),
    exportColumns: [
      { header: 'ID', value: (r) => r.code },
      { header: 'Date', value: (r) => fmtDate(r.date) },
      { header: 'Type', value: (r) => r.type },
      { header: 'Customer', value: (r) => r.customer_name },
      { header: 'Vendor', value: (r) => r.vendor_name },
      { header: 'Employee', value: (r) => r.employee_name },
      { header: 'Net total', value: (r) => r.net_total },
      { header: 'Payment methods', value: (r) => (r.payment_methods || []).join(' ') },
      { header: 'Description', value: (r) => r.description },
      { header: 'Created by', value: (r) => r.created_by_name },
    ],
    exportName: def.kind === 'receivable' ? 'receivables' : 'payables',
  };
}

export function MoneyListPage({ kind }: { kind: MoneyKind }) {
  const def = MONEY[kind];
  const nav = useNavigate();
  const storeId = useStoreId();
  const { store, can, setting } = useAuth();
  const cfg = moneyListConfig(def, { zatcaLive: zatcaEnabled(store, def), employees: !!setting('enable_employee_module'), canUpdate: can(def.resource, 'update'), nav, storeId });
  return <ListPage config={cfg} />;
}

export const ReceivableListPage = () => <MoneyListPage kind="receivable" />;
export const PayableListPage = () => <MoneyListPage kind="payable" />;
