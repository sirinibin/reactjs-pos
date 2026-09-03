/**
 * Tests for the StoreSettingsModal ZATCA-related UI changes:
 *  1. Invoice Titles tab — phase-conditional rendering (isPhase1 / isPhase2)
 *  2. General Info tab — "(Optional)" label on Store Name / Store Name In Arabic
 *  3. General Info tab — VAT % field is absent (removed from non-admin view)
 */
import React from 'react';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const P = ({ children }) => <>{children || null}</>;
    const Modal = ({ show, children }) => (show ? <div data-testid="settings-modal">{children}</div> : null);
    Modal.Header = P;
    Modal.Title = P;
    Modal.Body = P;
    Modal.Footer = P;
    return { Modal, Button: P, Spinner: () => null };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
}));

// ── react-select-country-list ─────────────────────────────────────────────────
jest.mock('react-select-country-list', () => () => ({ getData: () => [] }));

// ── timezone utils ────────────────────────────────────────────────────────────
jest.mock('../../utils/timezone.js', () => ({
    toStoreLocalDate: jest.fn((v) => (v ? new Date(v) : null)),
    fromStoreLocalDate: jest.fn((d) => (d ? d.toISOString() : null)),
}));

// ── ZatcaConnect ──────────────────────────────────────────────────────────────
jest.mock('../zatca_connect.js', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef((_props, ref) => {
            React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
            return null;
        }),
    };
});

// ── Static image imports ──────────────────────────────────────────────────────
jest.mock('../../INVOICE.jpg', () => 'invoice.jpg', { virtual: true });
jest.mock('../../LGK_WHATSAPP.png', () => 'whatsapp.png', { virtual: true });

// ── imageUtils ────────────────────────────────────────────────────────────────
jest.mock('../../utils/imageUtils.js', () => ({
    resolveImageUrl: jest.fn((url) => url),
}));

jest.useFakeTimers();

// ── fetch factory ─────────────────────────────────────────────────────────────

function makeStoreFetch(storeOverride = {}) {
    return jest.fn((url) => {
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
                result: {
                    id: 'test-store-settings-id',
                    settings: { invoice: {} },
                    zatca: { phase: '1', ...storeOverride.zatca },
                    bank_account: {},
                    national_address: {},
                    ...storeOverride,
                },
            }),
        });
    });
}

beforeEach(() => {
    localStorage.setItem('store_id', 'test-store-settings-id');
    localStorage.setItem('access_token', 'test-token');
    global.fetch = makeStoreFetch();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

import StoreSettingsModal from '../StoreSettingsModal.js';

// ── helper ────────────────────────────────────────────────────────────────────

async function renderAndShow(storeOverride = {}) {
    global.fetch = makeStoreFetch(storeOverride);
    const { rerender, ...utils } = render(
        <MemoryRouter>
            <StoreSettingsModal show={true} onHide={jest.fn()} />
        </MemoryRouter>
    );
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
    return { rerender, ...utils };
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

describe('StoreSettingsModal — Invoice Titles phase-conditional rendering', () => {

    test('shows Phase 1 Invoice Titles section when zatca.phase is "1"', async () => {
        await renderAndShow({ zatca: { phase: '1' } });
        await clickTab('Invoice Titles');
        expect(screen.queryAllByText(/Zatca Phase 1/i).length).toBeGreaterThan(0);
    });

    test('hides Phase 2 Invoice Titles section when zatca.phase is "1"', async () => {
        await renderAndShow({ zatca: { phase: '1' } });
        await clickTab('Invoice Titles');
        expect(screen.queryAllByText(/Zatca Phase 2/i).length).toBe(0);
    });

    test('shows Phase 2 Invoice Titles section when zatca.phase is "2"', async () => {
        await renderAndShow({ zatca: { phase: '2' } });
        await clickTab('Invoice Titles');
        expect(screen.queryAllByText(/Zatca Phase 2/i).length).toBeGreaterThan(0);
    });

    test('hides Phase 1 Invoice Titles section when zatca.phase is "2"', async () => {
        await renderAndShow({ zatca: { phase: '2' } });
        await clickTab('Invoice Titles');
        expect(screen.queryAllByText(/Zatca Phase 1/i).length).toBe(0);
    });
});

// ── General Info — "(Optional)" label ────────────────────────────────────────

describe('StoreSettingsModal — Optional labels on Store Name fields', () => {

    test('"Store Name" label is present', async () => {
        await renderAndShow();
        // General tab is active by default
        const storeNameLabels = screen.queryAllByText(/Store Name/i);
        expect(storeNameLabels.length).toBeGreaterThan(0);
    });

    test('Store Name and Store Name In Arabic both have Optional markers', async () => {
        await renderAndShow();
        // Find all labels with "(Optional)" suffix rendered by the Field component
        const optionalSpans = screen.getAllByText('(Optional)');
        expect(optionalSpans.length).toBeGreaterThanOrEqual(2);
    });
});

// ── General Info — VAT % field removed ───────────────────────────────────────

describe('StoreSettingsModal — VAT % field absent in non-admin view', () => {

    test('does not render a "VAT %" label in General Info tab', async () => {
        await renderAndShow();
        // The label "VAT %" should not appear — it was removed from StoreSettingsModal
        const vatLabel = screen.queryByText(/^VAT %/i);
        expect(vatLabel).toBeNull();
    });

    test('does not render a vat_percent input field', async () => {
        await renderAndShow();
        const input = document.querySelector('input[id="vat_percent"]');
        expect(input).toBeNull();
    });
});

// ── Smoke ─────────────────────────────────────────────────────────────────────

describe('StoreSettingsModal — smoke', () => {
    test('renders without crashing when show=true', async () => {
        await expect(renderAndShow()).resolves.not.toThrow();
    });

    test('does not render modal content when show=false', () => {
        render(
            <MemoryRouter>
                <StoreSettingsModal show={false} onHide={jest.fn()} />
            </MemoryRouter>
        );
        expect(screen.queryByTestId('settings-modal')).toBeNull();
    });
});
