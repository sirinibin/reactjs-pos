import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS / static assets
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-datepicker
jest.mock('react-datepicker', () => () => null);

// react-bootstrap — render children; only Button and Spinner are used in the source
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
  return {
    Button: Passthrough,
    Spinner: () => null,
    Modal: ({ show, children }) => (show ? React.createElement(React.Fragment, null, children) : null),
    Form: Passthrough,
    Row: Passthrough,
    Col: Passthrough,
    Alert: Passthrough,
    Table: Passthrough,
  };
});

// react-bootstrap-typeahead — Typeahead is used
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// react-bootstrap-confirmation
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// react-router-dom — keep MemoryRouter real, stub hooks/Link
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Child domain components — both receive a ref and have .open() called on them
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

// Shared / utils components
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

// ---- Subject under test ----
import ProductCategoryIndex from '../index.js';

// ---- Test setup ----
beforeEach(() => {
  jest.useFakeTimers();

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

  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'product_category_pageSize') return '10';
    return null;
  });
  Storage.prototype.setItem = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ---- Smoke test ----
describe('ProductCategoryIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ProductCategoryIndex />
        </MemoryRouter>
      );
    });
  });
});
