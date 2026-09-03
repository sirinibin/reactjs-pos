/**
 * Tests for ZATCA re-connect features in the admin StoreCreate form:
 *   1. Invoice Titles tab — phase-conditional rendering
 *   2. "Relieve from Re-Connect Prompt" button
 */
import React, { createRef } from 'react';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const P = ({ children }) => <>{children || null}</>;
    const Modal = ({ children }) => <div data-testid="modal">{children}</div>;
    Modal.Header = P;
    Modal.Title = P;
    Modal.Body = P;
    Modal.Footer = P;
    return {
        Modal, Button: P, Spinner: () => null,
        Form: P, Row: P, Col: P, Alert: P, Table: P,
    };
});

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
}));

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    AsyncTypeahead: () => null,
}));
jest.mock('react-image-file-resizer', () => ({ imageFileResizer: jest.fn() }));
jest.mock('react-select-country-list', () => () => ({ getData: () => [] }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: jest.fn(),
}));
jest.mock('../../utils/timezone.js', () => ({
    toStoreLocalDate: jest.fn((v) => (v ? new Date(v) : null)),
    fromStoreLocalDate: jest.fn((d) => (d ? d.toISOString() : null)),
}));
jest.mock('../../sidebar_menu_config', () => ({
    applyAutomobileMenuOrder: jest.fn((x) => x),
    DEFAULT_MENU: [],
    loadSidebarConfig: jest.fn(() => []),
    saveSidebarConfig: jest.fn(),
}));

jest.useFakeTimers();

// ── fetch factory ─────────────────────────────────────────────────────────────

function makeStoreFetch(storeOverride = {}) {
    return jest.fn((url) => {
        const isListEndpoint = url && (
            url.includes('customer-package') ||
            url.includes('customer?') ||
            url.includes('product?') ||
            url.includes('employee?') ||
            url.includes('serial-locks')
        );
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve(
                isListEndpoint
                    ? { status: true, result: [], data: [], total_count: 0 }
                    : {
                        result: {
                            settings: {},
                            zatca: { phase: '1', env: 'NonProduction', ...storeOverride.zatca },
                            ...storeOverride,
                        },
                        data: [],
                        total_count: 0,
                        store: {},
                        status: true,
                    }
            ),
        });
    });
}

beforeEach(() => {
    localStorage.clear();
    global.fetch = makeStoreFetch();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

import StoreCreate from '../create.js';

// ── helpers ───────────────────────────────────────────────────────────────────

async function renderAndOpen(storeId = 'test-store-123') {
    const ref = createRef();
    await act(async () => {
        render(<MemoryRouter><StoreCreate ref={ref} /></MemoryRouter>);
    });
    await act(async () => {
        ref.current.open(storeId);
        await Promise.resolve();
        await Promise.resolve();
    });
    return ref;
}

async function clickTab(tabLabel) {
    await act(async () => {
        const btn = screen.getAllByRole('button').find(
            b => b.textContent.trim() === tabLabel
        );
        if (btn) fireEvent.click(btn);
    });
}

// ── Invoice Titles — phase-conditional rendering ──────────────────────────────

describe('StoreCreate — Invoice Titles phase-conditional rendering', () => {

    test('shows Phase 1 Invoice Titles when zatca.phase is "1"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '1' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Zatca Phase 1 Invoice Titles/i)).not.toBeNull();
    });

    test('hides Phase 2 Invoice Titles when zatca.phase is "1"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '1' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Zatca Phase 2 Invoice Titles/i)).toBeNull();
    });

    test('shows Phase 2 Invoice Titles when zatca.phase is "2"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '2' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Zatca Phase 2 Invoice Titles/i)).not.toBeNull();
    });

    test('hides Phase 1 Invoice Titles when zatca.phase is "2"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '2' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Zatca Phase 1 Invoice Titles/i)).toBeNull();
    });

    // Note: an empty/null phase cannot be persisted — deepFillEmptyStrings()
    // replaces '' with the default "1" when loading store data, so the
    // component always ends up with phase "1" or "2" in practice.

    test('shows Other Invoice Titles when zatca.phase is "1"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '1' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Other Invoice Titles/i)).not.toBeNull();
    });

    test('shows Other Invoice Titles when zatca.phase is "2"', async () => {
        global.fetch = makeStoreFetch({ zatca: { phase: '2' } });
        await renderAndOpen();
        await clickTab('Invoice Titles');

        expect(screen.queryByText(/Other Invoice Titles/i)).not.toBeNull();
    });
});

// ── Relieve from Re-Connect Prompt button ─────────────────────────────────────

