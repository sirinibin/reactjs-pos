import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SalesReturns from '../salesReturn.js';

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

// Capture SalesReturnIndex props so tests can trigger its callbacks
let capturedSalesReturnIndexProps = {};
jest.mock('../../sales_return/index.js', () => {
  return function MockSalesReturnIndex(props) {
    capturedSalesReturnIndexProps = props;
    return null;
  };
});

// ─── helpers ────────────────────────────────────────────────────────────────

function renderSalesReturns(onSelectSalesReturn = jest.fn()) {
  const ref = createRef();
  const utils = render(
    <SalesReturns ref={ref} onSelectSalesReturn={onSelectSalesReturn} />
  );
  return { ref, onSelectSalesReturn, ...utils };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('SalesReturns modal component', () => {
  beforeEach(() => {
    capturedSalesReturnIndexProps = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Smoke test
  test('renders without crashing', () => {
    expect(() => renderSalesReturns()).not.toThrow();
  });

  // 2. Initially hidden
  test('modal is initially hidden', () => {
    renderSalesReturns();
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 3. Title "Sales Returns" when enableSelection=false
  test('shows "Sales Returns" title after open(false, [], [])', () => {
    const { ref } = renderSalesReturns();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Sales Returns');
  });

  // 4. Title "Select Sales Return" when enableSelection=true
  test('shows "Select Sales Return" title after open(true, [], [])', () => {
    const { ref } = renderSalesReturns();
    act(() => {
      ref.current.open(true, [], []);
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Select Sales Return');
  });

  // 5. Close button hides the modal
  test('close button hides the modal', () => {
    const { ref } = renderSalesReturns();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 6. onSelectSalesReturn prop is called when SalesReturnIndex triggers onSelectSalesReturn
  test('calls onSelectSalesReturn prop when SalesReturnIndex triggers onSelectSalesReturn', () => {
    const onSelectSalesReturn = jest.fn();
    const { ref } = renderSalesReturns(onSelectSalesReturn);
    act(() => {
      ref.current.open(false, [], []);
    });

    act(() => {
      capturedSalesReturnIndexProps.onSelectSalesReturn({ id: 'return-42' });
    });

    expect(onSelectSalesReturn).toHaveBeenCalledTimes(1);
    expect(onSelectSalesReturn).toHaveBeenCalledWith({ id: 'return-42' });
  });

  // 7. Modal closes after a selection is made
  test('modal closes after selection', () => {
    const { ref } = renderSalesReturns();
    act(() => {
      ref.current.open(false, [], []);
    });
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      capturedSalesReturnIndexProps.onSelectSalesReturn({ id: 'return-42' });
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 8. selectedCustomers is forwarded to SalesReturnIndex
  test('passes selectedCustomers to SalesReturnIndex after open', () => {
    const customers = [{ id: 'c1', name: 'Alice' }];
    const { ref } = renderSalesReturns();
    act(() => {
      ref.current.open(false, customers, []);
    });

    expect(capturedSalesReturnIndexProps.selectedCustomers).toEqual(customers);
  });
});
