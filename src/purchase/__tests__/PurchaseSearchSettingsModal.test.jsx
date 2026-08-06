/**
 * Regression tests for the Product/Vendor Search Settings modal fix in
 * purchase/create.js (Purchase form, all layouts: type1, type2, type3).
 *
 * Bug: clicking the "gear" settings icon inside the product/vendor search
 * result dropdown opened the TableSettingsModal, but it rendered BEHIND the
 * purchase form because:
 *   1. The search dropdown (react-bootstrap-typeahead Menu) stayed open on
 *      top of the modal.
 *   2. The whole purchase form renders inside a Modal with class
 *      `purchase-create-wrap` (z-index 1088 !important, see App.css), while
 *      TableSettingsModal used react-bootstrap's default (lower) z-index.
 *
 * Fix under test:
 *   - Gear icon onClick now calls setOpen{Product,Vendor}SearchResult(false)
 *     before opening the settings modal, closing the dropdown.
 *   - Both TableSettingsModal instances (Product/Vendor Search Settings) now
 *     receive className="purchase-search-settings-modal-wrap", matched by a
 *     CSS rule in App.css that raises their z-index (1150) above every other
 *     stacking context used in the app, including nested purchase forms.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_non_vat_sales_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_non_vat_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/vendors.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/vendor_pending.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: Stub }));

jest.mock('../../utils/amount.js', () => {
    const ReactLib = require('react');
    return {
        __esModule: true,
        default: ({ amount }) => ReactLib.createElement('span', null, String(amount ?? '')),
    };
});

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

// ── react-datepicker / react-number-format / react-debounce-input ─────────────
jest.mock('react-datepicker', () => Stub);
jest.mock('react-number-format', () => Stub);
jest.mock('react-debounce-input', () => ({ DebounceInput: Stub }));

// ── react-bootstrap-typeahead: functional mock that actually exercises the
//    component's `renderMenu` render-prop (unlike a plain Stub), so the gear
//    icon and its onClick handler are real, unmocked code from create.js. ────
jest.mock('react-bootstrap-typeahead', () => {
    const ReactLib = require('react');
    const Typeahead = ReactLib.forwardRef((props, _ref) => {
        const { id, open, onInputChange, renderMenu, options } = props;
        return ReactLib.createElement(
            'div',
            { 'data-testid': `typeahead-wrapper-${id}` },
            ReactLib.createElement('input', {
                'data-testid': `typeahead-input-${id}`,
                onChange: (e) => onInputChange && onInputChange(e.target.value, e),
            }),
            ReactLib.createElement('div', {
                'data-testid': `typeahead-open-${id}`,
                'data-open': String(!!open),
            }),
            open && typeof renderMenu === 'function'
                ? renderMenu(options || [], { style: {} }, { text: '', activeIndex: -1 })
                : null
        );
    });
    Typeahead.displayName = 'Typeahead';
    return {
        Typeahead,
        Menu: ({ children }) => ReactLib.createElement('div', { 'data-testid': 'rbt-menu' }, children),
        MenuItem: ({ children }) => ReactLib.createElement('div', null, children),
    };
});

// ── TableSettingsModal: lightweight mock that surfaces the props under test
//    (show / title / className) instead of the full Modal + DnD internals. ──
jest.mock('../../utils/TableSettingsModal.js', () => {
    const ReactLib = require('react');
    return {
        __esModule: true,
        default: ({ show, title, className }) =>
            show
                ? ReactLib.createElement(
                    'div',
                    { 'data-testid': 'table-settings-modal', className },
                    title
                )
                : null,
    };
});

import PurchaseCreate from '../create.js';

async function flushPromises() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

/** Mocks fetch so the product/vendor search endpoints return a real match,
 *  while every other endpoint gets a harmless empty object (mirrors the
 *  approach used by PurchaseCreate.smoke.test.jsx). */
function mockFetch({ productResult = [], vendorResult = [] } = {}) {
    global.fetch = jest.fn((url) => {
        if (typeof url === 'string' && url.includes('/v1/product?')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: productResult }) });
        }
        if (typeof url === 'string' && url.includes('/v1/vendor?')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ result: vendorResult }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
}

async function openSearchDropdown(inputTestId, searchText) {
    const input = screen.getByTestId(inputTestId);
    fireEvent.change(input, { target: { value: searchText } });
    await act(async () => {
        jest.advanceTimersByTime(400);
    });
    await flushPromises();
}

/** PurchaseCreate renders its Modal with `show={false}` until the parent
 *  calls the imperative `.open()` handle (this is how it's used in the real
 *  app, e.g. from purchase/index.js). Render the component and open it so
 *  the actual form body (with the search Typeaheads) mounts. */
async function renderAndOpenPurchaseCreate() {
    const ref = React.createRef();
    render(
        <MemoryRouter>
            <PurchaseCreate ref={ref} />
        </MemoryRouter>
    );
    await act(async () => {
        ref.current.open();
    });
    await flushPromises();
    return ref;
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.removeItem('purchase_form_type');
});

