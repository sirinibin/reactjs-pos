import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS stubs ──────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-datepicker ───────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) =>
    show ? <div data-testid="customer-create-modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title  = ({ children }) => <div>{children}</div>;
  Modal.Body   = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button  = ({ children, onClick, disabled, className, type, style }) => (
    <button onClick={onClick} disabled={disabled} className={className} type={type} style={style}>
      {children}
    </button>
  );
  const Spinner = () => <span />;

  const Dropdown = ({ children }) => <div>{children}</div>;
  Dropdown.Toggle  = ({ children }) => <button>{children}</button>;
  Dropdown.Menu    = ({ children }) => <div>{children}</div>;
  Dropdown.Item    = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
  Dropdown.Divider = () => <hr />;

  return { Modal, Button, Spinner, Dropdown };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  Menu:      ({ children }) => <div>{children}</div>,
  MenuItem:  ({ children }) => <div>{children}</div>,
}));

// ── react-select-country-list ──────────────────────────────────────────────
jest.mock('react-select-country-list', () => () => ({
  getData: () => [{ value: 'SA', label: 'Saudi Arabia' }],
}));

// ── react-router-dom: keep MemoryRouter real, stub hooks/Link ─────────────
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory:  () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams:   () => ({}),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
  Link:        ({ children, to }) => <a href={to}>{children}</a>,
}));

// ── Child domain components (all use forwardRef + imperative handle) ───────
jest.mock('../../utils/quotations.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock('../../utils/sales.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock('../../utils/salesReturn.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock('../../utils/quotation_sales_returns.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock('../../utils/ImageGallery.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ uploadAllImages: jest.fn().mockResolvedValue(undefined) }));
    return null;
  });
});
jest.mock('../../vehicle/create.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// ── Utility modules ────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── Fake timers ────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Component under test ───────────────────────────────────────────────────
import CustomerCreate from '../create.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeFetchOk(result = {}) {
  return Promise.resolve({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result, store: {}, data: [], total_count: 0, settings: {} }),
  });
}

// ── Suite ──────────────────────────────────────────────────────────────────
describe('CustomerCreate smoke test', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'test-access-token');
    global.fetch = jest.fn().mockImplementation(() => makeFetchOk());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing', () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <CustomerCreate ref={ref} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('exposes an open() method via ref', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerCreate ref={ref} />
      </MemoryRouter>
    );
    expect(typeof ref.current?.open).toBe('function');
  });

  it('modal is hidden before open() is called', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerCreate ref={ref} />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('customer-create-modal')).not.toBeInTheDocument();
  });

  it('shows the modal and core form fields after open()', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerCreate ref={ref} />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open();
    });

    expect(screen.getByTestId('customer-create-modal')).toBeInTheDocument();

    // Identity section inputs
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();

    // Business details inputs
    expect(screen.getByPlaceholderText('VAT NO.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CRN')).toBeInTheDocument();
  });

  it('shows "Create New Customer" title when opening without an id', async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CustomerCreate ref={ref} />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open();
    });

    expect(screen.getByText('Create New Customer')).toBeInTheDocument();
  });

  it('renders with optional props without crashing', () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <CustomerCreate
          ref={ref}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
          openDetailsView={jest.fn()}
          noVehicleCreate={true}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
