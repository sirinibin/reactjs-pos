import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useRemove } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { Button, IconButton } from '@/ui/Button';
import { SearchInput } from '@/ui/Field';
import { EmptyState, ErrorState, Segmented, Skeleton, useConfirm } from '@/ui/Misc';
import { Icon } from '@/ui/Icon';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { downloadText, toCsv } from '@/lib/exportCsv';
import { fmtDate, fmtMoney, round } from '@/lib/format';
import { t as tt } from '@/i18n';
import { Money } from './components';
import { ACCOUNT_REFS, ACCOUNT_TYPES, ancestors, balanceSides, buildTrialBalance, isBalanced, titleCase, type Account, type TbNode } from './logic';

export const ACCOUNT = '/v1/account';
const PATH = '/finance/accounts';
export const ACCOUNT_SELECT = 'id,store_id,name,name_arabic,deleted,type,phone,vat_no,number,search_label,open,balance,debit_total,credit_total,created_at,updated_at,reference_model,reference_id,debit_or_credit_balance';

export function BalancePill({ debit, credit }: { debit: number; credit: number }) {
  const { t } = useTranslation();
  return isBalanced(debit, credit)
    ? <Pill tone="good" icon="checkc">{t('Debits equal credits')}</Pill>
    : <Pill tone="crit" icon="alert" title={t('Difference')}>{t('Out of balance by {{n}}', { n: fmtMoney(Math.abs(debit - credit)) })}</Pill>;
}

