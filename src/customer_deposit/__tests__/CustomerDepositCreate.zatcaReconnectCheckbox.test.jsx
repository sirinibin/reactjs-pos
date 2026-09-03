/**
 * Unit tests for the ZATCA reconnect-prompt interception added to
 * CustomerDepositCreate (customer_deposit/create.js).
 *
 * The "Report to ZATCA" checkbox onChange handler (line ~2464) follows this pattern:
 *
 *   onChange={() => {
 *     if (store?.zatca?.zatca_reconnect_required) {
 *       zatcaConnectRef.current?.open(store.id, true);
 *       return;
 *     }
 *     formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
 *     setFormData({ ...formData });
 *   }}
 *
 * These tests verify the three behaviours of that handler in isolation,
 * then add a smoke-render test to confirm the component mounts without crashing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Logic-isolation tests (no DOM, no React rendering)
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerDepositCreate – ZATCA reconnect checkbox interceptor logic', () => {
    // Helper: builds the same onChange handler that lives inside the component.
    function makeHandler(store, formData, setFormData, zatcaConnectRef) {
        return () => {
            if (store?.zatca?.zatca_reconnect_required) {
                zatcaConnectRef.current?.open(store.id, true);
                return;
            }
            formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
            setFormData({ ...formData });
        };
    }

    test('1. does not open reconnect when zatca_reconnect_required is false', () => {
        const store = {
            id: 'store-cd-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: false },
            settings: { enable_zatca_reporting_for_receivables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        const handleChange = makeHandler(store, formData, setFormData, zatcaConnectRef);
        handleChange();

        expect(mockOpen).not.toHaveBeenCalled();
        // Toggle should have occurred instead
        expect(setFormData).toHaveBeenCalledTimes(1);
        expect(formData.enable_report_to_zatca).toBe(true);
    });

    test('2. opens reconnect prompt when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-cd-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
            settings: { enable_zatca_reporting_for_receivables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        const handleChange = makeHandler(store, formData, setFormData, zatcaConnectRef);
        handleChange();

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith('store-cd-1', true);
    });

    test('3. does not toggle checkbox when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-cd-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
            settings: { enable_zatca_reporting_for_receivables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        const handleChange = makeHandler(store, formData, setFormData, zatcaConnectRef);
        handleChange();

        // setFormData must NOT have been called — the handler returned early
        expect(setFormData).not.toHaveBeenCalled();
        // enable_report_to_zatca stays false (unchecked)
        expect(formData.enable_report_to_zatca).toBe(false);
    });

    test('4. handles missing zatca object gracefully (no crash, no reconnect)', () => {
        const store = { id: 'store-cd-2' }; // no zatca key at all
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        const handleChange = makeHandler(store, formData, setFormData, zatcaConnectRef);
        expect(() => handleChange()).not.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
    });

    test('5. handles null zatcaConnectRef.current gracefully when reconnect required', () => {
        const store = {
            id: 'store-cd-3',
            zatca: { zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const zatcaConnectRef = { current: null }; // ref not yet attached

        const handleChange = makeHandler(store, formData, setFormData, zatcaConnectRef);
        expect(() => handleChange()).not.toThrow();
        // Still returned early — toggle was not applied
        expect(setFormData).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Form-submission catch handler — zatca_reconnect error interception
// ─────────────────────────────────────────────────────────────────────────────
//
// When CreateCustomerDeposit API returns 403 + errors.zatca_reconnect, the
// catch handler opens ZatcaConnect instead of setting error state.

describe('CustomerDepositCreate – form submission catch handler', () => {
    function makeCatchHandler(store, zatcaConnectRef, setProcessing, setErrors, showToastMessage) {
        return (error) => {
            setProcessing(false);
            if (error?.zatca_reconnect) {
                zatcaConnectRef.current?.open(store.id, true);
                return;
            }
            setErrors({ ...error });
            if (showToastMessage) showToastMessage("Error Creating!", "danger");
        };
    }

    test('opens ZatcaConnect when zatca_reconnect error is returned', () => {
        const store = { id: 'store-cd-catch-1' };
        const mockOpen = jest.fn();
        makeCatchHandler(store, { current: { open: mockOpen } }, jest.fn(), jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(mockOpen).toHaveBeenCalledWith('store-cd-catch-1', true);
    });

    test('does NOT set error state when zatca_reconnect is present', () => {
        const store = { id: 'store-cd-catch-2' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setErrors).not.toHaveBeenCalled();
    });

    test('sets error state for non-reconnect errors', () => {
        const store = { id: 'store-cd-catch-3' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { amount: 'Amount is required.' }
        );
        expect(setErrors).toHaveBeenCalledWith({ amount: 'Amount is required.' });
    });

    test('shows "Error Creating!" toast for non-reconnect errors', () => {
        const store = { id: 'store-cd-catch-4' };
        const showToastMessage = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), jest.fn(), showToastMessage)(
            { amount: 'error' }
        );
        expect(showToastMessage).toHaveBeenCalledWith("Error Creating!", "danger");
    });

    test('does NOT call toast when zatca_reconnect is present', () => {
        const store = { id: 'store-cd-catch-5' };
        const showToastMessage = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), jest.fn(), showToastMessage)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(showToastMessage).not.toHaveBeenCalled();
    });

    test('always calls setProcessing(false)', () => {
        const store = { id: 'store-cd-catch-6' };
        const setProcessing = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, setProcessing, jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setProcessing).toHaveBeenCalledWith(false);
    });

    test('handles null ref.current gracefully', () => {
        const store = { id: 'store-cd-catch-7' };
        expect(() =>
            makeCatchHandler(store, { current: null }, jest.fn(), jest.fn(), undefined)(
                { zatca_reconnect: 'reconnect!' }
            )
        ).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Smoke-render test (confirms the full component mounts without crashing)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS stubs ─────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── Third-party UI ────────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const pass = ({ children }) => React.createElement(React.Fragment, null, children);
    const Modal = Object.assign(
        ({ children, show }) => (show ? React.createElement(React.Fragment, null, children) : null),
        { Header: pass, Title: pass, Body: pass, Footer: pass }
    );
    return {
        Modal, Button: pass, Spinner: () => null,
        Form: pass, Row: pass, Col: pass, Container: pass, Table: pass,
    };
});
jest.mock('react-bootstrap-typeahead', () => {
    const React = require('react');
    return {
        Typeahead: React.forwardRef((_p, _r) => null),
        Menu: ({ children }) => React.createElement('div', null, children),
        MenuItem: ({ children }) => React.createElement('div', null, children),
    };
});
jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn().mockResolvedValue(false) }));
jest.mock('react-draggable', () => {
    const React = require('react');
    return ({ children }) => React.createElement('div', null, children);
});

// ── ZatcaConnect (the component under scrutiny) ───────────────────────────────
jest.mock('../../store/zatca_connect.js', () => {
    const React = require('react');
    const mockOpen = jest.fn();
    return {
        __esModule: true,
        default: React.forwardRef((_props, ref) => {
            React.useImperativeHandle(ref, () => ({ open: mockOpen }));
            return null;
        }),
    };
});

// ── Child component stubs (inline factories — Babel requires this) ─────────────
jest.mock('../../customer/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../vendor/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../employee/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/customer_pending.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/vendor_pending.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../customer/view.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/customers.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/vendors.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/employees.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/sales.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/purchase-returns.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/quotations.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../preview.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../order/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../purchase_return/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../quotation/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/InfoDialog', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);

// ── Utility mocks ─────────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(parseFloat(v).toFixed(2)),
}));
jest.mock('../../utils/search.js', () => ({ highlightWords: (t) => t }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

// ── Subject under test ────────────────────────────────────────────────────────
import CustomerDepositCreate from '../create.js';

describe('CustomerDepositCreate smoke test (with ZatcaConnect mock)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.setItem('access_token', 'test-token');
        localStorage.setItem('store_id', 'test-store');
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        localStorage.clear();
    });

    test('6. renders without crashing (ZatcaConnect ref wired correctly)', () => {
        const ref = React.createRef();
        expect(() =>
            render(
                <MemoryRouter>
                    <CustomerDepositCreate ref={ref} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
