import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / asset mocks ─────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Passthrough = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = Passthrough;
  Modal.Title = Passthrough;
  Modal.Body = Passthrough;
  Modal.Footer = Passthrough;
  return {
    Modal,
    Button: ({ children, onClick, disabled }) => (
      <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Spinner: () => <span data-testid="spinner" />,
    Form: Object.assign(Passthrough, {
      Group: Passthrough,
      Label: Passthrough,
      Control: (props) => <input {...props} />,
      Check: (props) => <input type="checkbox" {...props} />,
    }),
    Row: Passthrough,
    Col: Passthrough,
    Table: Passthrough,
    Alert: Passthrough,
  };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── child domain components (both use forwardRef) ─────────────────────────────
jest.mock('../create.js', () => {
  const React = require('react');
  return React.forwardRef((_props, _ref) => null);
});

jest.mock('../view.js', () => {
  const React = require('react');
  return React.forwardRef((_props, _ref) => null);
});

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── timers / fetch ────────────────────────────────────────────────────────────
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
  localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── component under test ──────────────────────────────────────────────────────
import SignatureIndex from '../index.js';

describe('SignatureIndex — smoke', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SignatureIndex />
        </MemoryRouter>
      );
    });
  });

  it('renders the Signatures heading', async () => {
    let getByText;
    await act(async () => {
      ({ getByText } = render(
        <MemoryRouter>
          <SignatureIndex />
        </MemoryRouter>
      ));
    });
    expect(getByText('Signatures')).toBeTruthy();
  });

  it('renders the Create button', async () => {
    let getAllByRole;
    await act(async () => {
      ({ getAllByRole } = render(
        <MemoryRouter>
          <SignatureIndex />
        </MemoryRouter>
      ));
    });
    const buttons = getAllByRole('button');
    const createBtn = buttons.find((b) => /create/i.test(b.textContent));
    expect(createBtn).toBeTruthy();
  });

  it('calls fetch on mount to load the signature list', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SignatureIndex />
        </MemoryRouter>
      );
    });
    expect(global.fetch).toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][0]).toMatch('/v1/signature');
  });

  it('accepts showToastMessage prop without crashing', async () => {
    const showToastMessage = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <SignatureIndex showToastMessage={showToastMessage} />
        </MemoryRouter>
      );
    });
  });
});
