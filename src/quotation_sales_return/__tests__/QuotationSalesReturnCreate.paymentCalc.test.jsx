/**
 * Tests for the payment auto-calculation fix in reCalculate().
 *
 * Bug: In CREATE mode, payment was capped at quotation.total_payment_received
 * (which stored the pre-VAT amount) even when net_total (VAT-inclusive) was
 * higher, causing the wrong amount to auto-populate.
 * Fix: Removed the total_payment_received cap from the CREATE-flow branch.
 *
 * All form types (type1, type2, type3) share the same reCalculate function,
 * so one fix covers all three. The type-specific tests below confirm this.
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── bootstrap ────────────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-bootstrap (render children always so inner DOM is testable) ────────
jest.mock('react-bootstrap', () => {
    const Passthrough    = ({ children }) => children || null;
    const PassthroughDiv = ({ children }) => <div>{children}</div>;
    return {
        Modal: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv, Title: PassthroughDiv,
            Body: PassthroughDiv,  Footer: PassthroughDiv,
        }),
        Button: Passthrough, Spinner: () => null,
        Dropdown: Object.assign(PassthroughDiv, {
            Toggle: Passthrough, Menu: PassthroughDiv, Item: Passthrough,
        }),
        OverlayTrigger: ({ children }) => children,
        Tooltip: PassthroughDiv,
        Form: Object.assign(PassthroughDiv, {
            Group: PassthroughDiv, Label: PassthroughDiv,
            Control: () => null,  Check: () => null,
        }),
        Row: PassthroughDiv, Col: PassthroughDiv, Table: PassthroughDiv,
        Alert: PassthroughDiv, Badge: Passthrough,
        Nav: Object.assign(PassthroughDiv, { Item: PassthroughDiv, Link: Passthrough }),
        Tab: Object.assign(PassthroughDiv, { Pane: PassthroughDiv }),
        Tabs: PassthroughDiv, Container: PassthroughDiv,
        Card: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv, Body: PassthroughDiv, Footer: PassthroughDiv,
        }),
        InputGroup: Object.assign(PassthroughDiv, { Text: PassthroughDiv }),
        ListGroup: Object.assign(PassthroughDiv, { Item: Passthrough }),
        Collapse: Passthrough,
        Accordion: Object.assign(PassthroughDiv, {
            Item: PassthroughDiv, Header: PassthroughDiv, Body: PassthroughDiv,
        }),
        Stack: PassthroughDiv, Image: () => null, ProgressBar: () => null,
        CloseButton: () => null,
        Offcanvas: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv, Title: PassthroughDiv, Body: PassthroughDiv,
        }),
        Popover: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv, Body: PassthroughDiv,
        }),
        ToggleButton: Passthrough, ToggleButtonGroup: PassthroughDiv,
    };
});

// ── other deps ───────────────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable:  ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable:  ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-number-format', () => () => null);

// ── child component stubs ─────────────────────────────────────────────────────
const Stub = () => null;
jest.mock('../view.js',                                                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../store/create.js',                                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',                                    () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js',                                        () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js',                                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js',                                      () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js',                                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/view.js',                                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js',                                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/view.js',                                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer_withdrawal/create.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation/create.js',                                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_history.js',                              () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js',                        () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js',                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js',                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js',              () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js',                    () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js',       () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js',                () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js',                                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js',                                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customer_pending.js',                             () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell.js',                           () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal.js',                             () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js',                              () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/queryUtils.js',    () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js',    () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: () => ({ ref: null }) }));
jest.mock('../../utils/numberUtils.js',   () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

import QuotationSalesReturnCreate from '../create.js';

// ── shared product fixture ────────────────────────────────────────────────────
const PRODUCT = {
    product_id: 'prod-001',
    name: 'Test Product',
    unit_price: 1100,
    unit_price_with_vat: 1100,
    quantity: 1,
    quantity_returned: 0,
    selected: false,
    unit_discount: 0,
    unit_discount_with_vat: 0,
};

/**
 * Build a fetch mock that handles all endpoints used by the component.
 *
 * @param {object} opts
 * @param {number}   opts.netTotal               - what calculate-net-total returns
 * @param {number}   opts.totalPaymentReceived   - included in the quotation response
 * @param {number}   opts.cashDiscount           - quotation.cash_discount
 * @param {string}   opts.editPaymentStatus      - payment_status in the existing QSR (EDIT mode)
 * @param {Array}    opts.editPayments           - payments array in the existing QSR (EDIT mode)
 */
