import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Query } from '@/api/client';
import { session } from '@/api/session';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { FilterChip, dateRangeToSearch, type FilterDef } from '@/framework/filters';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Field';
import { Banner, EmptyState, Skeleton } from '@/ui/Misc';
import { Modal } from '@/ui/Overlay';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney, fmtNumber } from '@/lib/format';
import { forecastRows, overallSummary, parseCsv, pct, profitLoss, statSettings, withoutVatOf, type Component, type Meta, type Metas } from './stats';
import './insights.css';

interface Source { key: keyof Metas; path: string; resource?: string; gate?: (s: Record<string, any>) => boolean; limit?: number }
const SOURCES: Source[] = [
  { key: 'sales', path: '/v1/order', resource: 'sales' },
  { key: 'salesReturn', path: '/v1/sales-return', resource: 'sales_return' },
  { key: 'purchase', path: '/v1/purchase', resource: 'purchases' },
  { key: 'purchaseReturn', path: '/v1/purchase-return', resource: 'purchase_return' },
  { key: 'expense', path: '/v1/expense', resource: 'expenses' },
  { key: 'receivables', path: '/v1/customer-deposit', resource: 'receivables', limit: 1 },
  { key: 'payables', path: '/v1/customer-withdrawal', resource: 'payables', limit: 1 },
  { key: 'quotation', path: '/v1/quotation', resource: 'quotations' },
  { key: 'qsr', path: '/v1/quotation-sales-return', resource: 'qtn_sales_return', gate: (s) => !!s.enable_sales_in_quotation },
  { key: 'nonVatSales', path: '/v1/non-vat-sales', resource: 'non_vat_sales', gate: (s) => !!s.non_vat_sales },
  { key: 'nonVatSalesReturn', path: '/v1/non-vat-sales-return', resource: 'non_vat_sales_return', gate: (s) => !!s.non_vat_sales },
];

export const SECTIONS = [
  { key: 'profit_loss', label: 'Profit / loss statement' },
  { key: 'overall_summary', label: 'Overall summary', hidden: true },
  { key: 'sales', label: 'Sales' },
  { key: 'sales_return', label: 'Sales returns' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'purchase_return', label: 'Purchase returns' },
  { key: 'expense', label: 'Expenses' },
  { key: 'quotation', label: 'Quotations' },
  { key: 'qtn_sales', label: 'Qtn. sales' },
  { key: 'qtn_sales_return', label: 'Qtn. sales returns' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'payables', label: 'Payables' },
  { key: 'revenue_forecast', label: 'Revenue forecast (next 6 months)' },
  { key: 'expense_forecast', label: 'Expense forecast (next 6 months)' },
  { key: 'profit_forecast', label: 'Profit forecast (next 6 months)' },
] as const;
type SectionKey = (typeof SECTIONS)[number]['key'];
const PREF = 'stats_section_settings';

function loadPrefs(): { key: SectionKey; visible: boolean }[] {
  const def = SECTIONS.map((s) => ({ key: s.key, visible: !('hidden' in s && s.hidden) }));
  try {
    const saved = JSON.parse(localStorage.getItem(PREF) || 'null');
    if (!Array.isArray(saved)) return def;
    const known = saved.filter((x: any) => def.some((d) => d.key === x?.key));
    return [...known, ...def.filter((d) => !known.some((k: any) => k.key === d.key))];
  } catch { return def; }
}

/** BI forecast CSV (text/csv). Needs search[store_id] — the legacy client sent plain store_id and always got 400. */
async function fetchForecast(storeId: string, key: string, signal?: AbortSignal): Promise<Record<string, string>[]> {
  try {
    const r = await fetch(`/v1/bi/report-result/download?search[store_id]=${encodeURIComponent(storeId)}&report_key=${key}&format=csv`, { headers: { Authorization: session.token() || '' }, signal });
    if (!r.ok) return [];
    return parseCsv(await r.text());
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return [];
  }
}

