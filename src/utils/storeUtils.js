// One copy of each store per page, kept current by the server.
//
// Every screen reads the store through fetchStore(). The first call loads the
// whole store document once (GET /v1/store/{id}); later calls, whatever fields
// they need, are answered from that copy. The copy is refreshed only when:
//   - the server pushes "store_updated" over the WebSocket (any change to the
//     store: settings, print settings, sidebar, ZATCA, WhatsApp/email setup,
//     logo, ...); see handleStoreUpdatedPush, wired in WebSocketContext;
//   - the WebSocket reconnects (a change may have been missed while it was
//     down); see refreshCurrentStore;
//   - this tab saves the store (invalidateStoreCache / refreshStore).
// Screens that show store data live subscribe with subscribeStoreUpdates (or
// the useStore hook) and get the new copy without asking for it.
//
// The `select` argument is accepted for compatibility and ignored: the shared
// copy holds every field, so a narrower request would only cost another GET.

const _storeCache = new Map();
// Requests in flight: storeId → promise. Screens mounting together (top bar,
// list, forms) ask for the same store at once; they share one request instead
// of each sending its own before the first answer fills the cache.
const _inFlight = new Map();
// Bumped by invalidate/refresh so an answer that left the server before the
// store changed can't overwrite the newer copy when it arrives late.
const _generation = new Map();
const _listeners = new Set();

function bumpGeneration(id) {
    _generation.set(id, (_generation.get(id) || 0) + 1);
}

export function invalidateStoreCache(id) {
    if (id) {
        _storeCache.delete(id);
        _inFlight.delete(id);
        bumpGeneration(id);
    }
}

export function _clearAllStoreCaches() {
    _storeCache.clear();
    _inFlight.clear();
    _generation.clear();
    _listeners.clear();
}

// The cached copy, or null when the store hasn't been loaded on this page.
export function getCachedStore(id) {
    return (id && _storeCache.get(id)) || null;
}

// Put a store this page loaded itself (the store edit form reads it fresh)
// into the shared copy, so the screens after it don't ask again.
export function primeStoreCache(store) {
    if (!store?.id) return;
    bumpGeneration(store.id);
    _inFlight.delete(store.id);
    _storeCache.set(store.id, store);
    syncCurrentStoreLocalStorage(store);
    notify(store);
}

// eslint-disable-next-line no-unused-vars
export async function fetchStore(id, select) {
    if (!id) return null;

    if (_storeCache.has(id)) {
        return _storeCache.get(id);
    }
    if (_inFlight.has(id)) {
        return _inFlight.get(id);
    }

    const generation = _generation.get(id) || 0;
    const request = (async () => {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        const response = await fetch(`/v1/store/${id}`, requestOptions);
        // A response without headers (some test doubles) is read as JSON.
        const isJson = !response.headers?.get || !!response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : undefined;
        if (!response.ok) {
            return Promise.reject(data && data.errors);
        }
        if (data?.result && (_generation.get(id) || 0) === generation) {
            _storeCache.set(id, data.result);
        }
        return data && data.result;
    })();

    _inFlight.set(id, request);
    try {
        return await request;
    } finally {
        if (_inFlight.get(id) === request) _inFlight.delete(id);
    }
}

// Re-read the store from the server and hand the new copy to subscribers.
export async function refreshStore(id) {
    if (!id) return null;
    invalidateStoreCache(id);
    const store = await fetchStore(id);
    syncCurrentStoreLocalStorage(store);
    notify(store);
    return store;
}

// The signed-in user's current store, re-read after a WebSocket reconnect.
export function refreshCurrentStore() {
    const id = localStorage.getItem('store_id');
    if (!id || !localStorage.getItem('access_token')) return Promise.resolve(null);
    return refreshStore(id).catch(() => null);
}

// "store_updated" from the server: { store_id }. Only stores this page uses
// (the current store, or one already loaded) are re-read, once per event.
export function handleStoreUpdatedPush(data) {
    const id = data?.store_id;
    if (!id) return Promise.resolve(null);
    if (id !== localStorage.getItem('store_id') && !_storeCache.has(id) && !_inFlight.has(id)) {
        return Promise.resolve(null);
    }
    return refreshStore(id).catch(() => null);
}

// cb(store) runs after each refresh of any store. Returns the unsubscribe.
export function subscribeStoreUpdates(cb) {
    _listeners.add(cb);
    return () => _listeners.delete(cb);
}

function notify(store) {
    if (!store) return;
    _listeners.forEach((cb) => {
        try { cb(store); } catch (e) { console.error('store update listener failed', e); }
    });
}

// Copies of the current store's settings that other code reads synchronously.
function syncCurrentStoreLocalStorage(store) {
    if (!store?.id || store.id !== localStorage.getItem('store_id')) return;
    try {
        if (store.settings) {
            localStorage.setItem('_store_settings_cache', JSON.stringify(store.settings));
        }
        if (store.name !== undefined) localStorage.setItem('store_name', store.name || '');
        if (store.name_in_arabic !== undefined) localStorage.setItem('store_name_in_arabic', store.name_in_arabic || '');
        if (store.branch_name) localStorage.setItem('branch_name', store.branch_name);
        else localStorage.removeItem('branch_name');
    } catch (_) { }
}
