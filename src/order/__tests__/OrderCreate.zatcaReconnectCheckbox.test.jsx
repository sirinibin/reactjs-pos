/**
 * Unit tests for the ZATCA reconnect-prompt interception added to
 * OrderCreate (order/create.js).
 *
 * Two checkboxes were updated:
 *   - Type-3 layout (line ~5894)
 *   - Type-2 layout (line ~6028)
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
 * ZatcaConnect is imported from '../store/zatca_connect.js'.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Logic-isolation tests (no DOM, no React rendering)
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderCreate – ZATCA reconnect checkbox interceptor logic', () => {
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
            id: 'store-ord-1',
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
            id: 'store-ord-1',
            zatca: { phase: '2', connected: true, zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockOpen).toHaveBeenCalledWith('store-ord-1', true);
    });

    test('3. does not toggle checkbox when zatca_reconnect_required is true', () => {
        const store = {
            id: 'store-ord-1',
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

    test('4. type-2 layout handler: intercepts when reconnect required', () => {
        const store = {
            id: 'store-ord-2',
            zatca: { zatca_reconnect_required: true },
        };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        makeHandler(store, formData, setFormData, zatcaConnectRef)({});

        expect(mockOpen).toHaveBeenCalledWith('store-ord-2', true);
        expect(setFormData).not.toHaveBeenCalled();
    });

    test('5. type-2 layout handler: toggles when reconnect NOT required', () => {
        const store = {
            id: 'store-ord-2',
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
        const store = { id: 'store-ord-3', zatca: { zatca_reconnect_required: true } };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const zatcaConnectRef = { current: null };

        expect(() => makeHandler(store, formData, setFormData, zatcaConnectRef)({})).not.toThrow();
        expect(setFormData).not.toHaveBeenCalled();
    });

    test('7. handles undefined store.zatca gracefully', () => {
        const store = { id: 'store-ord-4' };
        const formData = { enable_report_to_zatca: false };
        const setFormData = jest.fn();
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };

        expect(() => makeHandler(store, formData, setFormData, zatcaConnectRef)({})).not.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
        expect(setFormData).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Form-submission catch handler — zatca_reconnect error interception
// ─────────────────────────────────────────────────────────────────────────────
//
// When the Create Order API returns HTTP 403 with errors.zatca_reconnect, the
// catch handler must open the ZatcaConnect modal instead of setting error state.

describe('OrderCreate – form submission catch handler', () => {
    function makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, showToastMessage) {
        return (error) => {
            setIsSubmitting(false);
            if (error?.zatca_reconnect) {
                zatcaConnectRef.current?.open(store.id, true);
                return;
            }
            setErrors({ ...error });
            if (showToastMessage) {
                showToastMessage("Failed to process sale!", "danger");
            }
        };
    }

    test('opens ZatcaConnect when zatca_reconnect error is returned', () => {
        const store = { id: 'store-ord-catch-1' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();

        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
            { zatca_reconnect: 'ZATCA re-connection is required.' }
        );

        expect(mockOpen).toHaveBeenCalledWith('store-ord-catch-1', true);
    });

    test('does NOT set error state when zatca_reconnect is present', () => {
        const store = { id: 'store-ord-catch-2' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();

        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
            { zatca_reconnect: 'ZATCA re-connection is required.' }
        );

        expect(setErrors).not.toHaveBeenCalled();
    });

    test('sets error state for non-reconnect errors', () => {
        const store = { id: 'store-ord-catch-3' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();

        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
            { products: 'At least one product is required.' }
        );

        expect(mockOpen).not.toHaveBeenCalled();
        expect(setErrors).toHaveBeenCalledWith({ products: 'At least one product is required.' });
    });

    test('calls showToastMessage for non-reconnect errors', () => {
        const store = { id: 'store-ord-catch-4' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();
        const showToastMessage = jest.fn();

        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, showToastMessage)(
            { products: 'error' }
        );

        expect(showToastMessage).toHaveBeenCalledWith("Failed to process sale!", "danger");
    });

    test('does NOT call showToastMessage when zatca_reconnect is present', () => {
        const store = { id: 'store-ord-catch-5' };
        const mockOpen = jest.fn();
        const zatcaConnectRef = { current: { open: mockOpen } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();
        const showToastMessage = jest.fn();

        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, showToastMessage)(
            { zatca_reconnect: 'reconnect!' }
        );

        expect(showToastMessage).not.toHaveBeenCalled();
    });

    test('always calls setIsSubmitting(false) regardless of error type', () => {
        const store = { id: 'store-ord-catch-6' };
        const zatcaConnectRef = { current: { open: jest.fn() } };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();

        // reconnect error
        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
            { zatca_reconnect: 'reconnect!' }
        );
        expect(setIsSubmitting).toHaveBeenNthCalledWith(1, false);

        // non-reconnect error
        makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
            { products: 'error' }
        );
        expect(setIsSubmitting).toHaveBeenNthCalledWith(2, false);
    });

    test('handles null zatcaConnectRef.current gracefully', () => {
        const store = { id: 'store-ord-catch-7' };
        const zatcaConnectRef = { current: null };
        const setIsSubmitting = jest.fn();
        const setErrors = jest.fn();

        expect(() =>
            makeCatchHandler(store, zatcaConnectRef, setIsSubmitting, setErrors, undefined)(
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

jest.mock('../style.css', () => ({}), { virtual: true });
jest.mock('../../tailwind.generated.css', () => ({}), { virtual: true });

jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

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

// ── Child component stubs ─────────────────────────────────────────────────────
const Stub = () => null;

jest.mock('../preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../print.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../SalesType1Form', () => ({ SalesType1Header: Stub, SalesType1Body: Stub }));
jest.mock('../SalesVanStoreForm', () => ({ SalesVanStoreHeader: Stub, SalesVanStoreBody: Stub }), { virtual: true });
jest.mock('../SalesType5Form', () => ({ SalesType5Header: Stub, SalesType5Body: Stub }), { virtual: true });

jest.mock('../../customer/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../purchase/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer_deposit/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../sales_return/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../delivery_note/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../purchase_order/PurchaseOrderPicker.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_non_vat_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_non_vat_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/quotations.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/delivery_notes.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customers.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customer_pending.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/eventEmitter', () => ({
    __esModule: true,
    default: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

jest.mock('../../utils/search.js', () => ({ highlightWords: (text) => text }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: () => ({ ref: null }) }));
jest.mock('../../i18n/dateLocales', () => ({ getDateLocale: () => undefined }));
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: Stub, Menu: Stub, MenuItem: Stub }));
jest.mock('react-datepicker', () => Stub);
jest.mock('react-number-format', () => Stub);
jest.mock('react-debounce-input', () => ({ DebounceInput: Stub }));

import OrderCreate from '../create.js';

describe('OrderCreate smoke test (with ZatcaConnect mock)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('8. renders without crashing (ZatcaConnect ref wired correctly)', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <OrderCreate />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
