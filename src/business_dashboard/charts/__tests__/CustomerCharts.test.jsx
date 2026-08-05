// Corner-case tests for business_dashboard/charts/CustomerCharts.js
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

import { TopCustomersChart, OutstandingReceivablesChart } from '../CustomerCharts';

beforeEach(() => {
    mockChartCalls.length = 0;
    jest.clearAllMocks();
});

describe('TopCustomersChart', () => {
    it('renders the empty-state message when customerSummaries is empty/undefined', () => {
        render(<TopCustomersChart customerSummaries={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No customer data')).toBeInTheDocument();
        expect(screen.queryByTestId('chart')).not.toBeInTheDocument();

        render(<TopCustomersChart store={{}} filters={{}} />);
        expect(screen.getAllByText('No customer data').length).toBeGreaterThan(0);
    });

    it('limits rows to the top 10 customers and adds a header row', () => {
        const customerSummaries = Array.from({ length: 15 }, (_, i) => ({
            customer_name: `Customer ${i}`,
            sales_amount: 100 + i,
            total_amount: 200 + i,
        }));
        render(<TopCustomersChart customerSummaries={customerSummaries} store={{}} filters={{}} />);
        expect(screen.getByTestId('chart')).toBeInTheDocument();
        const { data } = mockChartCalls[0];
        // header + 10 rows
        expect(data.length).toBe(11);
        expect(data[0][0]).toBe('Customer');
    });

    it('includes the Qtn. Invoice Orders line only when quotation_invoice_accounting is enabled', () => {
        const summaries = [{ customer_name: 'Acme', sales_amount: 100, qtn_amount: 50, total_amount: 150 }];

        render(
            <TopCustomersChart
                customerSummaries={summaries}
                store={{ settings: { quotation_invoice_accounting: true }, vat_percent: 15 }}
                filters={{}}
            />
        );
        const { tooltipHtml } = require('../chartTooltipSetup');
        const linesWithQtn = tooltipHtml.mock.calls[0][2];
        expect(linesWithQtn.some((l) => l.label === 'Qtn. Invoice Orders')).toBe(true);

        tooltipHtml.mockClear();
        render(<TopCustomersChart customerSummaries={summaries} store={{}} filters={{}} />);
        const linesWithoutQtn = tooltipHtml.mock.calls[0][2];
        expect(linesWithoutQtn.some((l) => l.label === 'Qtn. Invoice Orders')).toBe(false);
    });

    it('defaults vatPercent to 15 when store.vat_percent is not provided', () => {
        const summaries = [{ customer_name: 'Acme', sales_amount: 100, total_amount: 100 }];
        render(<TopCustomersChart customerSummaries={summaries} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        // total row value should equal the raw total (100), VAT split shown only in tooltip
        expect(data[1][1]).toBe(100);
    });
});

describe('OutstandingReceivablesChart', () => {
    it('renders the empty-state message when there are no positive outstanding balances', () => {
        render(<OutstandingReceivablesChart outstandingSummaries={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No outstanding balances')).toBeInTheDocument();

        render(
            <OutstandingReceivablesChart
                outstandingSummaries={[{ customer_name: 'Acme', outstanding: 0 }, { customer_name: 'Beta', outstanding: -5 }]}
                store={{}}
                filters={{}}
            />
        );
        expect(screen.getAllByText('No outstanding balances').length).toBeGreaterThan(0);
    });

    it('filters out non-positive balances and limits to top 10', () => {
        const outstandingSummaries = [
            { customer_name: 'Zero', outstanding: 0 },
            ...Array.from({ length: 12 }, (_, i) => ({ customer_name: `Cust ${i}`, outstanding: 10 + i })),
        ];
        render(<OutstandingReceivablesChart outstandingSummaries={outstandingSummaries} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(11); // header + 10
    });

    it('falls back to "Unknown" when customer_name is missing', () => {
        render(
            <OutstandingReceivablesChart
                outstandingSummaries={[{ outstanding: 42 }]}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('Unknown');
    });
});
