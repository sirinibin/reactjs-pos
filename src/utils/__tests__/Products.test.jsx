import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Products from '../products.js';

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-draggable: passthrough wrapper (default export)
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// react-bootstrap: Modal renders children only when show=true; sub-components
// render children unconditionally
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) =>
    show ? <div data-testid="modal">{children}</div> : null;
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

// Capture ProductIndex props so tests can inspect and trigger callbacks
let capturedProductProps = {};
jest.mock('../../product/index.js', () => ({
  __esModule: true,
  default: function MockProductIndex(props) {
    capturedProductProps = props;
    return <div data-testid="product-index" />;
  },
}));

// Capture ServiceIndex props so tests can inspect and trigger callbacks
let capturedServiceProps = {};
jest.mock('../../service/index.js', () => ({
  __esModule: true,
  default: function MockServiceIndex(props) {
    capturedServiceProps = props;
    return <div data-testid="service-index" />;
  },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function renderProducts(extraProps = {}) {
  const ref = createRef();
  const utils = render(<Products ref={ref} {...extraProps} />);
  return { ref, ...utils };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Products modal component', () => {
  beforeEach(() => {
    capturedProductProps = {};
    capturedServiceProps = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Smoke test
  test('renders without crashing', () => {
    expect(() => renderProducts()).not.toThrow();
  });

  // 2. Modal is initially hidden
  test('modal is initially hidden', () => {
    renderProducts();
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 3. open(true, '', {}) → title "Select Products"
  test('shows "Select Products" title after open(true, "", {})', () => {
    const { ref } = renderProducts();

    act(() => {
      ref.current.open(true, '', {});
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Select Products');
  });

  // 4. open(true, '', {}, true) → title "Select Services" + ServiceIndex rendered
  test('shows "Select Services" and renders ServiceIndex when serviceOnly=true', () => {
    const { ref } = renderProducts();

    act(() => {
      ref.current.open(true, '', {}, true);
    });

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Select Services');
    // ServiceIndex should be mounted
    expect(screen.getByTestId('service-index')).toBeInTheDocument();
    // ProductIndex must NOT be mounted
    expect(screen.queryByTestId('product-index')).not.toBeInTheDocument();
  });

  // 5. open(true, 'linked_products', { name: 'Widget' }) → linked products title
  test('shows linked products title when type is "linked_products"', () => {
    const { ref } = renderProducts();

    act(() => {
      ref.current.open(true, 'linked_products', { name: 'Widget' });
    });

    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Select Linked Products of #Widget'
    );
  });

  // 6. Close button hides the modal
  test('close button hides the modal', () => {
    const { ref } = renderProducts();

    act(() => {
      ref.current.open(true, '', {});
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 7. Escape key closes the modal
  test('Escape key closes the modal', () => {
    const { ref } = renderProducts();

    act(() => {
      ref.current.open(true, '', {});
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // 8. onSelectProducts prop is called when ProductIndex triggers onSelectProducts
  test('calls onSelectProducts prop when ProductIndex fires onSelectProducts', () => {
    const onSelectProducts = jest.fn();
    const { ref } = renderProducts({ onSelectProducts });

    act(() => {
      ref.current.open(true, '', {});
    });

    act(() => {
      capturedProductProps.onSelectProducts([{ id: 1, name: 'Test Product' }]);
    });

    expect(onSelectProducts).toHaveBeenCalledTimes(1);
    expect(onSelectProducts).toHaveBeenCalledWith([{ id: 1, name: 'Test Product' }]);
  });

  // 9. Modal closes after selection
  test('modal closes after product selection', () => {
    const onSelectProducts = jest.fn();
    const { ref } = renderProducts({ onSelectProducts });

    act(() => {
      ref.current.open(true, '', {});
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    act(() => {
      capturedProductProps.onSelectProducts([{ id: 1 }]);
    });

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});
