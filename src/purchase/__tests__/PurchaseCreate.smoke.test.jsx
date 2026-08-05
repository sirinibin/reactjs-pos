/**
 * Smoke test for PurchaseCreate (purchase/create.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/create.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../vendor/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../purchase_return/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer_withdrawal/create.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/vendors.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/vendor_pending.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: Stub }));

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

jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

jest.mock('../../i18n/dateLocales', () => ({
    getDateLocale: () => undefined,
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
import PurchaseCreate from '../create.js';

beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('PurchaseCreate smoke test', () => {
    test('renders without crashing', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <PurchaseCreate />
                </MemoryRouter>
            )
        ).not.toThrow();
    });

    test('renders without crashing in type3 form mode (info column Dropdown + stock OverlayTrigger)', () => {
        localStorage.setItem('purchase_form_type', 'type3');
        expect(() =>
            render(
                <MemoryRouter>
                    <PurchaseCreate />
                </MemoryRouter>
            )
        ).not.toThrow();
        localStorage.removeItem('purchase_form_type');
    });
});
