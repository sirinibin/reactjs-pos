import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-google-charts
jest.mock('react-google-charts', () => ({
  Chart: () => null,
  default: { Chart: () => null },
}));

jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import YearlySales from '../sales/yearlySales';

const defaultColumns = {
  sales: true,
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

describe('YearlySales smoke test', () => {
  it('renders without crashing with empty data', () => {
    render(
      <MemoryRouter>
        <YearlySales {...defaultProps} />
      </MemoryRouter>
    );
  });

  it('renders without crashing with all columns enabled', () => {
    const allColumnsOn = Object.fromEntries(
      Object.keys(defaultColumns).map((k) => [k, true])
    );
    render(
      <MemoryRouter>
        <YearlySales
          {...defaultProps}
          columns={allColumnsOn}
        />
      </MemoryRouter>
    );
  });

  it('renders without crashing with sample order data', () => {
    const allColumnsOn = Object.fromEntries(
      Object.keys(defaultColumns).map((k) => [k, true])
    );
    const sampleOrders = [
      {
        date: '2024-01-15',
        net_total: '1000.00',
        net_profit: '200.00',
        total_payment_received: '800.00',
        balance_amount: '200.00',
        loss: '0.00',
      },
    ];
    const sampleExpenses = [{ date: '2024-02-10', amount: '150.00' }];
    const samplePurchases = [{ date: '2024-03-05', net_total: '500.00' }];
    const sampleSalesReturns = [
      { date: '2024-04-20', net_total: '100.00', net_profit: '20.00', loss: '0.00' },
    ];
    const samplePurchaseReturns = [{ date: '2024-05-01', net_total: '50.00' }];

    render(
      <MemoryRouter>
        <YearlySales
          allOrders={sampleOrders}
          allExpenses={sampleExpenses}
          allPurchases={samplePurchases}
          allSalesReturns={sampleSalesReturns}
          allPurchaseReturns={samplePurchaseReturns}
          columns={allColumnsOn}
        />
      </MemoryRouter>
    );
  });
});
