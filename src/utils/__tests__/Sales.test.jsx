import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Sales from '../sales.js';

// Mock CSS imports
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock react-draggable as a passthrough wrapper
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// Mock react-bootstrap Modal — renders children only when show=true
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) => {
    if (!show) return null;
    return <div data-testid="modal">{children}</div>;
  };
  Modal.Header = ({ children }) => (
    <div data-testid="modal-header">{children}</div>
  );
  Modal.Title = ({ children }) => (
    <div data-testid="modal-title">{children}</div>
  );
  Modal.Body = ({ children }) => (
    <div data-testid="modal-body">{children}</div>
  );
  return { Modal };
});

// Capture OrderIndex props so tests can trigger its callbacks
let capturedOrderIndexProps = {};
jest.mock('../../order/index.js', () => {
  return function MockOrderIndex(props) {
    capturedOrderIndexProps = props;
    return null;
  };
});

// ─── helpers ────────────────────────────────────────────────────────────────

function renderSales(onSelectSale = jest.fn()) {
  const ref = createRef();
  const utils = render(<Sales ref={ref} onSelectSale={onSelectSale} />);
  return { ref, onSelectSale, ...utils };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Sales modal component', () => {
  beforeEach(() => {
    capturedOrderIndexProps = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Smoke test
  test('renders without crashing', () => {
    expect(() => renderSales()).not.toThrow();
  });

  // 2. Initially hidden
  test('modal is initially hidden', () => {
    renderSales();
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 3. Title "Sales" when enableSelection=false
  test('shows "Sales" title after open(false, [], [])', () => {
    const { ref } = renderSales();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Sales');
  });

  // 4. Title "Select Sale" when enableSelection=true
  test('shows "Select Sale" title after open(true, [], [])', () => {
    const { ref } = renderSales();
    act(() => {
      ref.current.open(true, [], []);
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Select Sale');
  });

  // 5. Close button hides the modal
  test('close button hides the modal', () => {
    const { ref } = renderSales();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 6. onSelectSale prop is called when OrderIndex triggers onSelectSale
  test('calls onSelectSale prop when OrderIndex triggers onSelectSale', () => {
    const onSelectSale = jest.fn();
    const { ref } = renderSales(onSelectSale);
    act(() => {
      ref.current.open(false, [], []);
    });

    act(() => {
      capturedOrderIndexProps.onSelectSale({ id: 'sale-42' });
    });

    expect(onSelectSale).toHaveBeenCalledTimes(1);
    expect(onSelectSale).toHaveBeenCalledWith({ id: 'sale-42' });
  });

  // 7. Modal closes after a selection is made
  test('modal closes after selection', () => {
    const { ref } = renderSales();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      capturedOrderIndexProps.onSelectSale({ id: 'sale-42' });
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 8. selectedCustomers is forwarded to OrderIndex
  test('passes selectedCustomers to OrderIndex after open', () => {
    const customers = [{ id: 'c1', name: 'Alice' }];
    const { ref } = renderSales();
    act(() => {
      ref.current.open(false, customers, []);
    });

    expect(capturedOrderIndexProps.selectedCustomers).toEqual(customers);
  });
});
