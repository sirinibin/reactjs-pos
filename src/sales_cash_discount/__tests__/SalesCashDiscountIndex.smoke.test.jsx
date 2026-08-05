import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock child domain components (use forwardRef because index.js passes refs to them)
jest.mock('../create.js', () => {
  const { forwardRef } = require('react');
  return forwardRef((_props, _ref) => null);
});
jest.mock('../view.js', () => {
  const { forwardRef } = require('react');
  return forwardRef((_props, _ref) => null);
});

// Mock react-bootstrap-typeahead
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
}));

// Mock react-datepicker and its CSS
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock react-number-format
jest.mock('react-number-format', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock react-bootstrap
jest.mock('react-bootstrap', () => ({
  Button: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Spinner: ({ children }) => <span>{children}</span>,
  Badge: ({ children }) => <span>{children}</span>,
  Modal: Object.assign(
    ({ show, children }) => (show ? <div>{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Form: Object.assign(
    ({ children, onSubmit }) => <form onSubmit={onSubmit}>{children}</form>,
    {
      Group: ({ children }) => <div>{children}</div>,
      Label: ({ children }) => <label>{children}</label>,
      Control: (props) => <input {...props} />,
      Check: (props) => <input type="checkbox" {...props} />,
      Select: ({ children, ...props }) => <select {...props}>{children}</select>,
      Text: ({ children }) => <small>{children}</small>,
    }
  ),
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
  Alert: ({ children }) => <div>{children}</div>,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => ''),
}));

// Mock utils
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

import SalesCashDiscountIndex from '../index.js';

describe('SalesCashDiscountIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          meta: { total_cash_discount: 0 },
          store: {},
          data: [],
          settings: {},
        }),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing inside MemoryRouter', () => {
    render(
      <MemoryRouter>
        <SalesCashDiscountIndex />
      </MemoryRouter>
    );
  });
});
