import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Card } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
import { Segmented, ErrorState, Skeleton, EmptyState } from '@/ui/Misc';
import { Select } from '@/ui/Field';
import { Donut, HBars, LineChart, Legend, SERIES } from '@/ui/charts/Charts';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney } from '@/lib/format';
import { DASHBOARD } from './lib/api';
import { calcVat, DASH_MODES, fmtCompact, periodText, rangeParams, toRange, trendSeries, yearOptions, type DashMode, type DashRange, type MonthRow } from './lib/dashboard';
import './workshop.css';

interface Breakdown { sales_profit?: number; return_profit?: number; non_vat_sales_profit?: number; non_vat_return_profit?: number }
interface Rev { sales_revenue?: number; sales_return_revenue?: number; qtn_revenue?: number; qtn_return_revenue?: number; total_revenue?: number; expense_total?: number; purchase_total?: number; salary_paid?: number; total_expenses?: number; non_vat_sales_revenue?: number; non_vat_sales_return_revenue?: number; non_vat_net_revenue?: number }
interface Vat { sales_vat?: number; sales_return_vat?: number; purchase_vat?: number; purchase_return_vat?: number; expense_vat?: number; net_vat?: number }
export interface DashData {
  total_profit: number; monthly_profit: number; month_name: string; counter_cash: number; bank_cash: number;
  spare_parts_value?: { purchase_value?: number; retail_value?: number } | null; total_credit: number; labour_profit: number; spare_profit: number; additional_profit: number;
  unpaid_bill: number; salary_balance: number; additional_expense: number; monthly_breakdown?: MonthRow[] | null; vat_box?: Vat | null; vat_box_monthly?: Vat | null;
  total_profit_breakdown?: Rev | null; monthly_profit_breakdown?: Rev | null; labour_breakdown?: Breakdown | null; spare_breakdown?: Breakdown | null; additional_breakdown?: Breakdown | null;
  employee_breakdown?: { account_id?: string; name: string; balance: number; direction?: string }[] | null;
  expense_category_breakdown?: { name: string; total: number }[] | null;
  customer_credit_breakdown?: { customer_id?: string; name: string; credit_balance: number }[] | null;
  vendor_payables_breakdown?: { vendor_id?: string; name: string; purchase_balance: number }[] | null;
}

type Line = { k: string; v: number; sub?: boolean } | { head: string };

function KpiCard({ label, value, color, note, lines, vat, raw }: { label: string; value: number; color: string; note?: ReactNode; lines?: Line[]; vat: number; raw?: boolean }) {
  const { t } = useTranslation();
  const v = calcVat(value, vat);
  return (
    <div className="card ws-kpi">
      <div className="l"><i style={{ background: color }} aria-hidden />{label}</div>
      <div className="v num">{fmtMoney(value)}<small>SAR</small></div>
      <div className="n">{note ?? (!raw && <>{t('w/o VAT')}: <span className="num">{fmtCompact(v.withoutVAT)}</span></>)}</div>
      {lines && lines.length > 0 && (
        <details>
          <summary>{t('Breakdown')}</summary>
          <dl>
            {lines.map((l, i) => ('head' in l ? <dt key={i} className="sub">{l.head}</dt> : <FragmentKV key={i} k={l.k} v={l.v} />))}
          </dl>
        </details>
      )}
    </div>
  );
}
const FragmentKV = ({ k, v }: { k: string; v: number }) => <><dt>{k}</dt><dd className="num">{fmtMoney(v)}</dd></>;

