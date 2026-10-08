/**
 * Integration test: sales form type 1 -> Import -> From Purchase / From Sales.
 * The real order/create.js wiring is exercised: the "From Purchase" handler it hands to
 * SalesType1Body opens the shared two-step picker (QuotationImportPicker) in purchase mode,
 * its prepareProducts step prices purchase lines at the store's retail price (from
 * /v1/product), and the products picked there are merged into the sale.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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
const mockBodyProps = { current: null };
jest.mock('../SalesType1Form', () => {
    const React = require('react');
    return {
        SalesType1Header: () => null,
        SalesType1Body: (props) => {
            mockBodyProps.current = props;
            return React.createElement('div', null,
                React.createElement('button', { type: 'button', 'data-testid': 'from-purchase', onClick: () => props.openImportFromPurchase() }, 'From Purchase'),
                React.createElement('button', { type: 'button', 'data-testid': 'from-sales', onClick: () => props.openImportFromSales() }, 'From Sales'),
                React.createElement('ul', { 'data-testid': 'lines' },
                    (props.selectedProducts || []).map((p, i) => React.createElement('li', { key: i }, `${p.product_id}|${p.quantity}|${p.unit_price}|${p.unit_price_with_vat}|${p.purchase_unit_price}`))));
        },
    };
});

const mockPickerOpen = jest.fn();
const mockPickerProps = { current: null };
jest.mock('../../quotation/QuotationImportPicker.js', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef((props, ref) => {
            mockPickerProps.current = props;
            React.useImperativeHandle(ref, () => ({ open: (opts) => mockPickerOpen(opts) }));
            return null;
        }),
    };
});

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

jest.mock('../../purchase_order/PurchaseOrderPicker.js', () => ({ __esModule: true, default: () => null }));

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

const priceCalls = [];
let priceFails = false;
beforeEach(() => {
    localStorage.setItem('order_form_type', 'type1');
    localStorage.setItem('store_id', 's1');
    priceCalls.length = 0;
    priceFails = false;
    mockPickerOpen.mockReset();
    global.fetch = jest.fn((url) => {
        if (String(url).includes('allow_duplicates')) {
            return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: [{ id: 'pdup', allow_duplicates: true }] }) });
        }
        if (String(url).includes('retail_unit_price')) {
            priceCalls.push(String(url));
            if (priceFails) return Promise.resolve({ ok: false, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ errors: {} }) });
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: [
                    { id: 'p1', product_stores: { s1: { retail_unit_price: 10, retail_unit_price_with_vat: 11.5 } } },
                ] }),
            });
        }
        const result = String(url).startsWith('/v1/product?') ? [] : {};
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result }) });
    });
});

afterEach(() => {
    localStorage.clear();
});

const toast = jest.fn();
async function openSalesForm() {
    const ref = React.createRef();
    render(<MemoryRouter><OrderCreate ref={ref} showToastMessage={toast} /></MemoryRouter>);
    await act(async () => { await ref.current.open(); });
    await act(async () => { await new Promise(r => setTimeout(r, 80)); });
    return ref;
}

function clickFromSales() {
    fireEvent.click(screen.getByTestId('from-sales'));
    return mockPickerOpen.mock.calls[mockPickerOpen.mock.calls.length - 1][0];
}

function clickFromPurchase() {
    fireEvent.click(screen.getByTestId('from-purchase'));
    return mockPickerOpen.mock.calls[mockPickerOpen.mock.calls.length - 1][0];
}

const purchaseLines = [
    { product_id: 'p1', item_code: 'IC1', part_number: 'OF-1', name: 'Oil Filter', quantity: 3, purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9, unit_discount: 1 },
    { product_id: 'p2', part_number: 'AF-2', name: 'Air Filter', quantity: 2, purchase_unit_price: 12, retail_unit_price: 20, retail_unit_price_with_vat: 23 },
];

describe('Sales form type 1: Import from Purchase', () => {
    beforeEach(() => toast.mockReset());

    test('renders the shared import picker', async () => {
        await openSalesForm();
        expect(mockPickerProps.current).not.toBeNull();
        expect(typeof mockPickerProps.current.showToastMessage).toBe('function');
    });

    test('From Purchase opens the picker in purchase mode with the products already in the sale', async () => {
        await openSalesForm();
        const opts = clickFromPurchase();
        expect(mockPickerOpen).toHaveBeenCalledTimes(1);
        expect(opts.docType).toBe('purchase');
        expect(opts.existingProductIds).toEqual([]);
        expect(typeof opts.onImport).toBe('function');
        expect(typeof opts.prepareProducts).toBe('function');
        expect(opts.excludeId).toBeUndefined();
    });

    test('prepareProducts prices purchase lines at the store retail price, falling back to the line', async () => {
        await openSalesForm();
        const { prepareProducts } = clickFromPurchase();
        let lines;
        await act(async () => { lines = await prepareProducts(purchaseLines); });
        expect(priceCalls).toHaveLength(1);
        expect(priceCalls[0]).toContain('search[ids]=p1,p2');
        expect(priceCalls[0]).toContain('search[store_id]=s1');
        expect(lines[0]).toMatchObject({ product_id: 'p1', unit_price: 10, unit_price_with_vat: 11.5, purchase_unit_price: 6, unit_discount: 0, quantity: 3 });
        expect(lines[1]).toMatchObject({ product_id: 'p2', unit_price: 20, unit_price_with_vat: 23, purchase_unit_price: 12 });
        expect(toast).not.toHaveBeenCalled();
    });

    test('prepareProducts warns and still lists the lines when the price lookup fails', async () => {
        priceFails = true;
        await openSalesForm();
        const { prepareProducts } = clickFromPurchase();
        let lines;
        await act(async () => { lines = await prepareProducts(purchaseLines); });
        expect(toast).toHaveBeenCalledWith(expect.stringMatching(/selling prices/), 'warning');
        expect(lines).toHaveLength(2);
        expect(lines[0].unit_price).toBe(0);
        expect(lines[1].unit_price).toBe(20);
    });

    test('picked lines are added to the sale with their prices', async () => {
        await openSalesForm();
        const { prepareProducts, onImport } = clickFromPurchase();
        let lines;
        await act(async () => { lines = await prepareProducts(purchaseLines); });
        await act(async () => { onImport(lines); });
        await waitFor(() => {
            expect(screen.getByText('p1|3|10|11.5|6')).toBeInTheDocument();
            expect(screen.getByText('p2|2|20|23|12')).toBeInTheDocument();
        });
        expect(toast).toHaveBeenCalledWith('Imported 2 products', 'success');
    });

    test('importing a product already in the sale increases its quantity', async () => {
        await openSalesForm();
        const first = clickFromPurchase();
        await act(async () => { first.onImport([{ product_id: 'p1', quantity: 3, unit_price: 10, unit_price_with_vat: 11.5 }]); });
        await waitFor(() => expect(screen.getByText('p1|3|10|11.5|0')).toBeInTheDocument());

        const second = clickFromPurchase();
        expect(second.existingProductIds).toEqual(['p1']);
        await act(async () => { second.onImport([{ product_id: 'p1', quantity: 2, unit_price: 99 }]); });
        await waitFor(() => expect(screen.getByText('p1|5|10|11.5|0')).toBeInTheDocument());
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    test('an empty pick changes nothing', async () => {
        await openSalesForm();
        const { onImport } = clickFromPurchase();
        await act(async () => { onImport([]); });
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
        expect(toast).not.toHaveBeenCalled();
    });
});

describe('Sales form type 1: Import from Sales', () => {
    beforeEach(() => toast.mockReset());

    test('From Sales opens the shared picker in sales mode', async () => {
        await openSalesForm();
        const opts = clickFromSales();
        expect(opts.docType).toBe('sales');
        expect(opts.existingProductIds).toEqual([]);
        expect(opts.defaultParties).toEqual([]);
        expect(opts.prepareProducts).toBeUndefined();
        expect(opts.excludeId).toBeUndefined();
    });

    test('picked sale lines keep their prices and discounts and merge with existing lines', async () => {
        await openSalesForm();
        const first = clickFromSales();
        await act(async () => {
            first.onImport([
                { product_id: 'p1', quantity: 2, unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15, purchase_unit_price: 6 },
                { product_id: 'p3', quantity: 1, unit_price: 50, unit_price_with_vat: 57.5 },
            ]);
        });
        await waitFor(() => {
            expect(screen.getByText('p1|2|10|11.5|6')).toBeInTheDocument();
            expect(screen.getByText('p3|1|50|57.5|0')).toBeInTheDocument();
        });
        expect(toast).toHaveBeenCalledWith('Imported 2 products', 'success');

        const second = clickFromSales();
        expect(second.existingProductIds).toEqual(['p1', 'p3']);
        await act(async () => { second.onImport([{ product_id: 'p1', quantity: 4, unit_price: 99 }]); });
        await waitFor(() => expect(screen.getByText('p1|6|10|11.5|6')).toBeInTheDocument());
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    test('both import sources share one picker', async () => {
        await openSalesForm();
        clickFromSales();
        clickFromPurchase();
        expect(mockPickerOpen.mock.calls.map(c => c[0].docType)).toEqual(['sales', 'purchase']);
    });
});

describe('Sales form type 1: "Allow duplicates" products on import', () => {
    test('are added as a separate line from both From Sales and From Purchase', async () => {
        await openSalesForm();
        const fromSales = clickFromSales();
        await act(async () => { await fromSales.onImport([{ product_id: 'pdup', quantity: 1, unit_price: 5 }, { product_id: 'p1', quantity: 1, unit_price: 10 }]); });
        await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));

        const fromPurchase = clickFromPurchase();
        await act(async () => { await fromPurchase.onImport([{ product_id: 'pdup', quantity: 2, unit_price: 5 }, { product_id: 'p1', quantity: 3, unit_price: 10 }]); });
        await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
        const lines = screen.getAllByRole('listitem').map(li => li.textContent);
        expect(lines.filter(l => l.startsWith('pdup|'))).toEqual(['pdup|1|5|0|0', 'pdup|2|5|0|0']);
        expect(lines.filter(l => l.startsWith('p1|'))).toEqual(['p1|4|10|0|0']);
    });
});
