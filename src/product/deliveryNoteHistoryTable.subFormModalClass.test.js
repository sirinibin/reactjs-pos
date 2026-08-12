/**
 * Tests that product/delivery_note_history.js TABLE forwards props.subFormModalClass
 * to the DeliveryNoteView it renders.
 *
 * This verifies the fix: <DeliveryNoteView modalClass={props.subFormModalClass} />
 * so that a DeliveryNoteView opened from within an inner history modal receives
 * the z-index class needed to appear above that modal.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ── mocks ─────────────────────────────────────────────────────────────────────

// Capture props received by DeliveryNoteView
let lastDeliveryNoteViewProps = {};

jest.mock('../delivery_note/view.js', () => {
    const React = require('react');
    return React.forwardRef((props, _ref) => {
        lastDeliveryNoteViewProps = props;
        return <div data-testid="dn-view" data-modal-class={props.modalClass || ''} />;
    });
});

jest.mock('../customer/view.js', () => {
    const React = require('react');
    return React.forwardRef(() => null);
});

// react-bootstrap
jest.mock('react-bootstrap', () => ({
    Button:  ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Spinner: () => null,
    Badge:   ({ children }) => <span>{children}</span>,
}));

// Other dependencies of the TABLE
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => {}, { virtual: true });
jest.mock('react-number-format', () => () => null);
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null }));
jest.mock('../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../utils/storeUtils.js', () => ({ fetchStore: () => Promise.resolve({}) }));
jest.mock('../utils/PaginationControls.js', () => () => null);
jest.mock('date-fns', () => ({ format: () => '' }));

// The TABLE calls list() in a useEffect on mount (setShow(true) is unconditional).
// Use beforeEach (not beforeAll/module-level) because Jest's resetMocks config
// clears mock implementations before each test — beforeEach runs after that reset.
const makeFetchResponse = () => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: [], total_count: 0 }),
});

beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve(makeFetchResponse()));
});

afterEach(() => {
    delete global.fetch;
});

// ── subject ───────────────────────────────────────────────────────────────────

import DeliveryNoteHistoryTable from './delivery_note_history';

// ── tests ─────────────────────────────────────────────────────────────────────

describe('DeliveryNoteHistoryTable – subFormModalClass → DeliveryNoteView modalClass', () => {
    beforeEach(() => {
        lastDeliveryNoteViewProps = {};
    });

    test('1. subFormModalClass="" → DeliveryNoteView receives modalClass=""', () => {
        render(
            <DeliveryNoteHistoryTable
                model={{ name: 'Test Product', _id: 'pid1' }}
                selectedCustomers={[]}
                subFormModalClass=""
            />
        );
        expect(lastDeliveryNoteViewProps.modalClass).toBe('');
    });

    test('2. subFormModalClass="above-inner-history-form" → DeliveryNoteView receives it', () => {
        render(
            <DeliveryNoteHistoryTable
                model={{ name: 'Test Product', _id: 'pid1' }}
                selectedCustomers={[]}
                subFormModalClass="above-inner-history-form"
            />
        );
        expect(lastDeliveryNoteViewProps.modalClass).toBe('above-inner-history-form');
        expect(screen.getByTestId('dn-view')).toHaveAttribute('data-modal-class', 'above-inner-history-form');
    });

    test('3. subFormModalClass not provided → DeliveryNoteView receives undefined', () => {
        render(
            <DeliveryNoteHistoryTable
                model={{ name: 'Test Product', _id: 'pid1' }}
                selectedCustomers={[]}
            />
        );
        // modalClass is undefined when prop is not provided — the view renders with no extra class
        expect(lastDeliveryNoteViewProps.modalClass).toBeUndefined();
    });

    test('4. DeliveryNoteView is always rendered (not gated by show state)', () => {
        render(
            <DeliveryNoteHistoryTable
                model={{ name: 'P', _id: 'id2' }}
                selectedCustomers={[]}
                subFormModalClass="above-inner-history-form"
            />
        );
        // The DeliveryNoteView ref-based view is always mounted so it can be
        // triggered imperatively via ref.open() — it must be in the DOM.
        expect(screen.getByTestId('dn-view')).toBeInTheDocument();
    });

    test('5. arbitrary subFormModalClass is forwarded verbatim', () => {
        render(
            <DeliveryNoteHistoryTable
                model={{ name: 'P', _id: 'id3' }}
                selectedCustomers={[]}
                subFormModalClass="some-other-class"
            />
        );
        expect(lastDeliveryNoteViewProps.modalClass).toBe('some-other-class');
    });

    test('6. subFormModalClass prop change updates the forwarded modalClass', () => {
        const { rerender } = render(
            <DeliveryNoteHistoryTable
                model={{ name: 'P', _id: 'id4' }}
                selectedCustomers={[]}
                subFormModalClass=""
            />
        );
        expect(lastDeliveryNoteViewProps.modalClass).toBe('');

        rerender(
            <DeliveryNoteHistoryTable
                model={{ name: 'P', _id: 'id4' }}
                selectedCustomers={[]}
                subFormModalClass="above-inner-history-form"
            />
        );
        expect(lastDeliveryNoteViewProps.modalClass).toBe('above-inner-history-form');
    });
});
