import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Vendors from '../vendors.js';

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

// Capture VendorIndex props so tests can trigger its callbacks.
// Path is relative to this test file (src/utils/__tests__/), so
// ../../vendor/index.js resolves to src/vendor/index.js — matching
// the '../vendor/index.js' import inside src/utils/vendors.js.
let capturedVendorIndexProps = {};
jest.mock('../../vendor/index.js', () => ({
  __esModule: true,
  default: function MockVendorIndex(props) {
    capturedVendorIndexProps = props;
    return null;
  },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function renderVendors(extraProps = {}) {
  const ref = createRef();
  const utils = render(<Vendors ref={ref} {...extraProps} />);
  return { ref, ...utils };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Vendors modal component', () => {
  beforeEach(() => {
    capturedVendorIndexProps = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Smoke test
  test('renders without crashing', () => {
    expect(() => renderVendors()).not.toThrow();
  });

  // 2. Initially hidden
  test('modal is initially hidden', () => {
    renderVendors();
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Vendor')).not.toBeInTheDocument();
  });

  // 3. Modal becomes visible after ref.current.open()
  test('modal shows "Select Vendor" title after ref.current.open()', () => {
    const { ref } = renderVendors();

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Select Vendor')).toBeInTheDocument();
  });

  // 4. Close button hides the modal
  test('close button hides the modal', () => {
    const { ref } = renderVendors();

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Select Vendor')).not.toBeInTheDocument();
  });

  // 5. onSelectVendor prop is called when VendorIndex triggers selection
  test('calls onSelectVendor prop when VendorIndex triggers onSelectVendor', () => {
    const onSelectVendor = jest.fn();
    const { ref } = renderVendors({ onSelectVendor });

    act(() => {
      ref.current.open();
    });

    act(() => {
      capturedVendorIndexProps.onSelectVendor({ id: '1', name: 'Test Vendor' });
    });

    expect(onSelectVendor).toHaveBeenCalledTimes(1);
    expect(onSelectVendor).toHaveBeenCalledWith({ id: '1', name: 'Test Vendor' });
  });

  // 6. Modal closes after selection
  test('modal closes after selection', () => {
    const onSelectVendor = jest.fn();
    const { ref } = renderVendors({ onSelectVendor });

    act(() => {
      ref.current.open();
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      capturedVendorIndexProps.onSelectVendor({ id: '1', name: 'Test Vendor' });
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});
