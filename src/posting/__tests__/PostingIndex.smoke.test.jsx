import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostingIndex from '../index.js';

// ---------------------------------------------------------------------------
// CSS mocks
// ---------------------------------------------------------------------------
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ---------------------------------------------------------------------------
// react-bootstrap: Modal + sub-components, Button, Spinner
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Modal = ({ show, children }) =>
    show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null;
  Modal.Header = ({ children }) => React.createElement('div', null, children);
  Modal.Body = ({ children }) => React.createElement('div', null, children);
  Modal.Title = ({ children }) => React.createElement('div', null, children);
  Modal.Footer = ({ children }) => React.createElement('div', null, children);
  return {
    Button: ({ children, ...p }) => React.createElement('button', p, children),
    Spinner: () => null,
    Modal,
  };
});

// ---------------------------------------------------------------------------
// react-bootstrap-typeahead
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ---------------------------------------------------------------------------
// react-datepicker
// ---------------------------------------------------------------------------
jest.mock('react-datepicker', () => () => null);

// ---------------------------------------------------------------------------
// Posting sub-components (forwardRef — they receive ref={...} in the source)
// ---------------------------------------------------------------------------
jest.mock('../printPreview.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

// ---------------------------------------------------------------------------
// Domain child create/form components (all default-exported forwardRef)
// ---------------------------------------------------------------------------
jest.mock('../../order/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../quotation_sales_return/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../purchase/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../customer_deposit/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../sales_return/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../purchase_return/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../customer_withdrawal/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../expense/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../capital/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../divident/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../quotation/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../employee/salaryPayment.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../customer/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../vendor/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../employee/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
jest.mock('../../user/create.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

// ---------------------------------------------------------------------------
// Utility components / helpers
// ---------------------------------------------------------------------------
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);

jest.mock('../../utils/WebSocketContext.js', () => {
  const React = require('react');
  return {
    WebSocketContext: React.createContext({ lastMessage: null }),
  };
});

jest.mock('../../utils/eventEmitter', () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

// ---------------------------------------------------------------------------
// Timers & fetch
// ---------------------------------------------------------------------------
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        meta: {},
        total_count: 0,
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

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------
describe('PostingIndex', () => {
  it('renders without crashing', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <PostingIndex ref={ref} />
      </MemoryRouter>
    );
  });
});
