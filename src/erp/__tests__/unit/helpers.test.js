import { resolveColumns } from '../../hooks/useColumnPrefs';
import { pageWindow } from '../../ui/DataGrid';
import { toApiDate, parseDateInput } from '../../ui/Filters';
import { validateForm } from '../../crud/CrudForm';
import { rankEntries } from '../../shell/CommandPalette';
import { activeFilterCount } from '../../crud/CrudPage';
import { formatMoney, formatDateTime, formatDate } from '../../format';

describe('resolveColumns', () => {
    const cols = [{ key: 'a' }, { key: 'b', defaultHidden: true }, { key: 'c' }];

    it('defaults to column order with defaultHidden respected', () => {
        expect(resolveColumns(cols, null)).toEqual([{ key: 'a', visible: true }, { key: 'b', visible: false }, { key: 'c', visible: true }]);
    });

    it('keeps the saved order and visibility', () => {
        expect(resolveColumns(cols, [{ key: 'c', visible: true }, { key: 'a', visible: false }, { key: 'b', visible: true }]))
            .toEqual([{ key: 'c', visible: true }, { key: 'a', visible: false }, { key: 'b', visible: true }]);
    });

    it('drops columns that no longer exist and inserts new ones near their default spot', () => {
        expect(resolveColumns(cols, [{ key: 'a', visible: true }, { key: 'gone', visible: true }, { key: 'c', visible: true }]))
            .toEqual([{ key: 'a', visible: true }, { key: 'b', visible: false }, { key: 'c', visible: true }]);
    });

    it('a new first column goes to the front', () => {
        expect(resolveColumns([{ key: 'z' }, ...cols], [{ key: 'a', visible: true }, { key: 'b', visible: true }, { key: 'c', visible: true }])[0].key).toBe('z');
    });
});

describe('pageWindow', () => {
    it('handles one page', () => expect(pageWindow(1, 1)).toEqual([1]));
    it('shows all pages when few', () => expect(pageWindow(2, 3)).toEqual([1, 2, 3]));
    it('adds ellipses around the current window', () => {
        const w = pageWindow(10, 20).map(p => (typeof p === 'string' ? '…' : p));
        expect(w).toEqual([1, '…', 9, 10, 11, '…', 20]);
    });
    it('no leading ellipsis on the first pages', () => {
        const w = pageWindow(2, 20).map(p => (typeof p === 'string' ? '…' : p));
        expect(w).toEqual([1, 2, 3, '…', 20]);
    });
    it('ellipsis keys are unique', () => {
        const keys = pageWindow(10, 20).filter(p => typeof p === 'string');
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe('date filter helpers', () => {
    it('parses yyyy-mm-dd as a local date (no UTC day shift)', () => {
        const d = parseDateInput('2026-01-31');
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 31]);
    });
    it('rejects malformed input', () => {
        expect(parseDateInput('31/01/2026')).toBeNull();
        expect(parseDateInput('')).toBeNull();
    });
    it('formats for the API as "MMM dd yyyy"', () => {
        expect(toApiDate('2026-10-05')).toBe('Oct 05 2026');
        expect(toApiDate('')).toBe('');
    });
    it('handles leap day', () => {
        expect(toApiDate('2028-02-29')).toBe('Feb 29 2028');
    });
});

describe('validateForm', () => {
    const fields = [
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true, requiredMessage: 'Code is required' },
        { name: 'email', label: 'Email', validate: v => (/@/.test(v) ? null : 'E-mail is not valid') },
        { name: 'x', label: 'X', required: true, hidden: v => !v.showX },
    ];
    it('flags blank and whitespace-only required fields', () => {
        expect(validateForm(fields, { name: '   ', code: '' })).toEqual({ name: 'Name is required', code: 'Code is required' });
    });
    it('runs custom validators only on filled values', () => {
        expect(validateForm(fields, { name: 'a', code: 'b', email: 'nope' })).toEqual({ email: 'E-mail is not valid' });
        expect(validateForm(fields, { name: 'a', code: 'b', email: '' })).toEqual({});
    });
    it('skips hidden fields', () => {
        expect(validateForm(fields, { name: 'a', code: 'b', showX: false })).toEqual({});
        expect(validateForm(fields, { name: 'a', code: 'b', showX: true })).toEqual({ x: 'X is required' });
    });
    it('translates messages', () => {
        expect(validateForm([fields[0]], {}, s => 'T:' + s)).toEqual({ name: 'T:Name is required' });
    });
});

describe('rankEntries', () => {
    const entries = [
        { id: 'pr', label: 'Purchase Returns', group: 'Purchasing' },
        { id: 's', label: 'Sales', group: 'Sales' },
        { id: 'sr', label: 'Sales Returns', group: 'Sales' },
        { id: 'c', label: 'Customers', group: 'Sales' },
    ];
    it('returns everything for an empty query', () => expect(rankEntries(entries, ' ')).toHaveLength(4));
    it('ranks prefix matches above word matches', () => {
        expect(rankEntries(entries, 'ret').map(e => e.id)).toEqual(['pr', 'sr']);
        expect(rankEntries(entries, 'sal').map(e => e.id).slice(0, 2)).toEqual(['s', 'sr']);
    });
    it('falls back to the group name', () => {
        expect(rankEntries(entries, 'purchasing').map(e => e.id)).toEqual(['pr']);
    });
    it('returns nothing for no match', () => expect(rankEntries(entries, 'zzz')).toEqual([]));
});

describe('activeFilterCount', () => {
    it('counts non-blank keys', () => expect(activeFilterCount({ a: '1', b: '', c: undefined, d: 'x' })).toBe(2));
});

describe('format helpers', () => {
    it('formatMoney', () => {
        expect(formatMoney(1234.5)).toBe('1,234.50');
        expect(formatMoney('99.999')).toBe('100.00');
        expect(formatMoney(-5)).toBe('-5.00');
        expect(formatMoney(1.23456, 4)).toBe('1.2346');
        expect(formatMoney(null)).toBe('');
        expect(formatMoney('abc')).toBe('');
        expect(formatMoney(0)).toBe('0.00');
    });
    it('formatDateTime / formatDate', () => {
        const d = new Date(2026, 9, 5, 16, 30);
        expect(formatDateTime(d.toISOString())).toBe('Oct 05 2026 4:30PM');
        expect(formatDate(d.toISOString())).toBe('Oct 05 2026');
        expect(formatDateTime('')).toBe('');
        expect(formatDateTime('not a date')).toBe('');
    });
});
