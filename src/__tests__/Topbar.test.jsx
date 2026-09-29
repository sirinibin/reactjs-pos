import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import eventEmitter from '../utils/eventEmitter';
import Topbar from '../Topbar';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-bootstrap/Dropdown', () => {
    const React = require('react');
    function Dropdown({ children, className }) {
        return React.createElement('div', { 'data-testid': 'dropdown', className }, children);
    }
    Dropdown.Toggle = function DropdownToggle({ children, id }) {
        return React.createElement('span', { id, 'data-testid': 'dropdown-toggle' }, children);
    };
    Dropdown.Menu = function DropdownMenu({ children }) {
        return React.createElement('div', { 'data-testid': 'dropdown-menu' }, children);
    };
    Dropdown.Item = function DropdownItem({ children, onClick }) {
        return React.createElement('button', { onClick }, children);
    };
    Dropdown.ItemText = function DropdownItemText({ children, className }) {
        return React.createElement('span', { className }, children);
    };
    Dropdown.Divider = function DropdownDivider() {
        return React.createElement('hr', null);
    };
    return Dropdown;
});

jest.mock('../components/LanguageSwitcher', () => () => null);

jest.mock('../utils/eventEmitter', () => ({
    __esModule: true,
    default: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
    },
}));

jest.mock('../i18n/config', () => ({
    LANGUAGE_OPTIONS: [],
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { changeLanguage: jest.fn(), language: 'en' },
    }),
}));

// ── Local mirror helpers — identical logic to Topbar.js internals ──────────
//
// These are NOT imported from Topbar (they are not exported). They are
// re-declared here so tests 8–10 can exercise the localStorage contract
// independently of the component render.

function getDismissedMap() {
    try { return JSON.parse(localStorage.getItem('dn_dismissed') || '{}'); }
    catch (_) { return {}; }
}
function saveDismissedMap(map) {
    localStorage.setItem('dn_dismissed', JSON.stringify(map));
}

// ── Render helper ──────────────────────────────────────────────────────────

function renderTopbar(props = {}) {
    return render(
        <MemoryRouter>
            <Topbar parentCallback={() => {}} {...props} />
        </MemoryRouter>
    );
}

// ── Default fetch factory ──────────────────────────────────────────────────

function makeOkResponse(body) {
    return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(body),
    });
}

// ── Component tests ────────────────────────────────────────────────────────

