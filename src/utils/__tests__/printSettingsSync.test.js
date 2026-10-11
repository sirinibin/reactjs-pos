import {
    savePrintSettingsToServer, loadServerPrintSettings, printSettingsSyncEnabled,
    PRINT_SETTINGS_SAVE_MS, PRINT_SETTINGS_SHARE_MS, _resetPrintSettingsSync,
} from '../printSettingsSync.js';

const enable = (on) => localStorage.setItem('_store_settings_cache', JSON.stringify({ save_print_settings_to_server: on }));
const okJson = (body) => Promise.resolve({ json: () => Promise.resolve(body) });

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('store_id', 's1');
    localStorage.setItem('access_token', 'tok');
    _resetPrintSettingsSync();
    global.fetch = jest.fn(() => okJson({ result: { settings: { print_settings: { sales_pageSize: 3 } } } }));
});
afterEach(() => { _resetPrintSettingsSync(); jest.useRealTimers(); });

const puts = () => global.fetch.mock.calls.filter(([, o]) => o?.method === 'PUT');
const gets = () => global.fetch.mock.calls.filter(([, o]) => !o?.method);

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

    test('previews mounting together read the store once, with a narrow select', async () => {
        enable(true);
        const [a, b, c] = await Promise.all([loadServerPrintSettings(1000), loadServerPrintSettings(1100), loadServerPrintSettings(1200)]);
        expect(a).toEqual({ sales_pageSize: 3 });
        expect(b).toBe(a);
        expect(c).toBe(a);
        expect(gets()).toHaveLength(1);
        expect(gets()[0][0]).toBe('/v1/store/s1?select=id,settings');
        expect(gets()[0][1].headers.Authorization).toBe('tok');
    });

    test('a preview opened later reads the store again', async () => {
        enable(true);
        await loadServerPrintSettings(1000);
        await loadServerPrintSettings(1000 + PRINT_SETTINGS_SHARE_MS);
        expect(gets()).toHaveLength(2);
    });

    test('a different store is read separately', async () => {
        enable(true);
        await loadServerPrintSettings(1000);
        localStorage.setItem('store_id', 's2');
        await loadServerPrintSettings(1001);
        expect(gets().map(([u]) => u)).toEqual(['/v1/store/s1?select=id,settings', '/v1/store/s2?select=id,settings']);
    });

    test('no saved layout, an empty one or a failed request gives null', async () => {
        enable(true);
        global.fetch = jest.fn(() => okJson({ result: { settings: {} } }));
        expect(await loadServerPrintSettings(1)).toBeNull();
        _resetPrintSettingsSync();
        global.fetch = jest.fn(() => okJson({ result: { settings: { print_settings: {} } } }));
        expect(await loadServerPrintSettings(2)).toBeNull();
        _resetPrintSettingsSync();
        global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        expect(await loadServerPrintSettings(3)).toBeNull();
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

    test('after a save, the next preview reads the store again', async () => {
        enable(true);
        await loadServerPrintSettings(1000);
        savePrintSettingsToServer({ v: 1 });
        jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS);
        await loadServerPrintSettings(1001);
        expect(gets()).toHaveLength(2);
    });

    test('a failed save is ignored', () => {
        enable(true);
        global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        savePrintSettingsToServer({ v: 1 });
        expect(() => jest.advanceTimersByTime(PRINT_SETTINGS_SAVE_MS)).not.toThrow();
    });
});
