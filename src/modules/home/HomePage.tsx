import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Donut, HBars, Kpi, Legend, LineChart, SERIES, VBars } from '@/ui/charts/Charts';
import { Icon, type IconName } from '@/ui/Icon';
import { EmptyState, Segmented, Skeleton } from '@/ui/Misc';
import { Pill } from '@/ui/Pill';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney, fmtNumber, fmtShort } from '@/lib/format';
import {
  addMonths, aging, buildTasks, delta, flagsFrom, greeting, inWindow, isEmptyMonth, kpis, monthKey, monthLabel, monthRange, netRevenue,
  paymentMix, presetWindow, PRESETS, purchases, series, totalExpense, type Monthly, type Preset,
} from './dashboard';
import './home.css';

const PREF_KEY = 'home_range';
const readPreset = (): Preset => {
  try { const v = localStorage.getItem(PREF_KEY); return (PRESETS.some((p) => p.id === v) ? v : '12m') as Preset; } catch { return '12m'; }
};

/** Dashboard endpoints take a plain store_id (not search[store_id]) and never fail the page (§10.2). */
async function dash<T>(path: string, storeId: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T | null> {
  try {
    const r = await api.get<T>(`/v1/dashboard/${path}`, { store_id: storeId, ...params }, signal);
    return (r.result ?? null) as T | null;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return null;
  }
}

async function countOf(path: string, storeId: string, search: Record<string, any>, signal?: AbortSignal, select = 'id,date,balance_amount', limit = 1) {
  try {
    const r = await api.get<any[]>(path, { search: { store_id: storeId, ...search }, limit, select, sort: '-date' }, signal);
    return { count: r.total_count || 0, rows: r.result || [], meta: r.meta || {} };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return null;
  }
}

const compact = (v: number) => (Math.abs(v) >= 1e6 ? fmtShort(v) : fmtNumber(v, 0));

export default function HomePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { user, store, can, isAdmin, setting, status } = useAuth();
  usePageMeta(t('Home'), 'home');
  const [preset, setPresetState] = useState<Preset>(readPreset);
  const setPreset = (p: Preset) => { setPresetState(p); try { localStorage.setItem(PREF_KEY, p); } catch { /* ignore */ } };
  const [recomputing, setRecomputing] = useState(false);
  const now = useMemo(() => new Date(), []);
  const flags = flagsFrom(store?.settings, store?.vat_percent);
  const enabled = setting('enable_common_dashboard') !== false;
  const zatcaLive = store?.zatca?.phase === '2' && !!store?.zatca?.connected;
  const canSales = can('sales');
  const canPurch = can('purchases');
  const canAcc = can('accounts');
  const canExp = can('expenses');
  const canProd = can('products');
  const canFinance = isAdmin || can('stats');

  // One monthly call covers the 12-month chart, every preset and its comparison window.
  const to = monthKey(now);
  const from = addMonths(to, -23);
  // Wait for the session (store + permissions) so we never query modules the user can't see.
  const on = !!storeId && enabled && status === 'ready';
  const monthlyQ = useQuery({ queryKey: ['/v1/dashboard', 'monthly', storeId, from, to], enabled: on, queryFn: ({ signal }) => dash<Monthly[]>('monthly', storeId, { from_month: from, to_month: to }, signal) });
  const win = presetWindow(preset, now);
  const productsQ = useQuery({ queryKey: ['/v1/dashboard', 'products', storeId, win.from, win.to], enabled: on && canSales, queryFn: ({ signal }) => dash<{ product_name: string; total_revenue: number }[]>('products', storeId, { from_month: win.from, to_month: win.to, limit: 6 }, signal) });
  const customersQ = useQuery({ queryKey: ['/v1/dashboard', 'customers', storeId, win.from, win.to], enabled: on && canSales, queryFn: ({ signal }) => dash<{ customer_name: string; total_amount: number }[]>('customers', storeId, { from_month: win.from, to_month: win.to, limit: 6 }, signal) });
  const accountsQ = useQuery({ queryKey: ['/v1/dashboard', 'accounts', storeId], enabled: on && canAcc, queryFn: ({ signal }) => dash<{ account_type: string; balance: number }[]>('accounts', storeId, {}, signal) });
  const stockQ = useQuery({ queryKey: ['/v1/dashboard', 'stock', storeId], enabled: on && canProd, queryFn: ({ signal }) => dash<{ out_of_stock: number; low_stock: number; healthy_stock: number; total: number }>('stock', storeId, {}, signal) });
  const empQ = useQuery({ queryKey: ['/v1/dashboard', 'employee', storeId], enabled: on && flags.employees && canFinance, queryFn: ({ signal }) => dash<{ salary_balance: number }>('employee', storeId, {}, signal) });
  const openSalesQ = useQuery({ queryKey: ['/v1/order', 'home-open', storeId], enabled: on && canSales, queryFn: ({ signal }) => countOf('/v1/order', storeId, { payment_status: 'not_paid,paid_partially' }, signal, 'id,date,balance_amount', 500) });
  const openPurchQ = useQuery({ queryKey: ['/v1/purchase', 'home-open', storeId], enabled: on && canPurch, queryFn: ({ signal }) => countOf('/v1/purchase', storeId, { payment_status: 'not_paid,paid_partially' }, signal, 'id,date,balance_amount', 500) });
  const zatcaQ = useQuery({ queryKey: ['/v1/order', 'home-zatca', storeId], enabled: on && canSales && zatcaLive, queryFn: ({ signal }) => countOf('/v1/order', storeId, { 'zatca.reporting_passed': 'reporting_failed' }, signal) });
  const tbQ = useQuery({ queryKey: ['/v1/account', 'home-tb', storeId], enabled: on && canAcc, queryFn: ({ signal }) => countOf('/v1/account', storeId, { stats: 1 }, signal, 'id') });

  const all = useMemo(() => (monthlyQ.data || []).filter((r) => !isEmptyMonth(r)), [monthlyQ.data]);
  const winRows = inWindow(all, win.from, win.to);
  const cur = kpis(winRows, flags);
  const mix = paymentMix(winRows, flags);
  const prev = kpis(inWindow(all, win.prevFrom, win.prevTo), flags);
  const keys12 = monthRange(addMonths(to, -11), to);
  const revSeries = series(all, keys12, (r) => netRevenue(r, flags));
  const purSeries = series(all, keys12, (r) => purchases(r, flags));
  const expSeries = series(all, keys12, (r) => totalExpense(r, flags));
  const profitSeries = revSeries.map((v, i) => v - expSeries[i]);
  const cashBank = (accountsQ.data || []).reduce((a, x) => a + (Number(x.balance) || 0), 0);
  const openRows = openSalesQ.data?.rows || [];
  const agingData = aging(openRows, now);
  const openAmount = openRows.reduce((a: number, r: any) => a + (Number(r.balance_amount) || 0), 0);
  const overdue = agingData.slice(1).reduce((a, b) => ({ count: a.count + b.count, amount: a.amount + b.value }), { count: 0, amount: 0 });
  const tbMeta = tbQ.data?.meta;
  const tb = tbMeta ? { debit: Number(tbMeta.debit_balance_total) || 0, credit: Number(tbMeta.credit_balance_total) || 0 } : null;
  const tasks = buildTasks({
    zatcaFailed: zatcaQ.data?.count,
    openSales: openSalesQ.data ? { count: openSalesQ.data.count, amount: openAmount } : undefined,
    overdue,
    openPurchases: openPurchQ.data ? { count: openPurchQ.data.count, amount: (openPurchQ.data.rows || []).reduce((a: number, r: any) => a + (Number(r.balance_amount) || 0), 0) } : undefined,
    stock: stockQ.data,
    tb,
    salaryOwed: empQ.data && empQ.data.salary_balance < 0 ? Math.abs(empQ.data.salary_balance) : 0,
  }, (x) => fmtMoney(x));
  const loading = monthlyQ.isPending;
  const isNewStore = !loading && all.length === 0 && (openSalesQ.data?.count || 0) === 0;
  const presetLabel = t(PRESETS.find((p) => p.id === preset)!.label);

  const refresh = () => qc.invalidateQueries({ predicate: (q) => ['/v1/dashboard', '/v1/order', '/v1/purchase', '/v1/account'].includes(String(q.queryKey[0])) });
  const recompute = async () => {
    setRecomputing(true);
    try {
      await api.post('/v1/dashboard/backfill', undefined, { store_id: storeId, months: 0 });
      toast.info(t('Recomputing dashboard totals — this takes about 30 seconds.'));
      setTimeout(() => { refresh(); setRecomputing(false); }, 30000);
    } catch (e) {
      toast.error((e as Error).message);
      setRecomputing(false);
    }
  };

  type Tile = { key: string; show: boolean; label: string; icon: IconName; value: number; d?: number; good?: boolean; spark?: number[]; hint?: string };
  const allTiles: Tile[] = [
    { key: 'rev', show: canSales, label: flags.nonVat ? 'Total revenue' : 'Net revenue', icon: 'receipt', value: cur.totalRevenue, d: delta(cur.totalRevenue, prev.totalRevenue), good: true, spark: revSeries },
    { key: 'exp', show: canExp || canPurch, label: 'Total expense', icon: 'wallet', value: cur.expense, d: delta(cur.expense, prev.expense), good: false, spark: expSeries },
    { key: 'profit', show: canFinance, label: cur.profit >= 0 ? 'Net profit' : 'Net loss', icon: 'chart', value: Math.abs(cur.profit), d: delta(cur.profit, prev.profit), good: true, spark: profitSeries },
    { key: 'cash', show: canAcc, label: 'Cash & bank', icon: 'bank', value: cashBank, hint: t('Live balance') },
    { key: 'ar', show: canSales && !canAcc, label: 'Receivables', icon: 'cash', value: openAmount, hint: t('{{n}} open invoices', { n: openSalesQ.data?.count || 0 }) },
    { key: 'orders', show: canSales && !canFinance, label: 'Orders', icon: 'cart', value: cur.orders, d: delta(cur.orders, prev.orders), good: true },
  ];
  const tiles = allTiles.filter((x) => x.show).slice(0, 4);

  const hour = now.getHours();
  const createActions = (
    <>
      {canExp && can('expenses', 'create') && <Button icon="wallet" onClick={() => nav('/finance/expenses/new')}>{t('New expense')}</Button>}
      {canSales && can('sales', 'create') && <Button variant="primary" icon="plus" onClick={() => nav('/sales/invoices/new')}>{t('New invoice')}</Button>}
    </>
  );

  if (!enabled) {
    return (
      <section className="pad">
        <div className="ph"><div><h1>{t('{{greeting}}, {{name}}', { greeting: t(greeting(hour)), name: user?.name || '' })}</h1><p>{store?.branch_name || store?.name}</p></div><div className="acts">{createActions}</div></div>
        <Card><EmptyState icon="home" title={t('The business dashboard is turned off for this store')}>{t('An administrator can enable it in store settings.')}</EmptyState></Card>
      </section>
    );
  }

  return (
    <section className="pad home">
      <div className="ph">
        <div>
          <h1>{t('{{greeting}}, {{name}}', { greeting: t(greeting(hour)), name: user?.name?.split(' ')[0] || '' })}</h1>
          <p><bdi>{store?.branch_name || store?.name}</bdi> · {fmtDate(now)}</p>
        </div>
        <div className="acts">
          <Segmented label={t('Period')} value={preset} onChange={setPreset} options={PRESETS.map((p) => ({ value: p.id, label: t(p.label) }))} />
          <IconButton icon="refresh" label={t('Refresh')} onClick={refresh} />
          {isAdmin && <Button icon="layers" className="hide-sm" loading={recomputing} onClick={recompute} title={t('Rebuild monthly totals from all transactions')}>{t('Recompute')}</Button>}
          {createActions}
        </div>
      </div>

      {tiles.length > 0 && (
        <div className="kpis" aria-label={t('Key figures')}>
          {tiles.map((k) => (loading && k.key !== 'cash' && k.key !== 'ar')
            ? <div className="card kpi" key={k.key}><Skeleton width={90} /><Skeleton width={140} height={22} /><Skeleton width={70} /></div>
            : <Kpi key={k.key} label={t(k.label)} icon={<Icon name={k.icon} size="s" />} value={compact(k.value)} unit="SAR"
                hint={k.hint || presetLabel} spark={k.spark && k.spark.some(Boolean) ? k.spark : undefined}
                delta={k.d !== undefined ? `${k.d >= 0 ? '▲' : '▼'} ${fmtNumber(Math.abs(k.d), 1)}%` : undefined} deltaGood={k.d !== undefined && (k.d >= 0) === k.good} />)}
        </div>
      )}

      {isNewStore ? (
        <Card className="welcome">
          <EmptyState icon="home" title={t('Welcome to StartERP')} action={<div className="row" style={{ justifyContent: 'center' }}>{createActions}{canProd && <Link className="btn" to="/stock/products">{t('Add products')}</Link>}</div>}>
            {t('Your dashboard fills in as you record sales, purchases and expenses. Start with your first invoice.')}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="dash2">
            {(canSales || canPurch) && (
              <Card title={t('Revenue vs purchases')} sub={t('SAR, incl. VAT · last 12 months')}
                actions={<Legend items={[...(canSales ? [{ name: t('Revenue'), color: SERIES[0] }] : []), ...(canPurch ? [{ name: t('Purchases'), color: SERIES[1] }] : [])]} />}>
                {loading ? <Skeleton height={250} /> : (
                  <LineChart ariaLabel={t('Revenue vs purchases, last 12 months')} labels={keys12.map(monthLabel)} format={(v) => fmtMoney(v, 0)}
                    series={[...(canSales ? [{ name: t('Revenue'), values: revSeries, color: SERIES[0] }] : []), ...(canPurch ? [{ name: t('Purchases'), values: purSeries, color: SERIES[1] }] : [])]} />
                )}
              </Card>
            )}
            <Card title={t('My tasks')} sub={t('Things that need you today')}>
              {tasks.length === 0
                ? <EmptyState icon="checkc" title={t('All caught up')}>{t('Nothing needs your attention right now.')}</EmptyState>
                : (
                  <div className="tasks" role="list" aria-label={t('My tasks')}>
                    {tasks.map((x) => (
                      <div key={x.id} role="listitem">
                        <span className={`n ${x.tone}`}>{x.count}</span>
                        <div className="t"><b>{t(x.title)}</b><span>{t(x.sub, x.subArgs)}</span></div>
                        <Button size="sm" onClick={() => nav(x.path)}>{t(x.action)}</Button>
                      </div>
                    ))}
                  </div>
                )}
            </Card>
          </div>
          <div className="dash3">
            {canSales && (
              <Card title={t('Receivables aging')} sub={t('Open balance by days since invoice, SAR')}>
                {openSalesQ.isPending ? <Skeleton height={170} /> : openAmount > 0
                  ? <VBars data={agingData.map((a) => ({ label: a.label, value: a.value, title: `${a.label}: ${fmtMoney(a.value)} · ${a.count}` }))} />
                  : <EmptyState icon="checkc" title={t('No open receivables')} />}
              </Card>
            )}
            {canSales && (
              <Card title={t('Top products')} actions={<span className="sub">{t('Revenue')} · {presetLabel}</span>}>
                {productsQ.isPending ? <Skeleton height={170} /> : productsQ.data?.length
                  ? <HBars data={productsQ.data.slice(0, 6).map((p) => ({ label: p.product_name, value: p.total_revenue }))} />
                  : <EmptyState icon="box" title={t('No product sales in this period')} />}
              </Card>
            )}
            <Card title={t('Compliance & health')}>
              <dl className="kv health">
                {zatcaLive && canSales && <><dt>{t('ZATCA reporting')}</dt><dd>{zatcaQ.data?.count ? <Pill tone="crit" icon="alert">{t('{{n}} rejected', { n: zatcaQ.data.count })}</Pill> : <Pill tone="good" icon="checkc">{t('All reported')}</Pill>}</dd></>}
                {tb && <><dt>{t('Trial balance')}</dt><dd><Link to="/finance/accounts?tab=tb">{Math.abs(tb.debit - tb.credit) < 0.005 ? <Pill tone="good" icon="check">{t('Balanced')}</Pill> : <Pill tone="crit" icon="alert">{t('Off by {{n}}', { n: fmtMoney(Math.abs(tb.debit - tb.credit)) })}</Pill>}</Link></dd></>}
                {stockQ.data && <><dt>{t('Stock health')}</dt><dd>{stockQ.data.out_of_stock || stockQ.data.low_stock ? <Pill tone="warn" icon="alert">{t('{{a}} out · {{b}} low', { a: stockQ.data.out_of_stock, b: stockQ.data.low_stock })}</Pill> : <Pill tone="good" icon="checkc">{t('{{n}} products healthy', { n: stockQ.data.healthy_stock })}</Pill>}</dd></>}
                {(accountsQ.data || []).map((a) => <Fragment key={a.account_type}><dt>{t(a.account_type === 'cash' ? 'Cash balance' : 'Bank balance')}</dt><dd className="num">{fmtMoney(a.balance)}</dd></Fragment>)}
                {flags.vatBox && canFinance && <><dt>{cur.vat >= 0 ? t('VAT payable') : t('VAT refundable')}</dt><dd className="num" style={{ color: cur.vat >= 0 ? 'var(--crit)' : 'var(--good)' }}>{fmtMoney(Math.abs(cur.vat))}</dd></>}
                {canSales && <><dt>{t('Orders')} · {presetLabel}</dt><dd className="num">{cur.orders.toLocaleString()}</dd></>}
                {canSales && <><dt>{t('Avg. order value')}</dt><dd className="num">{fmtMoney(cur.avgOrder)}</dd></>}
                {canSales && <><dt>{t('Return rate')}</dt><dd className="num">{fmtNumber(cur.returnRate, 2)}%</dd></>}
              </dl>
            </Card>
          </div>
          {canSales && (
            <div className="dash-pair">
              <Card title={t('Collections by payment method')} actions={<span className="sub">{presetLabel}</span>}>
                {loading ? <Skeleton height={150} /> : mix.length
                  ? <Donut data={mix.map((m) => ({ label: t(m.label), value: m.value }))} centerLabel={t('Total')} centerValue={compact(mix.reduce((a, b) => a + b.value, 0))} />
                  : <EmptyState icon="cash" title={t('No payments in this period')} />}
              </Card>
              <Card title={t('Top customers')} actions={<span className="sub">{t('Revenue')} · {presetLabel}</span>}>
                {customersQ.isPending ? <Skeleton height={150} /> : customersQ.data?.some((c) => c.total_amount > 0)
                  ? <HBars data={customersQ.data.filter((c) => c.total_amount > 0).slice(0, 6).map((c) => ({ label: c.customer_name || '—', value: c.total_amount }))} />
                  : <EmptyState icon="users" title={t('No customer sales in this period')} />}
              </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
}
