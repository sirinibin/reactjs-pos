import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useList } from '@/api/hooks';
import { useStoreId } from '@/auth/AuthContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Pager } from '@/ui/DataGrid';
import { EmptyState, ErrorState, Skeleton } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDateTime, fmtMoney, inputDateToApi } from '@/lib/format';
import { downloadText, toCsv } from '@/lib/exportCsv';
import { flattenPostings, referenceLink, statementSummary, titleCase, type Customer, type Posting } from './logic';

/** Customer account statement from GET /v1/posting?search[account_id]=… (finance.md §7). Newest first. */
export function StatementTab({ customer }: { customer: Customer }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const storeId = useStoreId();
  const accountId = customer.account?.id;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  const search = { account_id: accountId, stats: 1, from_date: from ? inputDateToApi(from) : undefined, to_date: to ? inputDateToApi(to) : undefined };
  const q = useList<Posting>('/v1/posting', { search, page, limit: size, sort: '-posts.date' }, { enabled: !!accountId });
  const rows = useMemo(() => flattenPostings(q.data?.rows || []), [q.data]);
  const sum = statementSummary(q.data?.meta);

  if (!accountId) return <Card title={t('Account statement')}><EmptyState icon="book" title={t('No ledger entries yet.')}>{t('The ledger account is created with the first invoice, receipt or opening balance.')}</EmptyState></Card>;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Posting[] = [];
      for (let p = 1; p <= 50; p++) {
        const r = await api.get<Posting[]>('/v1/posting', { search: { ...search, store_id: storeId, stats: undefined }, page: p, limit: 1000, sort: 'posts.date' });
        all.push(...(r.result || []));
        if (!r.result || r.result.length < 1000) break;
      }
      const lines = flattenPostings(all);
      downloadText(`statement-${customer.code || customer.id}.csv`, toCsv([t('Date'), t('Type'), t('ID'), t('Particulars'), t('Debit'), t('Credit'), t('Balance')], lines.map((l) => [fmtDateTime(l.date), titleCase(l.model), l.code, l.contra, l.debit || '', l.credit || '', l.balance])));
      toast.success(t('Exported {{n}} rows', { n: lines.length }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card title={t('Account statement')} sub={<>{t('A/c #{{n}}', { n: customer.account?.number || '—' })} · {t('newest first')}</>} bodyClass="card-b-tight"
      actions={<Button size="sm" icon="download" loading={exporting} onClick={() => void exportCsv()}>{t('Export')}</Button>}>
      <div className="gridbar cu-stmt-bar">
        <label className="cu-date"><span>{t('From')}</span><input className="inp" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label={t('From')} /></label>
        <label className="cu-date"><span>{t('To')}</span><input className="inp" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label={t('To')} /></label>
        {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>{t('Clear filters')}</Button>}
      </div>
      <div className="sum-mini" aria-label={t('Totals')}>
        <div><span>{t('Debit total')}</span><b className="num">{fmtMoney(sum.debit)}</b></div>
        <div><span>{t('Credit total')}</span><b className="num">{fmtMoney(sum.credit)}</b></div>
        <div><span>{t('Closing balance')}</span><b className="num" style={{ color: sum.closing ? (sum.side === 'DR' ? 'var(--crit)' : 'var(--good)') : undefined }}>{fmtMoney(sum.closing)} {sum.closing ? sum.side : ''}</b></div>
        {sum.opening !== 0 && <div><span>{t('Opening balance')}</span><b className="num">{fmtMoney(Math.abs(sum.opening))} {sum.opening > 0 ? 'DR' : 'CR'}</b></div>}
      </div>
      {q.isError ? <div style={{ padding: 12 }}><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>
        : q.isLoading ? <div style={{ padding: 12 }}><Skeleton height={120} /></div>
          : rows.length === 0 ? <EmptyState icon="book" title={t('No entries in this period.')} />
            : (
              <div style={{ overflowX: 'auto' }}>
                <table className="dg cu-stmt" aria-label={t('Account statement')}>
                  <thead><tr><th>{t('Date')}</th><th className="hide-sm">{t('Type')}</th><th>{t('ID')}</th><th className="hide-md">{t('Particulars')}</th><th className="r">{t('Debit')}</th><th className="r">{t('Credit')}</th><th className="r">{t('Balance')}</th></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const link = referenceLink(r.model, r.refId);
                      return (
                        <tr key={r.key} tabIndex={link ? 0 : undefined} style={link ? undefined : { cursor: 'default' }} onClick={link ? () => nav(link) : undefined} onKeyDown={link ? (e) => e.key === 'Enter' && nav(link) : undefined}>
                          <td className="num">{fmtDateTime(r.date)}</td>
                          <td className="hide-sm">{t(titleCase(r.model))}</td>
                          <td className="code">{r.code || '—'}</td>
                          <td className="muted hide-md">{r.contra}</td>
                          <td className="r num">{r.debit ? fmtMoney(r.debit) : ''}</td>
                          <td className="r num">{r.credit ? fmtMoney(r.credit) : ''}</td>
                          <td className="r num" style={{ fontWeight: 600 }}>{fmtMoney(r.balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
      <Pager page={page} pageSize={size} total={q.data?.total || 0} onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }} />
    </Card>
  );
}
