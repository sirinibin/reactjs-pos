import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock CSS files
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock react-bootstrap components
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  return { Modal };
});

jest.mock('react-bootstrap/Modal', () => {
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  return Modal;
});

jest.mock('react-bootstrap/Tab', () => ({ children }) => <div>{children}</div>);
jest.mock('react-bootstrap/Tabs', () => ({ children }) => <div>{children}</div>);
jest.mock('react-bootstrap/Badge', () => ({ children }) => <span>{children}</span>);
jest.mock('react-bootstrap/Button', () => ({ children, ...rest }) => <button {...rest}>{children}</button>);

// Mock react-draggable
jest.mock('react-draggable', () => ({ children }) => <div>{children}</div>);

// Mock react-router-dom (keep MemoryRouter real)
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    Link: () => null,
  };
});

// Mock react-datepicker
jest.mock('react-datepicker', () => () => null);

// Mock child domain components (paths relative to test file in src/utils/__tests__)
// OrderIndex exposes a button so tests can trigger the onSelectSale callback.
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
  const { forwardRef, useImperativeHandle, createElement } = require('react');
  const openMock = jest.fn();
  const MockPostingIndex = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ open: openMock }));
    return createElement('div', { 'data-testid': 'posting-index-mock' });
  });
  MockPostingIndex.__openMock = openMock;
  return MockPostingIndex;
});

// Mock utils (same directory as vendor_pending.js → ../  from __tests__)
jest.mock('../numberUtils', () => ({
  trimTo2Decimals: jest.fn((v) => (v != null ? Number(v).toFixed(2) : '0.00')),
}));
jest.mock('../amount.js', () => () => null);
jest.mock('../queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// Routes by URL so getVendor()/getCustomer() each get realistic responses.
function installFetchMock({ vendor, customer } = {}) {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/v1/vendor/vat_no/name')) {
      // not used by vendor_pending.js directly but kept for symmetry/safety
      return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: vendor || {} }) });
    }
    if (typeof url === 'string' && url.includes('/v1/vendor/')) {
      return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: vendor || {} }) });
    }
    if (typeof url === 'string' && url.includes('/v1/customer/vat_no/name')) {
      return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: customer || {} }) });
    }
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: {}, data: [], total_count: 0 }) });
  });
}

// Fake timers — must be (re-)established inside beforeEach; a top-level
// jest.useFakeTimers() does not carry over into the jest-circus execution phase.
beforeEach(() => {
  jest.useFakeTimers();
  installFetchMock({
    vendor: { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1', account: 'acc-1' },
    customer: { id: 'c1', name: 'Acme', vat_no: 'VAT1' },
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

import VendorPending from '../vendor_pending.js';
import MockPostingIndex from '../../posting/index.js';

describe('VendorPending', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <VendorPending />
      </MemoryRouter>
    );
  });

  it('open(false, vendor) shows the modal and eventually the vendor pendings title', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1' }));
    expect(await screen.findByText(/V-001\/Acme's Pendings/)).toBeInTheDocument();
  });

  it('open(true, vendor) shows "Select Sale" regardless of fetched vendor data', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(true, { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1' }));
    expect(screen.getByText('Select Sale')).toBeInTheDocument();
  });

  it('does not fetch a matching customer when the vendor has no vat_no (getCustomer guard clause)', async () => {
    installFetchMock({ vendor: { id: 'v1', name: 'Acme', code: 'V-001' } }); // no vat_no
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'v1', name: 'Acme', code: 'V-001' }));
    const customerCalls = global.fetch.mock.calls.filter(([url]) => typeof url === 'string' && url.includes('/v1/customer/'));
    expect(customerCalls.length).toBe(0);
  });

  it('fetches a matching customer when the vendor has a vat_no', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1' }));
    const customerCalls = global.fetch.mock.calls.filter(([url]) => typeof url === 'string' && url.includes('/v1/customer/'));
    expect(customerCalls.length).toBeGreaterThan(0);
  });

  it('selecting a sale calls props.onSelectSale and closes the modal', async () => {
    const onSelectSale = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} onSelectSale={onSelectSale} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(true, { id: 'v1', name: 'Acme', code: 'V-001' }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    act(() => screen.getByTestId('order-select-sale').click());
    expect(onSelectSale).toHaveBeenCalledWith({ id: 'sale1' });
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('the balance sheet button is disabled when the vendor has no account', async () => {
    installFetchMock({ vendor: { id: 'v1', name: 'Acme', code: 'V-001' } }); // no account
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'v1', name: 'Acme', code: 'V-001' }));
    expect(screen.getByText('Balance Sheet').closest('button')).toBeDisabled();
  });

  it('clicking the balance sheet button (when enabled) opens PostingIndex after the timeout', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <VendorPending ref={ref} />
      </MemoryRouter>
    );
    await act(async () => ref.current.open(false, { id: 'v1', name: 'Acme', code: 'V-001', vat_no: 'VAT1', account: 'acc-1' }));
    const btn = screen.getByText('Balance Sheet').closest('button');
    expect(btn).not.toBeDisabled();
    act(() => btn.click());
    expect(screen.getByTestId('posting-index-mock')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(100); });
    expect(MockPostingIndex.__openMock).toHaveBeenCalledWith('acc-1');
  });
});
