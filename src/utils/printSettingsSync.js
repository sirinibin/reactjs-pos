// Keeps the print layout (font sizes, margins, page size: localStorage "fontSizes")
// in step with the store when its "save print settings to server" setting is on.
//
// Every preview component (sales, quotation, deposit, balance sheet, RFQ...) used
// to do this itself on mount: fetch the whole store and PUT its local copy back.
// A screen mounts several previews at once (the customer pendings modal mounted
// three), so opening it sent three store requests and three PUTs, and the PUT
// sent this browser's copy before the store's was read, overwriting a layout
// saved from another device. Now the store's copy is read once for all previews
// mounting together, and it is written only when someone changes the layout.

export const PRINT_SETTINGS_SAVE_MS = 1500;
// Previews mounting within this window share one read of the store's copy.
export const PRINT_SETTINGS_SHARE_MS = 5000;

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
        // A layout saved here is what the store holds now.
        _loads.delete(id);
        fetch('/v1/store/' + id + '/print-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': auth },
            body: JSON.stringify({ print_settings: data }),
        }).catch(() => {});
    }, PRINT_SETTINGS_SAVE_MS);
}

const _loads = new Map(); // storeId -> { at, promise }

/** The store's saved layout (an object, or null when none or sync is off). */
export function loadServerPrintSettings(now = Date.now()) {
    if (!printSettingsSyncEnabled()) return Promise.resolve(null);
    const storeId = localStorage.getItem('store_id');
    const token = localStorage.getItem('access_token');
    if (!storeId || !token) return Promise.resolve(null);
    const shared = _loads.get(storeId);
    if (shared && now - shared.at < PRINT_SETTINGS_SHARE_MS) return shared.promise;
    const promise = fetch('/v1/store/' + storeId + '?select=id,settings', { headers: { 'Authorization': token } })
        .then((r) => r.json())
        .then((data) => {
            const ps = data?.result?.settings?.print_settings;
            return ps && Object.keys(ps).length > 0 ? ps : null;
        })
        .catch(() => null);
    _loads.set(storeId, { at: now, promise });
    return promise;
}

export function _resetPrintSettingsSync() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    _pendingSave = null;
    _loads.clear();
}
