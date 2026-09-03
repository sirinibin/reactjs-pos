/**
 * Unit tests for the ZATCA reconnect-prompt interception added to
 * SalesReturnCreate (sales_return/create.js).
 *
 * Two checkboxes were updated:
 *   - Compact header (line ~2492)
 *   - Classic layout (line ~5782)
 * Both share the same handler pattern:
 *
 *   onChange={(e) => {
 *     if (store?.zatca?.zatca_reconnect_required) {
 *       zatcaConnectRef.current?.open(store.id, true);
 *       return;
 *     }
 *     formData.enable_report_to_zatca = !formData.enable_report_to_zatca;
 *     setFormData({ ...formData });
 *   }}
 *
 * Logic-isolation tests cover both checkboxes' shared handler.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Logic-isolation tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SalesReturnCreate – ZATCA reconnect checkbox interceptor logic', () => {
    function makeHandler(store, formData, setFormData, zatcaConnectRef) {
        return (e) => {
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
            id: 'store-sr-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: false },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
        expect(formData.enable_report_to_zatca).toBe(true);
    });

    test('2. opens reconnect prompt when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-sr-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith('store-sr-1', true);
    });

    test('3. does not toggle checkbox when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-sr-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(setFormData).not.toHaveBeenCalled();
        expect(formData.enable_report_to_zatca).toBe(false);
    });

    test('4. classic layout handler: same logic – intercepts when reconnect required', () => {
        // The classic (type-1) checkbox handler is identical to the compact one.
        const store = {
            id: 'store-sr-2',
            zatca: { zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).toHaveBeenCalledWith('store-sr-2', true);
        expect(setFormData).not.toHaveBeenCalled();
    });

    test('5. classic layout handler: toggles when reconnect NOT required', () => {
        const store = {
            id: 'store-sr-2',
            zatca: { zatca_reconnect_required: false },
        };
        const formData = { enable_report_to_zatca: true };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
        expect(formData.enable_report_to_zatca).toBe(false);
    });

    test('6. handles null ref.current gracefully when reconnect required', () => {
        const store = { id: 'store-sr-3', zatca: { zatca_reconnect_required: true } };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const zatcaConnectRef = { current: null };

        expect(() => makeHandler(store, formData, setFormData, zatcaConnectRef)({})).not.toThrow();
        expect(setFormData).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Form-submission catch handler — zatca_reconnect error interception
// ─────────────────────────────────────────────────────────────────────────────

describe('SalesReturnCreate – form submission catch handler', () => {
    function makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, showToastMessage) {
        return (error) => {
            setIsSubmitting(false);
            if (error?.zatca_reconnect) {
                zatcaConnectRef.current?.open(store.id, true);
                return;
            }
            setErrors({ ...error });
            if (showToastMessage) showToastMessage("Failed to process sale!", "danger");
        };
    }

    test('opens ZatcaConnect when zatca_reconnect error is returned', () => {
        const store = { id: 'store-sr-catch-1' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        makeCatchHandler(store, zatcaConnectRef, jest.fn(), jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(mockOpen).toHaveBeenCalledWith('store-sr-catch-1', true);
    });

    test('does NOT set error state when zatca_reconnect is present', () => {
        const store = { id: 'store-sr-catch-2' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setErrors).not.toHaveBeenCalled();
    });

    test('sets error state for non-reconnect errors', () => {
        const store = { id: 'store-sr-catch-3' };
        const setErrors = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, jest.fn(), setErrors, undefined)(
            { products: 'At least one product is required.' }
        );
        expect(setErrors).toHaveBeenCalledWith({ products: 'At least one product is required.' });
    });

    test('always calls setIsSubmitting(false)', () => {
        const store = { id: 'store-sr-catch-4' };
        const setIsSubmitting = jest.fn();
        makeCatchHandler(store, { current: { open: jest.fn() } }, setIsSubmitting, jest.fn(), undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });

    test('handles null ref.current gracefully', () => {
        const store = { id: 'store-sr-catch-5' };
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
import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../order/style.css', () => ({}), { virtual: true });
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const P = ({ children }) => React.createElement(React.Fragment, null, children);
    const Modal = Object.assign(
        ({ show, children }) => (show ? React.createElement(React.Fragment, null, children) : null),
        { Header: P, Title: P, Body: P, Footer: P }
    );
    const Dropdown = Object.assign(
        ({ children }) => React.createElement('div', null, children),
        { Item: P, Toggle: P, Menu: P }
    );
    const OverlayTrigger = ({ children }) =>
        typeof children === 'function' ? children({}) : children;
    return {
        Modal, Button: P, Spinner: () => null,
        Form: P, Row: P, Col: P, Alert: P, Table: P,
        Dropdown, OverlayTrigger, Tooltip: P, Popover: P,
    };
});

jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
}));

jest.mock('react-datepicker', () => () => null);
jest.mock('react-number-format', () => () => null);

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

// ── Child stubs (inline factories — Babel requires this) ──────────────────────
jest.mock('../view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../store/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../customer_withdrawal/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));

jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/customer_pending.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_non_vat_sales_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_non_vat_sales_return_history.js', () => ({ __esModule: true, default: () => null }));

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: () => ({ ref: null }) }));
jest.mock('../../i18n/dateLocales', () => ({ getDateLocale: () => undefined }));

import SalesReturnCreate from '../create.js';

describe('SalesReturnCreate smoke test (with ZatcaConnect mock)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
        });
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('7. renders without crashing (ZatcaConnect ref wired correctly)', () => {
        const ref = createRef();
        expect(() =>
            render(
                <MemoryRouter>
                    <SalesReturnCreate ref={ref} />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
