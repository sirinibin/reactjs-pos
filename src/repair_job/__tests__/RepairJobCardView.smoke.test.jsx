import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');

    const Spinner = () => null;
    const Tooltip = ({ children }) => React.createElement('span', null, children);
    const OverlayTrigger = ({ children }) =>
        typeof children === 'function' ? children({}) : children;

    const DropdownMenu = ({ children }) => React.createElement('div', null, children);
    const DropdownToggle = React.forwardRef(({ children, onClick }, ref) =>
        React.createElement('button', { ref, onClick }, children)
    );
    const DropdownItem = ({ children, onClick }) =>
        React.createElement('div', { onClick }, children);
    const DropdownDivider = () => React.createElement('hr', null);

    const Dropdown = ({ children }) => React.createElement('div', null, children);
    Dropdown.Toggle  = DropdownToggle;
    Dropdown.Menu    = DropdownMenu;
    Dropdown.Item    = DropdownItem;
    Dropdown.Divider = DropdownDivider;

    return { Spinner, OverlayTrigger, Tooltip, Dropdown };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => {
    const React = require('react');
    const Typeahead = React.forwardRef((props, ref) =>
        React.createElement('input', { ref, placeholder: props.placeholder })
    );
    const Menu     = ({ children }) => React.createElement('div', null, children);
    const MenuItem = ({ children }) => React.createElement('div', null, children);
    return { Typeahead, Menu, MenuItem };
});

// ── utility mocks ─────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/search.js', () => ({
    highlightWords: jest.fn((text) => text),
}));

// ── kanban_utils ──────────────────────────────────────────────────────────────
jest.mock('../kanban_utils.js', () => ({
    loadKanbanLists:      jest.fn(() => []),
    loadCardMap:          jest.fn(() => ({})),
    saveCardMap:          jest.fn(),
    statusToDefaultListId: jest.fn(() => 'open'),
}));

// ── child domain components (all use forwardRef + useImperativeHandle) ────────
jest.mock('../../customer/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../customer/history_modal.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../utils/customers.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../vehicle/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../vehicle/view.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../employee/create.js', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(() => null) };
});

// ── component under test ──────────────────────────────────────────────────────
import RepairJobCardView from '../card_view.js';

// ── global setup ──────────────────────────────────────────────────────────────
beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () =>
            Promise.resolve({
                result: {},
                data: [],
                total_count: 0,
                store: {},
                settings: {},
            }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('RepairJobCardView smoke test', () => {
    it('renders without crashing inside MemoryRouter', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <RepairJobCardView ref={ref} />
            </MemoryRouter>
        );
    });

    it('renders without crashing when optional callback props are provided', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <RepairJobCardView
                    ref={ref}
                    onFullEdit={jest.fn()}
                    onKanbanListChange={jest.fn()}
                    onJobUpdated={jest.fn()}
                    showToastMessage={jest.fn()}
                    onCreateSalesInvoice={jest.fn()}
                    onCreateQuotation={jest.fn()}
                    onCreateNonVatInvoice={jest.fn()}
                    onOpenSalesInvoice={jest.fn()}
                    onOpenQuotation={jest.fn()}
                    onOpenNonVatInvoice={jest.fn()}
                    openUpdateProductForm={jest.fn()}
                />
            </MemoryRouter>
        );
    });
});