export function accountListConfig(h: { onOpen: (a: Account) => void; rowActions?: (a: Account) => React.ReactNode }): ListConfig<Account> {
  return {
    title: 'Accounts & trial balance',
    icon: 'calc',
    endpoint: ACCOUNT,
    resource: 'accounts',
    select: ACCOUNT_SELECT,
    defaultSort: { key: 'updated_at', dir: -1 },
    searchKey: (q) => (/^\d+$/.test(q) ? { number: q } : { name: q }),
    searchPlaceholder: 'Search account name or number…',
    onRowClick: h.onOpen,
    views: [
      { id: 'all', label: 'All accounts' },
      { id: 'open', label: 'Open', search: { open: 1 } },
      { id: 'customers', label: 'Customers', search: { reference_model: 'customer' } },
      { id: 'vendors', label: 'Vendors', search: { reference_model: 'vendor' } },
      { id: 'deleted', label: 'Deleted', search: { deleted: 1 } },
    ],
    filters: [
      { id: 'type', label: 'Type', type: 'select', options: ACCOUNT_TYPES.map((x) => ({ value: x, label: titleCase(x) })) },
      { id: 'reference_model', label: 'Reference', type: 'select', options: ACCOUNT_REFS.map((x) => ({ value: x, label: titleCase(x) })) },
      { id: 'open', label: 'Status', type: 'select', options: [{ value: '1', label: 'Open' }, { value: '0', label: 'Closed' }] },
      { id: 'balance', label: 'Balance', type: 'number', placeholder: 'e.g. >0' },
      { id: 'phone', label: 'Phone', type: 'text' },
      { id: 'vat_no', label: 'VAT no.', type: 'text' },
      { id: 'updated', label: 'Updated at', type: 'daterange', fromKey: 'updated_at_from', toKey: 'updated_at_to' },
      { id: 'created', label: 'Created at', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' },
    ],
    // The API only returns total_count/meta with stats=1 (ListPage sends it when a summary is configured).
    summary: (m) => [
      { label: 'Debit balance total', value: fmtMoney(m.debit_balance_total) },
      { label: 'Credit balance total', value: fmtMoney(m.credit_balance_total) },
      { label: 'Difference', value: fmtMoney(round((m.debit_balance_total || 0) - (m.credit_balance_total || 0))), tone: isBalanced(m.debit_balance_total || 0, m.credit_balance_total || 0) ? 'good' : 'crit' },
    ],
    columns: [
      { key: 'number', header: tt('Acc. no.'), sortKey: 'number', className: 'code', render: (a) => a.number },
      { key: 'name', header: tt('Name'), sortKey: 'name', className: 'two', render: (a) => <><b><bdi>{a.name}</bdi>{a.deleted && <> <Pill tone="crit" icon="trash">{tt('Deleted')}</Pill></>}</b><span><bdi>{a.name_arabic || ''}</bdi></span></> },
      { key: 'dr', header: tt('Debit balance'), sortKey: 'balance', align: 'end', render: (a) => <Money value={balanceSides(a).debit} tone={balanceSides(a).debit ? undefined : 'muted'} /> },
      { key: 'cr', header: tt('Credit balance'), sortKey: 'balance', align: 'end', render: (a) => <Money value={balanceSides(a).credit} tone={balanceSides(a).credit ? undefined : 'muted'} /> },
      { key: 'type', header: tt('Type'), sortKey: 'type', render: (a) => (a.type ? tt(titleCase(a.type)) : '—') },
      { key: 'status', header: tt('Status'), sortKey: 'open', hideBelow: 'md', render: (a) => (a.open ? <Pill tone="info" icon="clock">{tt('Open')}</Pill> : <Pill tone="neutral" icon="check">{tt('Closed')}</Pill>) },
      { key: 'phone', header: tt('Phone'), sortKey: 'phone', hideBelow: 'lg', render: (a) => a.phone || '—' },
      { key: 'vat', header: tt('VAT no.'), sortKey: 'vat_no', hideBelow: 'xl', render: (a) => a.vat_no || '—' },
      { key: 'ref', header: tt('Reference'), sortKey: 'reference_model', hideBelow: 'lg', render: (a) => (a.reference_model ? tt(titleCase(a.reference_model)) : <span className="muted">{tt('System')}</span>) },
      { key: 'updated', header: tt('Updated at'), sortKey: 'updated_at', hideBelow: 'xl', render: (a) => <span className="num muted">{fmtDate(a.updated_at)}</span> },
    ],
    rowActions: h.rowActions,
    mobileCard: (a) => ({ title: <span className="mono">#{a.number}</span>, amount: `${fmtMoney(a.balance)} ${a.debit_or_credit_balance === 'debit_balance' ? 'Dr' : a.debit_or_credit_balance === 'credit_balance' ? 'Cr' : ''}`, subtitle: <bdi>{a.name}</bdi>, meta: <>{a.type ? tt(titleCase(a.type)) : ''} {a.reference_model ? `· ${tt(titleCase(a.reference_model))}` : ''}</> }),
    exportColumns: [
      { header: 'Acc. no.', value: (a) => a.number },
      { header: 'Name', value: (a) => a.name },
      { header: 'Debit balance', value: (a) => balanceSides(a).debit },
      { header: 'Credit balance', value: (a) => balanceSides(a).credit },
      { header: 'Type', value: (a) => a.type },
      { header: 'Reference', value: (a) => a.reference_model },
      { header: 'Phone', value: (a) => a.phone },
      { header: 'VAT no.', value: (a) => a.vat_no },
    ],
    exportName: 'accounts',
  };
}

function AccountsList({ switcher }: { switcher: React.ReactNode }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [confirmEl, ask] = useConfirm();
  const remove = useRemove(ACCOUNT);
  const act = async (a: Account) => {
    if (a.deleted) {
      if (!(await ask(t('Restore account {{n}}?', { n: a.name }), { confirmLabel: t('Restore') }))) return;
      try {
        await api.post(`${ACCOUNT}/restore/${a.id}`, {}, { search: { store_id: storeId } });
        qc.invalidateQueries({ queryKey: [ACCOUNT] });
        toast.success(t('Account restored'));
      } catch (e) { toast.error((e as Error).message); }
      return;
    }
    if (!(await ask(t('Delete account {{n}}?', { n: a.name }), { danger: true, confirmLabel: t('Delete'), body: t('The account is hidden from lists and pickers. You can restore it from the Deleted view.') }))) return;
    try {
      await remove.mutateAsync(a.id);
      toast.success(t('Account deleted'));
    } catch (e) { toast.error((e as Error).message); }
  };
  const cfg = accountListConfig({
    onOpen: (a) => nav(`${PATH}/${a.id}`),
    rowActions: can('accounts', 'delete') ? (a) => <IconButton icon={a.deleted ? 'undo' : 'trash'} label={a.deleted ? t('Restore') : t('Delete')} onClick={() => act(a)} /> : undefined,
  });
  cfg.headerActions = switcher;
  return <><ListPage config={cfg} />{confirmEl}</>;
}

/** Load every non-deleted account (the trial balance needs all of them, not one page). */
export async function fetchAllAccounts(storeId: string, signal?: AbortSignal) {
  const all: Account[] = [];
  let meta: Record<string, any> = {};
  for (let page = 1; page <= 40; page++) {
    const r = await api.get<Account[]>(ACCOUNT, { search: { store_id: storeId, stats: page === 1 ? 1 : undefined }, page, limit: 500, sort: 'number', select: ACCOUNT_SELECT }, signal);
    if (page === 1) meta = r.meta || {};
    all.push(...(r.result || []));
    if (!r.result || r.result.length < 500) break;
  }
  return { accounts: all, meta };
}

export function TrialBalance() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { store } = useAuth();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: [ACCOUNT, 'trial-balance', storeId], queryFn: ({ signal }) => fetchAllAccounts(storeId, signal), enabled: !!storeId });
  const tb = useMemo(() => buildTrialBalance(query.data?.accounts || []), [query.data]);
  const meta = query.data?.meta || {};
  // Server totals are authoritative (they cover every filtered account); fall back to the client sum.
  const dTot = meta.debit_balance_total ?? tb.debit;
  const cTot = meta.credit_balance_total ?? tb.credit;
  const needle = q.trim().toLowerCase();
  const visible = tb.nodes.filter((n) => {
    if (needle) return n.level === 0 || (n.account ? `${n.label} ${n.account.number}`.toLowerCase().includes(needle) : false);
    return !ancestors(tb.nodes, n.id).some((a) => collapsed.has(a));
  });
  const parents = tb.nodes.filter((n) => !n.account);
  const allClosed = parents.length > 0 && parents.every((p) => collapsed.has(p.id));
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const exportCsv = () => downloadText(`trial-balance-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
    [t('Acc. no.'), t('Account'), t('Debit'), t('Credit')],
    [...tb.nodes.map((n) => [n.account?.number ?? '', `${'  '.repeat(n.level)}${n.account ? n.label : t(n.label)}`, round(n.debit).toFixed(2), round(n.credit).toFixed(2)]), ['', t('Total'), round(dTot).toFixed(2), round(cTot).toFixed(2)]],
  ));

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <div className="card">
      <div className="gridbar">
        <SearchInput value={q} onChange={setQ} placeholder={t('Filter accounts…')} aria-label={t('Filter accounts')} />
        {!query.isPending && <BalancePill debit={dTot} credit={cTot} />}
        <span className="spacer" />
        <span className="muted hide-sm">{t('As of {{d}}', { d: fmtDate(new Date()) })} · {store?.name} · SAR</span>
        <Button icon="layers" onClick={() => setCollapsed(allClosed ? new Set() : new Set(parents.map((p) => p.id)))}>{t(allClosed ? 'Expand all' : 'Collapse all')}</Button>
        <Button icon="download" onClick={exportCsv} disabled={!tb.nodes.length}>{t('Export')}</Button>
      </div>
      {query.isPending ? <div style={{ padding: 16 }} className="stack"><Skeleton height={14} /><Skeleton height={14} /><Skeleton height={14} /></div>
        : !tb.nodes.length ? <EmptyState icon="calc" title={t('No balances yet')}>{t('Accounts appear here once sales, purchases or expenses are posted.')}</EmptyState>
          : (
            <div className="tb-wrap">
              <table className="dg tb" aria-label={t('Trial balance')}>
                <thead><tr><th>{t('Account')}</th><th className="r">{t('Debit')}</th><th className="r">{t('Credit')}</th></tr></thead>
                <tbody>
                  {visible.map((n: TbNode) => (
                    <tr key={n.id} className={`l${n.level}${n.account ? ' leaf' : ''}`} style={{ cursor: 'default' }}>
                      <td className="acc" style={{ paddingInlineStart: 12 + n.level * 22 }}>
                        {!n.account ? (
                          <button type="button" className="tg" aria-expanded={!collapsed.has(n.id)} aria-label={`${collapsed.has(n.id) ? t('Expand') : t('Collapse')} ${t(n.label)}`} onClick={() => toggle(n.id)}>
                            <Icon name="chev" size="xs" className={collapsed.has(n.id) ? 'rot' : undefined} />
                          </button>
                        ) : <span style={{ display: 'inline-block', width: 22 }} />}
                        {n.account ? <><span className="accno">{n.account.number}</span><Link className="link" to={`${PATH}/${n.id}`}><bdi>{n.label}</bdi></Link></> : <>{t(n.label)} <span className="muted num">({n.count})</span></>}
                      </td>
                      <td className="r num">{n.debit ? fmtMoney(n.debit) : '—'}</td>
                      <td className="r num">{n.credit ? fmtMoney(n.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>{t('Total')}</td><td className="r num">{fmtMoney(dTot)}</td><td className="r num">{fmtMoney(cTot)}</td></tr>
                  {!isBalanced(dTot, cTot) && <tr><td>{t('Difference')}</td><td className="r num tb-diff" colSpan={2}>{fmtMoney(Math.abs(dTot - cTot))}</td></tr>}
                </tfoot>
              </table>
            </div>
          )}
    </div>
  );
}

export function AccountsPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'tb' ? 'tb' : 'list';
  usePageMeta(t('Accounts & trial balance'), 'calc');
  const switcher = (
    <Segmented label={t('View')} value={tab} onChange={(v) => setSp(v === 'tb' ? { tab: 'tb' } : {}, { replace: true })}
      options={[{ value: 'list', label: t('Accounts') }, { value: 'tb', label: t('Trial balance') }]} />
  );
  if (tab === 'list') return <AccountsList switcher={switcher} />;
  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Trial balance')}</h1><p>{t('Closing balance of every account, grouped by type')}</p></div>
        <div className="acts">{switcher}</div>
      </div>
      <TrialBalance />
    </section>
  );
}
