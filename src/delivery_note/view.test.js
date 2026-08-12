/**
 * Tests that DeliveryNoteView applies the modalClass prop to its Modal's className.
 *
 * Before the fix the className was hard-coded to "above-sales-modal".
 * After the fix it is `above-sales-modal${props.modalClass ? ' ' + props.modalClass : ''}`.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-bootstrap', () => {
    const Modal = ({ className, show, children }) =>
        show ? <div data-testid="dn-view-modal" className={className}>{children}</div> : null;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;
    return { Modal };
});

jest.mock('react-number-format', () => () => null);
jest.mock('./../order/preview.js', () => {
    const React = require('react');
    return React.forwardRef(() => null);
});
jest.mock('./print.js', () => {
    const React = require('react');
    return React.forwardRef(() => null);
});
jest.mock('../utils/numberUtils', () => ({ trimTo2Decimals: (v) => v }));
jest.mock('../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../utils/dateUtils.js', () => ({ formatInStoreTimezone: (d) => String(d) }));
jest.mock('../utils/storeUtils.js', () => ({ fetchStore: () => Promise.resolve({}) }));

// ── subject ───────────────────────────────────────────────────────────────────

import DeliveryNoteView from './view';

// ── helpers ───────────────────────────────────────────────────────────────────

function openView(modalClass) {
    const ref = React.createRef();
    render(<DeliveryNoteView ref={ref} modalClass={modalClass} />);

    // Bypass the fetch in open() by directly triggering SetShow via the ref.
    // open() calls getDeliveryNote (fetch) then SetShow(true).
    // We mock fetch so the show state is set synchronously via the resolved promise.
    global.fetch = jest.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve({ result: {}, status: 200 }),
        })
    );

    act(() => { ref.current.open('test-id'); });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('DeliveryNoteView – modalClass prop applied to className', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({}) })
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('1. without modalClass, className is "above-sales-modal"', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal.className).toBe('above-sales-modal');
    });

    test('2. modalClass="" produces className "above-sales-modal" (empty string is falsy)', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} modalClass="" />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal.className).toBe('above-sales-modal');
    });

    test('3. modalClass="above-inner-history-form" appends to className', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} modalClass="above-inner-history-form" />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal.className).toBe('above-sales-modal above-inner-history-form');
        expect(modal).toHaveClass('above-sales-modal');
        expect(modal).toHaveClass('above-inner-history-form');
    });

    test('4. arbitrary modalClass is appended without a double space', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} modalClass="custom-cls" />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal.className).toBe('above-sales-modal custom-cls');
        expect(modal.className).not.toMatch(/  /); // no double space
    });

    test('5. modalClass=undefined behaves the same as not provided → "above-sales-modal"', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} modalClass={undefined} />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal.className).toBe('above-sales-modal');
    });

    test('6. above-sales-modal base class is always present', async () => {
        const ref = React.createRef();
        render(<DeliveryNoteView ref={ref} modalClass="above-inner-history-form" />);
        await act(async () => { ref.current.open('id1'); });
        const modal = await screen.findByTestId('dn-view-modal');
        expect(modal).toHaveClass('above-sales-modal');
    });
});
