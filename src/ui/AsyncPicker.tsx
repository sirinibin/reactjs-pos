import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { useDebounced } from '@/framework/useListState';

export interface PickerOption<T = any> { id: string; label: string; sub?: string; right?: ReactNode; data: T }

interface Props<T> {
  value: PickerOption<T> | null;
  onChange: (v: PickerOption<T> | null) => void;
  load: (q: string, signal: AbortSignal) => Promise<PickerOption<T>[]>;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  /** Load suggestions on focus even with an empty query. */
  eager?: boolean;
  onCreate?: (q: string) => void;
  createLabel?: string;
  clearable?: boolean;
  autoFocus?: boolean;
  /** Keep the input empty after a pick (line-item adders). */
  resetOnPick?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/** Accessible async combobox (WAI-ARIA 1.2 pattern) used for customers, vendors, products… */
export function AsyncPicker<T>(p: Props<T>) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<PickerOption<T>[]>([]);
  const [hl, setHl] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q, 200);
  const editing = open || !p.value;

  useEffect(() => {
    if (!open) return;
    if (!dq.trim() && !p.eager) { setOpts([]); return; }
    const ac = new AbortController();
    setBusy(true);
    setError(false);
    p.load(dq.trim(), ac.signal)
      .then((r) => { if (!ac.signal.aborted) { setOpts(r); setHl(0); } })
      .catch((e) => { if (!ac.signal.aborted && e?.name !== 'AbortError') setError(true); })
      .finally(() => !ac.signal.aborted && setBusy(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, open]);

  const pick = (o: PickerOption<T>) => {
    p.onChange(o);
    setQ(p.resetOnPick ? '' : '');
    setOpen(p.resetOnPick ? true : false);
    if (p.resetOnPick) inputRef.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHl((h) => Math.min(opts.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { if (open && opts[hl] && !busy && dq === q) { e.preventDefault(); pick(opts[hl]); } else if (open) e.preventDefault(); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="ta">
      <div className="inpw">
        <Icon name="search" size="s" />
        <input
          ref={inputRef}
          id={p.id}
          className={`inp${p.invalid ? ' err' : ''}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && opts[hl] ? `${listId}-${hl}` : undefined}
          aria-invalid={p.invalid || undefined}
          aria-label={p['aria-label']}
          aria-describedby={p['aria-describedby']}
          autoComplete="off"
          autoFocus={p.autoFocus}
          disabled={p.disabled}
          placeholder={p.placeholder}
          value={editing ? q : p.value!.label}
          onChange={(e) => { setQ(e.target.value); setOpts([]); setOpen(true); }}
          onFocus={() => { setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
        />
        {busy && <span className="spin" style={{ position: 'absolute', insetInlineEnd: 10 }} />}
        {!busy && p.clearable && p.value && (
          <button type="button" className="ib" style={{ position: 'absolute', insetInlineEnd: 2, width: 30, height: 30 }} aria-label="Clear" onClick={() => { p.onChange(null); setQ(''); inputRef.current?.focus(); }}>
            <Icon name="x" size="xs" />
          </button>
        )}
      </div>
      <div className={`ta-menu${open && (opts.length || error || (dq.trim() && !busy)) ? ' on' : ''}`} id={listId} role="listbox">
        {error && <div className="muted" style={{ padding: 12 }}>Couldn’t load suggestions.</div>}
        {opts.map((o, i) => (
          <button type="button" key={o.id} id={`${listId}-${i}`} role="option" aria-selected={i === hl} className={i === hl ? 'hl' : undefined}
            onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHl(i)}>
            <b>{o.label}</b><em className="num">{o.right}</em>
            {o.sub && <span>{o.sub}</span>}
          </button>
        ))}
        {!error && !busy && dq.trim() && opts.length === 0 && !p.onCreate && (
          <div className="muted" style={{ padding: 12 }}>No match for “{dq}”.</div>
        )}
        {!error && !busy && dq.trim() && p.onCreate && (
          <button type="button" className="ta-create" onMouseDown={(e) => { e.preventDefault(); p.onCreate!(dq.trim()); }}>
            <Icon name="plus" size="s" /><span>{(p.createLabel || 'Create “{q}”').replace('{q}', dq.trim()).replace('…', dq.trim())}</span>
          </button>
        )}
      </div>
    </div>
  );
}
