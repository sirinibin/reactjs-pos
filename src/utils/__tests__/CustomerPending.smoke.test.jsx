// Smoke test for src/utils/customer_pending.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// ── CSS / asset stubs ────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap (named-import style) ─────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const React = require('react');
  return {
    Modal: Object.assign(
      ({ show, children }) => (show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null),
      {
        Header: ({ children }) => React.createElement('div', null, children),
        Title: ({ children }) => React.createElement('div', null, children),
        Body: ({ children }) => React.createElement('div', null, children),
        Footer: ({ children }) => React.createElement('div', null, children),
      }
    ),
    Button: ({ children, onClick }) => React.createElement('button', { onClick }, children),
    Badge: ({ children }) => React.createElement('span', null, children),
    Form: Object.assign(
      ({ children }) => React.createElement('form', null, children),
      {
        Group: ({ children }) => React.createElement('div', null, children),
        Label: ({ children }) => React.createElement('label', null, children),
        Control: () => React.createElement('input', null),
        Check: () => React.createElement('input', { type: 'checkbox' }),
        Select: ({ children }) => React.createElement('select', null, children),
        Text: ({ children }) => React.createElement('small', null, children),
      }
    ),
    Table: ({ children }) => React.createElement('table', null, children),
    Row: ({ children }) => React.createElement('div', null, children),
    Col: ({ children }) => React.createElement('div', null, children),
    Spinner: () => React.createElement('div', null, 'Loading…'),
    Alert: ({ children }) => React.createElement('div', null, children),
    Dropdown: Object.assign(
      ({ children }) => React.createElement('div', null, children),
      {
        Toggle: ({ children }) => React.createElement('button', null, children),
        Menu: ({ children }) => React.createElement('div', null, children),
        Item: ({ children }) => React.createElement('div', null, children),
      }
    ),
    Tabs: ({ children }) => React.createElement('div', null, children),
    Tab: ({ children }) => React.createElement('div', null, children),
  };
});

// ── react-bootstrap sub-path imports ─────────────────────────────────────────
jest.mock('react-bootstrap/Tab', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', null, children);
});
jest.mock('react-bootstrap/Tabs', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', null, children);
});
jest.mock('react-bootstrap/Badge', () => {
  const React = require('react');
  return ({ children }) => React.createElement('span', null, children);
});
jest.mock('react-bootstrap/Button', () => {
  const React = require('react');
  return ({ children, ...rest }) => React.createElement('button', rest, children);
});

// ── react-draggable ───────────────────────────────────────────────────────────
jest.mock('react-draggable', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', null, children);
});

// ── react-router-dom (keep MemoryRouter real) ─────────────────────────────────
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    Link: ({ children }) => children,
  };
});

// ── domain child components ───────────────────────────────────────────────────
// OrderIndex exposes a button so tests can trigger the onSelectSale callback
// (used to verify handleSelected/handleClose behavior).
jest.mock('../../order/index.js', () => (props) => {
  const React = require('react');
  return React.createElement(
    'button',
    { 'data-testid': 'order-select-sale', onClick: () => props.onSelectSale && props.onSelectSale({ id: 'sale1' }) },
    'select-sale'
  );
});
jest.mock('../../sales_return/index.js', () => () => null);
jest.mock('../../quotation/index.js', () => () => null);
jest.mock('../../quotation_sales_return/index.js', () => () => null);
jest.mock('../../purchase/index.js', () => () => null);
jest.mock('../../purchase_return/index.js', () => () => null);
jest.mock('../../posting/index.js', () => {
  const React = require('react');
  const openMock = jest.fn();
  const MockPostingIndex = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: openMock }));
    return React.createElement('div', { 'data-testid': 'posting-index-mock' });
  });
  MockPostingIndex.__openMock = openMock;
  return MockPostingIndex;
});

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../numberUtils', () => ({
  trimTo2Decimals: jest.fn((v) => (v != null ? Number(v).toFixed(2) : '0.00')),
}));
jest.mock('../amount.js', () => () => null);
jest.mock('../queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// ── global fetch ──────────────────────────────────────────────────────────────
// Routes by URL so getCustomer()/getVendor() each get realistic responses.
function installFetchMock({ customer, vendor } = {}) {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/v1/customer/')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: customer || {} }),
      });
    }
    if (typeof url === 'string' && url.includes('/v1/vendor/vat_no/name')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: vendor || {} }),
      });
    }
    return Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, data: [], total_count: 0 }),
    });
  });
}