describe('Purchase form — Product/Vendor Search Settings modal (dropdown-close + z-index fix)', () => {
    test('type1: product search gear closes the dropdown and opens Product Search Settings on top', async () => {
        mockFetch({ productResult: [{ id: 'p1', name: 'Widget', code: 'P-1', search_label: 'Widget' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-product_id', 'Widget');
        expect(screen.getByTestId('typeahead-open-product_id')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-product_id');
        const gear = wrapper.querySelector('.bi-gear-fill');
        expect(gear).toBeTruthy();

        fireEvent.click(gear);

        // Dropdown must close …
        expect(screen.getByTestId('typeahead-open-product_id')).toHaveAttribute('data-open', 'false');
        // … and the settings modal must open with the elevated z-index class.
        const modal = screen.getByTestId('table-settings-modal');
        expect(modal).toHaveTextContent('Product Search Settings');
        expect(modal).toHaveClass('purchase-search-settings-modal-wrap');
    });

    test('type1: vendor search gear closes the dropdown and opens Vendor Search Settings on top', async () => {
        mockFetch({ vendorResult: [{ id: 'v1', name: 'Widget Co', code: 'V-1', search_label: 'Widget Co' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-vendor_search', 'Widget');
        expect(screen.getByTestId('typeahead-open-vendor_search')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-vendor_search');
        const gear = wrapper.querySelector('.bi-gear-fill');
        expect(gear).toBeTruthy();

        fireEvent.click(gear);

        expect(screen.getByTestId('typeahead-open-vendor_search')).toHaveAttribute('data-open', 'false');
        const modal = screen.getByTestId('table-settings-modal');
        expect(modal).toHaveTextContent('Vendor Search Settings');
        expect(modal).toHaveClass('purchase-search-settings-modal-wrap');
    });

    test('type2: product search gear (type2/3 layout) closes the dropdown and opens the settings modal on top', async () => {
        localStorage.setItem('purchase_form_type', 'type2');
        mockFetch({ productResult: [{ id: 'p1', name: 'Widget', code: 'P-1', search_label: 'Widget' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-product_id_type2', 'Widget');
        expect(screen.getByTestId('typeahead-open-product_id_type2')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-product_id_type2');
        const gear = wrapper.querySelector('.bi-gear-fill');
        expect(gear).toBeTruthy();

        fireEvent.click(gear);

        expect(screen.getByTestId('typeahead-open-product_id_type2')).toHaveAttribute('data-open', 'false');
        const modal = screen.getByTestId('table-settings-modal');
        expect(modal).toHaveClass('purchase-search-settings-modal-wrap');
    });

    test('type2: vendor search gear (type2/3 layout) closes the dropdown and opens the settings modal on top', async () => {
        localStorage.setItem('purchase_form_type', 'type2');
        mockFetch({ vendorResult: [{ id: 'v1', name: 'Widget Co', code: 'V-1', search_label: 'Widget Co' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-vendor_search_type2', 'Widget');
        expect(screen.getByTestId('typeahead-open-vendor_search_type2')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-vendor_search_type2');
        const gear = wrapper.querySelector('.bi-gear-fill');
        expect(gear).toBeTruthy();

        fireEvent.click(gear);

        expect(screen.getByTestId('typeahead-open-vendor_search_type2')).toHaveAttribute('data-open', 'false');
        const modal = screen.getByTestId('table-settings-modal');
        expect(modal).toHaveClass('purchase-search-settings-modal-wrap');
    });

    test('type3: product search gear is still available and opens the settings modal on top', async () => {
        localStorage.setItem('purchase_form_type', 'type3');
        mockFetch({ productResult: [{ id: 'p1', name: 'Widget', code: 'P-1', search_label: 'Widget' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-product_id_type2', 'Widget');
        expect(screen.getByTestId('typeahead-open-product_id_type2')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-product_id_type2');
        const gear = wrapper.querySelector('.bi-gear-fill');
        expect(gear).toBeTruthy();

        fireEvent.click(gear);

        expect(screen.getByTestId('typeahead-open-product_id_type2')).toHaveAttribute('data-open', 'false');
        const modal = screen.getByTestId('table-settings-modal');
        expect(modal).toHaveClass('purchase-search-settings-modal-wrap');
    });

    test('type3: vendor search gear is intentionally hidden (fixed 3-field layout, nothing to customize)', async () => {
        localStorage.setItem('purchase_form_type', 'type3');
        mockFetch({ vendorResult: [{ id: 'v1', name: 'Widget Co', code: 'V-1', search_label: 'Widget Co' }] });

        await renderAndOpenPurchaseCreate();

        await openSearchDropdown('typeahead-input-vendor_search_type2', 'Widget');
        expect(screen.getByTestId('typeahead-open-vendor_search_type2')).toHaveAttribute('data-open', 'true');

        const wrapper = screen.getByTestId('typeahead-wrapper-vendor_search_type2');
        expect(wrapper.querySelector('.bi-gear-fill')).toBeNull();
        // No settings modal should be reachable from here.
        expect(screen.queryByTestId('table-settings-modal')).toBeNull();
    });

    test('the App.css stacking-context rule that keeps the settings modal above nested purchase forms still exists', () => {
        const css = fs.readFileSync(path.resolve(__dirname, '../../App.css'), 'utf8');
        expect(css).toMatch(/\.purchase-search-settings-modal-wrap\s*\{\s*z-index:\s*1150\s*!important;\s*\}/);
        expect(css).toMatch(/\.purchase-search-settings-modal-wrap \+ \.modal-backdrop\s*\{\s*z-index:\s*1149\s*!important;\s*\}/);
        // Must be strictly above the wrap that hosts the whole purchase create form.
        expect(css).toMatch(/\.purchase-create-wrap\s*\{\s*z-index:\s*1088\s*!important;\s*\}/);
    });
});
