import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / image stubs ────────────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead/css/Typeahead.css', () => ({}), { virtual: true });

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => React.createElement(React.Fragment, null, children || null);
    const Modal = ({ children, show }) => show ? React.createElement(React.Fragment, null, children) : null;
    Modal.Header = passthrough;
    Modal.Title = passthrough;
    Modal.Body = passthrough;
    Modal.Footer = passthrough;
    return {
        Modal,
        Button: passthrough,
        Form: Object.assign(passthrough, {
            Group: passthrough,
            Label: passthrough,
            Control: () => React.createElement('input', null),
            Check: () => React.createElement('input', { type: 'checkbox' }),
            Select: () => React.createElement('select', null),
            Text: passthrough,
        }),
        Row: passthrough,
        Col: passthrough,
        Table: passthrough,
        Alert: passthrough,
        Spinner: () => React.createElement('span', null, 'loading'),
        Badge: passthrough,
        InputGroup: Object.assign(passthrough, { Text: passthrough }),
        Dropdown: Object.assign(passthrough, { Item: passthrough, Toggle: passthrough, Menu: passthrough }),
    };
});

// ── react-router-dom ─────────────────────────────────────────────────────────
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    const mockReact = require('react');
    return {
        ...actual,
        useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
        useParams: () => ({}),
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
        Link: ({ children, to }) => mockReact.createElement('a', { href: to }, children),
    };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    AsyncTypeahead: () => null,
}));

// ── utils ────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: jest.fn(),
}));

// ── timers / fetch ────────────────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── subject ───────────────────────────────────────────────────────────────────
import ExpenseCategoryCreate from '../create.js';

describe('ExpenseCategoryCreate smoke test', () => {
    it('renders without crashing (modal hidden by default)', () => {
        const ref = React.createRef();
        const { container } = render(
            <MemoryRouter>
                <ExpenseCategoryCreate ref={ref} />
            </MemoryRouter>
        );
        // Modal is hidden by default (show=false), so nothing meaningful renders
        expect(container).toBeTruthy();
    });

    it('exposes an open() method via ref', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <ExpenseCategoryCreate ref={ref} />
            </MemoryRouter>
        );
        expect(typeof ref.current.open).toBe('function');
    });
});
