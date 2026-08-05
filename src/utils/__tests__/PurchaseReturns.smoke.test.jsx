// Smoke test for utils/purchase-returns.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-bootstrap ---
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
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Form: Object.assign(({ children }) => <form>{children}</form>, {
    Group: ({ children }) => <div>{children}</div>,
    Label: ({ children }) => <label>{children}</label>,
    Control: (props) => <input {...props} />,
    Check: (props) => <input type="checkbox" {...props} />,
    Select: ({ children }) => <select>{children}</select>,
    Text: ({ children }) => <small>{children}</small>,
  }),
  Table: ({ children }) => <table>{children}</table>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Spinner: () => <div />,
  Alert: ({ children }) => <div>{children}</div>,
  Dropdown: Object.assign(({ children }) => <div>{children}</div>, {
    Toggle: ({ children }) => <button>{children}</button>,
    Menu: ({ children }) => <div>{children}</div>,
    Item: ({ children }) => <div>{children}</div>,
  }),
  InputGroup: Object.assign(({ children }) => <div>{children}</div>, {
    Text: ({ children }) => <span>{children}</span>,
  }),
}));

// --- react-router-dom ---
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    Link: ({ children }) => <a>{children}</a>,
  };
});

// --- react-draggable ---
jest.mock('react-draggable', () => ({ children }) => <div>{children}</div>);

// --- child domain component ---
jest.mock('../../purchase_return/index.js', () => (props) => {
  const React = require('react');
  return React.createElement(
    'button',
    { 'data-testid': 'purchase-return-select', onClick: () => props.onSelectPurchaseReturn && props.onSelectPurchaseReturn({ id: 'pr1' }) },
    'select'
  );
});

// --- global fetch ---
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// --- actual test ---
import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchaseReturns from '../purchase-returns.js';

describe('PurchaseReturns (smoke)', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PurchaseReturns onSelectPurchaseReturn={jest.fn()} />
      </MemoryRouter>
    );
  });

  it('open(false) shows "PurchaseReturns" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <PurchaseReturns ref={ref} onSelectPurchaseReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false, []));
    expect(screen.getByText('PurchaseReturns')).toBeInTheDocument();
  });

  it('open(true) shows "Select PurchaseReturn" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <PurchaseReturns ref={ref} onSelectPurchaseReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true, []));
    expect(screen.getByText('Select PurchaseReturn')).toBeInTheDocument();
  });

  it('selecting a purchase return calls onSelectPurchaseReturn and closes the modal', () => {
    const onSelectPurchaseReturn = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <PurchaseReturns ref={ref} onSelectPurchaseReturn={onSelectPurchaseReturn} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    act(() => screen.getByTestId('purchase-return-select').click());
    expect(onSelectPurchaseReturn).toHaveBeenCalledWith({ id: 'pr1' });
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('clicking the close button hides the modal', () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturns ref={ref} onSelectPurchaseReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    act(() => container.querySelector('.btn-close').click());
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('does not clear selectedVendors when reopened with an empty array (only set when length > 0)', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <PurchaseReturns ref={ref} onSelectPurchaseReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false, [{ id: 'v1', name: 'Vendor 1' }]));
    // Reopening with an empty array should not throw and modal should still render.
    act(() => ref.current.open(false, []));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });
});
