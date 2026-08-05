import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / image files ──────────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead/css/Typeahead.css', () => ({}), { virtual: true });

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => ({
    Modal: Object.assign(
        ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
        {
            Header: ({ children }) => <div>{children}</div>,
            Title:  ({ children }) => <div>{children}</div>,
            Body:   ({ children }) => <div>{children}</div>,
            Footer: ({ children }) => <div>{children}</div>,
        }
    ),
    Spinner: () => <span data-testid="spinner" />,
    Button:  ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Form:    Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group:   ({ children }) => <div>{children}</div>,
            Label:   ({ children }) => <label>{children}</label>,
            Control: (props) => <input {...props} />,
            Check:   (props) => <input type="checkbox" {...props} />,
            Select:  ({ children }) => <select>{children}</select>,
            Text:    ({ children }) => <small>{children}</small>,
        }
    ),
    Row:   ({ children }) => <div>{children}</div>,
    Col:   ({ children }) => <div>{children}</div>,
    Alert: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    Badge: ({ children }) => <span>{children}</span>,
    Nav:   Object.assign(
        ({ children }) => <nav>{children}</nav>,
        { Item: ({ children }) => <div>{children}</div>, Link: ({ children }) => <a>{children}</a> }
    ),
    Tabs: ({ children }) => <div>{children}</div>,
    Tab:  ({ children }) => <div>{children}</div>,
    Dropdown: Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu:   ({ children }) => <div>{children}</div>,
            Item:   ({ children }) => <div>{children}</div>,
        }
    ),
    InputGroup: Object.assign(
        ({ children }) => <div>{children}</div>,
        { Text: ({ children }) => <span>{children}</span> }
    ),
    Container: ({ children }) => <div>{children}</div>,
    ProgressBar: () => <div />,
    Card: Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Header: ({ children }) => <div>{children}</div>,
            Body:   ({ children }) => <div>{children}</div>,
            Footer: ({ children }) => <div>{children}</div>,
            Title:  ({ children }) => <div>{children}</div>,
        }
    ),
    ListGroup: Object.assign(
        ({ children }) => <ul>{children}</ul>,
        { Item: ({ children }) => <li>{children}</li> }
    ),
    OverlayTrigger: ({ children }) => children,
    Tooltip:        ({ children }) => <div>{children}</div>,
    Collapse:       ({ children }) => <div>{children}</div>,
    Accordion:      ({ children }) => <div>{children}</div>,
}));

// ── react-router-dom ───────────────────────────────────────────────────────
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useHistory:  () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
        useParams:   () => ({}),
        useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
        Link:        ({ children, to }) => <a href={to}>{children}</a>,
    };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => {
    const { forwardRef } = require('react');
    return {
        Typeahead:      forwardRef(() => null),
        AsyncTypeahead: forwardRef(() => null),
    };
});

// ── react-select-country-list ──────────────────────────────────────────────
jest.mock('react-select-country-list', () => () => ({
    getData: () => [{ value: 'SA', label: 'Saudi Arabia' }],
}));

// ── utils ──────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: jest.fn(),
}));

// ── global fetch ───────────────────────────────────────────────────────────
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

// ── localStorage stub ──────────────────────────────────────────────────────
beforeEach(() => {
    localStorage.setItem('access_token', 'test-token');
    jest.useFakeTimers();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    localStorage.clear();
});

// ── Component under test ───────────────────────────────────────────────────
import WarehouseCreate from '../create.js';

// ── Smoke tests ────────────────────────────────────────────────────────────
describe('WarehouseCreate smoke tests', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <WarehouseCreate />
            </MemoryRouter>
        );
    });

    it('renders without crashing when forwarded ref is provided', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <WarehouseCreate ref={ref} />
            </MemoryRouter>
        );
    });

    it('renders without crashing with optional props', () => {
        const refreshList = jest.fn();
        const showToastMessage = jest.fn();
        const openDetailsView = jest.fn();
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <WarehouseCreate
                    ref={ref}
                    refreshList={refreshList}
                    showToastMessage={showToastMessage}
                    openDetailsView={openDetailsView}
                />
            </MemoryRouter>
        );
    });
});
