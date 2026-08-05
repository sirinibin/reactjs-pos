import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── child domain components ──────────────────────────────────────────────────
// Both are attached via useRef (.current.open()), so they must accept a ref.
jest.mock('../create.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, _ref) => null);
});
jest.mock('../view.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, _ref) => null);
});

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Button = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  const Spinner = ({ children }) => <span>{children}</span>;
  const Badge = ({ children }) => <span>{children}</span>;
  return { Button, Spinner, Badge };
});

// ── react-bootstrap-typeahead ────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => ({ value, renderText }) =>
  renderText ? renderText(value, {}) : value
);

// ── react-bootstrap-confirmation ─────────────────────────────────────────────
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// ── utils ────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── component under test ─────────────────────────────────────────────────────
import QuotationSalesReturnPaymentIndex from '../index.js';

// ── suite ────────────────────────────────────────────────────────────────────
describe('QuotationSalesReturnPaymentIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: [],
          data: [],
          total_count: 0,
          meta: { total_payment: 0 },
          store: {},
          settings: {},
        }),
    });
    localStorage.clear();
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('store_id', 'store-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing inside MemoryRouter', () => {
    render(
      <MemoryRouter>
        <QuotationSalesReturnPaymentIndex />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });

  test('renders the section heading', () => {
    const { getByText } = render(
      <MemoryRouter>
        <QuotationSalesReturnPaymentIndex />
      </MemoryRouter>
    );
    expect(getByText(/Qtn\. Sales Return Payments/i)).toBeTruthy();
  });

  test('renders with a quotationsalesReturn prop without crashing', () => {
    const fakeReturn = { id: 'qsr-1', net_total: 500 };
    render(
      <MemoryRouter>
        <QuotationSalesReturnPaymentIndex quotationsalesReturn={fakeReturn} />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
