import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- third-party mocks ---
jest.mock("react-google-charts", () => ({
  Chart: () => null,
  default: { Chart: () => null },
}));

// --- setup ---
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => "application/json" },
  json: () =>
    Promise.resolve({
      result: {},
      data: [],
      total_count: 0,
      store: {},
      settings: {},
    }),
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// --- component under test ---
import MonthlySales from "../sales/monthlySales";

const defaultProps = {
  allOrders: [],
  allExpenses: [],
  allPurchases: [],
  allSalesReturns: [],
  allPurchaseReturns: [],
  columns: {
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
  },
};

describe("MonthlySales smoke test", () => {
  it("renders without crashing with empty data", () => {
    render(
      <MemoryRouter>
        <MonthlySales {...defaultProps} />
      </MemoryRouter>
    );
  });

  it("renders without crashing with all columns enabled and sample data", () => {
    const allOrders = [
      {
        date: new Date().toISOString(),
        net_total: "100.00",
        net_profit: "20.00",
        total_payment_received: "100.00",
        balance_amount: "0.00",
        loss: "0.00",
      },
    ];
    const allExpenses = [
      { date: new Date().toISOString(), amount: "50.00" },
    ];
    const allPurchases = [
      { date: new Date().toISOString(), net_total: "200.00" },
    ];
    const allSalesReturns = [
      {
        date: new Date().toISOString(),
        net_total: "10.00",
        net_profit: "2.00",
        loss: "0.00",
      },
    ];
    const allPurchaseReturns = [
      { date: new Date().toISOString(), net_total: "5.00" },
    ];
    const columns = {
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
    };

    render(
      <MemoryRouter>
        <MonthlySales
          allOrders={allOrders}
          allExpenses={allExpenses}
          allPurchases={allPurchases}
          allSalesReturns={allSalesReturns}
          allPurchaseReturns={allPurchaseReturns}
          columns={columns}
        />
      </MemoryRouter>
    );
  });

  it("exposes imperative init handle via ref without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <MonthlySales {...defaultProps} ref={ref} />
      </MemoryRouter>
    );
    expect(ref.current).toBeDefined();
    expect(typeof ref.current.init).toBe("function");
    // calling init with empty allOrders should be a no-op
    ref.current.init();
  });
});