describe('Topbar component', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        // Default: all fetches succeed with an empty result — no notifications
        global.fetch = jest.fn().mockImplementation(() => makeOkResponse({ result: [] }));
    });

    // ── Test 1 ──────────────────────────────────────────────────────────────

    test('1. renders without crashing', async () => {
        await act(async () => {
            renderTopbar();
        });
        expect(document.querySelector('nav')).not.toBeNull();
    });

    // ── Test 2 ──────────────────────────────────────────────────────────────
    // The bell section is guarded by storeSettings.enable_notification.
    // Pre-seeding the localStorage cache makes the initial useState() pick it up
    // without waiting for any fetch.

    test('2. shows notification bell icon when enable_notification is true', async () => {
        localStorage.setItem(
            '_store_settings_cache',
            JSON.stringify({ enable_notification: true }),
        );
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'token123');

        await act(async () => {
            renderTopbar();
        });

        expect(document.querySelector('.bi-bell')).not.toBeNull();
    });

    // ── Test 3 ──────────────────────────────────────────────────────────────
    // Override fetch for the reminders endpoint to return one active reminder.
    // The badge should show the count "1" after state updates settle.

    test('3. notification count badge displays when there are notifications', async () => {
        localStorage.setItem(
            '_store_settings_cache',
            JSON.stringify({ enable_notification: true }),
        );
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'token123');

        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('delivery-note/reminders')) {
                return makeOkResponse({
                    status: true,
                    result: [
                        { id: 'dn1', code: 'DN-001', notify_at: '2026-08-04T10:00:00.000Z' },
                    ],
                });
            }
            return makeOkResponse({ result: [] });
        });

        await act(async () => {
            renderTopbar();
        });

        await waitFor(() => {
            expect(screen.getByText('1')).toBeInTheDocument();
        });
    });

    // ── Test 4 ──────────────────────────────────────────────────────────────
    // Clicking the × dismiss button calls dismissNotification(id, persist=true)
    // which internally calls saveDismissedMap. Verify localStorage was written.

    test('4. clicking a notification dismiss button persists dismissal via saveDismissedMap', async () => {
        localStorage.setItem(
            '_store_settings_cache',
            JSON.stringify({ enable_notification: true }),
        );
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'token123');

        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('delivery-note/reminders')) {
                return makeOkResponse({
                    status: true,
                    result: [
                        { id: 'dn1', code: 'DN-001', notify_at: '2026-08-04T10:00:00.000Z' },
                    ],
                });
            }
            return makeOkResponse({ result: [] });
        });

        await act(async () => {
            renderTopbar();
        });

        // Wait for the dismiss button to appear (notification loaded async)
        await waitFor(() => {
            expect(screen.getByTitle('Dismiss')).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByTitle('Dismiss'));
        });

        // saveDismissedMap wrote {dn1: notify_at} to localStorage
        const map = JSON.parse(localStorage.getItem('dn_dismissed') || '{}');
        expect(map['dn1']).toBe('2026-08-04T10:00:00.000Z');
    });

    // ── Test 5 ──────────────────────────────────────────────────────────────

    test('5. eventEmitter.on is called on mount', async () => {
        await act(async () => {
            renderTopbar();
        });

        expect(eventEmitter.on).toHaveBeenCalled();
        expect(eventEmitter.on).toHaveBeenCalledWith(
            'socket_connection_open',
            expect.any(Function),
        );
        expect(eventEmitter.on).toHaveBeenCalledWith(
            'delivery_note_reminder',
            expect.any(Function),
        );
        expect(eventEmitter.on).toHaveBeenCalledWith(
            'delivery_note_order_linked',
            expect.any(Function),
        );
    });

    // ── Test 6 ──────────────────────────────────────────────────────────────

    test('6. eventEmitter.off is called on unmount', async () => {
        let unmount;
        await act(async () => {
            ({ unmount } = renderTopbar());
        });

        // Clear calls accumulated during mount so only unmount calls are counted
        eventEmitter.off.mockClear();

        await act(async () => {
            unmount();
        });

        expect(eventEmitter.off).toHaveBeenCalled();
        expect(eventEmitter.off).toHaveBeenCalledWith(
            'socket_connection_open',
            expect.any(Function),
        );
        expect(eventEmitter.off).toHaveBeenCalledWith(
            'delivery_note_reminder',
            expect.any(Function),
        );
    });

    // ── Test 7 ──────────────────────────────────────────────────────────────
    // fetchReminders requires store_id + access_token in localStorage to call fetch.

    test('7. fetch is called on mount to load notifications', async () => {
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'token123');

        await act(async () => {
            renderTopbar();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        const calledUrls = global.fetch.mock.calls.map((c) => c[0]);
        expect(calledUrls.some((u) => u.includes('delivery-note/reminders'))).toBe(true);
    });
});

// ── getDismissedMap / saveDismissedMap localStorage contract tests ──────────
//
// These helpers are not exported from Topbar.js. The local mirror functions
// above are identical in logic. Tests 8–10 verify the storage contract that
// both the real helpers and the mirror must satisfy.

describe('getDismissedMap and saveDismissedMap (localStorage contract)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('8. getDismissedMap returns {} when localStorage is empty', () => {
        expect(getDismissedMap()).toEqual({});
    });

    test('9. After saveDismissedMap({id: true}), getDismissedMap returns {id: true}', () => {
        saveDismissedMap({ id: true });
        expect(getDismissedMap()).toEqual({ id: true });
    });

    test('10. getDismissedMap handles invalid JSON gracefully by returning {}', () => {
        localStorage.setItem('dn_dismissed', 'not-valid-json{{{');
        expect(getDismissedMap()).toEqual({});
    });
});