// ── timers ────────────────────────────────────────────────────────────────────
// Must be (re-)established inside beforeEach — top-level jest.useFakeTimers()
// does not carry over into the jest-circus test execution phase.
beforeEach(() => {
  jest.useFakeTimers();
  installFetchMock({
    customer: { id: 'c1', name: 'Acme', code: 'C-001', vat_no: 'VAT1', account: 'acc-1' },
    vendor: { id: 'v1', name: 'Acme', vat_no: 'VAT1' },
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ── actual test ───────────────────────────────────────────────────────────────
import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerPending from '../customer_pending.js';
import MockPostingIndex from '../../posting/index.js';

describe('CustomerPending smoke test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <CustomerPending />
      </MemoryRouter>
    );
  });

  it('open(false, customer) shows the modal and eventually the customer pendings title', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'c1', name: 'Acme', code: 'C-001', vat_no: 'VAT1' }));
    expect(await screen.findByText(/C-001\/Acme's Pendings/)).toBeInTheDocument();
  });

  it('open(true, customer) shows "Select Sale" regardless of fetched customer data', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(true, { id: 'c1', name: 'Acme', code: 'C-001', vat_no: 'VAT1' }));
    expect(screen.getByText('Select Sale')).toBeInTheDocument();
  });

  it('does not fetch a matching vendor when the customer has no vat_no (getVendor guard clause)', async () => {
    installFetchMock({ customer: { id: 'c1', name: 'Acme', code: 'C-001' } }); // no vat_no
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'c1', name: 'Acme', code: 'C-001' }));
    const vendorCalls = global.fetch.mock.calls.filter(([url]) => typeof url === 'string' && url.includes('/v1/vendor/'));
    expect(vendorCalls.length).toBe(0);
  });

  it('fetches a matching vendor when the customer has a vat_no', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'c1', name: 'Acme', code: 'C-001', vat_no: 'VAT1' }));
    const vendorCalls = global.fetch.mock.calls.filter(([url]) => typeof url === 'string' && url.includes('/v1/vendor/'));
    expect(vendorCalls.length).toBeGreaterThan(0);
  });

  it('selecting a sale calls props.onSelectSale and closes the modal', async () => {
    const onSelectSale = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} onSelectSale={onSelectSale} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(true, { id: 'c1', name: 'Acme', code: 'C-001' }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    act(() => screen.getByTestId('order-select-sale').click());
    expect(onSelectSale).toHaveBeenCalledWith({ id: 'sale1' });
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('the balance sheet button is disabled when the customer has no account', async () => {
    installFetchMock({ customer: { id: 'c1', name: 'Acme', code: 'C-001' } }); // no account
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'c1', name: 'Acme', code: 'C-001' }));
    expect(screen.getByText('Balance Sheet').closest('button')).toBeDisabled();
  });

  it('clicking the balance sheet button (when enabled) opens PostingIndex after the timeout', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'c1', name: 'Acme', code: 'C-001', vat_no: 'VAT1', account: 'acc-1' }));
    const btn = screen.getByText('Balance Sheet').closest('button');
    expect(btn).not.toBeDisabled();
    act(() => btn.click());
    expect(screen.getByTestId('posting-index-mock')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(100); });
    expect(MockPostingIndex.__openMock).toHaveBeenCalledWith('acc-1');
  });
});
