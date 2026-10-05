import { useCallback, useEffect, useRef, useState } from 'react';

function readInt(key, fallback) {
    try {
        const v = parseInt(localStorage.getItem(key), 10);
        return Number.isFinite(v) && v > 0 ? v : fallback;
    } catch (_) {
        return fallback;
    }
}

/**
 * Paging, sorting and filtering state for a server-side list, plus the fetch.
 *
 * fetchPage({search, sort, page, limit, signal}) must resolve {rows, total}.
 * Changing filters or sort resets to page 1. Stale responses are discarded
 * (each load aborts the previous one), so fast typing never shows old rows.
 */
export function useServerList({ fetchPage, storageKey, defaultSort, defaultPageSize = 20, initialSearch = {} }) {
    const [search, setSearchState] = useState(initialSearch);
    const [sort, setSortState] = useState(defaultSort || null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSizeState] = useState(() => (storageKey ? readInt(storageKey + '_pageSize', defaultPageSize) : defaultPageSize));
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0);
    const abortRef = useRef(null);
    const fetchRef = useRef(fetchPage);
    fetchRef.current = fetchPage;

    useEffect(() => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        abortRef.current = ctrl;
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.resolve(fetchRef.current({ search, sort, page, limit: pageSize, signal: ctrl ? ctrl.signal : undefined }))
            .then(res => {
                if (cancelled) return;
                setRows(res.rows || []);
                setTotal(res.total || 0);
                setMeta(res.meta || null);
                setLoading(false);
            })
            .catch(err => {
                if (cancelled || (err && err.name === 'AbortError')) return;
                setError(err);
                setLoading(false);
            });
        return () => {
            cancelled = true;
            if (ctrl) ctrl.abort();
        };
    }, [search, sort, page, pageSize, version]);

    const setFilter = useCallback((field, value) => {
        setSearchState(prev => {
            if (prev[field] === value) return prev;
            const next = { ...prev };
            if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) delete next[field];
            else next[field] = value;
            return next;
        });
        setPage(1);
    }, []);

    const setFilters = useCallback(patch => {
        setSearchState(prev => {
            const next = { ...prev };
            Object.keys(patch).forEach(k => {
                const v = patch[k];
                if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) delete next[k];
                else next[k] = v;
            });
            return next;
        });
        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setSearchState({});
        setPage(1);
    }, []);

    const setSort = useCallback(s => {
        setSortState(s);
        setPage(1);
    }, []);

    const setPageSize = useCallback(size => {
        setPageSizeState(size);
        setPage(1);
        if (storageKey) {
            try { localStorage.setItem(storageKey + '_pageSize', String(size)); } catch (_) { }
        }
    }, [storageKey]);

    const reload = useCallback(() => setVersion(v => v + 1), []);

    return {
        rows, total, meta, loading, error,
        search, setFilter, setFilters, clearFilters,
        sort, setSort,
        page, setPage, pageSize, setPageSize,
        reload,
    };
}
