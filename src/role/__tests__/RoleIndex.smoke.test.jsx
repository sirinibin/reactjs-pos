import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── child domain components (use forwardRef so parent refs don't throw) ──────
jest.mock('../create.js', () => {
  const R = require('react');
  const Comp = R.forwardRef(() => null);
  Comp.displayName = 'UserRoleCreate';
  return Comp;
});

jest.mock('../view.js', () => {
  const R = require('react');
  const Comp = R.forwardRef(() => null);
  Comp.displayName = 'UserRoleView';
  return Comp;
});

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const P = ({ children }) => React.createElement(React.Fragment, null, children);
  const Modal = ({ show, children }) =>
    show ? React.createElement(React.Fragment, null, children) : null;
  Modal.Header = P;
  Modal.Title = P;
  Modal.Body = P;
  Modal.Footer = P;
  return {
    Modal,
    Button: ({ children, onClick, type, size, variant, style }) =>
      React.createElement('button', { onClick, type, style }, children),
    Spinner: () => React.createElement('span', { 'data-testid': 'spinner' }),
    Form: P,
    Table: P,
    Row: P,
    Col: P,
    Alert: P,
  };
});

// ── react-bootstrap-confirmation ─────────────────────────────────────────────
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(true)),
}));

// ── utils ────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── react-router-dom: keep MemoryRouter real, stub hooks/Link ───────────────
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
    Link: ({ children, to }) =>
      require('react').createElement('a', { href: to }, children),
  };
});

// ── timers ───────────────────────────────────────────────────────────────────
jest.useFakeTimers();

const mockFetchResponse = {
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({ result: [], data: [], total_count: 0, store: {}, settings: {} }),
};

// ── localStorage, fetch & browser stubs ──────────────────────────────────────
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
  localStorage.setItem('user_role', 'Admin');
  localStorage.setItem('store_id', 'store-test-123');
  localStorage.setItem('access_token', 'test-token');
  window.confirm = jest.fn(() => false);
  // Prevent jsdom navigation errors from window.location assignment
  delete window.location;
  window.location = { href: '' };
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── subject under test ───────────────────────────────────────────────────────
import UserRoleIndex from '../index.js';

// ── smoke tests ───────────────────────────────────────────────────────────────
describe('RoleIndex smoke test', () => {
  test('renders without crashing (Admin user)', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <UserRoleIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders the "User Roles" heading', async () => {
    let getByText;
    await act(async () => {
      ({ getByText } = render(
        <MemoryRouter>
          <UserRoleIndex />
        </MemoryRouter>
      ));
    });
    expect(getByText('User Roles')).toBeTruthy();
  });

  test('renders without crashing when RBAC enabled for non-Admin user', async () => {
    localStorage.setItem('user_role', 'Staff');
    localStorage.setItem(
      '_store_settings_cache',
      JSON.stringify({ enable_rbac_module: true })
    );

    await act(async () => {
      render(
        <MemoryRouter>
          <UserRoleIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders without crashing with showToastMessage prop', async () => {
    const showToastMessage = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <UserRoleIndex showToastMessage={showToastMessage} />
        </MemoryRouter>
      );
    });
  });
});
