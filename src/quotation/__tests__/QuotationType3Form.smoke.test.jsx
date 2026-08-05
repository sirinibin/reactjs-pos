/**
 * Smoke test for QuotationType3Form (quotation/QuotationType3Form.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── fake timers ───────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── fetch mock ────────────────────────────────────────────────────────────────
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

// ── CSS mocks ─────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');

    const Modal = ({ show, children }) =>
        show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null;
    Modal.Header = ({ children }) => React.createElement('div', null, children);
    Modal.Body = ({ children }) => React.createElement('div', null, children);
    Modal.Title = ({ children }) => React.createElement('div', null, children);
    Modal.Footer = ({ children }) => React.createElement('div', null, children);

    const Dropdown = ({ children }) => React.createElement('div', null, children);
    Dropdown.Toggle = ({ children }) => React.createElement('button', { type: 'button' }, children);
    Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
    Dropdown.Item = ({ children, onClick }) => React.createElement('div', { onClick }, children);

    const Popover = ({ children }) => React.createElement('div', null, children);
    Popover.Header = ({ children }) => React.createElement('div', null, children);
    Popover.Body = ({ children }) => React.createElement('div', null, children);

    return {
        Modal,
        Button: ({ children }) => React.createElement('button', { type: 'button' }, children),
        Spinner: () => null,
        OverlayTrigger: ({ children }) => children,
        Tooltip: ({ children }) => React.createElement('div', null, children),
        Dropdown,
        Popover,
    };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => {
    const { forwardRef } = require('react');
    return {
        Typeahead: forwardRef(() => null),
        Menu: () => null,
        MenuItem: () => null,
    };
});

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => ({
    __esModule: true,
    default: () => null,
}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => ({
    __esModule: true,
    default: () => null,
}));

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

// ── child domain components (all use ref, so forwardRef stubs) ────────────────
jest.mock('../../vehicle/create.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/products.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../order/preview.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_sales_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_sales_return_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_purchase_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_purchase_return_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_quotation_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_delivery_note_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_non_vat_sales_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

jest.mock('../../utils/product_non_vat_sales_return_history.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

// ── utility mocks ─────────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => v,
    trimTo8Decimals: (v) => v,
}));

jest.mock('../../utils/search.js', () => ({
    highlightWords: (text) => text,
}));

jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

// ── component under test ──────────────────────────────────────────────────────
import QuotationType3Form from '../QuotationType3Form.js';

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

describe('QuotationType3Form smoke test', () => {
    beforeEach(() => {
        localStorage.setItem('store_id', 'test-store-id');
        localStorage.setItem('access_token', 'test-token');
    });

    test('renders without crashing', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <QuotationType3Form />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
