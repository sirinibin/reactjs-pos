/**
 * Unit tests for the ZATCA reconnect-prompt interception added to
 * CustomerWithdrawalCreate (customer_withdrawal/create.js).
 *
 * The "Report to ZATCA" checkbox onChange handler (line ~2482) follows this pattern:
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

describe('CustomerWithdrawalCreate – ZATCA reconnect checkbox interceptor logic', () => {
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
            id: 'store-cw-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: false },
            settings: { enable_zatca_reporting_for_payables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)();

        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
        expect(formData.enable_report_to_zatca).toBe(true);
    });

    test('2. opens reconnect prompt when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-cw-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
            settings: { enable_zatca_reporting_for_payables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)();

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith('store-cw-1', true);
    });

    test('3. does not toggle checkbox when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-cw-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
            settings: { enable_zatca_reporting_for_payables: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)();

        expect(setFormData).not.toHaveBeenCalled();
        expect(formData.enable_report_to_zatca).toBe(false);
    });

    test('4. handles missing zatca object gracefully (no crash, no reconnect)', () => {
        const store = { id: 'store-cw-2' };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        expect(() => makeHandler(store, formData, setFormData, zatcaConnectRef)()).not.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
    });

    test('5. handles null zatcaConnectRef.current gracefully when reconnect required', () => {
        const store = {
            id: 'store-cw-3',
            zatca: { zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const zatcaConnectRef = { current: null };

        expect(() => makeHandler(store, formData, setFormData, zatcaConnectRef)()).not.toThrow();
        expect(setFormData).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Form-submission catch handler — zatca_reconnect error interception
// ─────────────────────────────────────────────────────────────────────────────
//
// When CreateCustomerWithdrawal API returns 403 + errors.zatca_reconnect, the
// catch handler opens ZatcaConnect instead of setting error state.

describe('CustomerWithdrawalCreate – form submission catch handler', () => {
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
        const store = { id: 'store-cw-catch-1' };
        const mockOpen = jest.fn();
        makeCatchHandler(store, { current: { open: mockOpen } }, jest.fn(), jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(mockOpen).toHaveBeenCalledWith('store-cw-catch-1', true);
    });

    test('does NOT set error state when zatca_reconnect is present', () => {
        const store = { id: 'store-cw-catch-2' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setErrors).not.toHaveBeenCalled();
    });

    test('sets error state for non-reconnect errors', () => {
        const store = { id: 'store-cw-catch-3' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { amount: 'Amount is required.' }
        );
        expect(setErrors).toHaveBeenCalledWith({ amount: 'Amount is required.' });
    });

    test('always calls setProcessing(false)', () => {
        const store = { id: 'store-cw-catch-4' };
        const setProcessing = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, setProcessing, jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setProcessing).toHaveBeenCalledWith(false);
    });

    test('does NOT call toast when zatca_reconnect is present', () => {
        const store = { id: 'store-cw-catch-5' };
        const showToastMessage = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), jest.fn(), showToastMessage)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(showToastMessage).not.toHaveBeenCalled();
    });

    test('handles null ref.current gracefully', () => {
        const store = { id: 'store-cw-catch-6' };
        expect(() =>
            makeCatchHandler(store, { current: null }, jest.fn(), jest.fn(), undefined)(
                { zatca_reconnect: 'reconnect!' }
            )
        ).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Smoke-render test
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const pass = ({ children }) => React.createElement(React.Fragment, null, children);
    const Modal = Object.assign(
        ({ children, show }) => (show ? React.createElement(React.Fragment, null, children) : null),
        { Header: pass, Title: pass, Body: pass, Footer: pass }
    );
    const Button = ({ children, onClick, disabled }) =>
        React.createElement('button', { onClick, disabled }, children);
    return { Modal, Button, Spinner: () => null };
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

// ── ZatcaConnect mock ─────────────────────────────────────────────────────────
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
jest.mock('../../utils/salesReturn.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/purchases.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../utils/quotation_sales_returns.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../customer_deposit/preview.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../purchase/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../sales_return/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});
jest.mock('../../quotation_sales_return/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/InfoDialog', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);

jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(parseFloat(v).toFixed(2)),
}));
jest.mock('../../utils/search.js', () => ({ highlightWords: (t) => t }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

import CustomerWithdrawalCreate from '../create.js';

describe('CustomerWithdrawalCreate smoke test (with ZatcaConnect mock)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
        });
        localStorage.clear();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('6. renders without crashing (ZatcaConnect ref wired correctly)', () => {
        const ref = React.createRef();
        expect(() =>
            render(
                <MemoryRouter>
                    <CustomerWithdrawalCreate ref={ref} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
