// Smoke test for ledger/index.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => ({
  Button: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Spinner: () => <span data-testid="spinner" />,
}));

// --- react-bootstrap-typeahead ---
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
}));

// --- react-router-dom: keep MemoryRouter real, stub hooks/Link ---
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    Link: () => null,
  };
});

// --- child domain component ---
jest.mock('../../posting/index.js', () => {
  const mockReact = require('react');
  // eslint-disable-next-line react/display-name
  return mockReact.forwardRef(() => null);
});

// --- utils ---
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

// ---------------------------------------------------------------------------

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LedgerIndex from '../index.js';

// --- timers & fetch ---
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ---------------------------------------------------------------------------

describe('LedgerIndex smoke test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <LedgerIndex showToastMessage={jest.fn()} />
      </MemoryRouter>
    );
  });
});
