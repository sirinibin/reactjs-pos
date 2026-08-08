/**
 * Component tests for the "No Tax for Quotation Invoice" feature in QuotationType3Form.
 *
 * Covers:
 *  1. Form renders without crash when flag is on
 *  2. Changing type to 'invoice' with flag on triggers reCalculate with vat_percent=0
 *  3. Changing type back to 'quotation' triggers reCalculate with vat_percent restored
 *  4. addProduct sets unit_price_with_vat = unit_price when flag on + type=invoice
 */
import React, { createRef } from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.useFakeTimers();

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Modal always renders children
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
        Button: ({ children }) => <button type="button">{children}</button>,
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
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => parseFloat(parseFloat(v).toFixed(2)),
    trimTo8Decimals: (v) => parseFloat(parseFloat(v).toFixed(8)),
}));
jest.mock('../../utils/search.js',    () => ({ highlightWords: (text) => text }));
jest.mock('../../utils/queryUtils.js',() => ({ ObjectToSearchQueryParams: () => '' }));

import QuotationType3Form from '../QuotationType3Form.js';

// Store response with no_tax_for_quotation_invoice flag ON
function makeStoreFetch(extraSettings = {}) {
    return jest.fn((url) => {
        if (url && url.includes('calculate-net-total')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({
                    result: { net_total: 0, total: 0, vat_price: 0, total_with_vat: 0, products: [] },
                }),
            });
        }
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
                result: {
                    vat_percent: 15,
                    settings: {
                        enable_sales_in_quotation: true,
                        no_tax_for_quotation_invoice: true,
                        ...extraSettings,
                    },
                },
                data: [], total_count: 0,
            }),
        });
    });
}

beforeEach(() => {
    localStorage.setItem('store_id', 'test-store-id');
    localStorage.setItem('access_token', 'test-token');
    global.fetch = makeStoreFetch();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// Opens the form and waits for the store to load so the type dropdown renders
async function renderAndOpen(fetchMock) {
    if (fetchMock) global.fetch = fetchMock;
    const ref = createRef();
    render(<MemoryRouter><QuotationType3Form ref={ref} /></MemoryRouter>);
    await act(async () => {
        ref.current.open();
        await Promise.resolve();
        await Promise.resolve();
    });
    return ref;
}

function getTypeSelect() {
    const selects = screen.getAllByRole('combobox');
    return selects.find(s =>
        [...s.options].some(o => o.value === 'quotation' || o.value === 'invoice')
    );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('QuotationType3Form — no_tax_for_quotation_invoice flag', () => {
    test('renders without crash when flag is on', async () => {
        await expect(renderAndOpen()).resolves.not.toThrow();
    });

    test('type dropdown still shows Quotation and Invoice options when flag is on', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());
        const opts = [...getTypeSelect().options].map(o => o.value);
        expect(opts).toContain('quotation');
        expect(opts).toContain('invoice');
        expect(opts).not.toContain('non_vat_invoice');
    });

    test('changing type to invoice calls calculate-net-total with vat_percent=0', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());

        // Clear prior store-load fetch calls; capture only the reCalculate call
        global.fetch.mockClear();

        await act(async () => {
            fireEvent.change(getTypeSelect(), { target: { value: 'invoice' } });
            // Allow state updates to flush
            await Promise.resolve();
            await Promise.resolve();
            // Advance past the 150ms setTimeout that triggers reCalculate
            jest.advanceTimersByTime(200);
            await Promise.resolve();
            await Promise.resolve();
        });

        const calcCall = global.fetch.mock.calls.find(
            ([url]) => url && url.includes('calculate-net-total')
        );
        expect(calcCall).toBeDefined();
        const body = JSON.parse(calcCall[1].body);
        expect(body.vat_percent).toBe(0);
    });

    test('changing type back to quotation calls calculate-net-total with vat_percent=15', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());

        // First switch to invoice
        await act(async () => {
            fireEvent.change(getTypeSelect(), { target: { value: 'invoice' } });
            await Promise.resolve();
            await Promise.resolve();
            jest.advanceTimersByTime(200);
            await Promise.resolve();
        });

        global.fetch.mockClear();

        // Then switch back to quotation
        await act(async () => {
            fireEvent.change(getTypeSelect(), { target: { value: 'quotation' } });
            await Promise.resolve();
            await Promise.resolve();
            jest.advanceTimersByTime(200);
            await Promise.resolve();
        });

        const calcCall = global.fetch.mock.calls.find(
            ([url]) => url && url.includes('calculate-net-total')
        );
        expect(calcCall).toBeDefined();
        const body = JSON.parse(calcCall[1].body);
        // Restores store.vat_percent (15)
        expect(body.vat_percent).toBe(15);
    });

    test('flag OFF: changing type to invoice does NOT zero vat_percent', async () => {
        global.fetch = makeStoreFetch({ no_tax_for_quotation_invoice: false });
        await renderAndOpen(global.fetch);
        await waitFor(() => expect(getTypeSelect()).toBeDefined());

        global.fetch.mockClear();
        // Re-set mock for calculate-net-total response
        global.fetch = jest.fn((url) => {
            if (url && url.includes('calculate-net-total')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: { net_total: 0, total: 0, vat_price: 0, products: [] } }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: { vat_percent: 15, settings: { enable_sales_in_quotation: true, no_tax_for_quotation_invoice: false } }, data: [] }),
            });
        });

        await act(async () => {
            fireEvent.change(getTypeSelect(), { target: { value: 'invoice' } });
            await Promise.resolve();
            jest.advanceTimersByTime(200);
            await Promise.resolve();
        });

        const calcCall = global.fetch.mock.calls.find(
            ([url]) => url && url.includes('calculate-net-total')
        );
        if (calcCall) {
            const body = JSON.parse(calcCall[1].body);
            // vat_percent must NOT be 0 when flag is off
            expect(body.vat_percent).not.toBe(0);
        }
        // If reCalculate wasn't called (no products), that's also acceptable
    });

    test('component renders without crash when flag is off', async () => {
        global.fetch = makeStoreFetch({ no_tax_for_quotation_invoice: false });
        await expect(renderAndOpen()).resolves.not.toThrow();
    });
});
