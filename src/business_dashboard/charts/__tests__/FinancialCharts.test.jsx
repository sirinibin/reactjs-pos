// Corner-case tests for business_dashboard/charts/FinancialCharts.js
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

import { AccountBalancesChart, VendorSpendPieChart, PurchaseVsSalesChart } from '../FinancialCharts';

beforeEach(() => {
    mockChartCalls.length = 0;
    jest.clearAllMocks();
});

describe('AccountBalancesChart', () => {
    it('renders the empty-state message with no positive balances', () => {
        render(<AccountBalancesChart accountSummaries={[{ account_type: 'asset', balance: 0 }]} />);
        expect(screen.getByText('No account data')).toBeInTheDocument();

        render(<AccountBalancesChart accountSummaries={undefined} />);
        expect(screen.getAllByText('No account data').length).toBeGreaterThan(0);
    });

    it('maps known account_type keys to friendly labels and falls back to raw value / "General"', () => {
        const accountSummaries = [
            { account_type: 'asset', balance: 100 },
            { account_type: 'liability', balance: 50 },
            { account_type: '', balance: 10 },
            { account_type: 'custom_type', balance: 5 },
        ];
        render(<AccountBalancesChart accountSummaries={accountSummaries} />);
        const { data } = mockChartCalls[0];
        const labels = data.slice(1).map((r) => r[0]);
        expect(labels).toEqual(['Asset', 'Liability', 'General', 'custom_type']);
    });
});

describe('VendorSpendPieChart', () => {
    it('renders the empty-state message with no positive purchase amounts', () => {
        render(<VendorSpendPieChart vendorSummaries={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No purchase data')).toBeInTheDocument();
    });

    it('computes the percentage share of each vendor relative to the grand total', () => {
        const vendorSummaries = [
            { vendor_name: 'V1', purchase_amount: 75 },
            { vendor_name: 'V2', purchase_amount: 25 },
        ];
        render(<VendorSpendPieChart vendorSummaries={vendorSummaries} store={{}} filters={{}} />);
        const { tooltipHtml } = require('../chartTooltipSetup');
        const shareLine = tooltipHtml.mock.calls[0][2].find((l) => l.label === 'Share');
        expect(shareLine.value).toBe('75.0% of total purchase spend');
    });
});

describe('PurchaseVsSalesChart', () => {
    const baseProps = {
        orders: [], returns: [], purchases: [], purchaseReturns: [], expenses: [],
        salaryPaid: [], quotations: [], quotationSalesReturns: [],
        accountedPurchases: [], accountedPurchaseReturns: [], customerDeposits: [],
        store: {}, filters: {},
    };

    it('renders the empty-state message when there is no activity in any month', () => {
        render(<PurchaseVsSalesChart {...baseProps} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('computes Net Revenue as Sales − Returns for a single month (qtn accounting off)', () => {
        render(
            <PurchaseVsSalesChart
                {...baseProps}
                orders={[{ date: '2025-03-10', net_total: 300 }]}
                returns={[{ date: '2025-03-15', net_total: 50 }]}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('Mar 2025');
        expect(data[1][1]).toBe(250); // revenue
    });

    it('includes quotation invoice sales/returns in revenue only when enable_sales_in_quotation is on', () => {
        const props = {
            ...baseProps,
            orders: [{ date: '2025-04-01', net_total: 100 }],
            quotations: [{ date: '2025-04-01', type: 'invoice', net_total: 40 }],
            quotationSalesReturns: [{ date: '2025-04-01', net_total: 10 }],
        };
        render(<PurchaseVsSalesChart {...props} store={{ settings: { enable_sales_in_quotation: true } }} />);
        let { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(130); // 100 + 40 - 10

        mockChartCalls.length = 0;
        render(<PurchaseVsSalesChart {...props} store={{}} />);
        ({ data } = mockChartCalls[0]);
        expect(data[1][1]).toBe(100); // qtn ignored
    });

    it('uses the accounted-purchases formula for expense when disable_purchases_on_accounts is on', () => {
        const props = {
            ...baseProps,
            expenses: [{ date: '2025-05-01', amount: 100 }],
            accountedPurchases: [{ date: '2025-05-01', net_total: 40 }],
            accountedPurchaseReturns: [{ date: '2025-05-01', net_total: 10 }],
            purchases: [{ date: '2025-05-01', net_total: 999 }], // should be ignored in this mode
        };
        render(
            <PurchaseVsSalesChart {...props} store={{ settings: { disable_purchases_on_accounts: true } }} />
        );
        const { data } = mockChartCalls[0];
        // expense = exp(100) - depFund(0) + acctPur(40) - acctPurRet(10) = 130
        expect(data[1][3]).toBe(130);
    });

    it('uses Expenses + Purchases − PurchaseReturns for expense in the default mode', () => {
        const props = {
            ...baseProps,
            expenses: [{ date: '2025-06-01', amount: 50 }],
            purchases: [{ date: '2025-06-01', net_total: 30 }],
            purchaseReturns: [{ date: '2025-06-01', net_total: 5 }],
        };
        render(<PurchaseVsSalesChart {...props} />);
        const { data } = mockChartCalls[0];
        expect(data[1][3]).toBe(75); // 50 + 30 - 5
    });

    it('adds salaryPaid to expense only when enable_employee_module is on', () => {
        const props = {
            ...baseProps,
            expenses: [{ date: '2025-07-01', amount: 10 }],
            salaryPaid: [{ date: '2025-07-01', amount: 200 }],
        };
        render(<PurchaseVsSalesChart {...props} store={{ settings: { enable_employee_module: true } }} />);
        let { data } = mockChartCalls[0];
        expect(data[1][3]).toBe(210);

        mockChartCalls.length = 0;
        render(<PurchaseVsSalesChart {...props} store={{}} />);
        ({ data } = mockChartCalls[0]);
        expect(data[1][3]).toBe(10); // salary excluded
    });

    it('sorts multiple months chronologically', () => {
        render(
            <PurchaseVsSalesChart
                {...baseProps}
                orders={[
                    { date: '2025-02-01', net_total: 10 },
                    { date: '2025-01-01', net_total: 20 },
                ]}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('Jan 2025');
        expect(data[2][0]).toBe('Feb 2025');
    });
});
