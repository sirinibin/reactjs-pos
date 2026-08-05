/**
 * Smoke test for SalesReturnCreate (sales_return/create.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ─────────────────────────────────────────────────────────────────
jest.mock('../../order/style.css', () => ({}), { virtual: true });

// ── bootstrap JS mock ─────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const P = ({ children }) => React.createElement(React.Fragment, null, children);
  const Modal = Object.assign(
    ({ show, children }) => (show ? React.createElement(React.Fragment, null, children) : null),
    {
      Header: P,
      Title: P,
      Body: P,
      Footer: P,
    }
  );
  const Dropdown = Object.assign(
    ({ children }) => React.createElement('div', null, children),
    { Item: P, Toggle: P, Menu: P }
  );
  const OverlayTrigger = ({ children }) =>
    typeof children === 'function' ? children({}) : children;
  return {
    Modal,
    Button: P,
    Spinner: () => null,
    Form: P,
    Row: P,
    Col: P,
    Alert: P,
    Table: P,
    Dropdown,
    OverlayTrigger,
    Tooltip: P,
    Popover: P,
  };
});

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) =>
    children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) =>
    children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// ── react-router-dom (keep MemoryRouter real) ─────────────────────────────────
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── Child components — sales_return domain ────────────────────────────────────
jest.mock('../view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));

// ── Child components — sibling domains ───────────────────────────────────────
jest.mock('../../store/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../user/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../signature/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../customer_withdrawal/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));

// ── Child components — utils/ ─────────────────────────────────────────────────
jest.mock('../../utils/ResizableTableCell', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/ImageViewerModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/customer_pending.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_sales_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_sales_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_purchase_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_purchase_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_quotation_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_delivery_note_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_non_vat_sales_history.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/product_non_vat_sales_return_history.js', () => ({ __esModule: true, default: () => null }));

// ── Utility helpers ───────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => String(v),
  trimTo8Decimals: (v) => String(v),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: () => ({ ref: null }),
}));

jest.mock('../../i18n/dateLocales', () => ({
  getDateLocale: () => undefined,
}));

// ── Component under test ──────────────────────────────────────────────────────
import SalesReturnCreate from '../create.js';

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('SalesReturnCreate smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: {},
          data: [],
          total_count: 0,
          store: {},
          settings: {},
        }),
    });

    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const ref = createRef();
    expect(() =>
      render(
        <MemoryRouter>
          <SalesReturnCreate ref={ref} />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
