import { useEffect, useState } from "react";
import { fetchStore, getCachedStore, subscribeStoreUpdates } from "./storeUtils";

// The store with this id from the page's shared copy, re-rendered whenever the
// server announces a change to it. null until loaded (or when id is empty).
export default function useStore(storeId) {
    const [store, setStore] = useState(() => getCachedStore(storeId));

    useEffect(() => {
        let alive = true;
        setStore(getCachedStore(storeId));
        if (!storeId) return undefined;
        fetchStore(storeId).then((s) => { if (alive && s) setStore(s); }).catch(() => { });
        const unsubscribe = subscribeStoreUpdates((s) => {
            if (alive && s?.id === storeId) setStore(s);
        });
        return () => { alive = false; unsubscribe(); };
    }, [storeId]);

    return store;
}
