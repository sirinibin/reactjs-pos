import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS / static asset mocks
jest.mock('../styles.css', () => ({}));
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-bootstrap
jest.mock('react-bootstrap', () => {
  const P = ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = ({ children }) => <>{children}</>;
  Modal.Title = ({ children }) => <>{children}</>;
  Modal.Body = ({ children }) => <>{children}</>;
  Modal.Footer = ({ children }) => <>{children}</>;
  return { Modal, Button: P, Spinner: () => null, Form: ({ children }) => <>{children}</>, Row: ({ children }) => <>{children}</>, Col: ({ children }) => <>{children}</> };
});

// react-bootstrap-typeahead
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null }));

// react-datepicker
jest.mock('react-datepicker', () => () => null);

// react-router-dom — keep MemoryRouter real, mock hooks/Link
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Child domain components — UserCreate uses imperative ref API (open/close)
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef((_props, _ref) => null);
});
// UserView also receives a ref
jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef((_props, _ref) => null);
});

// Utility modules
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/dateUtils.js', () => ({
  shortLocale: {},
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// WebSocketContext — provide a context value with lastMessage: null
jest.mock('../../utils/WebSocketContext.js', () => ({
  WebSocketContext: require('react').createContext({ lastMessage: null }),
}));

// ---- timers & fetch ----
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
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import UserIndex from '../index.js';

describe('UserIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <UserIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });

  test('renders the Users heading', async () => {
    let getByText;
    await act(async () => {
      ({ getByText } = render(
        <MemoryRouter>
          <UserIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      ));
    });
    expect(getByText('Users')).toBeTruthy();
  });

  test('calls fetch on mount', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <UserIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
