/**
 * What a list screen does when the API rejects the session (401) or is down.
 * Sales payments is used as the representative list: every list page uses the
 * same `fetch(...).then(!ok → reject).catch(log)` pattern.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesPaymentIndex from '../index';

jest.mock('../create', () => {
    const React = require('react');
    return React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ open: jest.fn() })); return null; });
});
jest.mock('../view', () => {
    const React = require('react');
    return React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ open: jest.fn() })); return null; });
});
jest.mock('react-bootstrap', () => ({
    Button: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Spinner: ({ animation }) => <span data-testid={`spinner-${animation}`} />,
    Badge: ({ children }) => <span>{children}</span>,
}));
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null, AsyncTypeahead: () => null }));
jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn().mockResolvedValue(false) }));
jest.mock('react-number-format', () => () => null);
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/PaginationControls.js', () => () => null);

const flush = async (n = 20) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
const res = (status, body) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
});
const LIST_OK = {
    result: [{ id: 'p1', code: 'SP-1', date: '2026-01-01T00:00:00Z', amount: 50, method: 'cash', order_code: 'S-1', created_at: '2026-01-01T00:00:00Z' }],
    total_count: 1,
    meta: { total_payment: 50 },
};

let originalLocation;
beforeAll(() => { originalLocation = window.location; });
afterAll(() => { window.location = originalLocation; });

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'expired-token');
    localStorage.setItem('store_id', 's1');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    delete window.location;
    window.location = { href: '', pathname: '/dashboard/sales-payments', replace: jest.fn(), assign: jest.fn() };
});
afterEach(() => jest.restoreAllMocks());

async function renderList() {
    let utils;
    await act(async () => {
        utils = render(<MemoryRouter><SalesPaymentIndex /></MemoryRouter>);
        await flush();
    });
    return utils;
}

const listCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/v1/sales-payment?'));

describe('SalesPaymentIndex — 401 / API failure', () => {
    test('list request carries the stored token', async () => {
        global.fetch = jest.fn().mockResolvedValue(res(200, LIST_OK));
        await renderList();
        expect(listCalls()[0][1].headers.Authorization).toBe('expired-token');
    });

    test('401 from the list call: page does not crash and the loading spinner stops', async () => {
        global.fetch = jest.fn().mockResolvedValue(res(401, { errors: { access_token: 'token expired' } }));
        await renderList();
        expect(screen.getByText('sales_payments')).toBeInTheDocument();
        expect(screen.queryByTestId('spinner-grow')).not.toBeInTheDocument();
    });

    test('network error from the list call: page does not crash, refresh works afterwards', async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(res(200, LIST_OK));
        await renderList();
        expect(screen.getByText('sales_payments')).toBeInTheDocument();
        const before = listCalls().length;
        const refresh = document.querySelector('.fa-refresh').closest('button');
        await act(async () => { fireEvent.click(refresh); await flush(); });
        expect(listCalls().length).toBe(before + 1);
    });

    test('500 with a non-JSON body does not crash', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false, status: 500, headers: { get: () => 'text/html' }, json: () => Promise.reject(new Error('html')),
        });
        await renderList();
        expect(screen.getByText('sales_payments')).toBeInTheDocument();
    });

    // KNOWN BUG: list screens swallow a 401 (the catch only console.logs). The user
    // sees an empty list with no message and keeps the expired token, instead of
    // being sent back to the login page. There is no global fetch/401 handler.
    // Expected: token cleared and redirect to "/" (or a visible "session expired").
    test.skip('401 from the list call clears the session and redirects to login', async () => {
        global.fetch = jest.fn().mockResolvedValue(res(401, { errors: { access_token: 'token expired' } }));
        await renderList();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(window.location === '/' || window.location.href === '/' || window.location.replace.mock.calls.length > 0).toBe(true);
    });
});
