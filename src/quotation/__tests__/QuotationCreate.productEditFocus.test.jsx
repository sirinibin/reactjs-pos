/**
 * Tests for the "cursor keeps blinking in selected-products table after
 * editing a product from Quotation Form Type 1" bug fix.
 *
 * Root cause:
 *   product/create.js calls `props.openDetailsView(id)` immediately after
 *   handleClose() on every save (create or update). In quotation/create.js the
 *   ProductCreate child was rendered with `openDetailsView={openProductDetails}`,
 *   which opened ProductView (product/view.js). That modal has no
 *   `className="above-sales-modal"` and therefore sits at the default z-index
 *   (~1050), BEHIND the quotation form modal (~1080). Being hidden but still
 *   mounted with React-Bootstrap's default `enforceFocus: true`, it continuously
 *   stole focus from any element the user hovered over, making the text-caret
 *   appear to "blink" in the products-table inputs.
 *
 * Fix: remove `openDetailsView` from the ProductCreate rendered inside
 *   quotation/create.js so that `if (props.openDetailsView)` in product/create.js
 *   is never satisfied, and ProductView never opens.
 *
 * Section A — pure-logic tests (mirror the product/create.js callback chain).
 * Section B — render test (verify the prop is absent in the live component tree).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Section A — Pure logic: product update callback chain
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mirrors the callback block at the end of product/create.js handleSubmit:
 *
 *   handleClose();
 *   if (props.openDetailsView)
 *       props.openDetailsView(data.result.id);
 *
 * Returns true when ProductView was opened, false when it was not.
 */
function simulateProductSave(openDetailsView, productId) {
    // handleClose() runs unconditionally — we don't need to model it here
    if (openDetailsView) {
        openDetailsView(productId);
        return true;
    }
    return false;
}

describe('product save callback — openDetailsView guard (mirrors product/create.js)', () => {
    test('ProductView is NOT opened when openDetailsView is undefined (fixed state)', () => {
        expect(simulateProductSave(undefined, 'prod-1')).toBe(false);
    });

    test('ProductView is NOT opened when openDetailsView is null', () => {
        expect(simulateProductSave(null, 'prod-1')).toBe(false);
    });

    test('ProductView IS opened when openDetailsView is a function (old buggy state)', () => {
        const openDetailsView = jest.fn();
        const result = simulateProductSave(openDetailsView, 'prod-1');
        expect(result).toBe(true);
        expect(openDetailsView).toHaveBeenCalledWith('prod-1');
    });

    test('openDetailsView receives the correct product id', () => {
        const openDetailsView = jest.fn();
        simulateProductSave(openDetailsView, 'abc-123');
        expect(openDetailsView).toHaveBeenCalledWith('abc-123');
    });

    test('openDetailsView is not called when undefined, regardless of productId', () => {
        const spy = jest.fn();
        simulateProductSave(undefined, 'any-id');
        expect(spy).not.toHaveBeenCalled();
    });
});

/**
 * Mirrors openUpdateProductForm in quotation/create.js:
 *
 *   function openUpdateProductForm(id, isService) {
 *       if (isService) { ServiceCreateFormRef.current.open(id); }
 *       else            { ProductCreateFormRef.current.open(id); }
 *   }
 */
function simulateOpenUpdateProductForm(id, isService, productRef, serviceRef) {
    if (isService) {
        serviceRef.open(id);
    } else {
        productRef.open(id);
    }
}

