import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mock react-bootstrap ───────────────────────────────────────────────────
jest.mock('react-bootstrap', () => ({
  Modal: Object.assign(
    ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Spinner: () => null,
}));

// ── Mock react-bootstrap-typeahead ─────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── Mock react-i18next ─────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: jest.fn() },
  }),
}));

// ── Mock utils ─────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── Subject under test ─────────────────────────────────────────────────────
import ProductCategoryCreate from '../create.js';
// Note: the source file imports utils via '../utils/...' (relative to create.js = src/utils/...)
// From this test file that same module lives at '../../utils/...' — mocked above.

// ── Test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
  });
  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('store_id', 'store-1');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  localStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────
describe('ProductCategoryCreate — smoke', () => {
  it('renders without crashing (modal hidden by default)', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <ProductCategoryCreate />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it('renders without crashing when using a forwarded ref', () => {
    const ref = React.createRef();
    expect(() =>
      render(
        <MemoryRouter>
          <ProductCategoryCreate ref={ref} />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it('exposes an open() method via the imperative handle', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ProductCategoryCreate ref={ref} />
      </MemoryRouter>
    );
    expect(typeof ref.current?.open).toBe('function');
  });
});