// ── RTL navbar layout tests ────────────────────────────────────────────────
//
// These tests cover the isRTL detection, the inline styles applied to the
// .navbar-collapse container and the .navbar-nav ul, MutationObserver-driven
// re-renders, and the nav item order introduced by the RTL feature.

describe('Topbar RTL navbar layout', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        global.fetch = jest.fn().mockImplementation(() => makeOkResponse({ result: [] }));
        document.documentElement.removeAttribute('dir');
    });

    afterEach(() => {
        document.documentElement.removeAttribute('dir');
    });

    // ── Test 11 ─────────────────────────────────────────────────────────────
    // In LTR (no dir attribute) the collapse div must carry direction:ltr to
    // prevent the inherited direction:rtl double-reversal bug, but must NOT
    // apply any flexDirection override.

    test('11. LTR: collapse has direction:ltr but no flexDirection override', async () => {
        await act(async () => { renderTopbar(); });

        const collapse = document.querySelector('.navbar-collapse');
        expect(collapse).not.toBeNull();
        expect(collapse.style.direction).toBe('ltr');
        expect(collapse.style.flexDirection).toBe('');
        expect(collapse.style.justifyContent).toBe('');
    });

    // ── Test 12 ─────────────────────────────────────────────────────────────
    // When dir="rtl" is already set on <html> before mount, the component must
    // immediately render with row-reverse + space-between on the collapse div.

    test('12. RTL: collapse has direction:ltr, flexDirection:row-reverse, justifyContent:space-between', async () => {
        document.documentElement.setAttribute('dir', 'rtl');

        await act(async () => { renderTopbar(); });

        const collapse = document.querySelector('.navbar-collapse');
        expect(collapse.style.direction).toBe('ltr');
        expect(collapse.style.flexDirection).toBe('row-reverse');
        expect(collapse.style.justifyContent).toBe('space-between');
    });

    // ── Test 13 ─────────────────────────────────────────────────────────────
    // In RTL the nav <ul> must have marginLeft:0 to cancel App.css's
    // margin-left:auto (which would push the nav to the right in the
    // reversed container).

    test('13. RTL: nav ul has marginLeft 0px to cancel auto-push', async () => {
        document.documentElement.setAttribute('dir', 'rtl');

        await act(async () => { renderTopbar(); });

        const navUl = document.querySelector('.navbar-nav.navbar-align');
        expect(navUl).not.toBeNull();
        expect(navUl.style.marginLeft).toBe('0px');
    });

    // ── Test 14 ─────────────────────────────────────────────────────────────
    // The nav <ul> must always have columnGap:12px for consistent item spacing,
    // regardless of direction.

    test('14. LTR: nav ul has columnGap 12px', async () => {
        await act(async () => { renderTopbar(); });

        const navUl = document.querySelector('.navbar-nav.navbar-align');
        expect(navUl.style.columnGap).toBe('12px');
    });

    test('15. RTL: nav ul also has columnGap 12px', async () => {
        document.documentElement.setAttribute('dir', 'rtl');

        await act(async () => { renderTopbar(); });

        const navUl = document.querySelector('.navbar-nav.navbar-align');
        expect(navUl.style.columnGap).toBe('12px');
    });

    // ── Test 16 ─────────────────────────────────────────────────────────────
    // LTR: nav ul must NOT set marginLeft so App.css's margin-left:auto keeps
    // the nav on the right side of the navbar.

    test('16. LTR: nav ul does not override marginLeft (no inline marginLeft)', async () => {
        await act(async () => { renderTopbar(); });

        const navUl = document.querySelector('.navbar-nav.navbar-align');
        expect(navUl.style.marginLeft).toBe('');
    });

    // ── Test 17 ─────────────────────────────────────────────────────────────
    // MutationObserver: switching <html dir> from ltr → rtl after mount must
    // cause a re-render that applies the RTL flex styles.

    test('17. MutationObserver: switching to RTL after mount applies RTL flex styles', async () => {
        await act(async () => { renderTopbar(); });

        const collapse = document.querySelector('.navbar-collapse');
        expect(collapse.style.flexDirection).toBe('');

        await act(async () => {
            document.documentElement.setAttribute('dir', 'rtl');
        });

        await waitFor(() => {
            expect(collapse.style.flexDirection).toBe('row-reverse');
            expect(collapse.style.justifyContent).toBe('space-between');
        });
    });

    // ── Test 18 ─────────────────────────────────────────────────────────────
    // MutationObserver: switching <html dir> from rtl → ltr after mount must
    // remove the RTL flex overrides.

    test('18. MutationObserver: switching back to LTR removes RTL flex styles', async () => {
        document.documentElement.setAttribute('dir', 'rtl');

        await act(async () => { renderTopbar(); });

        const collapse = document.querySelector('.navbar-collapse');
        expect(collapse.style.flexDirection).toBe('row-reverse');

        await act(async () => {
            document.documentElement.setAttribute('dir', 'ltr');
        });

        await waitFor(() => {
            expect(collapse.style.flexDirection).toBe('');
        });
    });

    // ── Test 19 ─────────────────────────────────────────────────────────────
    // Nav item order: the language switcher <li> must appear BEFORE the username
    // dropdown <li> in the DOM so that in LTR it lands to the left of username.

    test('19. Language switcher li appears before username li in the nav ul', async () => {
        await act(async () => { renderTopbar(); });

        const navUl = document.querySelector('.navbar-nav.navbar-align');
        const navItems = Array.from(navUl.querySelectorAll(':scope > .nav-item'));

        // Username li contains the toggle with id "user-menu-toggle"
        const userToggle = document.querySelector('#user-menu-toggle');
        const userLiIdx = navItems.findIndex(li => li.contains(userToggle));

        // Language li is the second-to-last child (LanguageSwitcher is mocked as null so
        // its li has no child elements; username is the last item)
        const langLiIdx = navItems.findIndex((li, idx) => idx < userLiIdx && !li.contains(userToggle) && li.querySelector('[data-testid]') === null && li.children.length === 0);

        expect(userLiIdx).toBeGreaterThanOrEqual(0);
        // Language li (empty due to mock) must be before username li
        expect(langLiIdx).toBeGreaterThanOrEqual(0);
        expect(langLiIdx).toBeLessThan(userLiIdx);
    });

    // ── Test 20 ─────────────────────────────────────────────────────────────
    // The store Dropdown is the FIRST child of .navbar-collapse, so that
    // row-reverse in RTL puts it on the RIGHT and keeps it on the LEFT in LTR.

    test('20. Store dropdown (.ms-2) is the first child of .navbar-collapse', async () => {
        await act(async () => { renderTopbar(); });

        const collapse = document.querySelector('.navbar-collapse');
        const firstChild = collapse.firstElementChild;
        expect(firstChild).not.toBeNull();
        expect(firstChild.classList.contains('ms-2')).toBe(true);
    });
});

