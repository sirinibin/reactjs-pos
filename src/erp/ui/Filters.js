import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Input, Select } from './Form';
import AsyncMultiSelect from './AsyncMultiSelect';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

/** Free-text column filter; reports the value after the user stops typing. */
export function TextFilter({ value, onChange, placeholder = 'Search', label, delay = 350 }) {
    const [text, setText] = useState(value || '');
    const debounced = useDebouncedValue(text, delay);
    useEffect(() => { setText(value || ''); }, [value]);
    useEffect(() => {
        if ((debounced || '') !== (value || '')) onChange(debounced.trim());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);
    return <Input value={text} placeholder={placeholder} aria-label={label || placeholder} onChange={e => setText(e.target.value)} />;
}

/** YES / NO / any select, sending "1" / "0" like the classic lists. */
export function YesNoFilter({ value, onChange, label, yesLabel = 'YES', noLabel = 'NO', anyLabel = 'All' }) {
    return (
        <Select
            aria-label={label}
            value={value === undefined ? '' : value}
            onChange={e => onChange(e.target.value)}
            options={[{ value: '', label: anyLabel }, { value: '0', label: noLabel }, { value: '1', label: yesLabel }]}
        />
    );
}

export function SelectFilter({ value, onChange, options, label, anyLabel = 'All' }) {
    return (
        <Select
            aria-label={label}
            value={value === undefined ? '' : value}
            onChange={e => onChange(e.target.value)}
            options={[{ value: '', label: anyLabel }].concat(options)}
        />
    );
}

/** "2026-10-05" (from <input type=date>) → local Date, avoiding the UTC shift. */
export function parseDateInput(str) {
    if (!str) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
}

/** The classic API expects dates as "MMM dd yyyy" (e.g. "Oct 05 2026"). */
export function toApiDate(str) {
    const d = parseDateInput(str);
    return d ? format(d, 'MMM dd yyyy') : '';
}

/**
 * Single date, or a From/To range after "Range" is ticked. Emits a patch for
 * all three search keys so switching modes clears the other keys, exactly
 * like the classic date filters.
 */
export function DateFilter({ field, fromField, toField, onChange, label = 'Date' }) {
    const [range, setRange] = useState(false);
    const [single, setSingle] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    function emit(next) {
        if (next.range) {
            onChange({ [field]: '', [fromField]: toApiDate(next.from), [toField]: toApiDate(next.to) });
        } else {
            onChange({ [field]: toApiDate(next.single), [fromField]: '', [toField]: '' });
        }
    }

    return (
        <div className="erp-datefilter">
            {range ? (
                <>
                    <Input type="date" aria-label={label + ' from'} value={from} onChange={e => { setFrom(e.target.value); emit({ range, from: e.target.value, to }); }} />
                    <Input type="date" aria-label={label + ' to'} value={to} onChange={e => { setTo(e.target.value); emit({ range, from, to: e.target.value }); }} />
                </>
            ) : (
                <Input type="date" aria-label={label} value={single} onChange={e => { setSingle(e.target.value); emit({ range, single: e.target.value }); }} />
            )}
            <label className="erp-datefilter__toggle">
                <input
                    type="checkbox"
                    checked={range}
                    onChange={e => {
                        const r = e.target.checked;
                        setRange(r);
                        setSingle(''); setFrom(''); setTo('');
                        emit({ range: r, single: '', from: '', to: '' });
                    }}
                />
                Range
            </label>
        </div>
    );
}

/** Multi-value id filter (created_by, customer_id, …): sends ids joined by commas. */
export function IdsFilter({ onChange, loadOptions, label, placeholder }) {
    const [selected, setSelected] = useState([]);
    return (
        <AsyncMultiSelect
            value={selected}
            label={label}
            placeholder={placeholder || 'Select'}
            loadOptions={loadOptions}
            onChange={v => { setSelected(v); onChange(v.map(x => x.id).join(',')); }}
        />
    );
}
