/**
 * The repair job form starts with the walk-in UNKNOWN customer. A person must be
 * able to type over it to search for and pick a real customer, and the vehicle
 * search then follows that customer (it is not narrowed to UNKNOWN).
 */
import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';

jest.mock('react-bootstrap', () => {
    const MockModal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    MockModal.Header = ({ children }) => <div>{children}</div>;
    MockModal.Title = ({ children }) => <div>{children}</div>;
    MockModal.Body = ({ children }) => <div>{children}</div>;
    MockModal.Footer = ({ children }) => <div>{children}</div>;
    return {
        Modal: MockModal,
        Spinner: () => null,
        Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    };
});

// Typeahead stand-in that records its props, so a test can act as the user.
const typeaheads = {};
jest.mock('react-bootstrap-typeahead', () => {
    const { forwardRef } = require('react');
    return {
        Typeahead: forwardRef((props, ref) => {
            typeaheads[props.id] = props;
            return <input data-testid={`ta-${props.id}`} readOnly value={(props.selected && props.selected[0] && props.selected[0].label) || ''} />;
        }),
        Menu: ({ children }) => <div>{children}</div>,
        MenuItem: ({ children }) => <div>{children}</div>,
    };
});
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: () => Promise.resolve({}) }));
jest.mock('../../employee/create.js', () => require('react').forwardRef(() => null));

import RepairJobCreate from '../create.js';

const UNKNOWN = { id: 'unk1', name: 'UNKNOWN' };
const REAL = { id: 'cust1', name: 'Real Client' };
const json = (body) => Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

const urls = () => global.fetch.mock.calls.map(([u]) => decodeURIComponent(String(u)));
const unknownLookups = () => urls().filter((u) => u.startsWith('/v1/customer?') && u.includes('search[name]=UNKNOWN')).length;
const vehicleSearches = () => urls().filter((u) => u.startsWith('/v1/vehicle?'));

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.setItem('access_token', 't');
    localStorage.setItem('store_id', 's1');
    global.fetch = jest.fn((url) => {
        const u = decodeURIComponent(String(url));
        if (u.startsWith('/v1/customer?') && u.includes('search[name]=UNKNOWN')) return json({ result: [UNKNOWN] });
        if (u.startsWith('/v1/customer?')) return json({ result: [REAL] });
        if (u.startsWith('/v1/vehicle?')) return json({ result: [] });
        return json({ result: {} });
    });
});

afterEach(() => {
    jest.clearAllTimers();
    localStorage.clear();
});

async function openForm() {
    const ref = createRef();
    const view = render(<RepairJobCreate ref={ref} />);
    await act(async () => { ref.current.open(); });
    await act(async () => { jest.advanceTimersByTime(100); await flush(); });
    return view;
}

test('starts with the walk-in UNKNOWN customer', async () => {
    const { getByTestId } = await openForm();
    expect(getByTestId('ta-customer_id').value).toBe('UNKNOWN');
});

test('typing over UNKNOWN leaves the input to the search instead of putting UNKNOWN back', async () => {
    const { getByTestId } = await openForm();
    expect(unknownLookups()).toBe(1);
    // react-bootstrap-typeahead clears the selection on the first key typed over it.
    await act(async () => { typeaheads.customer_id.onChange([]); await flush(); });
    await act(async () => { typeaheads.customer_id.onInputChange('Real'); await flush(); });
    expect(unknownLookups()).toBe(1);
    expect(getByTestId('ta-customer_id').value).toBe('');
    expect(urls().some((u) => u.startsWith('/v1/customer?') && u.includes('search[name]=Real'))).toBe(true);

    await act(async () => { typeaheads.customer_id.onChange([{ ...REAL, label: REAL.name }]); await flush(); });
    expect(getByTestId('ta-customer_id').value).toBe('Real Client');
});

test('vehicle search is not narrowed to UNKNOWN, and follows a picked customer', async () => {
    await openForm();
    await act(async () => { typeaheads.vehicle_id.onInputChange('RJ 1'); await flush(); });
    const first = vehicleSearches().pop();
    expect(first).toContain('RJ 1');
    expect(first).not.toContain(UNKNOWN.id);

    await act(async () => { typeaheads.customer_id.onChange([{ ...REAL, label: REAL.name }]); await flush(); });
    await act(async () => { typeaheads.vehicle_id.onInputChange('RJ 1'); await flush(); });
    expect(vehicleSearches().pop()).toContain(`customer_id]=${REAL.id}`);
});

test('a customer cleared and not replaced is saved as the walk-in customer', async () => {
    const { fireEvent } = require('@testing-library/react');
    await openForm();
    await act(async () => { typeaheads.customer_id.onChange([]); await flush(); });
    await act(async () => { fireEvent.submit(document.querySelector('form')); await flush(); });
    const post = global.fetch.mock.calls.find(([u, o]) => String(u).startsWith('/v1/repair-job?') && o && o.method === 'POST');
    expect(JSON.parse(post[1].body).customer_id).toBe(UNKNOWN.id);
});
