import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  return { Button: P, Spinner: () => null };
});

// --- react-router-dom: keep MemoryRouter real, mock hooks/Link ---
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory:  () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams:   () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- react-bootstrap-confirmation ---
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(true)),
}));

// --- utils ---
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js', () => () => null);

// --- child domain components — both use forwardRef (parent calls ref.current.open) ---
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});

jest.useFakeTimers();

const mockFetchResponse = {
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({
      result: [],
      total_count: 0,
      store: {},
      settings: {},
    }),
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
  localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

import ProductBrandIndex from '../index.js';

describe('ProductBrandIndex smoke test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ProductBrandIndex />
        </MemoryRouter>
      );
    });
  });

  it('calls fetch on mount', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ProductBrandIndex />
        </MemoryRouter>
      );
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/product-brand?'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('accepts optional showToastMessage prop without crashing', async () => {
    const showToast = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <ProductBrandIndex showToastMessage={showToast} />
        </MemoryRouter>
      );
    });
  });
});
