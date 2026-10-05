import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, CornerDownLeft } from 'lucide-react';
import { ITEM_META, NAV_GROUPS, MENU_SETTINGS_ITEM } from './navModel';

/** Ranks entries: label prefix match first, then word-start, then substring. */
export function rankEntries(entries, query) {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    const scored = [];
    entries.forEach(e => {
        const label = e.label.toLowerCase();
        const group = (e.group || '').toLowerCase();
        let score = -1;
        if (label.startsWith(q)) score = 3;
        else if (label.split(/\s+/).some(w => w.startsWith(q))) score = 2;
        else if (label.includes(q)) score = 1;
        else if (group.includes(q)) score = 0;
        if (score >= 0) scored.push({ e, score });
    });
    return scored.sort((a, b) => b.score - a.score).map(s => s.e);
}

/** Ctrl/Cmd+K opens a quick-jump list over every menu entry the user can see. */
export default function CommandPalette({ items }) {
    const { t } = useTranslation('common');
    const history = useHistory();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef(null);

    const entries = useMemo(() => {
        const groupLabel = id => {
            const g = NAV_GROUPS.find(x => x.id === id);
            return g ? t(g.label) : '';
        };
        return items.concat([MENU_SETTINGS_ITEM]).map(item => {
            const meta = ITEM_META[item.id] || ['admin', item.icon];
            return { id: item.id, label: t(item.label), path: item.path, group: groupLabel(meta[0]), Icon: meta[1] || item.icon };
        });
    }, [items, t]);

    const results = rankEntries(entries, query);

    useEffect(() => {
        function onKey(e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setOpen(o => !o);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
        }
    }, [open]);

    useEffect(() => { setActiveIdx(0); }, [query]);

    function go(entry) {
        if (!entry) return;
        setOpen(false);
        history.push(entry.path);
    }

    function onInputKey(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(results.length - 1, i + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(results[activeIdx]); }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    }

    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '');

    return (
        <>
            <button type="button" className="erp-search-trigger" onClick={() => setOpen(true)} aria-label={t('Search menus')}>
                <Search size={14} aria-hidden="true" />
                <span className="erp-search-trigger__text">{t('Search menus and pages…')}</span>
                <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            {open && ReactDOM.createPortal(
                <div className="erp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
                    <div className="erp-modal erp-cmdk" role="dialog" aria-modal="true" aria-label={t('Search menus')}>
                        <input
                            ref={inputRef}
                            className="erp-cmdk__input"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={onInputKey}
                            placeholder={t('Type a menu name, e.g. Sales')}
                            role="combobox"
                            aria-expanded="true"
                            aria-controls="erp-cmdk-list"
                            aria-activedescendant={results[activeIdx] ? 'erp-cmdk-' + results[activeIdx].id : undefined}
                        />
                        <ul className="erp-cmdk__list" id="erp-cmdk-list" role="listbox">
                            {results.length === 0 && <li className="erp-empty" style={{ padding: 24 }}>{t('No matching menus')}</li>}
                            {results.map((r, i) => (
                                <li
                                    key={r.id}
                                    id={'erp-cmdk-' + r.id}
                                    role="option"
                                    aria-selected={i === activeIdx}
                                    className={'erp-cmdk__item' + (i === activeIdx ? ' is-active' : '')}
                                    onMouseEnter={() => setActiveIdx(i)}
                                    onClick={() => go(r)}
                                >
                                    {r.Icon && <r.Icon size={16} aria-hidden="true" />}
                                    <span>{r.label}</span>
                                    <span className="erp-cmdk__hint">{r.group}</span>
                                    {i === activeIdx && <CornerDownLeft size={13} aria-hidden="true" />}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
