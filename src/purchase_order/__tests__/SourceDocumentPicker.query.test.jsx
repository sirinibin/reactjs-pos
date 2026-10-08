// SourceDocumentPicker: request query, callbacks and edge cases (quotation mode)
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}), { virtual: true });

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Modal = ({ show, children, className }) =>
        show ? React.createElement('div', { 'data-testid': 'modal', className }, children) : null;
    Modal.Header = ({ children }) => React.createElement('div', null, children);
    Modal.Body = ({ children }) => React.createElement('div', null, children);
    Modal.Footer = ({ children }) => React.createElement('div', null, children);
    Modal.Title = ({ children }) => React.createElement('div', null, children);
    const Spinner = () => React.createElement('span', null, 'loading');
    const Button = ({ children, onClick }) => React.createElement('button', { onClick }, children);
    const Form = ({ children }) => React.createElement('form', null, children);
    Form.Group = ({ children }) => React.createElement('div', null, children);
    Form.Control = (props) => React.createElement('input', props);
    Form.Label = ({ children }) => React.createElement('label', null, children);
    Form.Check = (props) => React.createElement('input', { type: 'checkbox', ...props });
    const Table = ({ children }) => React.createElement('table', null, children);
    const Row = ({ children }) => React.createElement('div', null, children);
    const Col = ({ children }) => React.createElement('div', null, children);
    const Alert = ({ children }) => React.createElement('div', null, children);
    const Dropdown = ({ children }) => React.createElement('div', null, children);
    Dropdown.Toggle = ({ children }) => React.createElement('button', null, children);
    Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
    Dropdown.Item = ({ children, onClick }) => React.createElement('button', { onClick }, children);
    return { Modal, Spinner, Button, Form, Table, Row, Col, Alert, Dropdown };
});

// --- react-bootstrap-typeahead ---
// Typeahead is used with a forwardRef and .clear() call; provide a ref-compatible stub.
jest.mock('react-bootstrap-typeahead', () => {
    const React = require('react');
    const Typeahead = React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => ({ clear: jest.fn() }));
        return React.createElement('input', { placeholder: props.placeholder, readOnly: true });
    });
    const AsyncTypeahead = () => null;
    const Menu = ({ children }) => React.createElement('div', null, children);
    const MenuItem = ({ children }) => React.createElement('div', null, children);
    return { Typeahead, AsyncTypeahead, Menu, MenuItem };
});

// --- react-i18next ---
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { changeLanguage: jest.fn() } }),
    Trans: ({ children }) => children,
    initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// --- date-fns ---
jest.mock('date-fns', () => ({
    format: jest.fn(() => '01-Jan-2024'),
    parseISO: jest.fn((s) => new Date(s)),
    isValid: jest.fn(() => true),
    differenceInDays: jest.fn(() => 0),
    addDays: jest.fn((d) => d),
    startOfMonth: jest.fn((d) => d),
    endOfMonth: jest.fn((d) => d),
}));

// --- react-number-format (default export) ---
jest.mock('react-number-format', () => {
    const React = require('react');
    const NumberFormat = (props) => {
        const value = props.value !== undefined ? String(props.value) : '';
        if (props.displayType === 'text') {
            return props.renderText
                ? React.createElement('span', null, props.renderText(value))
                : React.createElement('span', null, value);
        }
        return React.createElement('input', { value, readOnly: true });
    };
    return NumberFormat;
});

// --- ../../utils/search.js ---
jest.mock('../../utils/search.js', () => ({
    highlightWords: jest.fn((text) => text),
}));

// --- ../../utils/numberUtils ---
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: jest.fn((n) => n),
}));

// --- ../../utils/TableSettingsModal.js ---
jest.mock('../../utils/TableSettingsModal.js', () => () => null);

// --- global fetch ---
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: [], data: [], total_count: 0, store: {}, settings: {} }),
});