interface Stat { label: string; value: number; kind?: 'money' | 'pct'; tone?: 'good' | 'crit'; sub?: ReactNode; parts?: Component[] }

function StatGrid({ stats }: { stats: Stat[] }) {
  const { t } = useTranslation();
  return (
    <div className="stat-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <span>{t(s.label)}</span>
          <b className="num" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.kind === 'pct' ? (s.value ? `${fmtNumber(s.value, 2)}%` : '—') : fmtMoney(s.value)}</b>
          {s.sub && <small>{s.sub}</small>}
          {s.parts && s.parts.length > 0 && (
            <details>
              <summary>{t('Breakdown')}</summary>
              <ul>{s.parts.filter((p) => p.value).map((p) => <li key={p.label}><span>{p.sign > 0 ? '+' : '−'} {t(p.label)}</span><b className="num">{fmtMoney(p.value)}</b></li>)}</ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

const DATE_DEF: FilterDef = { id: 'date', label: 'Date', type: 'daterange' };

export function StatsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can, store, setting, status } = useAuth();
  const ready = !!storeId && status === 'ready';
  usePageMeta(t('Statistics'), 'chart');
  const [date, setDate] = useState('');
  const [prefs, setPrefs] = useState(loadPrefs);
  const [customize, setCustomize] = useState(false);
  const settings = store?.settings || {};
  const cfg = statSettings(settings, store?.vat_percent);
  const dateSearch: Query = date ? dateRangeToSearch(date) : {};
  const sources = SOURCES.filter((s) => can(s.resource) && (!s.gate || s.gate(settings)));
  const results = useQueries({
    queries: sources.map((s) => ({
      queryKey: [s.path, 'stats-page', storeId, dateSearch],
      enabled: ready,
      queryFn: async ({ signal }: { signal: AbortSignal }) => (await api.get<any[]>(s.path, { search: { store_id: storeId, stats: 1, ...dateSearch }, page: 1, limit: s.limit || 1, select: 'id' }, signal)).meta || {},
    })),
  });
  const metas: Metas = {};
  sources.forEach((s, i) => { if (results[i].data) metas[s.key] = results[i].data as Meta; });
  const loading = results.some((r) => r.isPending);
  const failed = sources.filter((_, i) => results[i].isError).map((s) => s.path);
  const visible = (k: SectionKey) => prefs.find((p) => p.key === k)?.visible !== false;
  const anyForecast = visible('revenue_forecast') || visible('expense_forecast') || visible('profit_forecast');
  const forecastQ = useQuery({
    queryKey: ['/v1/bi/report-result', storeId],
    enabled: ready && anyForecast && can('stats'),
    queryFn: async ({ signal }) => {
      const [r, e, p] = await Promise.all(['revenue_forecast_6m', 'expense_forecast_6m', 'profit_forecast_6m'].map((k) => fetchForecast(storeId, k, signal)));
      return { revenue: forecastRows('revenue', r), expense: forecastRows('expense', e), profit: forecastRows('profit', p) };
    },
  });

  const pl = profitLoss(metas, cfg);
  const ov = overallSummary(metas);
  const p = cfg.vatPercent;
  const S = metas.sales || {}, SR = metas.salesReturn || {}, P = metas.purchase || {}, PR = metas.purchaseReturn || {}, E = metas.expense || {}, Q = metas.quotation || {}, QSR = metas.qsr || {}, R = metas.receivables || {}, PY = metas.payables || {};
  const woVat = (x: number) => <>{t('w/o VAT')}: {fmtMoney(withoutVatOf(x, p))}</>;

  const sections: { key: SectionKey; title: string; show: boolean; stats: Stat[] }[] = [
    { key: 'profit_loss', title: 'Profit / loss statement', show: settings.stats_show_profit_loss_statement !== false && (!!metas.sales || !!metas.expense), stats: [
      { label: 'Revenue', value: pl.revenue, sub: woVat(pl.revenueBase), parts: pl.revenueParts },
      { label: 'Expense', value: pl.expense, sub: woVat(pl.expense), parts: pl.expenseParts },
      { label: pl.profit >= 0 ? 'Profit' : 'Loss', value: Math.abs(pl.profit), tone: pl.profit >= 0 ? 'good' : 'crit', sub: woVat(pl.profit) },
      { label: `VAT ${p}%`, value: pl.profitVat },
    ] },
    { key: 'overall_summary', title: 'Overall summary', show: !!metas.sales && !!metas.purchase, stats: [
      { label: 'Sales (with VAT)', value: ov.salesWithVat }, { label: 'Purchase (with VAT)', value: ov.purchaseWithVat }, { label: 'Difference (with VAT)', value: ov.differenceWithVat },
      { label: 'Sales (without VAT)', value: ov.salesWithoutVat }, { label: 'Purchase (without VAT)', value: ov.purchaseWithoutVat }, { label: 'Difference (without VAT)', value: ov.differenceWithoutVat }, { label: 'VAT', value: ov.vat },
    ] },
    { key: 'sales', title: 'Sales', show: !!metas.sales, stats: [
      { label: 'Sales', value: S.total_sales }, { label: 'Paid sales', value: S.paid_sales }, { label: 'Credit sales', value: S.unpaid_sales }, { label: 'Cash sales', value: S.cash_sales },
      { label: 'Bank account sales', value: S.bank_account_sales }, { label: 'Sales paid by sales return', value: S.sales_return_sales }, { label: 'Sales paid by purchase', value: S.purchase_sales },
      { label: 'Cash discount', value: S.cash_discount }, { label: 'Sales discount', value: S.discount }, { label: 'VAT collected', value: S.vat_price }, { label: 'Shipping / handling fees', value: S.shipping_handling_fees },
      { label: 'Net profit', value: S.net_profit, tone: 'good' }, { label: 'Net profit %', value: pct(S.net_profit, S.total_sales), kind: 'pct' }, { label: 'Net loss', value: S.net_loss, tone: S.net_loss ? 'crit' : undefined },
    ] },
    { key: 'sales_return', title: 'Sales returns', show: !!metas.salesReturn, stats: [
      { label: 'Sales return', value: SR.total_sales_return }, { label: 'Paid sales return', value: SR.paid_sales_return }, { label: 'Credit sales return', value: SR.unpaid_sales_return }, { label: 'Cash sales return', value: SR.cash_sales_return },
      { label: 'Bank account sales return', value: SR.bank_account_sales_return }, { label: 'Sales return paid by sales', value: SR.sales_sales_return }, { label: 'Cash discount', value: SR.cash_discount },
      { label: 'VAT', value: SR.vat_price }, { label: 'Net profit', value: SR.net_profit }, { label: 'Net loss', value: SR.net_loss },
    ] },
    { key: 'purchase', title: 'Purchases', show: !!metas.purchase, stats: [
      { label: 'Purchase', value: P.total_purchase }, { label: 'Paid purchase', value: P.paid_purchase }, { label: 'Credit purchase', value: P.unpaid_purchase }, { label: 'Cash purchase', value: P.cash_purchase },
      { label: 'Bank account purchase', value: P.bank_account_purchase }, { label: 'Purchases paid by sales', value: P.sales_purchase }, { label: 'Purchases paid by purchase return', value: P.purchase_return_purchase },
      { label: 'Cash discount', value: P.cash_discount }, { label: 'Purchase discount', value: P.discount }, { label: 'VAT paid', value: P.vat_price }, { label: 'Shipping / handling fees', value: P.shipping_handling_fees },
    ] },
    { key: 'purchase_return', title: 'Purchase returns', show: !!metas.purchaseReturn, stats: [
      { label: 'Purchase return', value: PR.total_purchase_return }, { label: 'Paid purchase return', value: PR.paid_purchase_return }, { label: 'Credit purchase return', value: PR.unpaid_purchase_return },
      { label: 'Cash purchase return', value: PR.cash_purchase_return }, { label: 'Bank account purchase return', value: PR.bank_account_purchase_return }, { label: 'Purchase return paid by purchase', value: PR.purchase_purchase_return },
      { label: 'Cash discount', value: PR.cash_discount }, { label: 'VAT', value: PR.vat_price },
    ] },
    { key: 'expense', title: 'Expenses', show: !!metas.expense, stats: [
      { label: 'Total expense', value: E.total }, { label: 'Cash expense', value: E.cash }, { label: 'Bank expense', value: E.bank }, { label: 'Purchase fund', value: E.purchase_fund }, { label: 'VAT paid', value: E.vat },
      ...(cfg.employees ? [{ label: 'Salaries paid', value: E.salary_paid }] : []),
    ] },
    { key: 'quotation', title: 'Quotations', show: !!metas.quotation, stats: [
      { label: 'Quotation', value: Q.total_quotation }, { label: 'Profit', value: Q.profit, tone: 'good' }, { label: 'Profit %', value: pct(Q.profit, Q.total_quotation), kind: 'pct' }, { label: 'Loss', value: Q.loss },
    ] },
    { key: 'qtn_sales', title: 'Qtn. sales', show: !!metas.quotation && cfg.qtnAcc, stats: [
      { label: 'Sales', value: Q.invoice_total_sales }, { label: 'Paid sales', value: Q.invoice_paid_sales }, { label: 'Credit sales', value: Q.invoice_unpaid_sales }, { label: 'Cash sales', value: Q.invoice_cash_sales },
      { label: 'Bank account sales', value: Q.invoice_bank_account_sales }, { label: 'Cash discount', value: Q.invoice_cash_discount }, { label: 'VAT collected', value: Q.invoice_vat_price },
      { label: 'Net profit', value: Q.invoice_net_profit, tone: 'good' }, { label: 'Net loss', value: Q.invoice_net_loss },
    ] },
    { key: 'qtn_sales_return', title: 'Qtn. sales returns', show: !!metas.qsr, stats: [
      { label: 'Sales return', value: QSR.total_quotation_sales_return }, { label: 'Paid sales return', value: QSR.paid_quotation_sales_return }, { label: 'Credit sales return', value: QSR.unpaid_quotation_sales_return },
      { label: 'Cash discount', value: QSR.cash_discount }, { label: 'VAT', value: QSR.vat_price }, { label: 'Net profit', value: QSR.net_profit }, { label: 'Net loss', value: QSR.net_loss },
    ] },
    { key: 'receivables', title: 'Receivables', show: !!metas.receivables, stats: [
      { label: 'Total', value: R.total }, { label: 'Cash', value: R.cash }, { label: 'Bank', value: R.bank }, { label: 'Purchase fund', value: R.purchase_fund },
      { label: 'Receivable from customers (unpaid sales)', value: R.total_customer }, { label: 'Receivable from vendors (purchase return)', value: R.total_vendor },
      { label: 'Net receivables', value: (Number(R.total_customer) || 0) + (Number(R.total_vendor) || 0) },
    ] },
    { key: 'payables', title: 'Payables', show: !!metas.payables, stats: [
      { label: 'Total', value: PY.total }, { label: 'Cash', value: PY.cash }, { label: 'Bank', value: PY.bank },
      { label: 'Payable to vendors (unpaid purchases)', value: PY.total_vendor }, { label: 'Payable to customers (sales return)', value: PY.total_customer },
      { label: 'Net payables', value: (Number(PY.total_vendor) || 0) + (Number(PY.total_customer) || 0) },
    ] },
  ];
  const fc = forecastQ.data;
  const fcSum = (rows: { value: number }[] = []) => rows.reduce((a, r) => a + r.value, 0);
  const forecastSection = (key: SectionKey, title: string, rows: ReturnType<typeof forecastRows> | undefined) => ({
    key, title, show: can('stats'), stats: [] as Stat[], rows,
  });
  const fcs = [forecastSection('revenue_forecast', 'Revenue forecast (next 6 months)', fc?.revenue), forecastSection('expense_forecast', 'Expense forecast (next 6 months)', fc?.expense), forecastSection('profit_forecast', 'Profit forecast (next 6 months)', fc?.profit)];

  const ordered = prefs.filter((x) => x.visible);
  const save = (next: typeof prefs) => { setPrefs(next); try { localStorage.setItem(PREF, JSON.stringify(next)); } catch { /* ignore */ } };
  const move = (i: number, d: number) => { const n = [...prefs]; const [x] = n.splice(i, 1); n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x); save(n); };
  const labelOf = (k: SectionKey) => SECTIONS.find((s) => s.key === k)!.label;

  return (
    <section className="pad insights">
      <div className="ph">
        <div><h1>{t('Statistics')}</h1><p>{t('Totals across sales, purchases, expenses and payments for the active store')}</p></div>
        <div className="acts">
          <IconButton icon="refresh" label={t('Refresh')} onClick={() => qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === 'stats-page' || q.queryKey[0] === '/v1/bi/report-result' })} />
          <Button icon="sliders" onClick={() => setCustomize(true)}>{t('Customize')}</Button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <FilterChip def={DATE_DEF} value={date} onChange={setDate} />
        {!date && <span className="muted">{t('Showing all time')}</span>}
      </div>
      {failed.length > 0 && <div style={{ marginBottom: 14 }}><Banner tone="warn">{t('Some totals could not be loaded')}: {failed.join(', ')}</Banner></div>}
      <div className="stack">
        {ordered.map(({ key }) => {
          const fsec = fcs.find((f) => f.key === key);
          if (fsec) {
            if (!fsec.show) return null;
            const rows = fsec.rows || [];
            return (
              <Card key={key} title={t(fsec.title)} sub={forecastQ.isPending ? undefined : <>{t('Total')}: <b className="num">{fmtMoney(fcSum(rows))}</b>{key === 'revenue_forecast' && <> · {woVat(fcSum(rows))}</>}</>}>
                {forecastQ.isPending ? <Skeleton height={60} /> : rows.length === 0
                  ? <EmptyState icon="chart" title={t('No forecast yet')}>{t('Forecasts appear after the nightly BI job has run for this store.')}</EmptyState>
                  : <StatGrid stats={rows.map((r) => ({ label: r.label, value: r.value, parts: r.parts, tone: r.good === undefined ? undefined : r.good ? 'good' : 'crit' }))} />}
              </Card>
            );
          }
          const s = sections.find((x) => x.key === key);
          if (!s || !s.show) return null;
          return (
            <Card key={key} title={t(s.title)} sub={date ? undefined : t('All time')}>
              {loading && !s.stats.some((x) => x.value) ? <Skeleton height={60} /> : <StatGrid stats={s.stats.map((x) => ({ ...x, value: Number(x.value) || 0 }))} />}
            </Card>
          );
        })}
      </div>
      <Modal open={customize} onClose={() => setCustomize(false)} title={t('Statistics sections')} width={480}
        footer={<><Button variant="ghost" onClick={() => save(SECTIONS.map((s) => ({ key: s.key, visible: !('hidden' in s && s.hidden) })))}>{t('Restore defaults')}</Button><Button variant="primary" onClick={() => setCustomize(false)}>{t('Done')}</Button></>}>
        <div className="sec-list">
          {prefs.map((x, i) => (
            <div key={x.key} className="row">
              <Checkbox label={t(labelOf(x.key))} checked={x.visible} onChange={(e) => save(prefs.map((y) => (y.key === x.key ? { ...y, visible: e.target.checked } : y)))} />
              <span className="spacer" />
              <IconButton icon="chev" className="up" label={`${t('Move up')}: ${t(labelOf(x.key))}`} disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon="chev" label={`${t('Move down')}: ${t(labelOf(x.key))}`} disabled={i === prefs.length - 1} onClick={() => move(i, 1)} />
            </div>
          ))}
        </div>
      </Modal>
      {setting('stats_show_profit_loss_statement') === false && <p className="hint" style={{ marginTop: 10 }}>{t('The profit / loss statement is hidden by a store setting.')}</p>}
    </section>
  );
}
