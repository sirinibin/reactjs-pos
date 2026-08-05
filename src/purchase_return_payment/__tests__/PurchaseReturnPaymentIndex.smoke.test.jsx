import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / asset mocks ──────────────────────────────────────────────────────────

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── External library mocks ─────────────────────────────────────────────────────

jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Button = ({ children, onClick, disabled, className, style }) =>
    React.createElement('button', { onClick, disabled, className, style }, children);
  const Spinner = () => null;
  const Badge = ({ children }) => React.createElement('span', null, children);
  return { Button, Spinner, Badge };
});

jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: require('react').forwardRef((_props, _ref) => null),
  AsyncTypeahead: () => null,
}));

jest.mock('react-bootstrap-confirmation', () => ({
  __esModule: true,
  default: {},
  confirm: jest.fn().mockResolvedValue(false),
}));

jest.mock('react-number-format', () => {
  const React = require('react');
  const NumberFormat = ({ renderText, value }) =>
    renderText
      ? React.createElement('span', null, renderText(value, {}))
      : React.createElement('span', null, value);
  return { __esModule: true, default: NumberFormat };
});

// ── Utility mocks ──────────────────────────────────────────────────────────────

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── Child domain component mocks ───────────────────────────────────────────────

jest.mock('../create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

// ── Component under test ───────────────────────────────────────────────────────

import PurchaseReturnPaymentIndex from '../index.js';

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('PurchaseReturnPaymentIndex smoke test', () => {
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
        }),
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnPaymentIndex showToastMessage={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders with a purchaseReturn prop without crashing', () => {
    const purchaseReturn = {
      id: 'pr-1',
      net_total: 1000,
      cash_discount: 50,
    };
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnPaymentIndex
          purchaseReturn={purchaseReturn}
          showToastMessage={jest.fn()}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    const { getByText } = render(
      <MemoryRouter>
        <PurchaseReturnPaymentIndex showToastMessage={jest.fn()} />
      </MemoryRouter>
    );
    expect(getByText('Purchase Return Payments')).toBeTruthy();
  });
});
