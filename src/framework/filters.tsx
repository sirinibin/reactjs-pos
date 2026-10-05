import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { DATE_PRESETS, presetRange, type DatePreset } from '@/lib/dates';
import type { Query } from '@/api/client';
import { inputDateToApi } from '@/lib/format';

export type FilterDef =
  | { id: string; label: string; type: 'select'; options: { value: string; label: string }[]; toSearch?: (v: string) => Query }
  | { id: string; label: string; type: 'text' | 'number'; placeholder?: string; toSearch?: (v: string) => Query }
  | { id: string; label: string; type: 'daterange'; fromKey?: string; toKey?: string }
  | { id: string; label: string; type: 'picker'; load: (q: string, signal: AbortSignal) => Promise<PickerOption[]>; toSearch?: (v: string) => Query };

/** Encode/decode a date-range filter value: "preset" or "from~to". */
export function dateRangeToSearch(v: string, fromKey = 'from_date', toKey = 'to_date'): Query {
  if (!v || v === 'all') return {};
  const r = v.includes('~') ? (v.split('~').map((x) => (x ? inputDateToApi(x) : '')) as [string, string]) : presetRange(v as DatePreset);
  if (!r) return {};
  return { [fromKey]: r[0] || undefined, [toKey]: r[1] || undefined };
}

export function filtersToSearch(defs: FilterDef[], values: Record<string, string>): Query {
  const out: Query = {};
  for (const d of defs) {
    const v = values[d.id];
    if (v === undefined || v === '') continue;
    if (d.type === 'daterange') Object.assign(out, dateRangeToSearch(v, d.fromKey, d.toKey));
    else if (d.type === 'picker') Object.assign(out, d.toSearch ? d.toSearch(v.split('|')[0]) : { [d.id]: v.split('|')[0] });
    else Object.assign(out, d.toSearch ? d.toSearch(v) : { [d.id]: v });
  }
  return out;
}

function describe(d: FilterDef, v: string, t: (s: string) => string): string {
  if (d.type === 'select') return t(d.options.find((o) => o.value === v)?.label || v);
  if (d.type === 'daterange') {
    const p = DATE_PRESETS.find((x) => x.id === v);
    return p ? t(p.label) : v.replace('~', ' → ');
  }
  if (d.type === 'picker') return v.split('|')[1] || v;
  return v;
}

function Popover({ anchor, onClose, children }: { anchor: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [onClose]);
  return <div ref={ref} style={{ position: 'relative' }}>{anchor}<div className="pop" role="dialog">{children}</div></div>;
}

export function FilterChip({ def, value, onChange }: { def: FilterDef; value: string | undefined; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [range, setRange] = useState<[string, string]>(() => (value?.includes('~') ? (value.split('~') as [string, string]) : ['', '']));
  useEffect(() => setDraft(value || ''), [value]);
  const active = value !== undefined && value !== '';
  const chip = (
    <button type="button" className={`fchip${active ? ' on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
      <Icon name={active ? (def.type === 'daterange' ? 'clock' : 'filter') : 'plus'} size="xs" />
      <span>{t(def.label)}</span>
      {active && <>: <b>{describe(def, value!, t)}</b></>}
      {active && (
        <span role="button" tabIndex={0} aria-label={`${t('Clear')} ${t(def.label)}`} className="fchip-x"
          onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}>
          <Icon name="x" size="xs" />
        </span>
      )}
    </button>
  );
  if (!open) return chip;
  const apply = (v: string) => { onChange(v); setOpen(false); };
  return (
    <Popover anchor={chip} onClose={() => setOpen(false)}>
      <div className="pop-t">{t(def.label)}</div>
      {def.type === 'select' && (
        <div className="pop-list">
          {def.options.map((o) => (
            <button type="button" key={o.value} className={o.value === value ? 'on' : undefined} onClick={() => apply(o.value)}>
              {t(o.label)}{o.value === value && <Icon name="check" size="s" />}
            </button>
          ))}
        </div>
      )}
      {(def.type === 'text' || def.type === 'number') && (
        <form onSubmit={(e) => { e.preventDefault(); apply(draft.trim()); }} className="stack" style={{ gap: 8 }}>
          <input className="inp" autoFocus value={draft} type="text" inputMode={def.type === 'number' ? 'decimal' : undefined} placeholder={def.placeholder || (def.type === 'number' ? 'e.g. >=1000' : '')} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" variant="primary" size="sm">{t('Apply')}</Button>
        </form>
      )}
      {def.type === 'daterange' && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="pop-list">
            {DATE_PRESETS.map((p) => (
              <button type="button" key={p.id} className={p.id === value ? 'on' : undefined} onClick={() => apply(p.id === 'all' ? '' : p.id)}>{t(p.label)}</button>
            ))}
          </div>
          <div className="pop-t">{t('Custom range')}</div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="inp" type="date" aria-label={t('From')} value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} />
            <input className="inp" type="date" aria-label={t('To')} value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} />
          </div>
          <Button size="sm" variant="primary" disabled={!range[0] && !range[1]} onClick={() => apply(`${range[0]}~${range[1]}`)}>{t('Apply')}</Button>
        </div>
      )}
      {def.type === 'picker' && (
        <AsyncPicker value={null} eager autoFocus load={def.load} onChange={(o) => o && apply(`${o.id}|${o.label}`)} placeholder={t('Search…')} />
      )}
    </Popover>
  );
}
