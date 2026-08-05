import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS mocks
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-bootstrap mocks
jest.mock('react-bootstrap', () => {
  const P = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = ({ children }) => <>{children}</>;
  Modal.Title = ({ children }) => <>{children}</>;
  Modal.Body = ({ children }) => <>{children}</>;
  Modal.Footer = ({ children }) => <>{children}</>;
  return {
    Modal,
    Button: P,
    Spinner: () => <span data-testid="spinner" />,
    Form: ({ children }) => <form>{children}</form>,
    Table: ({ children }) => <table>{children}</table>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Alert: ({ children }) => <div>{children}</div>,
  };
});

// react-router-dom: keep MemoryRouter real, mock hooks and components
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Child domain components — both rendered with ref so must use forwardRef
jest.mock('../create.js', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock('../view.js', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// Util mocks
jest.mock('../../utils/OverflowTooltip.js', () => ({ value }) => <span>{value}</span>);
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// ─── Setup ───────────────────────────────────────────────────────────────────

jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        data: [],
        store: {},
        settings: {},
      }),
  });
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ─── Subject under test ───────────────────────────────────────────────────────

import WarehouseIndex from '../index.js';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WarehouseIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <WarehouseIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders without crashing when user is Admin with store_id', async () => {
    localStorage.setItem('user_role', 'Admin');
    localStorage.setItem('store_id', 'store-abc');
    await act(async () => {
      render(
        <MemoryRouter>
          <WarehouseIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });
});
