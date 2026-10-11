// The header polls /v1/rfq-whatsapp-unread and /v1/email-unread only for a store
// whose freshly fetched settings have the RFQ module on and that channel connected,
// and stops (interval and socket listeners) on unmount or when that changes.
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import eventEmitter from '../utils/eventEmitter';
import Topbar from '../Topbar';

jest.mock('react-bootstrap/Dropdown', () => {
    const React = require('react');
    function Dropdown({ children }) { return React.createElement('div', null, children); }
    Dropdown.Toggle = ({ children, id }) => React.createElement('span', { id }, children);
    Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
    Dropdown.Item = ({ children, onClick }) => React.createElement('button', { onClick }, children);
    Dropdown.ItemText = ({ children }) => React.createElement('span', null, children);
    Dropdown.Divider = () => React.createElement('hr', null);
    return Dropdown;
});
jest.mock('../components/LanguageSwitcher', () => () => null);
jest.mock('../utils/eventEmitter', () => ({
    __esModule: true,
    default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));
jest.mock('../i18n/config', () => ({ LANGUAGE_OPTIONS: [] }));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k, i18n: { changeLanguage: jest.fn(), language: 'en' } }),
}));

const STORE_ID = '680f6c53e32076f2003a8934';
const WA = '/v1/rfq-whatsapp-unread';
const EMAIL = '/v1/email-unread';

const MODULE_OFF = { enable_rfq_module: false };
const MODULE_ON_NOTHING_CONNECTED = { enable_rfq_module: true };
const WA_ONLY = { enable_rfq_module: true, store_rfq_waba_phone_number_id: '1234567890' };
const EMAIL_ONLY = { enable_rfq_module: true, rfq_email_accounts: [{ id: 'a1', provider: 'imap', email: 'rfq@example.com' }] };
const BOTH = { ...WA_ONLY, ...EMAIL_ONLY };

function ok(body) {
    return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });
}

// storeSettings: what GET /v1/store/{id} returns; null = the request fails.
function mockFetch(storeSettings) {
    global.fetch = jest.fn((url) => {
        if (url.startsWith(`/v1/store/${STORE_ID}?`)) {
            if (storeSettings === null) return Promise.reject(new Error('network'));
            return ok({ result: { id: STORE_ID, settings: storeSettings } });
        }
        if (url.startsWith(WA) || url.startsWith(EMAIL)) return ok({ items: [], total_unread: 0 });
        return ok({ result: [] });
    });
}

const calls = (prefix) => global.fetch.mock.calls.filter(([u]) => u.startsWith(prefix)).length;
const listened = (event) => eventEmitter.on.mock.calls.filter(([e]) => e === event).length;

async function renderTopbar() {
    let utils;
    await act(async () => {
        utils = render(<MemoryRouter><Topbar parentCallback={() => {}} /></MemoryRouter>);
    });
    return utils;
}

async function advance(ms) {
    await act(async () => { jest.advanceTimersByTime(ms); });
}

beforeEach(() => {
    jest.useFakeTimers('modern');
    localStorage.clear();
    jest.clearAllMocks();
    localStorage.setItem('store_id', STORE_ID);
    localStorage.setItem('access_token', 'token123');
});

afterEach(() => {
    jest.useRealTimers();
});

describe('no unread polling when there is nothing to poll', () => {
    test.each([
        ['RFQ module off', MODULE_OFF],
        ['RFQ module off but channels configured', { ...BOTH, enable_rfq_module: false }],
        ['RFQ module on, WhatsApp and email not connected', MODULE_ON_NOTHING_CONNECTED],
        ['settings missing from the store', undefined],
    ])('%s: no calls over five minutes', async (_, settings) => {
        mockFetch(settings);
        await renderTopbar();
        await advance(5 * 60 * 1000);
        expect(calls(WA)).toBe(0);
        expect(calls(EMAIL)).toBe(0);
        expect(listened('wa_unread_changed')).toBe(0);
        expect(listened('email_unread_changed')).toBe(0);
    });

    test('store settings request fails: no calls', async () => {
        mockFetch(null);
        await renderTopbar();
        await advance(5 * 60 * 1000);
        expect(calls(WA)).toBe(0);
        expect(calls(EMAIL)).toBe(0);
    });

    test('a stale cache from another store that had both connected does not start polling', async () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify(BOTH));
        mockFetch(MODULE_OFF);
        await renderTopbar();
        await advance(2 * 60 * 1000);
        expect(calls(WA)).toBe(0);
        expect(calls(EMAIL)).toBe(0);
        // and the badges follow the fresh settings
        expect(document.getElementById('wa-unread-toggle')).toBeNull();
        expect(document.getElementById('email-unread-toggle')).toBeNull();
    });

    test('no store selected or signed out: no calls at all', async () => {
        localStorage.removeItem('store_id');
        mockFetch(BOTH);
        await renderTopbar();
        await advance(2 * 60 * 1000);
        expect(calls(WA)).toBe(0);
        expect(calls(EMAIL)).toBe(0);
    });
});

describe('polling a connected channel', () => {
    test('WhatsApp connected only: polls WhatsApp every 30 s, never email', async () => {
        mockFetch(WA_ONLY);
        await renderTopbar();
        expect(calls(WA)).toBe(1);
        await advance(90 * 1000);
        expect(calls(WA)).toBe(4);
        expect(calls(EMAIL)).toBe(0);
        expect(listened('wa_unread_changed')).toBe(1);
        expect(listened('email_unread_changed')).toBe(0);
        expect(document.getElementById('wa-unread-toggle')).not.toBeNull();
        expect(document.getElementById('email-unread-toggle')).toBeNull();
    });

    test('bot WhatsApp number counts as connected', async () => {
        mockFetch({ enable_rfq_module: true, bot_waba_phone_number_id: '999' });
        await renderTopbar();
        expect(calls(WA)).toBe(1);
        expect(calls(EMAIL)).toBe(0);
    });

    test('email connected only: polls email every 30 s, never WhatsApp', async () => {
        mockFetch(EMAIL_ONLY);
        await renderTopbar();
        expect(calls(EMAIL)).toBe(1);
        await advance(60 * 1000);
        expect(calls(EMAIL)).toBe(3);
        expect(calls(WA)).toBe(0);
        expect(document.getElementById('email-unread-toggle')).not.toBeNull();
        expect(document.getElementById('wa-unread-toggle')).toBeNull();
    });

    test('legacy rfq_email_connected flag counts as connected', async () => {
        mockFetch({ enable_rfq_module: true, rfq_email_connected: true });
        await renderTopbar();
        expect(calls(EMAIL)).toBe(1);
    });

    test('unmount stops both polls and removes the socket listeners', async () => {
        mockFetch(BOTH);
        const { unmount } = await renderTopbar();
        expect(calls(WA)).toBe(1);
        expect(calls(EMAIL)).toBe(1);
        unmount();
        await advance(5 * 60 * 1000);
        expect(calls(WA)).toBe(1);
        expect(calls(EMAIL)).toBe(1);
        const offFor = (e) => eventEmitter.off.mock.calls.filter(([ev]) => ev === e).length;
        expect(offFor('wa_unread_changed')).toBe(1);
        expect(offFor('email_unread_changed')).toBe(1);
    });

    test('signed out mid-session (token removed): polls stop sending requests', async () => {
        mockFetch(BOTH);
        await renderTopbar();
        localStorage.removeItem('access_token');
        await advance(2 * 60 * 1000);
        expect(calls(WA)).toBe(1);
        expect(calls(EMAIL)).toBe(1);
    });
});
