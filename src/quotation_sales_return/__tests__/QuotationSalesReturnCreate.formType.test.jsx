/**
 * Tests for the fix that prevents the customer section from rendering twice
 * in Quotation Sales Return type-2 form.
 *
 * Root cause: a generic customer section (for type-1) always rendered; the
 * type-2 form also renders its own customer section inside <form>, causing
 * duplication. Fix: gate the generic section with `formType !== 'type2'`.
 *
 * formType is read from localStorage('quotation_sales_return_form_type').
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── bootstrap JS ─────────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-bootstrap: Modal renders children always (to expose inner DOM) ─────
jest.mock('react-bootstrap', () => {
    const Passthrough    = ({ children }) => children || null;
    const PassthroughDiv = ({ children }) => <div>{children}</div>;
    return {
        Modal: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv,
            Title:  PassthroughDiv,
            Body:   PassthroughDiv,
            Footer: PassthroughDiv,
        }),
        Button:  Passthrough,
        Spinner: () => null,
        Dropdown: Object.assign(PassthroughDiv, {
            Toggle: Passthrough,
            Menu:   PassthroughDiv,
            Item:   Passthrough,
        }),
        OverlayTrigger: ({ children }) => children,
        Tooltip: PassthroughDiv,
        Form: Object.assign(PassthroughDiv, {
            Group:   PassthroughDiv,
            Label:   PassthroughDiv,
            Control: () => null,
            Check:   () => null,
        }),
        Row: PassthroughDiv,
        Col: PassthroughDiv,
        Table: PassthroughDiv,
        Alert: PassthroughDiv,
        Badge: Passthrough,
        Nav: Object.assign(PassthroughDiv, { Item: PassthroughDiv, Link: Passthrough }),
        Tab: Object.assign(PassthroughDiv, { Pane: PassthroughDiv }),
        Tabs: PassthroughDiv,
        Container: PassthroughDiv,
        Card: Object.assign(PassthroughDiv, { Header: PassthroughDiv, Body: PassthroughDiv, Footer: PassthroughDiv }),
        InputGroup: Object.assign(PassthroughDiv, { Text: PassthroughDiv }),
        ListGroup: Object.assign(PassthroughDiv, { Item: Passthrough }),
        Collapse: Passthrough,
        Accordion: Object.assign(PassthroughDiv, { Item: PassthroughDiv, Header: PassthroughDiv, Body: PassthroughDiv }),
        Stack: PassthroughDiv,
        Image: () => null,
        ProgressBar: () => null,
        CloseButton: () => null,
        Offcanvas: Object.assign(PassthroughDiv, { Header: PassthroughDiv, Title: PassthroughDiv, Body: PassthroughDiv }),
        Popover: Object.assign(PassthroughDiv, { Header: PassthroughDiv, Body: PassthroughDiv }),
        ToggleButton: Passthrough,
        ToggleButtonGroup: PassthroughDiv,
    };
});

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// ── date / number ─────────────────────────────────────────────────────────────
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
jest.mock('../../utils/numberUtils.js',   () => ({ trimTo2Decimals: (v) => String(v), trimTo8Decimals: (v) => String(v) }));

import QuotationSalesReturnCreate from '../create.js';

function setup() {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
}

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

describe('QuotationSalesReturnCreate — customer section duplication fix', () => {
    test('formType=type1: generic customer section (phone input) is rendered', () => {
        setup();
        localStorage.setItem('quotation_sales_return_form_type', 'type1');
        render(<MemoryRouter><QuotationSalesReturnCreate /></MemoryRouter>);
        // The generic section (type-1 only) contains a phone input with this id
        expect(document.getElementById('quotationsales_return_phone')).not.toBeNull();
    });

    test('formType=type2: generic customer section is hidden (no phone input duplication)', () => {
        setup();
        localStorage.setItem('quotation_sales_return_form_type', 'type2');
        render(<MemoryRouter><QuotationSalesReturnCreate /></MemoryRouter>);
        // When type2, the generic section must NOT render — its phone input absent
        expect(document.getElementById('quotationsales_return_phone')).toBeNull();
    });

    test('formType=type1 (default): no localStorage key defaults to type1 behaviour', () => {
        setup();
        localStorage.removeItem('quotation_sales_return_form_type');
        render(<MemoryRouter><QuotationSalesReturnCreate /></MemoryRouter>);
        expect(document.getElementById('quotationsales_return_phone')).not.toBeNull();
    });

    test('formType=type2: component renders without crashing', () => {
        setup();
        localStorage.setItem('quotation_sales_return_form_type', 'type2');
        expect(() =>
            render(<MemoryRouter><QuotationSalesReturnCreate /></MemoryRouter>)
        ).not.toThrow();
    });

    test('formType=type1: component renders without crashing', () => {
        setup();
        localStorage.setItem('quotation_sales_return_form_type', 'type1');
        expect(() =>
            render(<MemoryRouter><QuotationSalesReturnCreate /></MemoryRouter>)
        ).not.toThrow();
    });
});
