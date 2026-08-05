import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  return {
    Modal,
    Button: passthrough,
    Spinner: () => <span />,
    Form: passthrough,
    Row: passthrough,
    Col: passthrough,
    Container: passthrough,
    Table: passthrough,
  };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
}));

// ── react-image-file-resizer ───────────────────────────────────────────────
jest.mock('react-image-file-resizer', () => ({
  imageFileResizer: jest.fn(),
}));

// ── react-datepicker ───────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── date-fns ───────────────────────────────────────────────────────────────
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2026-08-04'),
}));

// ── utility modules ────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── subject under test ─────────────────────────────────────────────────────
import CapitalCreate from '../create.js';

// ── test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.useFakeTimers();

  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('store_id', 'test-store');

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: {},
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
  localStorage.clear();
});

// ── tests ──────────────────────────────────────────────────────────────────
describe('CapitalCreate smoke tests', () => {
  it('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <CapitalCreate ref={ref} />
      </MemoryRouter>
    );
    // Component renders in closed (modal hidden) state by default — no crash is the goal
    expect(document.body).toBeTruthy();
  });
});
