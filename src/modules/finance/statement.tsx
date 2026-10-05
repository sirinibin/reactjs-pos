import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api, type Query } from '@/api/client';
import { useRecord } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { FilterChip, dateRangeToSearch, type FilterDef } from '@/framework/filters';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Checkbox } from '@/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '@/ui/Misc';
import { Pager } from '@/ui/DataGrid';
import { Pill } from '@/ui/Pill';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { loadAccounts } from './components';
import { buildStatement, documentPath, POSTING_TYPES, titleCase, type Account, type Posting, type StatementMeta } from './logic';

export const POSTING = '/v1/posting';
const POSTING_SELECT = 'id,date,store_id,account_id,account_name,account_number,reference_id,reference_model,reference_code,posts,debit_total,credit_total,created_at';
const DATE_DEF: FilterDef = { id: 'date', label: 'Date', type: 'daterange' };
const TYPE_DEF: FilterDef = { id: 'type', label: 'Type', type: 'select', options: POSTING_TYPES.map((x) => ({ value: x, label: titleCase(x) })) };
const CODE_DEF: FilterDef = { id: 'code', label: 'ID', type: 'text' };

/** Query params for GET /v1/posting (spec §7.1): single account, stats=1, ascending by post date. */
export function postingQuery(accountId: string, f: { date?: string; type?: string; code?: string }): Query {
  return {
    account_id: accountId,
    stats: 1,
    ...(f.date ? dateRangeToSearch(f.date) : {}),
    reference_model: f.type || undefined,
    reference_code: f.code || undefined,
  };
}

/**
 * Account statement ("Balance sheet of <account>") — used by /finance/accounts/:id and /finance/postings?account=.
 * Defaults to oldest→newest and jumps to the last page, like the legacy screen.
 */
