// Smoke test: PurchaseOrderPicker renders without crashing
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Modal = ({ show, children }) =>
        show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null;
    Modal.Header = ({ children }) => React.createElement('div', null, children);
    Modal.Body   = ({ children }) => React.createElement('div', null, children);
    Modal.Footer = ({ children }) => React.createElement('div', null, children);
    Modal.Title  = ({ children }) => React.createElement('div', null, children);
    const Spinner  = () => React.createElement('span', null, 'loading');
    const Button   = ({ children, onClick }) => React.createElement('button', { onClick }, children);
    const Form     = ({ children }) => React.createElement('form', null, children);
    Form.Group     = ({ children }) => React.createElement('div', null, children);
    Form.Control   = (props) => React.createElement('input', props);
    Form.Label     = ({ children }) => React.createElement('label', null, children);
    Form.Check     = (props) => React.createElement('input', { type: 'checkbox', ...props });
    const Table    = ({ children }) => React.createElement('table', null, children);
    const Row      = ({ children }) => React.createElement('div', null, children);
    const Col      = ({ children }) => React.createElement('div', null, children);
    const Alert    = ({ children }) => React.createElement('div', null, children);
    return { Modal, Spinner, Button, Form, Table, Row, Col, Alert };
});

// --- react-bootstrap-typeahead ---
// Typeahead is used with forwardRef and .clear(); provide a ref-compatible stub.
jest.mock('react-bootstrap-typeahead', () => {
    const React = require('react');
    const Typeahead = React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => ({ clear: jest.fn() }));
        return React.createElement('input', { placeholder: props.placeholder, readOnly: true });
    });
    const AsyncTypeahead = () => null;
    const Menu     = ({ children }) => React.createElement('div', null, children);
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
    format:           jest.fn(() => '01-Jan-2024'),
    parseISO:         jest.fn((s) => new Date(s)),
    isValid:          jest.fn(() => true),
    differenceInDays: jest.fn(() => 0),
    addDays:          jest.fn((d) => d),
    startOfMonth:     jest.fn((d) => d),
    endOfMonth:       jest.fn((d) => d),
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

// --- utils/queryUtils.js ---
jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// --- utils/numberUtils ---
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: jest.fn((n) => n),
}));

// --- utils/search.js ---
jest.mock('../../utils/search.js', () => ({
    highlightWords: jest.fn((text) => text),
}));

// --- utils/TableSettingsModal.js ---
jest.mock('../../utils/TableSettingsModal.js', () => () => null);

// --- fake timers ---
jest.useFakeTimers();

// --- actual tests ---
import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchaseOrderPicker from '../PurchaseOrderPicker';

beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: [], data: [], total_count: 0, store: {}, settings: {} }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

describe('PurchaseOrderPicker smoke test', () => {
    it('renders without crashing (modal hidden by default)', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <PurchaseOrderPicker ref={ref} />
            </MemoryRouter>
        );
        // Modal starts hidden; no crash is the assertion
    });

    it('renders without crashing when modal is opened via ref', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <PurchaseOrderPicker ref={ref} />
            </MemoryRouter>
        );
        act(() => {
            if (ref.current && ref.current.open) {
                ref.current.open(jest.fn());
            }
        });
        // No crash is the assertion
    });

    it('renders without crashing when modal is opened with a default vendor', () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <PurchaseOrderPicker ref={ref} />
            </MemoryRouter>
        );
        act(() => {
            if (ref.current && ref.current.open) {
                ref.current.open(jest.fn(), { id: 'vendor-1', name: 'Test Vendor' });
            }
        });
        // No crash is the assertion
    });
});
