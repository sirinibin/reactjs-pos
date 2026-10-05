import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, type Tone } from '@/ui/Pill';
import { fmtMoney, parseNumber } from '@/lib/format';
import { parsePlate } from '../lib/plate';
import { statusLabel, type KList } from '../lib/kanban';
import { balanceInfo, type EmpAccount } from '../lib/hr';
import '../workshop.css';

/** Saudi plate badge: digits + Latin letters | Arabic letters. Falls back to the raw text. */
export function Plate({ value }: { value?: string | null }) {
  if (!value) return null;
  const p = parsePlate(value);
  if (!p) return <span className="plate ws-plate" dir="ltr" title={value}><span>{value}</span></span>;
  return (
    <span className="plate ws-plate" dir="ltr" title={value} aria-label={value}>
      <span>{p.digits} {p.latin}</span>
      <span className="ar" lang="ar">{p.arabic}</span>
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = { open: 'info', in_progress: 'warn', completed: 'good', delivered: 'good', cancelled: 'crit', closed: 'neutral' };

export function JobStatusPill({ status, lists }: { status?: string; lists?: KList[] }) {
  const { t } = useTranslation();
  const s = status || 'open';
  const list = lists?.find((l) => l.id === s);
  if (list) {
    return <span className="pill ws-list-pill" style={{ color: list.color, background: `${list.color}22` }}><i aria-hidden style={{ background: list.color }} />{t(list.name)}</span>;
  }
  return <Pill tone={STATUS_TONE[s] || 'neutral'} icon={s === 'closed' ? 'lock' : s === 'cancelled' ? 'xc' : s === 'completed' || s === 'delivered' ? 'checkc' : 'clock'}>{t(statusLabel(s))}</Pill>;
}

export function OpenClosedPill({ status }: { status?: string }) {
  const { t } = useTranslation();
  return status === 'closed' ? <Pill tone="neutral" icon="lock">{t('Closed')}</Pill> : <Pill tone="info" icon="clock">{t('Open')}</Pill>;
}

/** Linked document chips on a job (invoice / quotation / non-VAT). */
export function DocChips({ job, amounts }: { job: Record<string, any>; amounts?: boolean }) {
  const chips: { k: string; cls: string; label: string }[] = [];
  if (job.order_id) chips.push({ k: 'inv', cls: 'inv', label: amounts ? `INV · ${fmtMoney(job.order_net_total)}` : job.order_code || 'INV' });
  if (job.quotation_id && job.quotation_type !== 'non_vat_invoice') chips.push({ k: 'qtn', cls: 'qtn', label: amounts ? `QTN · ${fmtMoney(job.quotation_net_total)}` : job.quotation_code || 'QTN' });
  if (job.non_vat_sales_id) chips.push({ k: 'nv', cls: 'nv', label: amounts ? `N-VAT · ${fmtMoney(job.non_vat_sales_net_total)}` : job.non_vat_sales_code || 'N-VAT' });
  if (!chips.length) return null;
  return <span className="ws-chips">{chips.map((c) => <span key={c.k} className={`ws-chip ${c.cls}`}>{c.label}</span>)}</span>;
}

/** Employee balance with direction label (negative = store owes the employee). */
export function BalanceText({ account, block }: { account?: EmpAccount | null; block?: boolean }) {
  const { t } = useTranslation();
  const b = balanceInfo(account);
  return (
    <span className={block ? 'ws-bal block' : 'ws-bal'}>
      <b className="num" style={{ color: `var(--${b.tone === 'good' ? 'good' : b.tone === 'info' ? 'info' : 'crit'})` }}>{fmtMoney(b.amount)}</b>
      {b.label && <small className="muted">{t(b.label)}</small>}
    </span>
  );
}

/** Numeric cell that commits on blur / Enter (Escape reverts). */
export function NumCell({ value, onCommit, label, dp = 2, disabled, className = 'cell num' }: { value: number; onCommit: (n: number) => void; label: string; dp?: number; disabled?: boolean; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancel = useRef(false);
  const shown = draft ?? (value ? String(Number(Number(value).toFixed(dp))) : '0');
  return (
    <input
      className={className}
      inputMode="decimal"
      aria-label={label}
      disabled={disabled}
      value={shown}
      onFocus={(e) => { cancel.current = false; setDraft(shown); e.currentTarget.select(); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (!cancel.current && draft !== null && parseNumber(draft) !== value) onCommit(parseNumber(draft)); setDraft(null); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.stopPropagation(); cancel.current = true; e.currentTarget.blur(); }
      }}
    />
  );
}

export const tzOffsetHours = () => new Date().getTimezoneOffset() / 60;
