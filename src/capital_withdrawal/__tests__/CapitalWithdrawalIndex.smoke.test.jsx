import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ──────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null, Badge: P };
});

// ── react-datepicker ───────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-number-format ────────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── child domain components — all accept a ref, so forwardRef is required ──────
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../../user/create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../../user/view.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});

// ── Timers ─────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Component under test ───────────────────────────────────────────────────────
import CapitalWithdrawalIndex from '../index.js';

// NOTE: CRA sets resetMocks: true, which resets all mock implementations before
// each test. global.fetch must be set in beforeEach (not at module scope or in
// beforeAll) so it survives the automatic reset and is valid when the component's
// useEffect fires during render.
beforeEach(() => {
  // index.js reads data.meta.total — the mock must include meta
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: { total: 0 },
      }),
  });
});

afterEach(() => {
  jest.clearAllTimers();
});

describe('CapitalWithdrawalIndex smoke test', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <CapitalWithdrawalIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
