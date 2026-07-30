import { useState, useEffect, useRef, useCallback } from 'react';

export function useDraft({ enabled, entityType, getFormData, productsCount, onNewDraftSaved, onSaved }) {
    const [draftId, setDraftId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const timerRef = useRef(null);
    const draftIdRef = useRef(null);
    const savingRef = useRef(false);
    const onNewDraftSavedRef = useRef(onNewDraftSaved);
    onNewDraftSavedRef.current = onNewDraftSaved;
    const onSavedRef = useRef(onSaved);
    onSavedRef.current = onSaved;

    draftIdRef.current = draftId;

    const saveDraft = useCallback(async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setIsSaving(true);
        try {
            const formData = getFormData();
            const storeId = localStorage.getItem('store_id');
            const queryParams = storeId ? `search[store_id]=${encodeURIComponent(storeId)}` : '';
            const currentDraftId = draftIdRef.current;
            const method = currentDraftId ? 'PUT' : 'POST';
            const url = currentDraftId
                ? `/v1/${entityType}/${currentDraftId}?${queryParams}`
                : `/v1/${entityType}?${queryParams}`;
            const payload = { ...formData, status: 'draft' };

            const res = await fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.result && data.result.id) {
                    if (!currentDraftId) {
                        setDraftId(data.result.id);
                        onNewDraftSavedRef.current?.();
                    }
                    onSavedRef.current?.();
                }
            }
        } catch (_) {
            // best-effort
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    }, [entityType, getFormData]);

    useEffect(() => {
        if (!enabled || productsCount === 0) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(saveDraft, 2500);
        return () => clearTimeout(timerRef.current);
    }, [enabled, productsCount, saveDraft]);

    const clearDraft = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setDraftId(null);
        draftIdRef.current = null;
    }, []);

    return { draftId, isSaving, clearDraft };
}