describe('StoreCreate — Relieve from Re-Connect Prompt', () => {

    function makeFetchWithReconnect() {
        return jest.fn((url) => {
            if (url && url.includes('clear-reconnect')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ status: true }),
                });
            }
            const isListEndpoint = url && (
                url.includes('customer-package') ||
                url.includes('customer?') ||
                url.includes('product?') ||
                url.includes('employee?') ||
                url.includes('serial-locks')
            );
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve(
                    isListEndpoint
                        ? { status: true, result: [], data: [], total_count: 0 }
                        : {
                            result: {
                                settings: {},
                                zatca: {
                                    phase: '2',
                                    env: 'NonProduction',
                                    connected: true,
                                    zatca_reconnect_required: true,
                                },
                            },
                            data: [],
                            total_count: 0,
                            store: {},
                            status: true,
                        }
                ),
            });
        });
    }

    test('"Relieve from Re-Connect Prompt" button appears when zatca_reconnect_required=true', async () => {
        global.fetch = makeFetchWithReconnect();
        await renderAndOpen('store-reconnect-test');

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );
        expect(btn).toBeTruthy();
    });

    test('"Relieve from Re-Connect Prompt" button calls PUT clear-reconnect endpoint', async () => {
        global.fetch = makeFetchWithReconnect();
        const mockFetch = global.fetch;
        await renderAndOpen('store-reconnect-test');

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );

        await act(async () => {
            fireEvent.click(btn);
            await Promise.resolve();
            await Promise.resolve();
        });

        const clearCall = mockFetch.mock.calls.find(
            ([url, opts]) => url && url.includes('clear-reconnect') && opts?.method === 'PUT'
        );
        expect(clearCall).toBeTruthy();
    });

    test('"Relieve" button sends Authorization header', async () => {
        global.fetch = makeFetchWithReconnect();
        localStorage.setItem('access_token', 'admin-jwt-token');
        const mockFetch = global.fetch;
        await renderAndOpen('store-reconnect-test');

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );
        await act(async () => {
            fireEvent.click(btn);
            await Promise.resolve();
            await Promise.resolve();
        });

        const clearCall = mockFetch.mock.calls.find(
            ([url]) => url && url.includes('clear-reconnect')
        );
        expect(clearCall).toBeTruthy();
        expect(clearCall[1].headers.Authorization).toBe('admin-jwt-token');
    });

    test('"Relieve from Re-Connect Prompt" button is absent when zatca_reconnect_required=false', async () => {
        global.fetch = makeStoreFetch({
            zatca: { phase: '2', connected: true, zatca_reconnect_required: false },
        });
        await renderAndOpen('store-no-reconnect');

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );
        expect(btn).toBeUndefined();
    });

    test('"Reconnect to ZATCA" button is also present when zatca_reconnect_required=true', async () => {
        global.fetch = makeFetchWithReconnect();
        await renderAndOpen('store-reconnect-test');

        const btn = screen.getAllByRole('button').find(
            b => /reconnect to zatca/i.test(b.textContent)
        );
        expect(btn).toBeTruthy();
    });

    test('shows success toast after Relieve succeeds', async () => {
        global.fetch = makeFetchWithReconnect();
        const showToastMessage = jest.fn();
        const ref = createRef();
        await act(async () => {
            render(
                <MemoryRouter>
                    <StoreCreate ref={ref} showToastMessage={showToastMessage} />
                </MemoryRouter>
            );
        });
        await act(async () => {
            ref.current.open('store-reconnect-test');
            await Promise.resolve();
            await Promise.resolve();
        });

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );
        await act(async () => {
            fireEvent.click(btn);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(showToastMessage).toHaveBeenCalledWith(
            'Store relieved from ZATCA re-connect requirement.',
            'success'
        );
    });

    test('shows danger toast when Relieve API returns status=false', async () => {
        global.fetch = jest.fn((url) => {
            if (url && url.includes('clear-reconnect')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ status: false }),
                });
            }
            const isListEndpoint = url && (
                url.includes('customer-package') || url.includes('serial-locks')
            );
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve(
                    isListEndpoint
                        ? { status: true, result: [], data: [], total_count: 0 }
                        : {
                            result: {
                                settings: {},
                                zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
                            },
                            data: [], total_count: 0, store: {}, status: true,
                        }
                ),
            });
        });

        const showToastMessage = jest.fn();
        const ref = createRef();
        await act(async () => {
            render(
                <MemoryRouter>
                    <StoreCreate ref={ref} showToastMessage={showToastMessage} />
                </MemoryRouter>
            );
        });
        await act(async () => {
            ref.current.open('store-reconnect-test');
            await Promise.resolve();
            await Promise.resolve();
        });

        const btn = screen.getAllByRole('button').find(
            b => /relieve from re-connect prompt/i.test(b.textContent)
        );
        await act(async () => {
            fireEvent.click(btn);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(showToastMessage).toHaveBeenCalledWith(
            'Failed to relieve store from ZATCA re-connect requirement.',
            'danger'
        );
    });
});