export function DashboardPage() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { store, setting } = useAuth();
  usePageMeta(t('Workshop dashboard'), 'chart');
  const vat = store?.vat_percent || 15;
  const [mode, setMode] = useState<DashMode>('month_range');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [applied, setApplied] = useState<DashRange | null>(null);

  const q = useQuery({
    queryKey: [DASHBOARD, storeId, applied],
    queryFn: async ({ signal }) => (await api.get<DashData>(DASHBOARD, { search: { store_id: storeId }, ...rangeParams(applied) }, signal)).result as DashData,
    enabled: !!storeId,
  });
  // Unfiltered load supplies the year options (years that have data).
  const all = useQuery({
    queryKey: [DASHBOARD, storeId, null],
    queryFn: async ({ signal }) => (await api.get<DashData>(DASHBOARD, { search: { store_id: storeId } }, signal)).result as DashData,
    enabled: !!storeId && (mode === 'year' || mode === 'year_range'),
  });
  const years = useMemo(() => {
    const ys = yearOptions(all.data?.monthly_breakdown);
    return ys.length ? ys : [String(new Date().getFullYear())];
  }, [all.data]);

  const change = (na: string, nb: string, m = mode) => { setA(na); setB(nb); setApplied(toRange(m, na, nb)); };
  const switchMode = (m: DashMode) => { setMode(m); setA(''); setB(''); setApplied(null); };
  const d = q.data;
  const period = t(periodText(applied));

  const inputs = () => {
    const monthIn = (val: string, set: (v: string) => void, label: string) => <input className="inp" type="month" aria-label={t(label)} value={val} onChange={(e) => set(e.target.value)} />;
    const dateIn = (val: string, set: (v: string) => void, label: string) => <input className="inp" type="date" aria-label={t(label)} value={val} onChange={(e) => set(e.target.value)} />;
    const yearIn = (val: string, set: (v: string) => void, label: string) => <Select aria-label={t(label)} value={val} onChange={(e) => set(e.target.value)} placeholder={t('Year')} options={years.map((y) => ({ value: y, label: y }))} />;
    switch (mode) {
      case 'single_month': return monthIn(a, (v) => change(v, v), 'Month');
      case 'month_range': return <>{monthIn(a, (v) => change(v, b), 'From')}{monthIn(b, (v) => change(a, v), 'To')}</>;
      case 'year': return yearIn(a, (v) => change(v, v), 'Year');
      case 'single_date': return dateIn(a, (v) => change(v, v), 'Date');
      case 'date_range': return <>{dateIn(a, (v) => change(v, b), 'From')}{dateIn(b, (v) => change(a, v), 'To')}</>;
      case 'year_range': return <>{yearIn(a, (v) => change(v, b), 'From')}{yearIn(b, (v) => change(a, v), 'To')}</>;
    }
  };

  const bd = (x: Breakdown | null | undefined, kind: string): Line[] => [
    { k: t(`Sales Profit (${kind})`), v: x?.sales_profit || 0 },
    { k: t(`Return Profit (${kind})`), v: x?.return_profit || 0 },
    ...(setting('non_vat_sales') ? [{ k: t('Non-VAT Sales Profit'), v: x?.non_vat_sales_profit || 0 }, { k: t('Non-VAT Return Profit'), v: x?.non_vat_return_profit || 0 }] : []),
  ];
  const rev = (r: Rev | null | undefined, total: number): Line[] => [
    { head: t('— Revenue —') },
    { k: t('Sales'), v: r?.sales_revenue || 0 },
    { k: t('Sales Returns'), v: -(r?.sales_return_revenue || 0) },
    ...(setting('enable_sales_in_quotation') && r?.qtn_revenue ? [{ k: t('Quotation Sales'), v: r.qtn_revenue }, { k: t('Quotation Returns'), v: -(r.qtn_return_revenue || 0) }] : []),
    ...(setting('non_vat_sales') ? [{ k: t('Non-VAT Sales'), v: r?.non_vat_sales_revenue || 0 }, { k: t('Non-VAT Returns'), v: -(r?.non_vat_sales_return_revenue || 0) }, { k: t('Non-VAT Net Revenue'), v: r?.non_vat_net_revenue || 0 }] : []),
    { k: t('Total Revenue'), v: r?.total_revenue || 0 },
    { head: t('— Expenses —') },
    { k: t('Expenses'), v: r?.expense_total || 0 }, { k: t('Purchases'), v: r?.purchase_total || 0 }, { k: t('Salary Paid'), v: r?.salary_paid || 0 },
    { k: t('Total Expenses'), v: r?.total_expenses || 0 },
    { head: t('Net Profit') }, { k: t('Total Profit (with VAT)'), v: total }, { k: t('Total Profit (without VAT)'), v: calcVat(total, vat).withoutVAT },
  ];

  const trend = trendSeries(d?.monthly_breakdown);
  const salaryTone = (d?.salary_balance || 0) < 0 ? 'var(--crit)' : (d?.salary_balance || 0) > 0 ? 'var(--info)' : 'var(--text)';
  const profitParts = [
    { label: t('Labour Profit'), value: Math.max(0, d?.labour_profit || 0) },
    { label: t('Spare Profit'), value: Math.max(0, d?.spare_profit || 0) },
    { label: t('Additional Profit'), value: Math.max(0, d?.additional_profit || 0) },
  ].filter((x) => x.value > 0);
  const cashParts = [{ label: t('Counter Cash'), value: Math.max(0, d?.counter_cash || 0) }, { label: t('Bank Cash'), value: Math.max(0, d?.bank_cash || 0) }].filter((x) => x.value > 0);
  const assets = [
    { label: t('Spare Parts (Purchase)'), value: d?.spare_parts_value?.purchase_value || 0 },
    { label: t('Spare Parts (Retail)'), value: d?.spare_parts_value?.retail_value || 0 },
    { label: t('Total Credit'), value: d?.total_credit || 0 },
    { label: t('Unpaid Purchase Bill'), value: d?.unpaid_bill || 0 },
    { label: t('Additional Expense'), value: d?.additional_expense || 0 },
  ];

  return (
    <section className="pad">
      <div className="ph">
        <div><h1>{t('Workshop dashboard')}</h1><p>{t('Real-time overview of your automobile workshop operations')} · {period}</p></div>
        <div className="acts"><IconButton icon="refresh" label={t('Refresh')} onClick={() => { q.refetch(); }} /></div>
      </div>
      <div className="ws-dash-bar" role="group" aria-label={t('Period')}>
        <Segmented label={t('Period')} value={mode} onChange={switchMode} options={DASH_MODES.map((m) => ({ value: m.value, label: t(m.label) }))} />
        {inputs()}
        {(a || b) && <Button variant="ghost" size="sm" onClick={() => change('', '')}>{t('Clear')}</Button>}
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !d ? (
        <div className="ws-kpis" aria-label={t('Loading dashboard...')}>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={96} />)}</div>
      ) : (
        <>
          <h2 className="ws-sec">{t('Profit Overview')}</h2>
          <div className="ws-kpis">
            <KpiCard vat={vat} label={t('Total Profit')} value={d.total_profit} color="#004ac6" lines={rev(d.total_profit_breakdown, d.total_profit)} />
            <KpiCard vat={vat} label={`${t('Monthly Profit')} (${t(d.month_name || '')})`} value={d.monthly_profit} color="#1a7a3a" lines={rev(d.monthly_profit_breakdown, d.monthly_profit)} />
            <KpiCard vat={vat} label={t('Labour Profit')} value={d.labour_profit} color="#e65100" lines={bd(d.labour_breakdown, 'Labour Charge')} />
            <KpiCard vat={vat} label={t('Spare Profit')} value={d.spare_profit} color="#6a1b9a" lines={bd(d.spare_breakdown, 'Spare Parts')} />
            <KpiCard vat={vat} label={t('Additional Profit')} value={d.additional_profit} color="#1565c0" lines={bd(d.additional_breakdown, 'Other Services')} />
          </div>
          <h2 className="ws-sec">{t('Cash & Bank')}</h2>
          <div className="ws-kpis">
            <KpiCard vat={vat} raw label={t('Counter Cash')} value={d.counter_cash} color="#1a7a3a" note={t('Cash A/c')} />
            <KpiCard vat={vat} raw label={t('Bank Cash')} value={d.bank_cash} color="#004ac6" note={t('Bank A/c')} />
          </div>
          <h2 className="ws-sec">{t('Assets & Liabilities')}</h2>
          <div className="ws-kpis">
            <KpiCard vat={vat} raw label={t('Spare Parts Asset Value')} value={d.spare_parts_value?.retail_value || 0} color="#4db6ac" note={<>{t('Purchase')}: <span className="num">{fmtCompact(d.spare_parts_value?.purchase_value || 0)}</span></>} />
            <KpiCard vat={vat} label={t('Total Credit')} value={d.total_credit} color="#ff8a65"
              lines={(d.customer_credit_breakdown || []).length ? [{ head: t('By Customer') }, ...(d.customer_credit_breakdown || []).map((c) => ({ k: c.name, v: c.credit_balance }))] : undefined} />
            <KpiCard vat={vat} label={t('Unpaid Purchase Bill')} value={d.unpaid_bill} color="#ef5350"
              lines={(d.vendor_payables_breakdown || []).length ? [{ head: t('By Vendor') }, ...(d.vendor_payables_breakdown || []).map((c) => ({ k: c.name, v: c.purchase_balance }))] : undefined} />
            <div className="card ws-kpi">
              <div className="l"><i style={{ background: salaryTone }} aria-hidden />{t('Salary Balance')}</div>
              <div className="v num" style={{ color: salaryTone }}>{fmtMoney(Math.abs(d.salary_balance))}<small>SAR</small></div>
              <div className="n">{t(d.salary_balance < 0 ? 'Owed to Employees' : d.salary_balance > 0 ? (applied ? 'Salary Paid' : 'Employees Owe Us') : 'Settled')}</div>
              {(d.employee_breakdown || []).length > 0 && (
                <details><summary>{t('By Employee')}</summary>
                  <dl>{(d.employee_breakdown || []).map((e, i) => <FragmentKV key={i} k={`${e.name}${e.direction === 'owed_to_employee' ? ' (−)' : e.direction === 'employee_owes' ? ' (+)' : ''}`} v={e.balance} />)}</dl>
                  <p className="muted" style={{ margin: '6px 0 0' }}>{t('(−) Store owes employee  ·  (+) Employee owes store')}</p>
                </details>
              )}
            </div>
            <KpiCard vat={vat} label={t('Additional Expense')} value={d.additional_expense} color="#8d6e63"
              lines={(d.expense_category_breakdown || []).length ? [{ head: t('By Category') }, ...(d.expense_category_breakdown || []).map((c) => ({ k: c.name, v: c.total }))] : undefined} />
          </div>
          {setting('enable_vat_box') && (
            <>
              <h2 className="ws-sec">{t('VAT')}</h2>
              <div className="ws-kpis">
                {[{ l: t('TOTAL VAT'), v: d.vat_box }, { l: `${t('Monthly VAT')} (${t(d.month_name || '')})`, v: d.vat_box_monthly }].map(({ l, v }) => (
                  <KpiCard key={l} vat={vat} raw label={l} value={v?.net_vat || 0} color={(v?.net_vat || 0) >= 0 ? '#ba1a1a' : '#1a7a3a'} note={t((v?.net_vat || 0) >= 0 ? 'Payable to Authority' : 'Refundable')}
                    lines={[{ k: t('Sales VAT'), v: v?.sales_vat || 0 }, { k: t('Sales Return VAT'), v: v?.sales_return_vat || 0 }, { k: t('Purchase VAT'), v: v?.purchase_vat || 0 }, { k: t('Purchase Return VAT'), v: v?.purchase_return_vat || 0 }, { k: t('Expense VAT (w/ Vendor Inv.)'), v: v?.expense_vat || 0 }]} />
                ))}
              </div>
            </>
          )}
          <h2 className="ws-sec">{t('Charts & Analytics')}</h2>
          <div className="ws-charts">
            <Card title={`${t('Monthly P&L Trend')} (${period})`} actions={<Legend items={[{ name: t('Revenue'), color: SERIES[0] }, { name: t('Expense'), color: SERIES[1] }]} />}>
              {trend.labels.length ? (
                <>
                  <LineChart ariaLabel={t('Monthly P&L Trend')} labels={trend.labels} series={[{ name: t('Revenue'), values: trend.revenue }, { name: t('Expense'), values: trend.expense.map((x) => Math.max(0, x)) }]} format={(n) => fmtMoney(n)} />
                  <details style={{ marginTop: 8 }}>
                    <summary className="link" style={{ cursor: 'pointer' }}>{t('Show table')}</summary>
                    <div className="ws-tbl-wrap"><table className="ws-tbl" aria-label={t('Monthly P&L Trend')}>
                      <thead><tr><th>{t('Month')}</th><th className="r">{t('Revenue')}</th><th className="r">{t('Expense')}</th><th className="r">{t('Profit/Loss')}</th></tr></thead>
                      <tbody>{trend.labels.map((l, i) => <tr key={l}><td>{l}</td><td className="r num">{fmtMoney(trend.revenue[i])}</td><td className="r num">{fmtMoney(trend.expense[i])}</td><td className="r num" style={{ color: trend.profit[i] < 0 ? 'var(--crit)' : undefined }}>{fmtMoney(trend.profit[i])}</td></tr>)}</tbody>
                    </table></div>
                  </details>
                </>
              ) : <EmptyState icon="chart" title={t('No monthly data available')} />}
            </Card>
            <Card title={t('Profit Breakdown')}>
              {profitParts.length ? <Donut data={profitParts} centerLabel={t('Total')} centerValue={fmtCompact(profitParts.reduce((s, x) => s + x.value, 0))} /> : <EmptyState icon="pie" title={t('No profit data available')} />}
            </Card>
          </div>
          <div className="ws-charts3">
            <Card title={t('Cash Distribution')}>
              {cashParts.length ? <Donut data={cashParts} centerLabel={t('Total')} centerValue={fmtCompact(cashParts.reduce((s, x) => s + x.value, 0))} /> : <EmptyState icon="pie" title={t('No cash data available')} />}
            </Card>
            <Card title={t('Assets & Liabilities Overview')} className="ws-assets">
              <HBars data={assets} format={(n) => fmtCompact(n)} />
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
