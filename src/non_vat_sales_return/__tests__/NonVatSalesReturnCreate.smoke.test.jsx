/**
 * Smoke test for NonVATSalesReturnIndex (non_vat_sales_return/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ─────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    Menu: () => null,
    MenuItem: () => null,
}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');

    const Button = ({ children, ...rest }) => React.createElement('button', rest, children);

    const ModalHeader = ({ children }) => React.createElement('div', null, children);
    const ModalTitle = ({ children }) => React.createElement('div', null, children);
    const ModalBody = ({ children }) => React.createElement('div', null, children);
    const ModalFooter = ({ children }) => React.createElement('div', null, children);

    const Modal = ({ children, show }) =>
        show ? React.createElement('div', null, children) : null;
    Modal.Header = ModalHeader;
    Modal.Title = ModalTitle;
    Modal.Body = ModalBody;
    Modal.Footer = ModalFooter;

    const Spinner = () => null;
    const Form = ({ children }) => React.createElement('form', null, children);
    const Row = ({ children }) => React.createElement('div', null, children);
    const Col = ({ children }) => React.createElement('div', null, children);
    const Container = ({ children }) => React.createElement('div', null, children);
    const Table = ({ children }) => React.createElement('table', null, children);
    const Badge = ({ children }) => React.createElement('span', null, children);
    const Alert = ({ children }) => React.createElement('div', null, children);
    const Card = ({ children }) => React.createElement('div', null, children);
    Card.Body = ({ children }) => React.createElement('div', null, children);
    Card.Header = ({ children }) => React.createElement('div', null, children);
    const InputGroup = ({ children }) => React.createElement('div', null, children);
    InputGroup.Text = ({ children }) => React.createElement('span', null, children);
    const Dropdown = ({ children }) => React.createElement('div', null, children);
    Dropdown.Toggle = ({ children }) => React.createElement('button', null, children);
    Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
    Dropdown.Item = ({ children }) => React.createElement('div', null, children);

    return {
        Button,
        Modal,
        Spinner,
        Form,
        Row,
        Col,
        Container,
        Table,
        Badge,
        Alert,
        Card,
        InputGroup,
        Dropdown,
    };
});

// ── WebSocketContext ──────────────────────────────────────────────────────────
jest.mock('../../utils/WebSocketContext.js', () => {
    const React = require('react');
    return {
        WebSocketContext: React.createContext({ lastMessage: null }),
    };
});

// ── child components → lightweight stubs ──────────────────────────────────────
const Stub = () => null;

jest.mock('../../quotation/QuotationType3Form.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: Stub }));

// ── component under test ──────────────────────────────────────────────────────
import NonVATSalesReturnIndex from '../index.js';

// ── suite ─────────────────────────────────────────────────────────────────────
describe('NonVATSalesReturnIndex smoke test', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('renders without crashing inside MemoryRouter', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <NonVATSalesReturnIndex />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
