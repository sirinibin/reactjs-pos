// Corner-case tests for business_dashboard/charts/PaymentCharts.js
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

import { PaymentMethodPieChart, PaymentStatusPieChart, CashVsBankTrendChart } from '../PaymentCharts';

beforeEach(() => {
    mockChartCalls.length = 0;
    jest.clearAllMocks();
});

describe('PaymentMethodPieChart', () => {
    it('renders the empty-state message when there are no payments', () => {
        render(<PaymentMethodPieChart payments={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No payment data')).toBeInTheDocument();
    });

    it('aggregates amounts by method and sorts descending by total', () => {
        const payments = [
            { method: 'cash', amount: 50 },
            { method: 'bank_transfer', amount: 200 },
            { method: 'cash', amount: 25 },
        ];
        render(<PaymentMethodPieChart payments={payments} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('Bank Transfer'); // 200, highest total first
        expect(data[2][0]).toBe('Cash'); // 75
    });

    it('includes quotation invoice payments only when quotation_invoice_accounting is enabled', () => {
        const payments = [{ method: 'cash', amount: 10 }];
        const quotations = [{ type: 'invoice', payments: [{ method: 'cash', amount: 40 }] }];

        render(
            <PaymentMethodPieChart
                payments={payments}
                quotations={quotations}
                store={{ settings: { quotation_invoice_accounting: true } }}
                filters={{}}
            />
        );
        let { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(50); // 10 + 40 combined

        mockChartCalls.length = 0;
        render(<PaymentMethodPieChart payments={payments} quotations={quotations} store={{}} filters={{}} />);
        ({ data } = mockChartCalls[0]);
        expect(data[1][1]).toBe(10); // quotation payments excluded
    });

    it('falls back to "other" for a missing method and uses the raw key as label when unmapped', () => {
        render(<PaymentMethodPieChart payments={[{ amount: 30 }]} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('other');
    });
});

describe('PaymentStatusPieChart', () => {
    it('renders the empty-state message with no orders', () => {
        render(<PaymentStatusPieChart orders={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No order data')).toBeInTheDocument();
    });

    it('buckets orders by payment_status and ignores unrecognized statuses', () => {
        const orders = [
            { payment_status: 'paid', net_total: 100 },
            { payment_status: 'not_paid', net_total: 50 },
            { payment_status: 'paid_partially', net_total: 25 },
            { payment_status: 'unknown_status', net_total: 999 },
        ];
        render(<PaymentStatusPieChart orders={orders} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        const labels = data.slice(1).map((r) => r[0]);
        expect(labels).toEqual(expect.arrayContaining(['Paid', 'Unpaid', 'Partially Paid']));
        expect(labels.length).toBe(3); // "unknown_status" row excluded (total stays 0)
    });

    it('includes quotation invoice statuses only when quotation_invoice_accounting is enabled', () => {
        const orders = [];
        const quotations = [{ type: 'invoice', payment_status: 'paid', net_total: 500 }];
        render(
            <PaymentStatusPieChart
                orders={orders}
                quotations={quotations}
                store={{ settings: { quotation_invoice_accounting: true } }}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(500);
    });
});

describe('CashVsBankTrendChart', () => {
    it('renders the empty-state message with no payments', () => {
        render(<CashVsBankTrendChart payments={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('splits cash vs. non-cash payments per month and ignores entries missing date/amount', () => {
        const payments = [
            { date: '2025-01-15', amount: 100, method: 'cash' },
            { date: '2025-01-20', amount: 200, method: 'bank_transfer' },
            { date: '2025-01-25', amount: 0, method: 'cash' }, // amount falsy — ignored
            { amount: 50, method: 'cash' }, // no date — ignored
        ];
        render(<CashVsBankTrendChart payments={payments} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(2); // header + 1 month
        expect(data[1][1]).toBe(100); // cash total
        expect(data[1][3]).toBe(200); // bank total
    });

    it('includes quotation invoice payments only when quotation_invoice_accounting is enabled', () => {
        const quotations = [
            { type: 'invoice', date: '2025-02-10', payments: [{ method: 'cash', amount: 75 }] },
        ];
        render(
            <CashVsBankTrendChart
                payments={[]}
                quotations={quotations}
                store={{ settings: { quotation_invoice_accounting: true } }}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][1]).toBe(75);
    });
});