export function AccountStatement({ accountId, onPickAccount }: { accountId?: string; onPickAccount?: (a: Account | null) => void }) {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { isAdmin, setting, store } = useAuth();
  const [sp, setSp] = useSearchParams();
  const f = { date: sp.get('f.date') || '', type: sp.get('f.type') || '', code: sp.get('f.code') || '' };
  const setF = (k: string, v: string) => setSp((p) => { const n = new URLSearchParams(p); if (v) n.set(`f.${k}`, v); else n.delete(`f.${k}`); n.delete('page'); return n; }, { replace: true });
  const [ignoreOpening, setIgnoreOpening] = useState(false);
  const [ignoreDiscount, setIgnoreDiscount] = useState(false);
  const [size, setSize] = useState(20);
  const pageParam = Number(sp.get('page')) || 0; // 0 = "last page" (legacy default)
  const acc = useRecord<Account>('/v1/account', accountId);
  const search = accountId ? postingQuery(accountId, f) : null;
  const firstQ = useQuery({
    queryKey: [POSTING, 'count', storeId, search, size],
    queryFn: async ({ signal }) => (await api.get<Posting[]>(POSTING, { search: { store_id: storeId, ...search }, page: 1, limit: 1, sort: 'posts.date', select: 'id' }, signal)).total_count || 0,
    enabled: !!search && !pageParam,
  });
  const total = firstQ.data ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / size));
  const page = pageParam || lastPage;
  const q = useQuery({
    queryKey: [POSTING, 'list', storeId, search, page, size],
    queryFn: async ({ signal }) => {
      const r = await api.get<Posting[]>(POSTING, { search: { store_id: storeId, ...search }, page, limit: size, sort: 'posts.date', select: POSTING_SELECT }, signal);
      return { rows: r.result || [], total: r.total_count || 0, meta: (r.meta || {}) as StatementMeta };
    },
    enabled: !!search && (!!pageParam || firstQ.isSuccess),
    placeholderData: (p) => p,
  });
  const account: Account | undefined = q.data?.meta.account || acc.data;
  usePageMeta(account ? `${account.name} · ${t('Statement')}` : t('Postings'), 'layers');
  const st = useMemo(() => buildStatement(q.data?.rows || [], q.data?.meta || {}, { ignoreOpening, ignoreDiscount }), [q.data, ignoreOpening, ignoreDiscount]);
  const negLiability = !!setting('show_minus_on_liability_balance_in_balance_sheet') && st.accountType === 'liability';
  const hideTotal = !!setting('hide_total_amount_row_in_balance_sheet');
  const dueSign = negLiability ? -1 : 1;
  const isLast = page >= Math.max(1, Math.ceil((q.data?.total || 0) / size));
  const rangeLabel = f.date ? (f.date.includes('~') ? f.date.replace('~', ' → ') : t(titleCase(f.date))) : t('All dates');

  const picker = onPickAccount && (
    <AsyncPicker<Account> value={account ? { id: account.id, label: account.search_label || `${account.name} A/c #${account.number}`, data: account } : null}
      onChange={(o: PickerOption<Account> | null) => onPickAccount(o?.data || null)} load={(qq, s) => loadAccounts(storeId, qq, s)} eager clearable
      placeholder={t('Name / mobile / account no.')} aria-label={t('Account')} />
  );

  return (
    <section className="pad">
      <div className="ph">
        <div>
          <h1>{account ? <><bdi>{account.name}</bdi>{account.name_arabic ? <> | <bdi>{account.name_arabic}</bdi></> : null} <span className="muted num" style={{ fontWeight: 500 }}>#{account.number}</span></> : t('Postings')}</h1>
          <p>{account ? <>{t('Account statement')} · {account.type ? t(titleCase(account.type)) : ''} · {rangeLabel}</> : t('Pick an account to see its statement')}</p>
        </div>
        <div className="acts">
          {account && <Link className="btn" to="/finance/accounts">{t('All accounts')}</Link>}
          {account && <Button icon="print" onClick={() => window.print()}>{t('Print')}</Button>}
        </div>
      </div>
      {account && (
        <div className="st-cards">
          <div className="card st-card"><span>{t('Debit total')}</span><b className="num">{fmtMoney(st.debitTotal)}</b></div>
          <div className="card st-card"><span>{t('Credit total')}</span><b className="num">{fmtMoney(st.creditTotal)}</b></div>
          <div className="card st-card"><span>{t('Closing balance')}</span><b className="num">{fmtMoney(st.closing.amount)}<small style={{ color: st.closing.side === 'Dr' ? 'var(--crit)' : 'var(--good)' }}>{st.closing.side}</small></b></div>
        </div>
      )}
      <div className="card">
        <div className="st-print-h">
          <b>{store?.name}</b> — {t('Account statement')}: {account?.name} #{account?.number} · {rangeLabel}
        </div>
        <div className="st-bar">
          {picker}
          <FilterChip def={DATE_DEF} value={f.date} onChange={(v) => setF('date', v)} />
          <FilterChip def={TYPE_DEF} value={f.type} onChange={(v) => setF('type', v)} />
          <FilterChip def={CODE_DEF} value={f.code} onChange={(v) => setF('code', v)} />
          <Checkbox label={t('Ignore opening balance')} checked={ignoreOpening} onChange={(e) => setIgnoreOpening(e.target.checked)} />
          <Checkbox label={t('Ignore discount allowed A/c')} checked={ignoreDiscount} onChange={(e) => setIgnoreDiscount(e.target.checked)} />
          <span className="spacer" />
          {account && <IconButton icon="refresh" label={t('Refresh')} onClick={() => { firstQ.refetch(); q.refetch(); }} />}
        </div>
        {!accountId ? <EmptyState icon="layers" title={t('Choose an account')}>{t('Search by name, mobile or account number above.')}</EmptyState>
          : q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>
            : !q.data ? <div style={{ padding: 16 }} className="stack"><Skeleton height={14} /><Skeleton height={14} /><Skeleton height={14} /></div>
              : (
                <>
                <div className="st-m mlist" aria-label={t('Account statement')}>
                  {st.opening && page === 1 && <div className="ft" style={{ color: 'var(--crit)' }}><span>{st.opening.side === 'debit' ? t('To opening balance') : t('By opening balance')}</span><span className="num">{fmtMoney(st.opening.amount)} {st.opening.side === 'debit' ? 'Dr' : 'Cr'}</span></div>}
                  {st.rows.length === 0 && <EmptyState icon="search" title={t('No postings for this account')} />}
                  {st.rows.map((r) => {
                    const to = documentPath(r.refModel, r.refId);
                    return (
                      <div className="mi" key={r.key}>
                        <span />
                        <span className="a">{to ? <Link className="link" to={to}>{r.code}</Link> : r.code}</span>
                        <span className="b num">{fmtMoney(r.side === 'debit' ? r.debit : r.credit)} {r.side === 'debit' ? 'Dr' : 'Cr'}</span>
                        <span className="c" style={{ whiteSpace: 'normal', fontWeight: 400, fontSize: 12 }}>{r.contra}</span>
                        <span className="d">{fmtDate(r.date)} · {t('Balance')} <b className="num">{fmtMoney(r.balance)}</b></span>
                      </div>
                    );
                  })}
                  {isLast && st.rows.length > 0 && <div className="ft"><span>{t('Closing balance')}</span><span className="num">{fmtMoney(st.closing.amount)} {st.closing.side}</span></div>}
                </div>
                <div className="tw resp" style={{ maxHeight: 'none' }}>
                  <table className="dg st" aria-label={t('Account statement')}>
                    <thead>
                      <tr>
                        {isAdmin && <th className="hide-sm">{t('No.')}</th>}
                        <th>{t('Date')}</th><th>{t('ID')}</th><th className="r">{t('Debit')}</th><th className="r">{t('Credit')}</th><th className="r hide-sm">{t('Balance')}</th>
                        {isAdmin && <th className="hide-md">{t('Type')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {st.opening && page === 1 && (
                        <tr className="op">
                          {isAdmin && <td className="hide-sm" />}
                          <td colSpan={2}>{st.opening.side === 'debit' ? t('To opening balance') : t('By opening balance')}</td>
                          <td className="r num">{st.opening.side === 'debit' ? fmtMoney(st.opening.amount) : ''}</td>
                          <td className="r num">{st.opening.side === 'credit' ? fmtMoney(st.opening.amount) : ''}</td>
                          <td className="hide-sm" />{isAdmin && <td className="hide-md" />}
                        </tr>
                      )}
                      {st.rows.length === 0 && <tr><td colSpan={7} style={{ cursor: 'default' }}><EmptyState icon="search" title={t('No postings for this account')}>{t('Try another date range or clear the filters.')}</EmptyState></td></tr>}
                      {st.rows.map((r, i) => {
                        const to = documentPath(r.refModel, r.refId);
                        return (
                          <tr key={r.key} style={{ cursor: 'default' }}>
                            {isAdmin && <td className="num muted hide-sm">{(page - 1) * size + i + 1}</td>}
                            <td className="num">{fmtDate(r.date)} <span className="muted">{fmtTime(r.date)}</span></td>
                            <td className="mono">{to ? <Link className="link" to={to}>{r.code}</Link> : r.code}</td>
                            <td className="r num">{r.side === 'debit' && <>{fmtMoney(r.debit)}<span className="ct">{r.contra}</span></>}</td>
                            <td className="r num">{r.side === 'credit' && <>{fmtMoney(r.credit)}<span className="ct">{r.contra}</span></>}</td>
                            <td className="r num hide-sm">{fmtMoney(r.balance)}</td>
                            {isAdmin && <td className="hide-md">{r.refModel ? t(titleCase(r.refModel)) : ''}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                    {isLast && st.rows.length > 0 && (
                      <tfoot>
                        <tr className="ft"><td colSpan={isAdmin ? 3 : 2}>{t('Amount')}</td><td className="r num">{fmtMoney(st.debitTotal)}</td><td className="r num">{fmtMoney(st.creditTotal)}</td><td className="hide-sm" />{isAdmin && <td className="hide-md" />}</tr>
                        <tr className="ft">
                          <td colSpan={isAdmin ? 3 : 2}>{t('Due amount')}</td>
                          <td className="r num">{st.debitBalance > 0 ? <>{fmtMoney(st.debitBalance * dueSign)}<span className="ct">{t('To closing balance')}</span></> : ''}</td>
                          <td className="r num">{st.creditBalance > 0 ? <>{fmtMoney(st.creditBalance * dueSign)}<span className="ct">{t('By closing balance')}</span></> : ''}</td>
                          <td className="hide-sm" />{isAdmin && <td className="hide-md" />}
                        </tr>
                        {!hideTotal && <tr className="ft"><td colSpan={isAdmin ? 3 : 2}>{t('Total amount')}</td><td className="r num">{fmtMoney(Math.max(st.debitTotal, st.creditTotal))}</td><td className="r num">{fmtMoney(Math.max(st.debitTotal, st.creditTotal))}</td><td className="hide-sm" />{isAdmin && <td className="hide-md" />}</tr>}
                      </tfoot>
                    )}
                  </table>
                </div>
                </>
              )}
        {accountId && q.data && (
          <Pager page={page} pageSize={size} total={q.data.total} sizes={[20, 50, 100, 200]}
            onPage={(p) => setSp((x) => { const n = new URLSearchParams(x); n.set('page', String(p)); return n; }, { replace: true })}
            onPageSize={(n) => { setSize(n); setSp((x) => { const m = new URLSearchParams(x); m.delete('page'); return m; }, { replace: true }); }} />
        )}
      </div>
      {account && !account.open && <p className="hint" style={{ marginTop: 10 }}><Pill tone="neutral" icon="check">{t('Closed')}</Pill> {t('This account has a zero balance.')}</p>}
    </section>
  );
}

export function AccountStatementPage() {
  const { id } = useParams();
  const nav = useNavigate();
  return <AccountStatement accountId={id} onPickAccount={(a) => a && nav(`/finance/accounts/${a.id}`)} />;
}

export function PostingsPage() {
  const [sp, setSp] = useSearchParams();
  const id = sp.get('account') || undefined;
  useEffect(() => { document.getElementById('content')?.scrollTo?.(0, 0); }, [id]);
  return <AccountStatement key={id || 'none'} accountId={id} onPickAccount={(a) => setSp(a ? { account: a.id } : {}, { replace: true })} />;
}