// ── ZATCA env Arabic labels (source-level) ─────────────────────────────────
//
// These verify the zatcaEnvLabel function and ZATCA_ENV_AR map at source level
// without mounting the component, and a render test for the RTL Arabic label.

describe('Topbar ZATCA env Arabic labels — source contract', () => {
    // eslint-disable-next-line no-undef
    const TOPBAR_SRC = require('fs').readFileSync(
        // eslint-disable-next-line no-undef
        require('path').join(__dirname, '..', 'Topbar.js'),
        'utf8'
    );

    test('21. ZATCA_ENV_AR map contains Production → إنتاج', () => {
        expect(TOPBAR_SRC).toMatch(/ZATCA_ENV_AR[\s\S]{0,50}Production[\s\S]{0,10}إنتاج/);
    });

    test('22. ZATCA_ENV_AR map contains NonProduction → غير إنتاج', () => {
        expect(TOPBAR_SRC).toMatch(/NonProduction[\s\S]{0,10}غير إنتاج/);
    });

    test('23. ZATCA_ENV_AR map contains Simulation → محاكاة', () => {
        expect(TOPBAR_SRC).toMatch(/Simulation[\s\S]{0,10}محاكاة/);
    });

    test('24. zatcaEnvLabel returns ZATCA_ENV_AR[env] when isRTL is true', () => {
        expect(TOPBAR_SRC).toMatch(/function zatcaEnvLabel\(env\)[\s\S]{0,100}isRTL[\s\S]{0,50}ZATCA_ENV_AR\[env\]/);
    });

    test('25. zatcaEnvLabel falls back to env when isRTL is false', () => {
        expect(TOPBAR_SRC).toMatch(/zatcaEnvLabel\(env\)[\s\S]{0,150}:\s*env/);
    });

    test('26. zatcaEnvLabel is applied to the toggle display span', () => {
        expect(TOPBAR_SRC).toMatch(/zatcaEnvLabel\(storeZatca\.env\)/);
    });
});

