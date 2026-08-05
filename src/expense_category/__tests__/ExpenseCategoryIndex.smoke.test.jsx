import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => {
  const R = require('react');
  const P = ({ children }) => R.createElement(R.Fragment, null, children || null);
  const Modal = Object.assign(
    ({ show, children }) => (show ? R.createElement(R.Fragment, null, children) : null),
    { Header: P, Title: P, Body: P, Footer: P }
  );
  return { Modal, Button: P, Spinner: () => null };
});

// --- react-bootstrap-typeahead ---
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null }));

// --- Child domain components (both receive a ref via React.forwardRef) ---
jest.mock('../create.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef((_props, ref) => {
      R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
      return null;
    }),
  };
});

jest.mock('../view.js', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef((_props, ref) => {
      R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
      return null;
    }),
  };
});

// --- Utils ---
jest.mock('../../utils/OverflowTooltip.js', () => {
  const R = require('react');
  return { __esModule: true, default: ({ value }) => R.createElement('span', null, value) };
});
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: () => null }));

// --- Component under test ---
import ExpenseCategoryIndex from '../index.js';

// --- Suite ---
describe('ExpenseCategoryIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: [], total_count: 0 }),
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <ExpenseCategoryIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
