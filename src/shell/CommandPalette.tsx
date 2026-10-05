import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/ui/Icon';
import { useAuth } from '@/auth/AuthContext';
import { useVisibleNav } from './useVisibleNav';
import { getCreates, getProviders, type CommandHit } from './commands';
import { useDebounced } from '@/framework/useListState';

interface Row { key: string; label: string; sub?: string; icon: IconName; path: string; group: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { store, can } = useAuth();
  const modules = useVisibleNav();
  const [q, setQ] = useState('');
  const [hl, setHl] = useState(0);
  const [hits, setHits] = useState<CommandHit[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q.trim(), 220);

  useEffect(() => {
    if (open) { setQ(''); setHl(0); setHits([]); input.current?.focus(); }
  }, [open]);

  useEffect(() => {
    if (!open || dq.length < 2 || !store) { setHits([]); return; }
    const ac = new AbortController();
    setBusy(true);
    const allowedNav = new Set(modules.flatMap((m) => m.groups.flatMap((g) => g.items.map((i) => i.id))));
    Promise.allSettled(getProviders().filter((p) => can(p.resource) && (!p.navId || allowedNav.has(p.navId))).map((p) => p.search(dq, store.id, ac.signal)))
      .then((rs) => { if (!ac.signal.aborted) setHits(rs.flatMap((r) => (r.status === 'fulfilled' ? r.value.slice(0, 5) : []))); })
      .finally(() => !ac.signal.aborted && setBusy(false));
    return () => ac.abort();
  }, [dq, open, store, can, modules]);

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    const allowedNav = new Set(modules.flatMap((m) => m.groups.flatMap((g) => g.items.map((i) => i.id))));
    const createRows = getCreates().filter((c) => allowedNav.has(c.navId) && can(c.resource, 'create'))
      .map((c) => ({ key: `c:${c.path}`, label: t(c.label), icon: c.icon, path: c.path, group: t('Create') }));
    const navRows = modules.flatMap((m) => m.groups.flatMap((g) => g.items.map((i) => ({ key: `n:${i.id}`, label: t(i.label), sub: t(m.title), icon: i.icon, path: i.path, group: t('Go to') }))));
    const match = (r: Row) => !needle || r.label.toLowerCase().includes(needle) || (r.sub || '').toLowerCase().includes(needle);
    const recs = hits.map((h) => ({ key: `r:${h.id}`, label: h.label, sub: h.sub, icon: h.icon, path: h.path, group: t(h.group) }));
    return [...recs, ...createRows.filter(match).slice(0, needle ? 8 : 5), ...navRows.filter(match).slice(0, needle ? 12 : 8)];
  }, [q, modules, hits, t, can]);

  useEffect(() => setHl(0), [rows.length]);
  if (!open) return null;

  const go = (r?: Row) => { if (!r) return; onClose(); nav(r.path); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => Math.min(rows.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[hl]); }
    else if (e.key === 'Escape') onClose();
  };
  let last = '';

  return createPortal(
    <div className="ov-root">
      <div className="scrim on" onClick={onClose} />
      <div className="modal on" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="cmdk" role="dialog" aria-modal="true" aria-label={t('Command palette')}>
          <div className="cmdk-in">
            <Icon name="search" />
            <input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t('Search records or type a command…')}
              role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={rows[hl] ? `cmd-${hl}` : undefined} />
            {busy ? <span className="spin" /> : <kbd>Esc</kbd>}
          </div>
          <div className="cmdk-l" id="cmdk-list" role="listbox">
            {rows.length === 0 && <div className="empty-state" style={{ padding: 24 }}>{t('No results')}</div>}
            {rows.map((r, i) => {
              const head = r.group !== last ? <div className="cmdk-g" key={`g${i}`}>{r.group}</div> : null;
              last = r.group;
              return [head, (
                <button key={r.key} id={`cmd-${i}`} role="option" aria-selected={i === hl} type="button" className={i === hl ? 'hl' : undefined}
                  onMouseEnter={() => setHl(i)} onClick={() => go(r)}>
                  <Icon name={r.icon} size="s" /><span>{r.label}</span>{r.sub && <span className="k">{r.sub}</span>}
                </button>
              )];
            })}
          </div>
          <div className="cmdk-f"><span><kbd>↑</kbd> <kbd>↓</kbd> {t('navigate')}</span><span><kbd>Enter</kbd> {t('open')}</span><span><kbd>Esc</kbd> {t('close')}</span></div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
