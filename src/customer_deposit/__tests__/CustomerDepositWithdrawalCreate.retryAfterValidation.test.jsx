// Regression: handleCreate set submittingRef.current = true and then
// `if (!validatePaymentAmounts()) return;` left it true, so after one refused
// save (e.g. amount -20 → "Amount should be greater than zero") correcting the
// amount and clicking Create again did nothing (no POST was ever sent).
// Covers both customer_deposit/create.js and customer_withdrawal/create.js.
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const passthrough = ({ children }) => React.createElement('div', null, children);
  const Modal = ({ children, show }) => (show ? React.createElement('div', null, children) : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  const Button = ({ children, onClick, disabled }) =>
    React.createElement('button', { type: 'button', onClick, disabled }, children);
  return { Modal, Button, Spinner: () => null };
});

jest.mock('react-bootstrap-typeahead', () => {
  const React = require('react');
  return {
    Typeahead: React.forwardRef(() => null),
    Menu: ({ children }) => React.createElement('div', null, children),
    MenuItem: ({ children }) => React.createElement('div', null, children),
  };
});

jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn() }));
jest.mock('react-draggable', () => ({ children }) => children);

// Child forms / pickers (both components)
jest.mock('../../customer/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../vendor/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../employee/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/customer_pending.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/vendor_pending.js', () => require('react').forwardRef(() => null));
jest.mock('../../customer/view.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/customers.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/vendors.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/employees.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/sales.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/purchase-returns.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/quotations.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/salesReturn.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/purchases.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/quotation_sales_returns.js', () => require('react').forwardRef(() => null));
jest.mock('../preview.js', () => require('react').forwardRef(() => null));
jest.mock('../../order/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../purchase_return/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../quotation/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../purchase/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../sales_return/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../quotation_sales_return/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../store/zatca_connect.js', () => require('react').forwardRef(() => null));
jest.mock('../../utils/InfoDialog', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);

jest.mock('../../utils/search.js', () => ({ highlightWords: (text) => text }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn() }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: () => {} }));

import CustomerDepositCreate from '../create.js';
import CustomerWithdrawalCreate from '../../customer_withdrawal/create.js';
import { fetchStore } from '../../utils/storeUtils.js';

const flush = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('access_token', 'tok');
  localStorage.setItem('store_id', 'store1');
  // CRA enables resetMocks, so (re)install implementations per test
  fetchStore.mockImplementation(() => Promise.resolve({ id: 'store1', settings: {} }));
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: { id: 'new1' } }),
  }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const writes = () => global.fetch.mock.calls.filter(([, o]) => o && (o.method === 'POST' || o.method === 'PUT'));

describe.each([
  ['CustomerDepositCreate', CustomerDepositCreate, 'customer_receivable', '/v1/customer-deposit'],
  ['CustomerWithdrawalCreate', CustomerWithdrawalCreate, 'customer_payable', '/v1/customer-withdrawal'],
])('%s — Create works again after a refused save', (_name, Component, prefix, endpoint) => {
  it('refused save (amount -20), fix amount to 20, second Create sends the POST', async () => {
    const ref = React.createRef();
    const { container, findByText } = render(
      <MemoryRouter>
        <Component ref={ref} />
      </MemoryRouter>
    );
    await act(async () => { ref.current.open(); });
    await flush(10);

    const form = container.querySelector('form.pw-form');
    fireEvent.change(container.querySelector(`#${prefix}_payment_method_0`), { target: { value: 'cash' } });
    fireEvent.change(container.querySelector(`#${prefix}_payment_amount_0`), { target: { value: '-20' } });

    await act(async () => { fireEvent.submit(form); });
    await flush(10);
    expect(await findByText('Amount should be greater than zero')).toBeTruthy();
    expect(writes()).toHaveLength(0);

    fireEvent.change(container.querySelector(`#${prefix}_payment_amount_0`), { target: { value: '20' } });
    await act(async () => { fireEvent.submit(form); });
    await flush(10);

    const sent = writes();
    expect(sent).toHaveLength(1);
    expect(sent[0][0].startsWith(endpoint + '?')).toBe(true);
    expect(sent[0][1].method).toBe('POST');
    expect(JSON.parse(sent[0][1].body).payments[0].amount).toBe(20);
  });
});
