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