function makeFetchMock({
    netTotal = 1265,
    totalPaymentReceived = 1100,
    cashDiscount = 0,
    editPaymentStatus = 'paid',
    editPayments = [{ amount: 500, date_str: '2026-01-01', method: 'cash', deleted: false }],
} = {}) {
    return jest.fn().mockImplementation((url) => {
        // calculate-net-total
        if (url.includes('calculate-net-total')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({
                    result: {
                        net_total: netTotal,
                        total: 1100,
                        total_with_vat: netTotal,
                        vat_price: netTotal - 1100,
                        rounding_amount: 0,
                        products: [{ product_id: 'prod-001', unit_discount: 0, unit_discount_with_vat: 0 }],
                    },
                }),
            });
        }
        // existing QSR (EDIT mode): /v1/quotation-sales-return/<id>
        if (url.includes('/v1/quotation-sales-return/') && !url.includes('calculate')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({
                    result: {
                        id: 'qsr-001',
                        code: 'QSR-001',
                        payment_status: editPaymentStatus,
                        payments: editPayments,
                        products: [{ ...PRODUCT, selected: true }],
                        vat_percent: 15,
                        discount: 0,
                        cash_discount: cashDiscount,
                    },
                }),
            });
        }
        // quotation: /v1/quotation/<id>
        if (url.includes('/v1/quotation/')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({
                    result: {
                        id: 'qtn-001',
                        code: 'QTN-001',
                        products: [PRODUCT],
                        total_payment_received: totalPaymentReceived,
                        payment_status: 'paid',
                        cash_discount: cashDiscount,
                        return_cash_discount: 0,
                        vat_percent: 15,
                        discount: 0,
                        discount_percent: 0,
                        shipping_handling_fees: 0,
                        auto_rounding_amount: false,
                    },
                }),
            });
        }
        // everything else (warehouse, customer, product, etc.)
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {} }),
        });
    });
}

/** Render the component with a forwarded ref inside a MemoryRouter. */
function setup() {
    const ref = React.createRef();
    render(
        <MemoryRouter>
            <QuotationSalesReturnCreate ref={ref} />
        </MemoryRouter>
    );
    return ref;
}