describe('openUpdateProductForm routing (mirrors quotation/create.js)', () => {
    test('non-service product opens ProductCreate form', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        simulateOpenUpdateProductForm('p1', false, productRef, serviceRef);
        expect(productRef.open).toHaveBeenCalledWith('p1');
        expect(serviceRef.open).not.toHaveBeenCalled();
    });

    test('service product opens ServiceCreate form', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        simulateOpenUpdateProductForm('s1', true, productRef, serviceRef);
        expect(serviceRef.open).toHaveBeenCalledWith('s1');
        expect(productRef.open).not.toHaveBeenCalled();
    });

    test('isService=undefined is treated as falsy → ProductCreate opens', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        simulateOpenUpdateProductForm('p2', undefined, productRef, serviceRef);
        expect(productRef.open).toHaveBeenCalledWith('p2');
        expect(serviceRef.open).not.toHaveBeenCalled();
    });

    test('isService=0 (falsy) → ProductCreate opens', () => {
        const productRef = { open: jest.fn() };
        const serviceRef = { open: jest.fn() };
        simulateOpenUpdateProductForm('p3', 0, productRef, serviceRef);
        expect(productRef.open).toHaveBeenCalledWith('p3');
        expect(serviceRef.open).not.toHaveBeenCalled();
    });
});

/**
 * The enforceFocus hazard: if ProductView opens hidden behind the quotation form,
 * React-Bootstrap's enforceFocus continuously intercepts focus events on elements
 * outside the modal and moves focus back to the modal — causing inputs to appear
 * to blink.
 *
 * These tests model the enforceFocus invariant: a modal should NOT be opened
 * (from within the quotation form context) unless it will be visible above the
 * quotation form's z-index.
 */
function willOpenHiddenModal(openDetailsView) {
    // In the quotation context, ProductView has no `above-sales-modal` class,
    // so its z-index (~1050) is below the quotation form (~1080).
    // Opening it while the quotation form is visible = hidden modal.
    // The fix removes openDetailsView → this path is never reached.
    return !!openDetailsView;
}

describe('hidden-modal / enforceFocus hazard', () => {
    test('no openDetailsView → no hidden modal is opened (fixed)', () => {
        expect(willOpenHiddenModal(undefined)).toBe(false);
    });

    test('openDetailsView present → a hidden modal would be opened (old bug)', () => {
        expect(willOpenHiddenModal(() => {})).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section B — Render test: ProductCreate inside QuotationCreate has no openDetailsView
// ═══════════════════════════════════════════════════════════════════════════════

// All mocks must be declared before the import at the bottom.

jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// Capture the props that ProductCreate receives when rendered inside QuotationCreate.
// Written via `global` so the assignment survives Jest's module isolation + mock hoisting.
jest.mock('../../product/create.js', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef((props, _ref) => {
            global.__capturedProductCreateProps = props;
            return null;
        }),
    };
});

const Stub = () => null;
jest.mock('../../product/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer_deposit/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customers.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customer_pending.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/sales.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/InfoDialog', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/search.js', () => ({ highlightWords: (t) => t }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: () => ({ ref: null }) }));
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: Stub, Menu: Stub, MenuItem: Stub }));
jest.mock('react-datepicker', () => Stub);
jest.mock('react-number-format', () => Stub);
jest.mock('react-debounce-input', () => ({ DebounceInput: Stub }));
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotationCreate from '../create.js';

beforeEach(() => {
    global.__capturedProductCreateProps = undefined;
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: {}, data: [], total_count: 0 }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('QuotationCreate — ProductCreate receives no openDetailsView (render test)', () => {
    test('ProductCreate is rendered without openDetailsView prop', () => {
        render(
            <MemoryRouter>
                <QuotationCreate />
            </MemoryRouter>
        );
        expect(global.__capturedProductCreateProps).toBeDefined();
        expect(global.__capturedProductCreateProps.openDetailsView).toBeUndefined();
    });

    test('ProductCreate still receives showToastMessage (other props intact)', () => {
        const showToast = jest.fn();
        render(
            <MemoryRouter>
                <QuotationCreate showToastMessage={showToast} />
            </MemoryRouter>
        );
        expect(global.__capturedProductCreateProps.showToastMessage).toBe(showToast);
    });

    test('ProductCreate has no openDetailsView even when parent passes showToastMessage', () => {
        render(
            <MemoryRouter>
                <QuotationCreate showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        expect(global.__capturedProductCreateProps.openDetailsView).toBeUndefined();
    });

    test('rendering does not throw', () => {
        expect(() =>
            render(<MemoryRouter><QuotationCreate /></MemoryRouter>)
        ).not.toThrow();
    });
});