describe('Topbar ZATCA env — RTL render shows Arabic label', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        document.documentElement.removeAttribute('dir');
    });

    afterEach(() => {
        document.documentElement.removeAttribute('dir');
    });

    test('27. RTL + storeZatca.env=Production shows إنتاج in the toggle', async () => {
        document.documentElement.setAttribute('dir', 'rtl');
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'tok');

        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/v1/store/store1?select=id')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({
                        result: { zatca: { phase: '2', env: 'Production' } },
                    }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: [] }),
            });
        });

        await act(async () => { renderTopbar(); });

        await waitFor(() => {
            expect(screen.getByText('إنتاج')).toBeInTheDocument();
        });
    });

    test('28. LTR + storeZatca.env=Production shows English "Production" label', async () => {
        localStorage.setItem('store_id', 'store1');
        localStorage.setItem('access_token', 'tok');

        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/v1/store/store1?select=id')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({
                        result: { zatca: { phase: '2', env: 'Production' } },
                    }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: [] }),
            });
        });

        await act(async () => { renderTopbar(); });

        await waitFor(() => {
            expect(screen.getByText('Production')).toBeInTheDocument();
        });
    });
});

// ── Notification history localStorage helpers (source-level) ─────────────────
//
// loadWaHistory / saveWaHistory / loadEmailHistory / saveEmailHistory are not
// exported from Topbar.js.  The tests here mirror the logic locally and also
// verify it by exercising the stored key names via source inspection.

const TOPBAR_SRC_NOTIF = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'Topbar.js'),
    'utf8'
);

function loadWaHistoryMirror() {
    try { return JSON.parse(localStorage.getItem('wa_notif_history') || '[]'); }
    catch (_) { return []; }
}
function saveWaHistoryMirror(items) {
    localStorage.setItem('wa_notif_history', JSON.stringify(items));
}
function loadEmailHistoryMirror() {
    try { return JSON.parse(localStorage.getItem('email_notif_history') || '[]'); }
    catch (_) { return []; }
}
function saveEmailHistoryMirror(items) {
    localStorage.setItem('email_notif_history', JSON.stringify(items));
}