/** Read the numeric value of the first payment amount input. */
function paymentValue() {
    const el = document.getElementById('quotationsales_return_payment_amount0');
    return el ? Number(el.value) : null;
}

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE flow  (open called with no existing QSR id)
// ─────────────────────────────────────────────────────────────────────────────
describe('CREATE flow — reCalculate payment auto-calculation', () => {

    test('sets payment to net_total (VAT-inclusive), not capped at total_payment_received', async () => {
        // net_total = 1265 (with VAT), total_payment_received = 1100 (without VAT)
        // OLD BUG: payment was capped to 1100; FIXED: payment = 1265
        global.fetch = makeFetchMock({ netTotal: 1265, totalPaymentReceived: 1100 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1265);
        });
    });

    test('net_total = 0 (no products selected) → payment = 0', async () => {
        global.fetch = makeFetchMock({ netTotal: 0, totalPaymentReceived: 0 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            const el = document.getElementById('quotationsales_return_payment_amount0');
            expect(el).not.toBeNull();
            expect(paymentValue()).toBe(0);
        });
    });

    test('cash_discount subtracted from net_total (net_total > cash_discount)', async () => {
        // net_total = 1265, cash_discount = 100 → payment = 1165
        global.fetch = makeFetchMock({ netTotal: 1265, cashDiscount: 100, totalPaymentReceived: 1265 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1165);
        });
    });

    test('cash_discount ≥ net_total → payment = net_total (no negative subtraction)', async () => {
        // net_total = 100, cash_discount = 200 → 100 is NOT > 200, so no subtraction
        global.fetch = makeFetchMock({ netTotal: 100, cashDiscount: 200, totalPaymentReceived: 100 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(100);
        });
    });

    test('zero cash_discount → payment = net_total unchanged', async () => {
        global.fetch = makeFetchMock({ netTotal: 1265, cashDiscount: 0, totalPaymentReceived: 1265 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1265);
        });
    });

    test('net_total equals total_payment_received → no cap needed, payment = net_total', async () => {
        global.fetch = makeFetchMock({ netTotal: 1265, totalPaymentReceived: 1265 });
        const ref = setup();

        act(() => { ref.current.open(undefined, 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1265);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT flow  (open called with an existing QSR id)
// ─────────────────────────────────────────────────────────────────────────────
describe('EDIT flow — reCalculate payment auto-calculation', () => {

    test('payment_status = "paid" → payment auto-updates to net_total', async () => {
        global.fetch = makeFetchMock({
            netTotal: 1265,
            editPaymentStatus: 'paid',
            editPayments: [{ amount: 1100, date_str: '2026-01-01', method: 'cash', deleted: false }],
        });
        const ref = setup();

        act(() => { ref.current.open('qsr-001', 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1265);
        });
    });

    test('payment_status = "not_paid" → existing payment amount preserved, not overwritten', async () => {
        global.fetch = makeFetchMock({
            netTotal: 1265,
            editPaymentStatus: 'not_paid',
            editPayments: [{ amount: 800, date_str: '2026-01-01', method: 'cash', deleted: false }],
        });
        const ref = setup();

        act(() => { ref.current.open('qsr-001', 'qtn-001'); });

        await waitFor(() => {
            // 800 should be preserved since payment_status !== 'paid'
            expect(paymentValue()).toBe(800);
        });
    });

    test('payment_status = "paid_partially" → existing payment preserved', async () => {
        global.fetch = makeFetchMock({
            netTotal: 1265,
            editPaymentStatus: 'paid_partially',
            editPayments: [{ amount: 600, date_str: '2026-01-01', method: 'cash', deleted: false }],
        });
        const ref = setup();

        act(() => { ref.current.open('qsr-001', 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(600);
        });
    });

    test('multiple payment rows (length > 1) → no row is auto-overwritten', async () => {
        global.fetch = makeFetchMock({
            netTotal: 1265,
            editPaymentStatus: 'paid',
            editPayments: [
                { amount: 700, date_str: '2026-01-01', method: 'cash',   deleted: false },
                { amount: 565, date_str: '2026-01-01', method: 'credit', deleted: false },
            ],
        });
        const ref = setup();

        act(() => { ref.current.open('qsr-001', 'qtn-001'); });

        await waitFor(() => {
            const first  = document.getElementById('quotationsales_return_payment_amount0');
            const second = document.getElementById('quotationsales_return_payment_amount1');
            expect(first).not.toBeNull();
            // Neither row should be overwritten by auto-calculation
            expect(Number(first.value)).toBe(700);
            if (second) expect(Number(second.value)).toBe(565);
        });
    });

    test('payment_status = "paid" with cash_discount → payment = net_total - cash_discount', async () => {
        global.fetch = makeFetchMock({
            netTotal: 1265,
            cashDiscount: 50,
            editPaymentStatus: 'paid',
            editPayments: [{ amount: 1100, date_str: '2026-01-01', method: 'cash', deleted: false }],
        });
        const ref = setup();

        act(() => { ref.current.open('qsr-001', 'qtn-001'); });

        await waitFor(() => {
            expect(paymentValue()).toBe(1215);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form type coverage  (type1, type2, type3 all use the same reCalculate)
// ─────────────────────────────────────────────────────────────────────────────
describe.each([['type1'], ['type2'], ['type3']])(
    'Form %s — payment auto-calculation uses net_total',
    (formType) => {
        beforeEach(() => {
            localStorage.setItem('quotation_sales_return_form_type', formType);
        });

        test(`${formType}: payment = net_total (not capped at total_payment_received)`, async () => {
            global.fetch = makeFetchMock({ netTotal: 1265, totalPaymentReceived: 1100 });
            const ref = setup();

            act(() => { ref.current.open(undefined, 'qtn-001'); });

            await waitFor(() => {
                expect(paymentValue()).toBe(1265);
            });
        });

        test(`${formType}: cash_discount is deducted from payment`, async () => {
            global.fetch = makeFetchMock({ netTotal: 1265, cashDiscount: 100, totalPaymentReceived: 1265 });
            const ref = setup();

            act(() => { ref.current.open(undefined, 'qtn-001'); });

            await waitFor(() => {
                expect(paymentValue()).toBe(1165);
            });
        });
    }
);
