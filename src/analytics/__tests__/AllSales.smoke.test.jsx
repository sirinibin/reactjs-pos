import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-google-charts', () => ({
  Chart: () => null,
  default: { Chart: () => null },
}));

const defaultColumns = {
  sales: false,
  salesProfit: false,
  paidSales: false,
  unpaidSales: false,
  expense: false,
  purchase: false,
  salesReturn: false,
  salesReturnProfit: false,
  salesReturnLoss: false,
  purchaseReturn: false,
  loss: false,
};

const defaultProps = {
  allOrders: [],
  allExpenses: [],
  allPurchases: [],
  allSalesReturns: [],
  allPurchaseReturns: [],
  columns: defaultColumns,
};

// Import after mocks are set up
const AllSales = require('../sales/allSales').default;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('AllSales smoke test', () => {
  it('renders without crashing with empty data', () => {
    render(
      <MemoryRouter>
        <AllSales {...defaultProps} />
      </MemoryRouter>
    );
  });

  it('renders without crashing when sales column is enabled with order data', () => {
    const props = {
      ...defaultProps,
      columns: { ...defaultColumns, sales: true },
      allOrders: [
        {
          date: '2024-01-01T10:00:00Z',
          net_total: 100.5,
          net_profit: 20.0,
          total_payment_received: 100.5,
          balance_amount: 0.0,
          loss: 0.0,
        },
      ],
    };

    render(
      <MemoryRouter>
        <AllSales {...props} />
      </MemoryRouter>
    );
  });

  it('renders without crashing when multiple columns are enabled', () => {
    const props = {
      ...defaultProps,
      columns: {
        ...defaultColumns,
        sales: true,
        salesProfit: true,
        paidSales: true,
        unpaidSales: true,
        expense: true,
        purchase: true,
        salesReturn: true,
        salesReturnProfit: true,
        salesReturnLoss: true,
        purchaseReturn: true,
        loss: true,
      },
      allOrders: [
        {
          date: '2024-01-01T10:00:00Z',
          net_total: 200.0,
          net_profit: 50.0,
          total_payment_received: 150.0,
          balance_amount: 50.0,
          loss: 5.0,
        },
      ],
      allExpenses: [
        { date: '2024-01-02T10:00:00Z', amount: 30.0 },
      ],
      allPurchases: [
        { date: '2024-01-03T10:00:00Z', net_total: 80.0 },
      ],
      allSalesReturns: [
        {
          date: '2024-01-04T10:00:00Z',
          net_total: 20.0,
          net_profit: 5.0,
          loss: 2.0,
        },
      ],
      allPurchaseReturns: [
        { date: '2024-01-05T10:00:00Z', net_total: 10.0 },
      ],
    };

    render(
      <MemoryRouter>
        <AllSales {...props} />
      </MemoryRouter>
    );
  });

  it('exposes an init method via ref', () => {
    const ref = React.createRef();

    render(
      <MemoryRouter>
        <AllSales {...defaultProps} ref={ref} />
      </MemoryRouter>
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current.init).toBe('function');
  });

  it('calls init without crashing when allOrders is empty', () => {
    const ref = React.createRef();

    render(
      <MemoryRouter>
        <AllSales {...defaultProps} ref={ref} />
      </MemoryRouter>
    );

    act(() => ref.current.init());
  });

  it('calls init without crashing when allOrders has data and sales column enabled', () => {
    const ref = React.createRef();
    const props = {
      ...defaultProps,
      columns: { ...defaultColumns, sales: true },
      allOrders: [
        {
          date: '2024-01-01T10:00:00Z',
          net_total: 100.0,
          net_profit: 25.0,
          total_payment_received: 100.0,
          balance_amount: 0.0,
          loss: 0.0,
        },
      ],
    };

    render(
      <MemoryRouter>
        <AllSales {...props} ref={ref} />
      </MemoryRouter>
    );

    act(() => ref.current.init());
  });
});
