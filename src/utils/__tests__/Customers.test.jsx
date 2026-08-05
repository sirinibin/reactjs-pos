import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Customers from '../customers.js';

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

// Capture CustomerIndex props so tests can trigger its callbacks
let capturedCustomerIndexProps = {};
jest.mock('../../customer/index.js', () => ({
  __esModule: true,
  default: function MockCustomerIndex(props) {
    capturedCustomerIndexProps = props;
    return null;
  },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function renderCustomers(extraProps = {}) {
  const ref = createRef();
  const utils = render(<Customers ref={ref} {...extraProps} />);
  return { ref, ...utils };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Customers modal component', () => {
  beforeEach(() => {
    capturedCustomerIndexProps = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Smoke test
  test('renders without crashing', () => {
    expect(() => renderCustomers()).not.toThrow();
  });

  // 2. Initially hidden
  test('modal is initially hidden', () => {
    renderCustomers();
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Customer')).not.toBeInTheDocument();
  });

  // 3. Modal becomes visible after ref.current.open()
  test('modal becomes visible after ref.current.open()', () => {
    const { ref } = renderCustomers();

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Select Customer')).toBeInTheDocument();
  });

  // 4. Close button hides the modal
  test('close button hides the modal', () => {
    const { ref } = renderCustomers();

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Customer')).not.toBeInTheDocument();
  });

  // 5. onSelectCustomer prop is called when CustomerIndex triggers selection
  test('calls onSelectCustomer prop when CustomerIndex triggers onSelectCustomer', () => {
    const onSelectCustomer = jest.fn();
    const { ref } = renderCustomers({ onSelectCustomer });

    act(() => {
      ref.current.open();
    });

    act(() => {
      capturedCustomerIndexProps.onSelectCustomer({ id: '1', name: 'Test Customer' });
    });

    expect(onSelectCustomer).toHaveBeenCalledTimes(1);
    expect(onSelectCustomer).toHaveBeenCalledWith({ id: '1', name: 'Test Customer' });
  });

  // 6. Modal closes after selection
  test('modal closes after selection', () => {
    const onSelectCustomer = jest.fn();
    const { ref } = renderCustomers({ onSelectCustomer });

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      capturedCustomerIndexProps.onSelectCustomer({ id: '1', name: 'Test Customer' });
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 7. showToastMessage prop is passed through to CustomerIndex
  test('passes showToastMessage prop through to CustomerIndex', () => {
    const showToastMessage = jest.fn();
    const { ref } = renderCustomers({ showToastMessage });

    act(() => {
      ref.current.open();
    });

    expect(capturedCustomerIndexProps.showToastMessage).toBe(showToastMessage);
  });
});
