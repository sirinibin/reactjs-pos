/**
 * Tests for the enable_sales_in_quotation gate in VendorPending.
 *
 * vendor_pending.js reads storeSettings from localStorage at module load time,
 * so each test uses jest.isolateModules() to get a fresh module instance after
 * seeding localStorage with the desired setting value.
 */

// ── CSS stub ──────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    return {
        Modal: Object.assign(
            ({ show, children }) => (show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null),
            {
                Header: ({ children }) => React.createElement('div', null, children),
                Title: ({ children }) => React.createElement('div', null, children),
                Body: ({ children }) => React.createElement('div', null, children),
            }
        ),
    };
});

jest.mock('react-bootstrap/Tab', () => {
    const React = require('react');
    return ({ children }) => React.createElement('div', null, children);
});
jest.mock('react-bootstrap/Tabs', () => {
    const React = require('react');
    return ({ children }) => React.createElement('div', null, children);
});
jest.mock('react-bootstrap/Badge', () => {
    const React = require('react');
    return ({ children }) => React.createElement('span', null, children);
});
jest.mock('react-bootstrap/Button', () => {
    const React = require('react');
    return ({ children, ...rest }) => React.createElement('button', rest, children);
});

// ── react-draggable ───────────────────────────────────────────────────────────
jest.mock('react-draggable', () => {
    const React = require('react');
    return ({ children }) => React.createElement('div', null, children);
});

// ── react-router-dom ─────────────────────────────────────────────────────────
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useHistory: () => ({ push: jest.fn() }),
        useParams: () => ({}),
        Link: () => null,
    };
});

jest.mock('react-datepicker', () => () => null);

// ── domain child components ───────────────────────────────────────────────────
jest.mock('../../order/index.js', () => () => null);
jest.mock('../../sales_return/index.js', () => () => null);
jest.mock('../../purchase/index.js', () => () => null);
jest.mock('../../purchase_return/index.js', () => () => null);
jest.mock('../../posting/index.js', () => {
    const { forwardRef, useImperativeHandle, createElement } = require('react');
    return forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({ open: jest.fn() }));
        return createElement('div', null);
    });
});

// Identifiable stubs so tests can detect whether the Qtn. tabs were rendered.
jest.mock('../../quotation/index.js', () => () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'qtn-sales-stub' });
});
jest.mock('../../quotation_sales_return/index.js', () => () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'qtn-sales-return-stub' });
});

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../numberUtils', () => ({
    trimTo2Decimals: jest.fn((v) => (v != null ? Number(v).toFixed(2) : '0.00')),
}));
jest.mock('../amount.js', () => () => null);
jest.mock('../queryUtils.js', () => ({
    ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// ── fetch mock ────────────────────────────────────────────────────────────────
function installFetchMock() {
    global.fetch = jest.fn((url) => {
        if (typeof url === 'string' && url.includes('/v1/vendor/')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1' } }),
            });
        }
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, data: [], total_count: 0 }),
        });
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    installFetchMock();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    localStorage.clear();
});

// ── imports (after mocks) ─────────────────────────────────────────────────────
import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Helper: load a fresh VendorPending with the current localStorage state.
function loadFreshVendorPending() {
    let VendorPending;
    jest.isolateModules(() => {
        VendorPending = require('../vendor_pending.js').default;
    });
    return VendorPending;
}

const TEST_VENDOR = { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1' };

describe('VendorPending – Qtn. Sales tab visibility (enable_sales_in_quotation)', () => {
    it('hides Qtn. Sales tab when enable_sales_in_quotation is false', async () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_sales_in_quotation: false }));
        const VendorPending = loadFreshVendorPending();
        const ref = createRef();
        render(<MemoryRouter><VendorPending ref={ref} /></MemoryRouter>);
        await act(async () => ref.current.open(false, TEST_VENDOR));
        expect(screen.queryByTestId('qtn-sales-stub')).not.toBeInTheDocument();
    });

    it('hides Qtn. Sales Return tab when enable_sales_in_quotation is false', async () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_sales_in_quotation: false }));
        const VendorPending = loadFreshVendorPending();
        const ref = createRef();
        render(<MemoryRouter><VendorPending ref={ref} /></MemoryRouter>);
        await act(async () => ref.current.open(false, TEST_VENDOR));
        expect(screen.queryByTestId('qtn-sales-return-stub')).not.toBeInTheDocument();
    });

    it('shows Qtn. Sales tab when enable_sales_in_quotation is true', async () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_sales_in_quotation: true }));
        const VendorPending = loadFreshVendorPending();
        const ref = createRef();
        render(<MemoryRouter><VendorPending ref={ref} /></MemoryRouter>);
        await act(async () => ref.current.open(false, TEST_VENDOR));
        expect(screen.getByTestId('qtn-sales-stub')).toBeInTheDocument();
    });

    it('shows Qtn. Sales Return tab when enable_sales_in_quotation is true', async () => {
        localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_sales_in_quotation: true }));
        const VendorPending = loadFreshVendorPending();
        const ref = createRef();
        render(<MemoryRouter><VendorPending ref={ref} /></MemoryRouter>);
        await act(async () => ref.current.open(false, TEST_VENDOR));
        expect(screen.getByTestId('qtn-sales-return-stub')).toBeInTheDocument();
    });

    it('hides both Qtn. tabs when _store_settings_cache is absent', async () => {
        // localStorage.clear() in beforeEach ensures no cache entry
        const VendorPending = loadFreshVendorPending();
        const ref = createRef();
        render(<MemoryRouter><VendorPending ref={ref} /></MemoryRouter>);
        await act(async () => ref.current.open(false, TEST_VENDOR));
        expect(screen.queryByTestId('qtn-sales-stub')).not.toBeInTheDocument();
        expect(screen.queryByTestId('qtn-sales-return-stub')).not.toBeInTheDocument();
    });
});
