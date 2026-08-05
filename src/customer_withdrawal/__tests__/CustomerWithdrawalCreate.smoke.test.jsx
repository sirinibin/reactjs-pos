import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ──────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── Third-party library mocks ──────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const passthrough = ({ children }) => React.createElement('div', null, children);
  const Modal = ({ children, show }) => show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null;
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  const Button = ({ children, onClick, disabled }) =>
    React.createElement('button', { onClick, disabled }, children);
  const Spinner = () => null;
  return { Modal, Button, Spinner };
});

jest.mock('react-bootstrap-typeahead', () => {
  const React = require('react');
  const Typeahead = React.forwardRef((_props, _ref) => null);
  const Menu = ({ children }) => React.createElement('div', null, children);
  const MenuItem = ({ children }) => React.createElement('div', null, children);
  return { Typeahead, Menu, MenuItem };
});

jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

jest.mock('react-draggable', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', null, children);
});

// ── Local child component mocks ────────────────────────────────────────────
jest.mock('../../customer/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../vendor/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../employee/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/customer_pending.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/vendor_pending.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../customer/view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/customers.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/vendors.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/employees.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/salesReturn.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/purchases.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/quotation_sales_returns.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../customer_deposit/preview.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../purchase/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../sales_return/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../quotation_sales_return/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../utils/InfoDialog', () => () => null);

// ── Utility mocks ──────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => String(parseFloat(v).toFixed(2)),
}));

jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));

jest.mock('../../utils/amount.js', () => () => null);

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: (obj) =>
    Object.entries(obj || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('&'),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── Subject under test ─────────────────────────────────────────────────────
import CustomerWithdrawalCreate from '../create.js';

// ── Test suite ─────────────────────────────────────────────────────────────
describe('CustomerWithdrawalCreate smoke tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <CustomerWithdrawalCreate ref={ref} />
      </MemoryRouter>
    );
    // Component mounts without throwing; modal is hidden by default (show=false)
    expect(document.body).toBeTruthy();
  });
});
