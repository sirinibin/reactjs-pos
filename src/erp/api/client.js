/**
 * Thin fetch wrapper for the pos-rest API.
 *
 * It speaks the existing API exactly as the classic screens do: relative /v1
 * URLs, the raw access token in the Authorization header, list filters as
 * search[field]=value, and the { status, result, total_count, errors }
 * response envelope. Nothing here changes what the server receives.
 */

export class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors || {};
    }
}

export function getToken() {
    return localStorage.getItem('access_token') || '';
}

export function getStoreId() {
    return localStorage.getItem('store_id') || '';
}

/** Timezone offset in hours, signed the way the classic screens send it. */
export function timezoneOffsetHours(date = new Date()) {
    return parseFloat(date.getTimezoneOffset() / 60);
}

/** {key, dir} → "-key" for descending, "key" for ascending (API convention). */
export function sortParam(sort) {
    if (!sort || !sort.key) return '';
    return (sort.dir === 'desc' ? '-' : '') + sort.key;
}

function isBlank(v) {
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/**
 * Builds a query string.
 *   search: {field: value} → search[field]=value (blank values skipped)
 *   params: {key: value}   → key=value (blank values skipped)
 */
export function buildQuery({ search, params } = {}) {
    const parts = [];
    if (search) {
        Object.keys(search).forEach(k => {
            const v = search[k];
            if (isBlank(v)) return;
            parts.push(`search[${encodeURIComponent(k)}]=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`);
        });
    }
    if (params) {
        Object.keys(params).forEach(k => {
            const v = params[k];
            if (isBlank(v)) return;
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`);
        });
    }
    return parts.join('&');
}

/** Turns an API error map into one readable sentence. */
export function errorSummary(errors, fallback = 'Something went wrong. Please try again.') {
    if (!errors) return fallback;
    if (typeof errors === 'string') return errors;
    const msgs = Object.values(errors).filter(v => typeof v === 'string' && v.trim());
    return msgs.length ? msgs.join(' ') : fallback;
}

let unauthorizedHandler = null;
export function onUnauthorized(fn) {
    unauthorizedHandler = fn;
}

export async function request(method, path, { query, body, signal, headers } = {}) {
    const url = path + (query ? (path.includes('?') ? '&' : '?') + query : '');
    let response;
    try {
        response = await fetch(url, {
            method,
            signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: getToken(),
                ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, {});
    }

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok || (data && data.status === false)) {
        const errors = (data && data.errors) || {};
        if (response.status === 401 && errors.access_token && unauthorizedHandler) {
            unauthorizedHandler(errors);
        }
        throw new ApiError(errorSummary(errors, `Request failed (${response.status})`), response.status, errors);
    }
    return data || {};
}

export const api = {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts = {}) => request('POST', path, { ...opts, body }),
    put: (path, body, opts = {}) => request('PUT', path, { ...opts, body }),
    del: (path, opts) => request('DELETE', path, opts),
};
