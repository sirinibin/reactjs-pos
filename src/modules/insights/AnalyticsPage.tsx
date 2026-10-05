import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { Select } from '@/ui/Field';
import { Legend, LineChart, SERIES } from '@/ui/charts/Charts';
import { Banner, EmptyState, Segmented, Skeleton } from '@/ui/Misc';
import { usePageMeta } from '@/shell/Workspace';
import { fmtMoney, toInputDate } from '@/lib/format';
import { bucketLabels, bucketSeries, firstYearOf, SERIES_DEFS, SOURCES, toggleSlot, type Granularity, type Rec, type Source } from './analytics';
import './insights.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Every record of a module for the store (limit 1000, page++ until a short page), newest first. */
async function fetchAll(path: string, select: string, storeId: string, signal?: AbortSignal): Promise<Rec[]> {
  const out: Rec[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await api.get<Rec[]>(path, { search: { store_id: storeId }, page, limit: 1000, sort: '-date', select }, signal);
    out.push(...(r.result || []));
    if (!r.result || r.result.length < 1000) break;
  }
  return out;
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const storeId = useStoreId();
  const { can, status } = useAuth();
  usePageMeta(t('Analytics'), 'pie');
  const now = useMemo(() => new Date(), []);
  const [g, setG] = useState<Granularity>('monthly');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [sel, setSel] = useState({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });
  const [slots, setSlots] = useState<(string | null)[]>(['sales', null, null]);
  const defs = SERIES_DEFS.filter((d) => can(SOURCES[d.source].resource));
  const active = slots.map((id) => defs.find((d) => d.id === id) || null);
  const needed = Array.from(new Set(active.filter(Boolean).map((d) => d!.source))) as Source[];
  const qs = useQueries({
    queries: needed.map((s) => ({
      queryKey: [SOURCES[s].path, 'analytics', storeId],
      enabled: !!storeId && status === 'ready',
      staleTime: 5 * 60_000,
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchAll(SOURCES[s].path, SOURCES[s].select, storeId, signal),
    })),
  });
  const data: Partial<Record<Source, Rec[]>> = {};
  needed.forEach((s, i) => { if (qs[i].data) data[s] = qs[i].data; });
  const loading = qs.some((q) => q.isPending);
  const error = qs.find((q) => q.isError)?.error as Error | undefined;
  const firstYear = firstYearOf(Object.values(data) as Rec[][], now.getFullYear());
  const labels = bucketLabels(g, sel, firstYear, now.getFullYear(), now);
  const series = active.map((d, slot) => (d ? { name: t(d.label), values: bucketSeries(data[d.source] || [], d.field, g, sel, firstYear, now.getFullYear(), now), color: SERIES[slot] } : null)).filter(Boolean) as { name: string; values: number[]; color: string }[];
  const hasData = series.some((s) => s.values.some((v) => v !== 0));
  const years = Array.from({ length: now.getFullYear() - firstYear + 1 }, (_, i) => String(now.getFullYear() - i));
  const full = slots.every(Boolean);

  return (
    <section className="pad insights">
      <div className="ph">
        <div><h1>{t('Analytics')}</h1><p>{t('Trends from every sale, purchase, return and expense — compare up to three series')}</p></div>
        <div className="acts"><Segmented label={t('View')} value={view} onChange={setView} options={[{ value: 'chart', label: t('Chart') }, { value: 'table', label: t('Table') }]} /></div>
      </div>
      <div className="card">
        <div className="an-bar">
          <Segmented label={t('Group by')} value={g} onChange={setG} options={[{ value: 'hourly', label: t('Hourly') }, { value: 'daily', label: t('Daily') }, { value: 'monthly', label: t('Monthly') }, { value: 'yearly', label: t('Yearly') }]} />
          {g === 'hourly' && <input className="inp" type="date" aria-label={t('Date')} value={toInputDate(new Date(sel.year, sel.month, sel.day))}
            onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); if (y) setSel({ year: y, month: m - 1, day: d }); }} />}
          {(g === 'daily' || g === 'monthly') && <Select aria-label={t('Year')} value={String(sel.year)} onChange={(e) => setSel({ ...sel, year: Number(e.target.value) })} options={years.map((y) => ({ value: y, label: y }))} />}
          {g === 'daily' && <Select aria-label={t('Month')} value={String(sel.month)} onChange={(e) => setSel({ ...sel, month: Number(e.target.value) })} options={MONTHS.map((m, i) => ({ value: String(i), label: t(m) }))} />}
        </div>
        <div className="an-series" role="group" aria-label={t('Series')}>
          {defs.map((d) => {
            const slot = slots.indexOf(d.id);
            const on = slot >= 0;
            return (
              <button key={d.id} type="button" className={`fchip${on ? ' on' : ''}`} aria-pressed={on} disabled={!on && full} title={!on && full ? t('Up to three series at a time') : undefined}
                onClick={() => setSlots((s) => toggleSlot(s, d.id))}>
                {on && <i className="sw" style={{ background: SERIES[slot] }} />}{t(d.label)}
              </button>
            );
          })}
        </div>
        <div className="card-b">
          {error ? <Banner tone="crit">{error.message}</Banner>
            : loading ? <Skeleton height={280} />
              : !series.length ? <EmptyState icon="chart" title={t('Pick a series to plot')} />
                : !hasData ? <EmptyState icon="chart" title={t('No data for this period')}>{t('Try another period or series.')}</EmptyState>
                  : view === 'chart' ? (
                    <>
                      {series.length > 1 && <div style={{ marginBottom: 8 }}><Legend items={series.map((s) => ({ name: s.name, color: s.color }))} /></div>}
                      <LineChart height={300} labels={labels} series={series} format={(v) => fmtMoney(v)} ariaLabel={`${series.map((s) => s.name).join(', ')} · ${t(g)}`} />
                    </>
                  ) : (
                    <div className="tw" style={{ maxHeight: 420, minHeight: 0 }}>
                      <table className="dg" aria-label={t('Analytics table')}>
                        <thead><tr><th>{t('Period')}</th>{series.map((s) => <th key={s.name} className="r">{s.name}</th>)}</tr></thead>
                        <tbody>{labels.map((l, i) => <tr key={l} style={{ cursor: 'default' }}><td>{l}</td>{series.map((s) => <td key={s.name} className="r num">{fmtMoney(s.values[i])}</td>)}</tr>)}</tbody>
                        <tfoot><tr><td><b>{t('Total')}</b></td>{series.map((s) => <td key={s.name} className="r num"><b>{fmtMoney(s.values.reduce((a, b) => a + b, 0))}</b></td>)}</tr></tfoot>
                      </table>
                    </div>
                  )}
        </div>
      </div>
    </section>
  );
}
