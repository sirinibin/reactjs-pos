/**
 * Smoke test for OrderCreate (order/create.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks (CRA transforms CSS → identity but some cause issues) ───────────
jest.mock('../style.css', () => ({}), { virtual: true });
jest.mock('../../tailwind.generated.css', () => ({}), { virtual: true });

// ── bootstrap JS mock ─────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// ── complex child components → lightweight stubs ──────────────────────────────
const Stub = () => null;

jest.mock('../preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../print.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../SalesType1Form', () => ({
    SalesType1Header: Stub,
    SalesType1Body: Stub,
}));

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

jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: Stub }));
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

jest.mock('../../utils/search.js', () => ({
    highlightWords: (text) => text,
}));

jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: () => ({ ref: null }),
}));

jest.mock('../../i18n/dateLocales', () => ({
    getDateLocale: () => undefined,
}));

jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

// ── react-bootstrap-typeahead mock ────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: Stub,
    Menu: Stub,
    MenuItem: Stub,
}));

// ── react-datepicker mock ─────────────────────────────────────────────────────
jest.mock('react-datepicker', () => Stub);

// ── react-number-format mock ──────────────────────────────────────────────────
jest.mock('react-number-format', () => Stub);

// ── react-debounce-input mock ─────────────────────────────────────────────────
jest.mock('react-debounce-input', () => ({ DebounceInput: Stub }));

// ── now import the component ──────────────────────────────────────────────────
import OrderCreate from '../create.js';

describe('OrderCreate smoke test', () => {
    test('renders without crashing', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <OrderCreate />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
