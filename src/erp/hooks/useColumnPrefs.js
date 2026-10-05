import { useCallback, useMemo, useState } from 'react';

/**
 * Column visibility and order, persisted per list in localStorage.
 * Columns with `defaultHidden` start hidden; columns added later appear in
 * their default position; columns that no longer exist are dropped.
 */
export function resolveColumns(columns, saved) {
    if (!Array.isArray(saved) || saved.length === 0) {
        return columns.map(c => ({ key: c.key, visible: !c.defaultHidden }));
    }
    const known = new Set(columns.map(c => c.key));
    const result = saved.filter(s => known.has(s.key)).map(s => ({ key: s.key, visible: !!s.visible }));
    const present = new Set(result.map(r => r.key));
    columns.forEach((c, idx) => {
        if (present.has(c.key)) return;
        // insert after the nearest preceding column that is already placed
        let insertAt = 0;
        for (let i = idx - 1; i >= 0; i--) {
            const pos = result.findIndex(r => r.key === columns[i].key);
            if (pos >= 0) { insertAt = pos + 1; break; }
        }
        result.splice(insertAt, 0, { key: c.key, visible: !c.defaultHidden });
    });
    return result;
}

export function useColumnPrefs(storageKey, columns) {
    const key = 'erp_cols_' + storageKey;
    const [saved, setSaved] = useState(() => {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
    });

    const prefs = useMemo(() => resolveColumns(columns, saved), [columns, saved]);

    const visibleColumns = useMemo(() => {
        const byKey = {};
        columns.forEach(c => { byKey[c.key] = c; });
        return prefs.filter(p => p.visible && byKey[p.key]).map(p => byKey[p.key]);
    }, [prefs, columns]);

    const save = useCallback(next => {
        setSaved(next);
        try {
            if (next) localStorage.setItem(key, JSON.stringify(next));
            else localStorage.removeItem(key);
        } catch (_) { }
    }, [key]);

    return { prefs, visibleColumns, save, reset: () => save(null) };
}
