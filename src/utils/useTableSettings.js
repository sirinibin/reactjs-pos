import { useState, useEffect, useCallback } from 'react';

export function useTableSettings({ storageKey, selectStorageKey, pendingStorageKey, defaultColumns, enableSelection = false, pendingView = false }) {
    const resolvedKey = enableSelection
        ? (selectStorageKey || storageKey)
        : pendingView
        ? (pendingStorageKey || storageKey)
        : storageKey;

    const [columns, setColumns] = useState(defaultColumns);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(resolvedKey);
        if (saved) setColumns(JSON.parse(saved));

        let missingOrUpdated = false;
        for (let i = 0; i < defaultColumns.length; i++) {
            if (!saved) break;
            const savedCol = JSON.parse(saved)?.find(col => col.fieldName === defaultColumns[i].fieldName);
            missingOrUpdated = !savedCol || savedCol.label !== defaultColumns[i].label || savedCol.key !== defaultColumns[i].key;
            if (missingOrUpdated) break;
        }
        if (missingOrUpdated) {
            localStorage.setItem(resolvedKey, JSON.stringify(defaultColumns));
            setColumns(defaultColumns);
        }
    }, [defaultColumns, resolvedKey]);

    const handleToggleColumn = useCallback((index) => {
        setColumns(prev => {
            const updated = [...prev];
            updated[index].visible = !updated[index].visible;
            localStorage.setItem(resolvedKey, JSON.stringify(updated));
            return updated;
        });
    }, [resolvedKey]);

    const onDragEnd = useCallback((result) => {
        if (!result.destination) return;
        setColumns(prev => {
            const reordered = Array.from(prev);
            const [moved] = reordered.splice(result.source.index, 1);
            reordered.splice(result.destination.index, 0, moved);
            localStorage.setItem(resolvedKey, JSON.stringify(reordered));
            return reordered;
        });
    }, [resolvedKey]);

    const restoreDefaults = useCallback(() => {
        const cloned = defaultColumns.map(col => ({ ...col }));
        localStorage.setItem(resolvedKey, JSON.stringify(cloned));
        setColumns(cloned);
    }, [defaultColumns, resolvedKey]);

    return { columns, setColumns, showSettings, setShowSettings, handleToggleColumn, onDragEnd, restoreDefaults };
}
