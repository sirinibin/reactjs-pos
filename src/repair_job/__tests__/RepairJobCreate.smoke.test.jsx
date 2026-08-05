import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const MockModal = ({ children, show }) =>
        show ? <div data-testid="modal">{children}</div> : null;
    MockModal.Header = ({ children }) => <div>{children}</div>;
    MockModal.Title  = ({ children }) => <div>{children}</div>;
    MockModal.Body   = ({ children }) => <div>{children}</div>;
    MockModal.Footer = ({ children }) => <div>{children}</div>;
    return {
        Modal:   MockModal,
        Spinner: () => null,
        Button:  ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
        Form:    ({ children }) => <form>{children}</form>,
        Row:     ({ children }) => <div>{children}</div>,
        Col:     ({ children }) => <div>{children}</div>,
    };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    Menu:      ({ children }) => <div>{children}</div>,
    MenuItem:  ({ children }) => <div>{children}</div>,
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => <div>{children}</div>,
    Droppable:       ({ children }) => <div>{children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {})}</div>,
    Draggable:       ({ children }) => <div>{children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, {})}</div>,
}));

// ── utility mocks ─────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: () => Promise.resolve({}),
}));

// ── kanban_utils mock — use plain functions to avoid jest.fn hoisting issues ──
jest.mock('../kanban_utils.js', () => ({
    loadKanbanLists: () => [{ id: 'open', name: 'Open' }],
    loadCardMap:     () => ({}),
    saveCardMap:     () => {},
}));

// ── child components ──────────────────────────────────────────────────────────
jest.mock('../../employee/create.js', () => {
    const { forwardRef } = require('react');
    return forwardRef(() => null);
});

// ── component under test ──────────────────────────────────────────────────────
import RepairJobCreate from '../create.js';

describe('RepairJobCreate smoke test', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.setItem('access_token', 'test-token');
        localStorage.setItem('store_id', 'test-store');
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        localStorage.clear();
    });

    it('renders without crashing inside MemoryRouter', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <RepairJobCreate ref={ref} />
            </MemoryRouter>
        );
    });
});
