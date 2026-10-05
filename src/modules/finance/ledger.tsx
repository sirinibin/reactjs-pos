import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime } from '@/lib/format';
import { t as tt } from '@/i18n';
import { loadAccounts } from './components';
import { documentPath, journalLabel, journalTotals, POSTING_TYPES, titleCase, type Journal } from './logic';

export const LEDGER = '/v1/ledger';
type Ledger = { id: string; reference_model?: string; reference_code?: string; reference_id?: string; journals?: Journal[]; created_at?: string };

function Journals({ js, onAccount }: { js: Journal[]; onAccount: (id: string) => void }) {
  return (
    <div className="jl" role="list">
      {js.map((j, i) => (
        <Fragment key={i}>
          <span className={j.debit_or_credit === 'debit' ? 'dr' : 'cr'} role="listitem">
            {j.account_id ? <button type="button" className="link" onClick={(e) => { e.stopPropagation(); onAccount(j.account_id!); }}><bdi>{journalLabel(j)}</bdi></button> : <bdi>{journalLabel(j)}</bdi>}
          </span>
          <span className="n num">{j.debit_or_credit === 'debit' ? fmtMoney(j.debit) : ''}</span>
          <span className="n num c2">{j.debit_or_credit === 'credit' ? fmtMoney(j.credit) : ''}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function ledgerListConfig(storeId: string, onAccount: (id: string) => void): ListConfig<Ledger> {
  return {
    title: 'Ledger',
    subtitle: 'Journal entries posted by every financial document',
    icon: 'book',
    endpoint: LEDGER,
    resource: 'ledger',
    select: 'id,store_id,reference_id,reference_model,reference_code,journals,created_at',
    defaultSort: { key: 'journals.date', dir: -1 },
    searchKey: 'reference_code',
    searchPlaceholder: 'Search document # (e.g. S-INV-000001)…',
    filters: [
      { id: 'date', label: 'Date', type: 'daterange' },
      { id: 'account', label: 'Account', type: 'picker', toSearch: (v) => ({ account_id: v }), load: (q, s) => loadAccounts(storeId, q, s) },
      { id: 'reference_model', label: 'Type', type: 'select', options: POSTING_TYPES.map((x) => ({ value: x, label: titleCase(x) })) },
      { id: 'debit', label: 'Debit', type: 'number' },
      { id: 'credit', label: 'Credit', type: 'number' },
      { id: 'created', label: 'Created at', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    columns: [
      { key: 'date', header: tt('Date'), sortKey: 'journals.date', render: (r) => <span className="num">{fmtDate(r.journals?.[0]?.date)} <span className="muted">{fmtTime(r.journals?.[0]?.date)}</span></span> },
      { key: 'entries', header: <span className="jl" style={{ minWidth: 0 }}><span>{tt('Account')}</span><span className="n">{tt('Debit')}</span><span className="n c2">{tt('Credit')}</span></span>, className: 'wrap', render: (r) => <Journals js={r.journals || []} onAccount={onAccount} /> },
      { key: 'type', header: tt('Type'), sortKey: 'reference_model', render: (r) => tt(titleCase(r.reference_model)) },
      { key: 'code', header: tt('ID'), sortKey: 'reference_code', className: 'code', render: (r) => { const to = documentPath(r.reference_model, r.reference_id); return to ? <Link className="link" to={to} onClick={(e) => e.stopPropagation()}>{r.reference_code}</Link> : r.reference_code; } },
      { key: 'created', header: tt('Created at'), sortKey: 'created_at', hideBelow: 'xl', render: (r) => <span className="num muted">{fmtDateTime(r.created_at)}</span> },
    ],
    mobileCard: (r) => {
      const tot = journalTotals(r.journals);
      return { title: <span className="mono">{r.reference_code}</span>, amount: fmtMoney(Math.max(tot.debit, tot.credit)), subtitle: <Journals js={r.journals || []} onAccount={onAccount} />, meta: <>{fmtDate(r.journals?.[0]?.date)} · {tt(titleCase(r.reference_model))}</> };
    },
    exportColumns: [
      { header: 'Date', value: (r) => fmtDate(r.journals?.[0]?.date) },
      { header: 'Type', value: (r) => r.reference_model },
      { header: 'ID', value: (r) => r.reference_code },
      { header: 'Entries', value: (r) => (r.journals || []).map((j) => `${journalLabel(j)} ${j.debit_or_credit === 'debit' ? j.debit : j.credit}`).join(' | ') },
    ],
    exportName: 'ledger',
  };
}

export function LedgerPage() {
  const nav = useNavigate();
  const storeId = useStoreId();
  return <ListPage config={ledgerListConfig(storeId, (id) => nav(`/finance/accounts/${id}`))} />;
}
