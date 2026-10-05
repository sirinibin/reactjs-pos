import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { fmtNumber, fmtShort } from '@/lib/format';

/** Categorical series colours (validated palette: blue, orange, aqua; then "other" grey). */
export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s-other)'];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const isRtl = () => document.documentElement.dir === 'rtl';

export interface Series { name: string; values: number[]; color?: string }

/** Line chart with one shared y-axis, crosshair + tooltip, area under the first series. */
export function LineChart({ labels, series, height = 250, format = (n: number) => fmtNumber(n, 0), ariaLabel }: {
  labels: string[]; series: Series[]; height?: number; format?: (n: number) => string; ariaLabel: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = `lc-${useId().replace(/:/g, '')}`;
  const H = height;
  const rtl = isRtl();
  const n = labels.length;
  const all = series.flatMap((s) => s.values);
  const nice = (v: number) => { if (v <= 0) return 0; const mag = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / mag) * mag; };
  const max = Math.max(1, nice(Math.max(0, ...all)));
  const min = -nice(-Math.min(0, ...all));
  const m = { t: 10, r: rtl ? 44 : 12, b: 24, l: rtl ? 12 : 44 };
  const iw = Math.max(10, W - m.l - m.r), ih = H - m.t - m.b;
  const X = (i: number) => (n <= 1 ? m.l + iw / 2 : rtl ? m.l + iw - (i / (n - 1)) * iw : m.l + (i / (n - 1)) * iw);
  const Y = (v: number) => m.t + ih - ((v - min) / (max - min)) * ih;
  const path = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const step = W < 520 ? Math.ceil(n / 6) : Math.ceil(n / 12);
  const onMove = (clientX: number, el: SVGRectElement) => {
    const r = el.getBoundingClientRect();
    const x = clientX - r.left;
    const f = (rtl ? iw - x : x) / iw;
    setHover(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))));
  };
  const color = (i: number) => series[i].color || SERIES[i] || SERIES[3];

  return (
    <div className="chart" ref={ref} style={{ height: H }}>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color(0)} stopOpacity=".16" />
              <stop offset="1" stopColor={color(0)} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" />
              <text x={rtl ? m.l + iw + 8 : m.l - 8} y={Y(v) + 4} textAnchor={rtl ? 'start' : 'end'} fontSize="11" fill="var(--text-3)">{fmtShort(v)}</text>
            </g>
          ))}
          {labels.map((l, i) => (i % step === 0 || i === n - 1) && (
            <text key={i} x={X(i)} y={H - 5} textAnchor="middle" fontSize="11" fill="var(--text-3)">{l}</text>
          ))}
          {series[0] && n > 1 && <path d={`${path(series[0].values)}L${X(n - 1)},${Y(0)}L${X(0)},${Y(0)}Z`} fill={`url(#${gid})`} />}
          {min < 0 && <line x1={m.l} x2={m.l + iw} y1={Y(0)} y2={Y(0)} stroke="var(--text-4)" />}
          {series.map((s, si) => <path key={s.name} d={path(s.values)} fill="none" stroke={color(si)} strokeWidth="2" strokeLinejoin="round" />)}
          {series.map((s, si) => n > 0 && <circle key={`e${si}`} cx={X(n - 1)} cy={Y(s.values[n - 1] || 0)} r="4" fill={color(si)} stroke="var(--surface)" strokeWidth="2" />)}
          {hover !== null && (
            <g>
              <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} stroke="var(--text-4)" strokeDasharray="3 3" />
              {series.map((s, si) => <circle key={si} cx={X(hover)} cy={Y(s.values[hover] || 0)} r="4.5" fill={color(si)} stroke="var(--surface)" strokeWidth="2" />)}
            </g>
          )}
          <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent"
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(null)}
            onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget)} onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget)} />
        </svg>
      )}
      {hover !== null && W > 0 && (
        <div className="tip" style={{ opacity: 1, left: Math.min(W - 180, Math.max(0, X(hover) + 14)), top: 6 }}>
          <div className="t">{labels[hover]}</div>
          {series.map((s, si) => (
            <div className="r" key={s.name}><span><i style={{ background: color(si) }} />{s.name}</span><b className="num">{format(s.values[hover] || 0)}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="legend">{items.map((i) => <span key={i.name}><i style={{ background: i.color }} />{i.name}</span>)}</div>;
}

/** Vertical bars (single series). */
export function VBars({ data, height = 170, color = 'var(--s1)', format = fmtShort }: { data: { label: string; value: number; title?: string }[]; height?: number; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="vbars" style={{ height }} role="list">
      {data.map((d) => (
        <div className="vbar" key={d.label} title={d.title || `${d.label}: ${fmtNumber(d.value)}`} role="listitem" aria-label={`${d.label}: ${fmtNumber(d.value)}`}>
          <span className="bv num">{format(d.value)}</span>
          <div className="b" style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 2 : 0 }} />
          <span className="bl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal ranked bars. */
export function HBars({ data, format = fmtShort }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars" role="list">
      {data.map((d) => (
        <div className="hb" key={d.label} role="listitem" title={`${d.label}: ${fmtNumber(d.value)}`}>
          <span className="n">{d.label}</span><span className="v num">{format(d.value)}</span>
          <div className="tr"><div className="fl" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Donut with legend; >3 slices fold the tail into "Other". */
export function Donut({ data, centerLabel, centerValue, size = 148 }: { data: { label: string; value: number }[]; centerLabel?: string; centerValue?: ReactNode; size?: number }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const slices = sorted.length > 4 ? [...sorted.slice(0, 3), { label: 'Other', value: sorted.slice(3).reduce((a, b) => a + b.value, 0) }] : sorted;
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const r = 52, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut-row" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 140 140" style={{ width: size, height: size, flex: 'none' }} role="img" aria-label={slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}>
        <circle r={r} cx="70" cy="70" fill="none" stroke="var(--surface-3)" strokeWidth="18" />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} r={r} cx="70" cy="70" fill="none" stroke={SERIES[i] || SERIES[3]} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"><title>{s.label}</title></circle>;
          off += len;
          return el;
        })}
        {centerLabel && <text x="70" y="66" textAnchor="middle" fontSize="11" fill="var(--text-3)">{centerLabel}</text>}
        {centerValue && <text x="70" y="84" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)">{centerValue}</text>}
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 140 }}>
        {slices.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: SERIES[i] || SERIES[3], flex: 'none' }} />{s.label}
            <b className="num" style={{ marginInlineStart: 'auto', color: 'var(--text)' }}>{Math.round((s.value / total) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, width = 90, height = 30 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const mx = Math.max(...values), mn = Math.min(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i * width) / (values.length - 1)).toFixed(1)},${(height - 2 - ((v - mn) / (mx - mn || 1)) * (height - 4)).toFixed(1)}`).join('');
  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden><path d={d} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Gauge({ ratio, label }: { ratio: number; label?: string }) {
  const r = Math.max(0, Math.min(1, ratio));
  const L = 141.4;
  return (
    <svg viewBox="0 0 110 64" style={{ width: 110, height: 64, flex: 'none' }} role="img" aria-label={label || `${Math.round(r * 100)}%`}>
      <path d="M10 58a45 45 0 0 1 90 0" fill="none" stroke="var(--surface-3)" strokeWidth="10" strokeLinecap="round" />
      <path d="M10 58a45 45 0 0 1 90 0" fill="none" stroke={r > 0.9 ? 'var(--crit)' : r > 0.75 ? 'var(--warn)' : 'var(--s1)'} strokeWidth="10" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - r)} />
      <text x="55" y="56" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">{Math.round(r * 100)}%</text>
    </svg>
  );
}

/** Ordinal stacked bar (e.g. receivables aging) with sequential ramp. */
export function StackBar({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const ramp = ['var(--seq2)', 'var(--seq3)', 'var(--seq4)', 'var(--seq5)', 'var(--crit)'];
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <>
      <div className="aging" role="img" aria-label={data.map((d) => `${d.label}: ${fmtNumber(d.value)}`).join(', ')}>
        {data.filter((d) => d.value > 0).map((d) => <div key={d.label} style={{ width: `${(d.value / total) * 100}%`, background: d.color || ramp[data.indexOf(d)] || ramp[0] }} title={`${d.label}: ${fmtNumber(d.value)}`} />)}
      </div>
      <div className="aging-l">
        {data.map((d, i) => (
          <div key={d.label}><span><i style={{ background: d.color || ramp[i] }} />{d.label}</span><b className="num">{fmtNumber(d.value, 0)}</b></div>
        ))}
      </div>
    </>
  );
}

export function Kpi({ label, value, unit, delta, deltaGood, icon, spark, hint }: {
  label: string; value: ReactNode; unit?: string; delta?: string; deltaGood?: boolean; icon?: ReactNode; spark?: number[]; hint?: string;
}) {
  return (
    <div className="card kpi">
      <div className="l">{icon && <span className="ic">{icon}</span>}{label}</div>
      <div className="v num">{value}{unit && <small>{unit}</small>}</div>
      <div className="f">
        {delta && <span className={`delta ${deltaGood ? 'up' : 'dn'}`}>{delta}</span>}
        {hint && <span>{hint}</span>}
        {spark && <Sparkline values={spark} />}
      </div>
    </div>
  );
}