// --- actual tests ---
import React, { createRef } from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import SourceDocumentPicker from '../SourceDocumentPicker';

const QUOTATIONS = [
    { id: 'q1', code: 'QT-001', customer_name: 'ACME', net_total: 10, products: [{ product_id: 'p1' }, { product_id: 'p2' }] },
];

beforeEach(() => {
    localStorage.setItem('store_id', 'store123');
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: QUOTATIONS, total_count: 1 }),
    });
});

afterEach(() => localStorage.clear());

function lastUrl() {
    const calls = global.fetch.mock.calls.filter(c => String(c[0]).startsWith('/v1/quotation?'));
    return decodeURIComponent(String(calls[calls.length - 1][0]));
}

describe('SourceDocumentPicker (quotation mode)', () => {
    it('requests newest quotations first for the current store with products selected', async () => {
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'quotation'); });
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const url = lastUrl();
        expect(url).toContain('search[store_id]=store123');
        expect(url).toContain('sort=-created_at');
        expect(url).not.toContain('sort_by=');
        expect(url).toMatch(/select=[^&]*products/);
        expect(url).toContain('page=1');
    });

    it('filters by the default customers passed in', async () => {
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'quotation', [{ id: 'c1' }, { id: 'c2' }]); });
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(lastUrl()).toContain('search[customer_id]=c1,c2');
    });

    it('sends the typed code after the debounce', async () => {
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'quotation'); });
        fireEvent.change(screen.getByPlaceholderText('QT-...'), { target: { value: 'QT 00/1' } });
        await waitFor(() => expect(lastUrl()).toContain('search[code]=QT 00/1'));
    });

    it('calls back with the clicked quotation and its type, then closes', async () => {
        const ref = createRef();
        const cb = jest.fn();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(cb, 'quotation'); });
        fireEvent.click(await screen.findByText('QT-001'));
        expect(cb).toHaveBeenCalledWith(QUOTATIONS[0], 'quotation');
        expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('applies modalClassName so it can stack above the quotation form', () => {
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} modalClassName="above-sales-modal" />);
        act(() => { ref.current.open(jest.fn(), 'quotation'); });
        expect(screen.getByTestId('modal')).toHaveClass('above-sales-modal');
    });

    it('shows an empty state when the API returns nothing', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: null, total_count: 0 }) });
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'quotation'); });
        expect(await screen.findByText('No documents found.')).toBeInTheDocument();
    });

    it('survives a network error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'quotation'); });
        expect(await screen.findByText('No documents found.')).toBeInTheDocument();
    });
});

describe('SourceDocumentPicker (purchase mode)', () => {
    function lastPurchaseUrl() {
        const calls = global.fetch.mock.calls.filter(c => String(c[0]).startsWith('/v1/purchase?'));
        return decodeURIComponent(String(calls[calls.length - 1][0]));
    }

    it('searches purchases newest first with products, filtered by vendor', async () => {
        const ref = createRef();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(jest.fn(), 'purchase', [{ id: 'v1' }]); });
        await waitFor(() => expect(global.fetch.mock.calls.some(c => String(c[0]).startsWith('/v1/purchase?'))).toBe(true));
        const url = lastPurchaseUrl();
        expect(url).toContain('search[store_id]=store123');
        expect(url).toContain('search[vendor_id]=v1');
        expect(url).not.toContain('search[customer_id]');
        expect(url).toContain('sort=-created_at');
        expect(url).toMatch(/select=[^&]*products/);
        expect(screen.getByText('Import from Purchase')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('PI-...')).toBeInTheDocument();
    });

    it('calls back with the purchase and its type', async () => {
        const ref = createRef();
        const cb = jest.fn();
        render(<SourceDocumentPicker ref={ref} />);
        act(() => { ref.current.open(cb, 'purchase'); });
        fireEvent.click(await screen.findByText('QT-001'));
        expect(cb).toHaveBeenCalledWith(QUOTATIONS[0], 'purchase');
    });
});

