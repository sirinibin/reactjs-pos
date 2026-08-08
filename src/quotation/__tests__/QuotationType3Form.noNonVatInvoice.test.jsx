/**
 * Tests for removal of non_vat_invoice from QuotationType3Form's type dropdown.
 * Regression: "Non VAT Invoice" must not appear; Invoice + Quotation must still be present.
 *
 * The type dropdown is only shown when store.settings.enable_sales_in_quotation is true,
 * so the store mock returns that flag and we call open() to trigger the store fetch.
 */
import React, { createRef } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: (v) => v, trimTo8Decimals: (v) => v }));
jest.mock('../../utils/search.js',   () => ({ highlightWords: (text) => text }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));

import QuotationType3Form from '../QuotationType3Form.js';

beforeEach(() => {
    localStorage.setItem('store_id', 'test-store-id');
    localStorage.setItem('access_token', 'test-token');
    // Return enable_sales_in_quotation:true so the type dropdown renders
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
            result: { settings: { enable_sales_in_quotation: true } },
            data: [], total_count: 0,
        }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// Opens the form and waits for the store to load so the type dropdown renders
async function renderAndOpen() {
    const ref = createRef();
    render(<MemoryRouter><QuotationType3Form ref={ref} /></MemoryRouter>);
    await act(async () => {
        ref.current.open();
        // flush microtasks so fetch .then() handlers run and store state updates
        await Promise.resolve();
        await Promise.resolve();
    });
}

// Finds the type <select> by looking for the one with "quotation" or "invoice" options
function getTypeSelect() {
    const selects = screen.getAllByRole('combobox');
    return selects.find(s =>
        [...s.options].some(o => o.value === 'quotation' || o.value === 'invoice')
    );
}

describe('QuotationType3Form — type dropdown (non_vat_invoice removal)', () => {
    test('"Non VAT Invoice" option absent — even when enable_sales_in_quotation is true', async () => {
        await renderAndOpen();
        expect(screen.queryByRole('option', { name: /Non VAT Invoice/i })).toBeNull();
    });

    test('"Invoice" option present in type dropdown', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());
        expect(screen.queryByRole('option', { name: /^Invoice$/i })).not.toBeNull();
    });

    test('"Quotation" option present in type dropdown', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());
        expect(screen.queryByRole('option', { name: /^Quotation$/i })).not.toBeNull();
    });

    test('type dropdown has exactly 2 options: Quotation and Invoice (no non_vat_invoice)', async () => {
        await renderAndOpen();
        await waitFor(() => expect(getTypeSelect()).toBeDefined());
        const optionValues = [...getTypeSelect().options].map(o => o.value);
        expect(optionValues).not.toContain('non_vat_invoice');
        expect(optionValues).toContain('quotation');
        expect(optionValues).toContain('invoice');
        expect(optionValues).toHaveLength(2);
    });

    test('NonVAT Sales form (apiBase !== /v1/quotation) renders without crash', () => {
        expect(() =>
            render(<MemoryRouter><QuotationType3Form apiBase="/v1/non-vat-sales" /></MemoryRouter>)
        ).not.toThrow();
    });
});
