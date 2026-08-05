import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => ({
  Button: ({ children, onClick, disabled, variant, className }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Spinner: () => <span />,
}));

// --- react-bootstrap-confirmation ---
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(false)),
}));

// --- child domain components ---
// PostingIndex uses forwardRef; factory cannot reference out-of-scope React, so use require
jest.mock('../../posting/index.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, _ref) => null);
});

// --- utils ---
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// Fake timers at module level so they are active before any test lifecycle
jest.useFakeTimers();

beforeEach(() => {
  // Re-assign each time so clearAllMocks cannot leave it stale
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          meta: { debit_balance_total: 0, credit_balance_total: 0 },
        }),
    })
  );
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import AccountIndex from '../index.js';

describe('AccountIndex smoke test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <AccountIndex />
      </MemoryRouter>
    );
  });
});
