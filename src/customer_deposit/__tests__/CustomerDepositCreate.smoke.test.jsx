import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  return {
    Modal,
    Button: passthrough,
    Spinner: () => <span />,
    Form: passthrough,
    Row: passthrough,
    Col: passthrough,
    Container: passthrough,
    Table: passthrough,
  };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  Menu: ({ children }) => <div>{children}</div>,
  MenuItem: ({ children }) => <div>{children}</div>,
}));

// ── react-draggable ────────────────────────────────────────────────────────
jest.mock('react-draggable', () => ({ children }) => <div>{children}</div>);

// ── react-datepicker ───────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap-confirmation ───────────────────────────────────────────
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// ── date-fns ───────────────────────────────────────────────────────────────
jest.mock('date-fns', () => ({
  format: jest.fn((d, fmt) => '2026-08-04'),
}));

// ── utility modules ────────────────────────────────────────────────────────
jest.mock('../../utils/search.js', () => ({
  highlightWords: jest.fn((text) => text),
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: jest.fn((n) => String(parseFloat(n).toFixed(2))),
}));

// ── child components ───────────────────────────────────────────────────────
jest.mock('../../customer/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../vendor/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../employee/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/customer_pending.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/vendor_pending.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../customer/view.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/customers.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/vendors.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/employees.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/sales.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/purchase-returns.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/quotations.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../preview.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../order/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../purchase_return/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../quotation/create.js', () =>
  require('react').forwardRef((props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

jest.mock('../../utils/InfoDialog', () => () => null);

jest.mock('../../utils/amount.js', () => () => null);

// ── subject under test ─────────────────────────────────────────────────────
import CustomerDepositCreate from '../create.js';

// ── test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.useFakeTimers();

  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('store_id', 'test-store');

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── tests ──────────────────────────────────────────────────────────────────
describe('CustomerDepositCreate smoke tests', () => {
  it('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <CustomerDepositCreate ref={ref} />
      </MemoryRouter>
    );
    // Component renders in closed state by default — no crash is the goal
    expect(document.body).toBeTruthy();
  });
});
