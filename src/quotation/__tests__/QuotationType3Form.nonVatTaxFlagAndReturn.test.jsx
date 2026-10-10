/**
 * QuotationType3Form as the Non VAT Sale / Non VAT Sales Return form:
 *  - "Exclude Products Tax" must stay ticked when a calculate-net-total
 *    response (from a request sent before the click) comes back with false.
 *  - a return must send selected:true on its lines (pos-rest's
 *    NonVATSalesReturn.validateQuantities only counts selected lines), and
 *    the API's errors must be shown.
 */
import React, { createRef } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.useFakeTimers();

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Modal always renders children so we can query form content without opening
jest.mock('react-bootstrap', () => {
    const Passthrough    = ({ children }) => children || null;
    const PassthroughDiv = ({ children }) => <div>{children}</div>;
    const Modal = ({ children }) => <div data-testid="modal">{children}</div>;
    Modal.Header = PassthroughDiv;
    Modal.Body   = PassthroughDiv;
    Modal.Title  = PassthroughDiv;
    Modal.Footer = PassthroughDiv;
    const Dropdown = ({ children }) => <div>{children}</div>;
    Dropdown.Toggle = ({ children }) => <button type="button">{children}</button>;
    Dropdown.Menu   = PassthroughDiv;
    Dropdown.Item   = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
    const Popover = PassthroughDiv;
    Popover.Header = PassthroughDiv;
    Popover.Body   = PassthroughDiv;
    return {
        Modal,
        Button: ({ children, onClick }) => <button type="button" onClick={onClick}>{children}</button>,
        Spinner: () => null,
        OverlayTrigger: ({ children }) => children,
        Tooltip: PassthroughDiv,
        Dropdown,
        Popover,
    };
});

jest.mock('react-bootstrap-typeahead', () => {
    const { forwardRef } = require('react');
    return { Typeahead: forwardRef(() => null), Menu: () => null, MenuItem: () => null };
});

jest.mock('react-datepicker',    () => ({ __esModule: true, default: () => null }));
jest.mock('react-number-format', () => ({ __esModule: true, default: () => null }));
jest.mock('react-i18next',       () => ({ useTranslation: () => ({ t: (key) => key }) }));

jest.mock('../../vehicle/create.js',                               () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/products.js',                               () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/preview.js',                                () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_sales_history.js',                  () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_sales_return_history.js',           () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_purchase_history.js',               () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_purchase_return_history.js',        () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_quotation_history.js',              () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_delivery_note_history.js',          () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_non_vat_sales_history.js',          () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/product_non_vat_sales_return_history.js',   () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../purchase_order/PurchaseOrderPicker.js',           () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/sales.js',                                  () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/purchases.js',                              () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: (v) => v, trimTo8Decimals: (v) => v }));
jest.mock('../../utils/search.js',   () => ({ highlightWords: (text) => text }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));


import QuotationType3Form from '../QuotationType3Form.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const json = (body) => Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });

let returnResponse;
beforeEach(() => {
    jest.useFakeTimers(); // CRA's resetMocks wipes the fake timers set up at module level
    localStorage.setItem('store_id', 'test-store-id');
    localStorage.setItem('access_token', 'test-token');
    returnResponse = { status: false, errors: { quantity_0: 'Quantity should not be greater than sold quantity: 3.00' } };
    global.fetch = jest.fn((url, opts = {}) => {
        if (String(url).includes('/calculate-net-total')) {
            // An answer to a request sent before the box was ticked.
            return json({ status: true, result: { net_total: 300, exclude_product_tax: false, exclude_service_tax: false } });
        }
        if (String(url).startsWith('/v1/non-vat-sales-return') && opts.method === 'POST') return json(returnResponse);
        if (String(url).startsWith('/v1/store/')) return json({ result: { settings: {} } });
        if (String(url).startsWith('/v1/customer/')) return json({ result: { id: 'c1', name: 'Cust' } });
        return json({ result: [], total_count: 0 });
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

describe('Non VAT Sale form — Exclude Products Tax', () => {
    test('stays ticked after the recalculation that follows the click', async () => {
        const ref = createRef();
        render(<MemoryRouter><QuotationType3Form ref={ref} apiBase="/v1/non-vat-sales" /></MemoryRouter>);
        await act(async () => { ref.current.open(); await flush(); });
        const box = document.querySelector('#qt3_exclude_product_tax');
        expect(box.checked).toBe(false);
        await act(async () => { fireEvent.click(box); await flush(); });
        expect(box.checked).toBe(true);
        await act(async () => { jest.advanceTimersByTime(400); await flush(); });
        expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/calculate-net-total'))).toBe(true);
        expect(document.querySelector('#qt3_exclude_product_tax').checked).toBe(true);
    });
});

describe('Non VAT Sales Return form — submit', () => {
    async function openReturn() {
        const ref = createRef();
        render(<MemoryRouter><QuotationType3Form ref={ref} apiBase="/v1/non-vat-sales-return" /></MemoryRouter>);
        await act(async () => {
            ref.current.open(null, {
                customer_id: 'c1', customer_name: 'Cust', non_vat_sales_id: 's1',
                products: [{ product_id: 'p1', name: 'Prod', quantity: 5, unit_price: 100, unit_price_with_vat: 100 }],
            });
            await flush();
        });
        await act(async () => { jest.advanceTimersByTime(400); await flush(); });
        const methodSelect = screen.getAllByRole('combobox').find((s) => [...s.options].some((o) => o.value === 'cash'));
        await act(async () => { fireEvent.change(methodSelect, { target: { value: 'cash' } }); });
        await act(async () => { fireEvent.submit(document.querySelector('form')); await flush(); });
        const post = global.fetch.mock.calls.find(([u, o]) => String(u).startsWith('/v1/non-vat-sales-return?') && o && o.method === 'POST');
        return post && JSON.parse(post[1].body);
    }

    test('sends selected:true on the lines being returned', async () => {
        const body = await openReturn();
        expect(body).toBeTruthy();
        expect(body.products).toHaveLength(1);
        expect(body.products[0]).toMatchObject({ product_id: 'p1', quantity: 5, selected: true });
    });

    test('shows the errors the API answers with', async () => {
        await openReturn();
        expect(screen.getByText(/greater than sold quantity: 3.00/)).toBeTruthy();
    });
});
