/**
 * Smoke test for QuotationSalesReturnCreate (quotation_sales_return/create.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── bootstrap JS mock ─────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const Passthrough = ({ children }) => children || null;
    const PassthroughDiv = ({ children }) => <div>{children}</div>;
    return {
        Modal: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv,
            Title: PassthroughDiv,
            Body: PassthroughDiv,
            Footer: PassthroughDiv,
        }),
        Button: Passthrough,
        Spinner: () => null,
        Dropdown: Object.assign(PassthroughDiv, {
            Toggle: Passthrough,
            Menu: PassthroughDiv,
            Item: Passthrough,
        }),
        OverlayTrigger: ({ children }) => children,
        Tooltip: PassthroughDiv,
        Form: Object.assign(PassthroughDiv, {
            Group: PassthroughDiv,
            Label: PassthroughDiv,
            Control: () => null,
            Check: () => null,
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
        Card: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv,
            Body: PassthroughDiv,
            Footer: PassthroughDiv,
        }),
        InputGroup: Object.assign(PassthroughDiv, { Text: PassthroughDiv }),
        ListGroup: Object.assign(PassthroughDiv, { Item: Passthrough }),
        Collapse: Passthrough,
        Accordion: Object.assign(PassthroughDiv, {
            Item: PassthroughDiv,
            Header: PassthroughDiv,
            Body: PassthroughDiv,
        }),
        Stack: PassthroughDiv,
        Image: () => null,
        ProgressBar: () => null,
        CloseButton: () => null,
        Offcanvas: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv,
            Title: PassthroughDiv,
            Body: PassthroughDiv,
        }),
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

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── complex child components → lightweight stubs ──────────────────────────────
const Stub = () => null;

jest.mock('../view.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../store/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../product/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../customer_withdrawal/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation/create.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/products.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customer_pending.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: () => ({ ref: null }),
}));

jest.mock('../../utils/numberUtils.js', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

// ── now import the component ──────────────────────────────────────────────────
import QuotationSalesReturnCreate from '../create.js';

describe('QuotationSalesReturnCreate smoke test', () => {
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

    test('renders without crashing inside MemoryRouter', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <QuotationSalesReturnCreate />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
