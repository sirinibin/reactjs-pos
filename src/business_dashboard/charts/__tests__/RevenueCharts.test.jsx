// Corner-case tests for business_dashboard/charts/RevenueCharts.js
// React 17, CRA, @testing-library/react v11, no TypeScript

import React from 'react';
import { render, screen } from '@testing-library/react';

const mockChartCalls = [];
jest.mock('react-google-charts', () => ({
    Chart: (props) => {
        mockChartCalls.push(props);
        return <div data-testid="chart" />;
    },
}));

jest.mock('../chartTooltipSetup', () => ({
    tooltipHtml: jest.fn((title) => `<div>tooltip:${title}</div>`),
    onChartSelect: jest.fn(),
}));

import {
    MonthlyRevenueTrendChart,
    CumulativeRevenueChart,
    Last30DaysSalesChart,
    SalesVsReturnsChart,
} from '../RevenueCharts';

beforeEach(() => {
    mockChartCalls.length = 0;
    jest.clearAllMocks();
});

describe('MonthlyRevenueTrendChart', () => {
    const baseProps = {
        orders: [], returns: [], purchases: [], purchaseReturns: [], expenses: [],
        salaryPaid: [], quotations: [], quotationSalesReturns: [],
        accountedPurchases: [], accountedPurchaseReturns: [], customerDeposits: [],
        store: {}, filters: {},
    };

    it('renders the empty-state message with no activity', () => {
        render(<MonthlyRevenueTrendChart {...baseProps} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('computes revenue, expense and profit for a simple month (default mode)', () => {
        render(
            <MonthlyRevenueTrendChart
                {...baseProps}
                orders={[{ date: '2025-03-01', net_total: 500 }]}
                returns={[{ date: '2025-03-05', net_total: 100 }]}
                purchases={[{ date: '2025-03-01', net_total: 150 }]}
                expenses={[{ date: '2025-03-01', amount: 50 }]}
            />
        );
        const { data } = mockChartCalls[0];
        // revenue = 500 - 100 = 400
        expect(data[1][1]).toBe(400);
        // expense = exp(50) + pur(150) - purRet(0) + cashDiscountAdj(0) + sal(0) = 200
        expect(data[1][3]).toBe(200);
        // profit = revenue - expense = 200
        expect(data[1][5]).toBe(200);
    });

    it('marks a negative month as a loss (isProfitable=false) via the Net Loss tooltip title', () => {
        render(
            <MonthlyRevenueTrendChart
                {...baseProps}
                orders={[{ date: '2025-04-01', net_total: 10 }]}
                expenses={[{ date: '2025-04-01', amount: 100 }]}
            />
        );
        const { tooltipHtml } = require('../chartTooltipSetup');
        const plCall = tooltipHtml.mock.calls.find(([title]) => title.includes('Net Loss'));
        expect(plCall).toBeDefined();
    });

    it('uses the accounted-purchases expense formula plus cash-discount adjustments when disable_purchases_on_accounts is on', () => {
        render(
            <MonthlyRevenueTrendChart
                {...baseProps}
                expenses={[{ date: '2025-05-01', amount: 100 }]}
                accountedPurchases={[{ date: '2025-05-01', net_total: 40, cash_discount: 5 }]}
                accountedPurchaseReturns={[{ date: '2025-05-01', net_total: 10, cash_discount: 2 }]}
                store={{ settings: { disable_purchases_on_accounts: true } }}
            />
        );
        const { data } = mockChartCalls[0];
        // expense = exp(100) - depFund(0) + acctPur(40) - acctPurRet(10) + cashDiscountAdj + sal(0)
        // cashDiscountAdj = salesCD(0) - salesRetCD(0) + acctPurRetCD(2) - acctPurCD(5) = -3
        // expense = 100 + 40 - 10 - 3 = 127
        expect(data[1][3]).toBe(127);
    });

    it('includes salaryPaid in expense only when enable_employee_module is on', () => {
        const props = {
            ...baseProps,
            expenses: [{ date: '2025-06-01', amount: 10 }],
            salaryPaid: [{ date: '2025-06-01', amount: 200 }],
        };
        render(<MonthlyRevenueTrendChart {...props} store={{ settings: { enable_employee_module: true } }} />);
        let { data } = mockChartCalls[0];
        expect(data[1][3]).toBe(210);

        mockChartCalls.length = 0;
        render(<MonthlyRevenueTrendChart {...props} store={{}} />);
        ({ data } = mockChartCalls[0]);
        expect(data[1][3]).toBe(10);
    });
});

describe('CumulativeRevenueChart', () => {
    it('renders the empty-state message with no activity', () => {
        render(<CumulativeRevenueChart orders={[]} returns={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('accumulates net revenue across consecutive months', () => {
        render(
            <CumulativeRevenueChart
                orders={[
                    { date: '2025-01-10', net_total: 100 },
                    { date: '2025-02-10', net_total: 50 },
                ]}
                returns={[{ date: '2025-02-15', net_total: 10 }]}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(100); // Jan cumulative
        expect(data[2][1]).toBe(140); // Feb: 100 + (50 - 10)
    });

    it('includes quotation invoice net revenue only when quotation_invoice_accounting is on', () => {
        const props = {
            orders: [{ date: '2025-03-01', net_total: 100 }],
            returns: [],
            quotations: [{ date: '2025-03-01', type: 'invoice', net_total: 20 }],
            quotationSalesReturns: [],
            filters: {},
        };
        render(<CumulativeRevenueChart {...props} store={{ settings: { quotation_invoice_accounting: true } }} />);
        let { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(120);

        mockChartCalls.length = 0;
        render(<CumulativeRevenueChart {...props} store={{}} />);
        ({ data } = mockChartCalls[0]);
        expect(data[1][1]).toBe(100);
    });
});

describe('Last30DaysSalesChart', () => {
    it('renders the empty-state message with no orders', () => {
        render(<Last30DaysSalesChart orders={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No sales data')).toBeInTheDocument();
    });

    it('limits results to the most recent 12 months', () => {
        const orders = Array.from({ length: 15 }, (_, i) => ({
            date: `2024-${String(i + 1).padStart(2, '0')}-01`,
            net_total: 10,
        })).filter((o) => Number(o.date.split('-')[1]) <= 15); // guard against invalid months beyond 12
        // Build 15 distinct months across 2024-2025 to exceed the 12-month cap
        const manyMonths = [];
        for (let m = 1; m <= 15; m++) {
            const year = 2024 + Math.floor((m - 1) / 12);
            const month = ((m - 1) % 12) + 1;
            manyMonths.push({ date: `${year}-${String(month).padStart(2, '0')}-01`, net_total: 10 });
        }
        render(<Last30DaysSalesChart orders={manyMonths} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(13); // header + 12
    });
});

describe('SalesVsReturnsChart', () => {
    it('renders the empty-state message with no activity', () => {
        render(<SalesVsReturnsChart orders={[]} returns={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('reports sales and returns for the same month independently', () => {
        render(
            <SalesVsReturnsChart
                orders={[{ date: '2025-07-01', net_total: 300 }]}
                returns={[{ date: '2025-07-15', net_total: 40 }]}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('Jul 2025');
        expect(data[1][1]).toBe(300);
        expect(data[1][3]).toBe(40);
    });

    it('includes a month with only returns and no sales (union of keys)', () => {
        render(
            <SalesVsReturnsChart
                orders={[]}
                returns={[{ date: '2025-08-01', net_total: 20 }]}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(0); // no sales
        expect(data[1][3]).toBe(20);
    });
});
