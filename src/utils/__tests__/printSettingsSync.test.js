import {
    savePrintSettingsToServer, loadServerPrintSettings, printSettingsSyncEnabled,
    PRINT_SETTINGS_SAVE_MS, _resetPrintSettingsSync,
} from '../printSettingsSync.js';
import { getCachedStore, handleStoreUpdatedPush, _clearAllStoreCaches } from '../storeUtils';

const enable = (on) => localStorage.setItem('_store_settings_cache', JSON.stringify({ save_print_settings_to_server: on }));
const okJson = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('store_id', 's1');
    localStorage.setItem('access_token', 'tok');
    _resetPrintSettingsSync();
    _clearAllStoreCaches();
    global.fetch = jest.fn((url) => okJson({ result: { id: url.split('/')[3], settings: { save_print_settings_to_server: true, print_settings: { sales_pageSize: 3 } } } }));
});
afterEach(() => { _resetPrintSettingsSync(); jest.useRealTimers(); });

const puts = () => global.fetch.mock.calls.filter(([, o]) => o?.method === 'PUT');
const gets = () => global.fetch.mock.calls.filter(([, o]) => !o?.method || o.method === 'GET');

describe('printSettingsSync', () => {
    test('does nothing when the store does not keep print settings on the server', async () => {
        enable(false);
        expect(printSettingsSyncEnabled()).toBe(false);
        expect(await loadServerPrintSettings()).toBeNull();
        savePrintSettingsToServer({ a: 1 });
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS * 2);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('also does nothing without a store cache, store or token', async () => {
        expect(await loadServerPrintSettings()).toBeNull();
        enable(true);
        localStorage.removeItem('access_token');
        expect(await loadServerPrintSettings()).toBeNull();
        savePrintSettingsToServer({ a: 1 });
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS * 2);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('previews read the page one copy of the store: one store GET, however many previews', async () => {
        enable(true);
        const [a, b, c] = await Promise.all([loadServerPrintSettings(), loadServerPrintSettings(), loadServerPrintSettings()]);
        expect(a).toEqual({ sales_pageSize: 3 });
        expect(b).toEqual(a);
        expect(c).toEqual(a);
        await loadServerPrintSettings(); // a preview opened later
        expect(gets()).toHaveLength(1);
        expect(gets()[0][0]).toBe('/v1/store/s1');
        expect(gets()[0][1].headers.Authorization).toBe('tok');
    });

    test('a layout saved on another device arrives by the store_updated push', async () => {
        enable(true);
        await loadServerPrintSettings();
        global.fetch = jest.fn(() => okJson({ result: { id: 's1', settings: { save_print_settings_to_server: true, print_settings: { sales_pageSize: 9 } } } }));
        await handleStoreUpdatedPush({ store_id: 's1' });
        expect(await loadServerPrintSettings()).toEqual({ sales_pageSize: 9 });
        expect(gets()).toHaveLength(1); // the push's one re-read
    });

    test('a different store is read separately', async () => {
        enable(true);
        await loadServerPrintSettings();
        localStorage.setItem('store_id', 's2');
        await loadServerPrintSettings();
        expect(gets().map(([u]) => u)).toEqual(['/v1/store/s1', '/v1/store/s2']);
    });

    test('no saved layout, an empty one or a failed request gives null', async () => {
        enable(true);
        global.fetch = jest.fn(() => okJson({ result: { id: 's1', settings: {} } }));
        expect(await loadServerPrintSettings()).toBeNull();
        _clearAllStoreCaches();
        global.fetch = jest.fn(() => okJson({ result: { id: 's1', settings: { print_settings: {} } } }));
        expect(await loadServerPrintSettings()).toBeNull();
        _clearAllStoreCaches();
        global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        expect(await loadServerPrintSettings()).toBeNull();
    });

    test('changes from several previews are saved once, with the latest layout', () => {
        enable(true);
        savePrintSettingsToServer({ v: 1 });
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS - 1);
        savePrintSettingsToServer({ v: 2 });
        savePrintSettingsToServer({ v: 3 });
        expect(puts()).toHaveLength(0);
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS);
        expect(puts()).toHaveLength(1);
        expect(puts()[0][0]).toBe('/v1/store/s1/print-settings');
        expect(JSON.parse(puts()[0][1].body)).toEqual({ print_settings: { v: 3 } });
    });

    test('after a save, previews get the saved layout without another store GET', async () => {
        enable(true);
        await loadServerPrintSettings();
        savePrintSettingsToServer({ v: 1 });
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS);
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
        expect(getCachedStore('s1').settings.print_settings).toEqual({ v: 1 });
        expect(await loadServerPrintSettings()).toEqual({ v: 1 });
        expect(gets()).toHaveLength(1);
    });

    test('a failed save is ignored', () => {
        enable(true);
        global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        savePrintSettingsToServer({ v: 1 });
        expect(() => jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS)).not.toThrow();
    });
});
