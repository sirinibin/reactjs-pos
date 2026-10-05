import { format as fmt } from 'date-fns';
import { formatInStoreTimezone } from '../utils/dateUtils';

const formatters = {};
function numberFormatter(decimals) {
    if (!formatters[decimals]) {
        formatters[decimals] = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return formatters[decimals];
}

/** 1234.5 → "1,234.50". Non-numbers render as an empty string. */
export function formatMoney(value, decimals = 2) {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (n === null || n === undefined || Number.isNaN(n)) return '';
    return numberFormatter(decimals).format(n);
}

/** List-cell date format used by the classic lists: "Oct 05 2026 4:30PM". */
export function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return fmt(d, 'MMM dd yyyy h:mma');
}

export function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return fmt(d, 'MMM dd yyyy');
}

/** Detail-view timestamp in the store's own timezone, as the classic views show it. */
export function formatStoreDateTime(value) {
    return formatInStoreTimezone(value);
}
