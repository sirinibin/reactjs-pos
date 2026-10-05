import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFieldId } from './Form';

/**
 * Multi-select with server-side suggestions (replaces the classic
 * react-bootstrap-typeahead filters). value: [{id, name}].
 * loadOptions(query) resolves [{id, name}].
 */
export default function AsyncMultiSelect({ value = [], onChange, loadOptions, placeholder = 'Search…', label, minChars = 0, getLabel = o => o.name, id, invalid, ...aria }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const debounced = useDebouncedValue(query, 250);
    const rootRef = useRef(null);
    const menuId = useFieldId() + '-menu';
    const loadRef = useRef(loadOptions);
    loadRef.current = loadOptions;

    useEffect(() => {
        if (!open || debounced.length < minChars) return undefined;
        let cancelled = false;
        setLoading(true);
        Promise.resolve(loadRef.current(debounced))
            .then(opts => { if (!cancelled) { setOptions(opts || []); setActiveIdx(0); } })
            .catch(() => { if (!cancelled) setOptions([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [debounced, open, minChars]);

    useEffect(() => {
        if (!open) return undefined;
        function onDoc(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const selectedIds = new Set(value.map(v => v.id));
    const available = options.filter(o => !selectedIds.has(o.id));

    function add(opt) {
        onChange(value.concat([opt]));
        setQuery('');
    }

    function remove(id) {
        onChange(value.filter(v => v.id !== id));
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIdx(i => Math.min(available.length - 1, i + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
        else if (e.key === 'Enter' && open && available[activeIdx]) { e.preventDefault(); add(available[activeIdx]); }
        else if (e.key === 'Escape') setOpen(false);
        else if (e.key === 'Backspace' && !query && value.length) remove(value[value.length - 1].id);
    }

    return (
        <div className="erp-ms" ref={rootRef}>
            <div className={'erp-ms__control' + (invalid ? ' is-invalid' : '')} onClick={() => setOpen(true)}>
                {value.map(v => (
                    <span key={v.id} className="erp-ms__tag">
                        {getLabel(v)}
                        <button type="button" aria-label={'Remove ' + getLabel(v)} onClick={e => { e.stopPropagation(); remove(v.id); }}>
                            <X size={11} />
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    className="erp-ms__input"
                    value={query}
                    placeholder={value.length ? '' : placeholder}
                    aria-label={id ? undefined : label || placeholder}
                    aria-invalid={aria['aria-invalid']}
                    aria-describedby={aria['aria-describedby']}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={menuId}
                    onFocus={() => setOpen(true)}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onKeyDown={onKeyDown}
                />
            </div>
            {open && (
                <ul className="erp-ms__menu" role="listbox" id={menuId}>
                    {loading && <li className="erp-ms__note">Loading…</li>}
                    {!loading && available.length === 0 && <li className="erp-ms__note">{query.length < minChars ? `Type ${minChars}+ characters` : 'No matches'}</li>}
                    {!loading && available.map((o, i) => (
                        <li
                            key={o.id}
                            role="option"
                            aria-selected={i === activeIdx}
                            className={'erp-ms__opt' + (i === activeIdx ? ' is-active' : '')}
                            onMouseEnter={() => setActiveIdx(i)}
                            onMouseDown={e => { e.preventDefault(); add(o); }}
                        >
                            {getLabel(o)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
