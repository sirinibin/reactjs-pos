// Smoke test for analytics/sales/hourlySales.js
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
let HourlySales;
beforeAll(() => {
    HourlySales = require('../sales/hourlySales').default;
});

const today = new Date();

describe('HourlySales smoke test', () => {
    it('renders without crashing with no columns enabled', () => {
        render(
            <MemoryRouter>
                <HourlySales {...defaultProps} />
            </MemoryRouter>
        );
    });

    it('renders without crashing with all columns enabled and matching-date entries', () => {
        const allColumns = Object.fromEntries(
            Object.keys(defaultColumns).map((k) => [k, true])
        );
        render(
            <MemoryRouter>
                <HourlySales
                    {...defaultProps}
                    columns={allColumns}
                    allOrders={[
                        {
                            date: today.toISOString(),
                            net_total: '100',
                            net_profit: '20',
                            total_payment_received: '80',
                            balance_amount: '20',
                            loss: '0',
                        },
                    ]}
                    allExpenses={[{ date: today.toISOString(), amount: '50' }]}
                    allPurchases={[{ date: today.toISOString(), net_total: '200' }]}
                    allSalesReturns={[
                        {
                            date: today.toISOString(),
                            net_total: '30',
                            net_profit: '5',
                            loss: '0',
                        },
                    ]}
                    allPurchaseReturns={[{ date: today.toISOString(), net_total: '10' }]}
                />
            </MemoryRouter>
        );
    });

    it('exposes an init() imperative handle without crashing when allOrders is empty', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <HourlySales {...defaultProps} ref={ref} />
            </MemoryRouter>
        );
        // init() only calls makeHourlySalesData() when allOrders.length > 0,
        // so with an empty array this should just rebuild date options.
        expect(() => act(() => ref.current.init())).not.toThrow();
    });

    it('exposes an init() imperative handle without crashing when allOrders is non-empty', () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <HourlySales
                    {...defaultProps}
                    allOrders={[
                        {
                            date: today.toISOString(),
                            net_total: '100',
                            net_profit: '20',
                            total_payment_received: '80',
                            balance_amount: '20',
                            loss: '0',
                        },
                    ]}
                    ref={ref}
                />
            </MemoryRouter>
        );
        expect(() => act(() => ref.current.init())).not.toThrow();
    });

    it('ignores entries whose date does not match the selected day/month/year', () => {
        const allColumns = Object.fromEntries(
            Object.keys(defaultColumns).map((k) => [k, true])
        );
        const nonMatchingDate = new Date(2000, 0, 1).toISOString();
        // Should not throw even though none of the entries match today's selected date.
        expect(() =>
            render(
                <MemoryRouter>
                    <HourlySales
                        {...defaultProps}
                        columns={allColumns}
                        allOrders={[
                            {
                                date: nonMatchingDate,
                                net_total: '100',
                                net_profit: '20',
                                total_payment_received: '80',
                                balance_amount: '20',
                                loss: '0',
                            },
                        ]}
                    />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
