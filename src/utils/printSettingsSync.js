// Keeps the print layout (font sizes, margins, page size: localStorage "fontSizes")
// in step with the store when its "save print settings to server" setting is on.
//
// Every preview component (sales, quotation, deposit, balance sheet, RFQ...) used
// to do this itself on mount: fetch the whole store and PUT its local copy back.
// A screen mounts several previews at once (the customer pendings modal mounted
// three), so opening it sent three store requests and three PUTs, and the PUT
// sent this browser's copy before the store's was read, overwriting a layout
// saved from another device. Now the store's copy comes from the page's one
// shared copy of the store (fetchStore, kept current by the server's
// store_updated push), and it is written only when someone changes the layout.

import { fetchStore, getCachedStore, primeStoreCache } from './storeUtils';

export const PRINT_SETTINGS_SAVE_MS = 1500;

function storeSettings() {
    try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; }
}

export function printSettingsSyncEnabled() {
    return !!storeSettings()?.save_print_settings_to_server;
}

let _saveTimer = null;
let _pendingSave = null;

/** Saves the layout to the store after a pause; changes from every preview share one timer. */
export function savePrintSettingsToServer(fontSizes) {
    if (!printSettingsSyncEnabled()) return;
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('access_token');
    if (!storeId || !token) return;
    _pendingSave = { storeId, token, fontSizes };
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        const { storeId: id, token: auth, fontSizes: data } = _pendingSave;
        _pendingSave = null;
        _saveTimer = null;
        fetch('/v1/store/' + id + '/print-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': auth },
            body: JSON.stringify({ print_settings: data }),
        }).then((res) => {
            // A layout saved here is what the store holds now: the shared copy
            // says so at once rather than when the server's push arrives.
            const cached = getCachedStore(id);
            if (res?.ok && cached) {
                primeStoreCache({ ...cached, settings: { ...cached.settings, print_settings: data } });
            }
        }).catch(() => {});
    }, PRINT_SETTINGS_SAVE_MS);
}

/** The store's saved layout (an object, or null when none or sync is off). */
export function loadServerPrintSettings() {
    if (!printSettingsSyncEnabled()) return Promise.resolve(null);
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('access_token');
    if (!storeId || !token) return Promise.resolve(null);
    return fetchStore(storeId)
        .then((store) => {
            const ps = store?.settings?.print_settings;
            return ps && Object.keys(ps).length > 0 ? ps : null;
        })
        .catch(() => null);
}

export function _resetPrintSettingsSync() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    _pendingSave = null;
}
