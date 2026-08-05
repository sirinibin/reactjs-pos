// Smoke + corner-case tests for:
//   src/utils/product_history.js
//   src/utils/product_sales_history.js
//   src/utils/product_purchase_history.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// ── DraggableHistoryModal (shared by all three) ───────────────────────────────
// Mimics the real component's conditional rendering (show/title/onClose) so
// we can exercise the `show && <Table/>` branch and title template literals.
jest.mock('../DraggableHistoryModal.js', () => {
  const React = require('react');
  return ({ show, onClose, title, children }) =>
    show
      ? React.createElement(
        'div',
        { 'data-testid': 'draggable-history-modal' },
        React.createElement('div', { 'data-testid': 'modal-title' }, title),
        React.createElement('button', { onClick: onClose }, 'Close'),
        children
      )
      : null;
});

// ── domain child components ───────────────────────────────────────────────────
// ProductHistoryTable — used with a ref in product_history.js
jest.mock('../../product/product_history.js', () => {
  const React = require('react');
  return React.forwardRef(() => React.createElement('div', { 'data-testid': 'product-history-table' }));
});

// ProductSalesHistoryTable — used with a ref in product_sales_history.js
jest.mock('../../product/sales_history.js', () => {
  const React = require('react');
  return React.forwardRef(() => React.createElement('div', { 'data-testid': 'product-sales-history-table' }));
});

// ProductPurchaseHistoryTable — used with a ref in product_purchase_history.js
jest.mock('../../product/purchase_history.js', () => {
  const React = require('react');
  return React.forwardRef(() => React.createElement('div', { 'data-testid': 'product-purchase-history-table' }));
});

// PurchaseCreate — used with a ref in product_purchase_history.js. Must
// implement useImperativeHandle so the setTimeout-triggered `.open()` call in
// product_purchase_history.js doesn't throw on a null ref.
jest.mock('../../purchase/create.js', () => {
  const React = require('react');
  const openMock = jest.fn();
  const MockPurchaseCreate = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: openMock }));
    return React.createElement('div', { 'data-testid': 'purchase-create-mock' });
  });
  MockPurchaseCreate.__openMock = openMock;
  return MockPurchaseCreate;
});

// ── global fetch ──────────────────────────────────────────────────────────────
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

// ── timers ────────────────────────────────────────────────────────────────────
// Must be (re-)established inside beforeEach, not at module top level — this
// project's jest-circus runner does not carry a top-level jest.useFakeTimers()
// call over into the test execution phase (jest.getTimerCount() stays 0).
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ── actual tests ──────────────────────────────────────────────────────────────
import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductHistory from '../product_history.js';
import ProductSalesHistory from '../product_sales_history.js';
import ProductPurchaseHistory from '../product_purchase_history.js';
import MockPurchaseCreate from '../../purchase/create.js';

describe('ProductHistory smoke test', () => {
  it('renders without crashing (modal closed initially)', () => {
    render(
      <MemoryRouter>
        <ProductHistory />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
  });

  it('opens with a product and no filters, shows title without arabic suffix', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Widget' }));
    expect(screen.getByTestId('modal-title')).toHaveTextContent('History of Widget');
    expect(screen.getByTestId('product-history-table')).toBeInTheDocument();
  });

  it('opens with a product that has an arabic name, appends it to the title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Widget', name_in_arabic: 'ودجت' }));
    expect(screen.getByTestId('modal-title')).toHaveTextContent('History of Widget / ودجت');
  });

  it('opens with selectedCustomers only (selectedVendors branch not taken)', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Widget' }, ['cust1', 'cust2']));
    expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
  });

  it('opens with selectedVendors only (no selectedCustomers) — else-if branch', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Widget' }, [], ['vendor1']));
    expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
  });

  it('closes the modal when the close button (onClose) is invoked', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Widget' }));
    expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
    act(() => screen.getByText('Close').click());
    expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
  });
});

describe('ProductSalesHistory smoke test', () => {
  it('renders without crashing (modal closed initially)', () => {
    render(
      <MemoryRouter>
        <ProductSalesHistory />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
  });

  it('opens with a product and shows the sales-history title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductSalesHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Gadget' }));
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Sales History of Gadget');
    expect(screen.getByTestId('product-sales-history-table')).toBeInTheDocument();
  });

  it('opens with selectedCustomers provided', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductSalesHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Gadget' }, ['cust1']));
    expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
  });

  it('re-opening with an empty selectedCustomers array resets the filter (no crash)', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductSalesHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Gadget' }, ['cust1']));
    act(() => ref.current.open({ name: 'Gadget' }, []));
    expect(screen.getByTestId('draggable-history-modal')).toBeInTheDocument();
  });
});

describe('ProductPurchaseHistory smoke test', () => {
  it('renders without crashing (modal closed initially)', () => {
    render(
      <MemoryRouter>
        <ProductPurchaseHistory />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('draggable-history-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('purchase-create-mock')).not.toBeInTheDocument();
  });

  it('opens the history modal via open() and shows the purchase-history title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductPurchaseHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.open({ name: 'Bolt' }, ['vendorA']));
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Purchase History of Bolt');
    expect(screen.getByTestId('product-purchase-history-table')).toBeInTheDocument();
  });

  it('openById() renders the direct PurchaseCreate form and calls its open() after the timeout', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductPurchaseHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.openById('purchase-123'));
    expect(screen.getByTestId('purchase-create-mock')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(100); });
    expect(MockPurchaseCreate.__openMock).toHaveBeenCalledWith('purchase-123');
  });

  it('openById() called twice with the same id re-uses the already-open form (re-entrant branch)', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductPurchaseHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.openById('purchase-123'));
    act(() => jest.advanceTimersByTime(100));
    MockPurchaseCreate.__openMock.mockClear();
    act(() => ref.current.openById('purchase-123'));
    // Re-entrant branch calls .open() immediately (no new setTimeout needed)
    expect(MockPurchaseCreate.__openMock).toHaveBeenCalledWith('purchase-123');
  });

  it('closing the direct purchase form resets directPurchaseShow/Id', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <ProductPurchaseHistory ref={ref} />
      </MemoryRouter>
    );
    act(() => ref.current.openById('purchase-123'));
    expect(screen.getByTestId('purchase-create-mock')).toBeInTheDocument();
  });
});
