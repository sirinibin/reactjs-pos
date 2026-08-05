// Smoke test for analytics/sales/dailySales.js
// React 17, CRA, @testing-library/react v11, no TypeScript

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- mock react-google-charts ---
jest.mock('react-google-charts', () => ({
  Chart: () => null,
  default: { Chart: () => null },
}));

// --- fetch stub (not used by this component but guards against any future effects) ---
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

jest.useFakeTimers();

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// --- minimal props satisfying every props.columns.* guard in the component ---
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
  columns: defaultColumns,
  allOrders: [],
  allExpenses: [],
  allPurchases: [],
  allSalesReturns: [],
  allPurchaseReturns: [],
};

// Lazy import so all mocks are in place first
let DailySales;
beforeAll(() => {
  DailySales = require('../sales/dailySales').default;
});

describe('DailySales smoke test', () => {
  it('renders without crashing with no columns enabled', () => {
    render(
      <MemoryRouter>
        <DailySales {...defaultProps} />
      </MemoryRouter>
    );
  });

  it('renders without crashing with all columns enabled', () => {
    const allColumns = Object.fromEntries(
      Object.keys(defaultColumns).map((k) => [k, true])
    );
    render(
      <MemoryRouter>
        <DailySales
          {...defaultProps}
          columns={allColumns}
          allOrders={[
            {
              date: new Date().toISOString(),
              net_total: '100',
              net_profit: '20',
              total_payment_received: '80',
              balance_amount: '20',
              loss: '0',
            },
          ]}
          allExpenses={[{ date: new Date().toISOString(), amount: '50' }]}
          allPurchases={[{ date: new Date().toISOString(), net_total: '200' }]}
          allSalesReturns={[
            {
              date: new Date().toISOString(),
              net_total: '30',
              net_profit: '5',
              loss: '0',
            },
          ]}
          allPurchaseReturns={[{ date: new Date().toISOString(), net_total: '10' }]}
        />
      </MemoryRouter>
    );
  });

  it('exposes an init() imperative handle without crashing', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <DailySales {...defaultProps} ref={ref} />
      </MemoryRouter>
    );
    // init() calls makeDailyData() which calls setDailySales — wrap in act()
    expect(() => act(() => ref.current.init())).not.toThrow();
  });
});