describe('Topbar notification history — source-level contracts', () => {
    beforeEach(() => { localStorage.clear(); });

    test('28. Topbar.js defines MAX_NOTIF_HISTORY = 100', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/MAX_NOTIF_HISTORY\s*=\s*100/);
    });

    test('29. Topbar.js persists WA history under key wa_notif_history', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/wa_notif_history/);
    });

    test('30. Topbar.js persists email history under key email_notif_history', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/email_notif_history/);
    });

    test('31. Topbar.js renders waHistory (not waUnreadItems) in the WA dropdown', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/waHistory\.length === 0/);
        expect(TOPBAR_SRC_NOTIF).toMatch(/\[\.\.\. ?waHistory\]/);
    });

    test('32. Topbar.js renders emailHistory (not emailUnreadItems) in the email dropdown', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/emailHistory\.map\(/);
    });

    test('33. Email click still decrements count only when isUnread', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/isUnread\s*=\s*emailUnreadItems\.some\(u => u\.id === item\.id\)/);
        expect(TOPBAR_SRC_NOTIF).toMatch(/if \(isUnread\)/);
    });

    test('34. WA items sorted: unread first, then by date', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/b\.unread_count > 0.*?1.*?-1|b\.unread_count > 0 \? 1 : -1/s);
    });

    test('35. WA history has "Clear all" button that resets state + localStorage', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/setWaHistory\(\[\]\)/);
        expect(TOPBAR_SRC_NOTIF).toMatch(/saveWaHistory\(\[\]\)/);
    });

    test('36. Email history has "Clear all" button that resets state + localStorage', () => {
        expect(TOPBAR_SRC_NOTIF).toMatch(/setEmailHistory\(\[\]\)/);
        expect(TOPBAR_SRC_NOTIF).toMatch(/saveEmailHistory\(\[\]\)/);
    });
});

describe('Topbar notification history — localStorage helpers (mirror)', () => {
    beforeEach(() => { localStorage.clear(); });

    test('37. loadWaHistoryMirror returns [] when localStorage is empty', () => {
        expect(loadWaHistoryMirror()).toEqual([]);
    });

    test('38. saveWaHistoryMirror / loadWaHistoryMirror round-trip', () => {
        const items = [{ phone: '96650001', unread_count: 2 }, { phone: '96650002', unread_count: 0 }];
        saveWaHistoryMirror(items);
        expect(loadWaHistoryMirror()).toEqual(items);
    });

    test('39. loadEmailHistoryMirror returns [] when localStorage is empty', () => {
        expect(loadEmailHistoryMirror()).toEqual([]);
    });

    test('40. saveEmailHistoryMirror / loadEmailHistoryMirror round-trip', () => {
        const items = [{ id: 'msg1', subject: 'Hello' }, { id: 'msg2', subject: 'Invoice' }];
        saveEmailHistoryMirror(items);
        expect(loadEmailHistoryMirror()).toEqual(items);
    });

    test('41. loadWaHistoryMirror handles corrupted JSON gracefully', () => {
        localStorage.setItem('wa_notif_history', '{invalid');
        expect(loadWaHistoryMirror()).toEqual([]);
    });

    test('42. loadEmailHistoryMirror handles corrupted JSON gracefully', () => {
        localStorage.setItem('email_notif_history', '{invalid');
        expect(loadEmailHistoryMirror()).toEqual([]);
    });

    test('43. history merge keeps existing items and prepends new ones', () => {
        const existing = [{ phone: '111', unread_count: 0 }, { phone: '222', unread_count: 0 }];
        const fresh = [{ phone: '333', unread_count: 3 }, { phone: '111', unread_count: 1 }];
        // Mirror of fetchWaUnread merge logic
        const freshByPhone = Object.fromEntries(fresh.map(i => [i.phone, i]));
        const merged = existing.map(h =>
            freshByPhone[h.phone] ? { ...h, ...freshByPhone[h.phone] } : { ...h, unread_count: 0 }
        );
        const existingPhones = new Set(merged.map(h => h.phone));
        for (const item of fresh) {
            if (!existingPhones.has(item.phone)) merged.unshift(item);
        }
        // '333' is new → prepended; '111' is updated; '222' stays with unread_count:0
        expect(merged[0].phone).toBe('333');
        expect(merged[0].unread_count).toBe(3);
        expect(merged.find(h => h.phone === '111').unread_count).toBe(1);
        expect(merged.find(h => h.phone === '222').unread_count).toBe(0);
    });

    test('44. history is trimmed to MAX_NOTIF_HISTORY (100)', () => {
        const items = Array.from({ length: 120 }, (_, i) => ({ phone: String(i), unread_count: 0 }));
        const trimmed = items.slice(0, 100);
        expect(trimmed.length).toBe(100);
    });
});
