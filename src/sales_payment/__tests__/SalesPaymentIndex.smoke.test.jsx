import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesPaymentIndex from '../index';

// ── Child domain components (use forwardRef — parent calls ref.current.open()) ──
jest.mock('../create', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock('../view', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => ({
  Button:  ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Spinner: () => <span>loading</span>,
  Badge:   ({ children }) => <span>{children}</span>,
}));

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap-typeahead ────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-bootstrap-confirmation ─────────────────────────────────────────────
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: { total_payment: 0 },
        store: {},
        settings: {},
        data: [],
      }),
  });

  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('SalesPaymentIndex smoke tests', () => {
  it('renders without crashing inside MemoryRouter', () => {
    const { container } = render(
      <MemoryRouter>
        <SalesPaymentIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(
      <MemoryRouter>
        <SalesPaymentIndex />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeDefined();
  });

  it('renders the Sales Payments heading', () => {
    const { getByText } = render(
      <MemoryRouter>
        <SalesPaymentIndex />
      </MemoryRouter>
    );
    expect(getByText('Sales Payments')).toBeTruthy();
  });

  it('renders without crashing when an order prop is provided', () => {
    const order = {
      id: 'order-1',
      net_total: 500,
      cash_discount: 50,
    };
    const { container } = render(
      <MemoryRouter>
        <SalesPaymentIndex order={order} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
