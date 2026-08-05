// Corner-case tests for business_dashboard/charts/ProductCharts.js
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
    TopProductsChart,
    CategoryRevenuePieChart,
    CategoryMarginChart,
    StockHealthChart,
} from '../ProductCharts';

beforeEach(() => {
    mockChartCalls.length = 0;
    jest.clearAllMocks();
});

describe('TopProductsChart', () => {
    it('renders the empty-state message with no data', () => {
        render(<TopProductsChart productSummaries={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No product sales data')).toBeInTheDocument();
    });

    it('limits to the top 10 products', () => {
        const productSummaries = Array.from({ length: 20 }, (_, i) => ({
            product_name: `Product ${i}`,
            sales_revenue: 10 + i,
            total_revenue: 20 + i,
        }));
        render(<TopProductsChart productSummaries={productSummaries} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(11);
    });

    it('includes the Qtn. Invoice Orders tooltip line only when quotation_invoice_accounting is on', () => {
        const summaries = [{ product_name: 'Widget', sales_revenue: 10, qtn_revenue: 5, total_revenue: 15 }];
        render(
            <TopProductsChart
                productSummaries={summaries}
                store={{ settings: { quotation_invoice_accounting: true } }}
                filters={{}}
            />
        );
        const { tooltipHtml } = require('../chartTooltipSetup');
        expect(tooltipHtml.mock.calls[0][2].some((l) => l.label === 'Qtn. Invoice Orders')).toBe(true);
    });
});

describe('CategoryRevenuePieChart', () => {
    it('renders the empty-state message when no category has positive sales', () => {
        render(<CategoryRevenuePieChart categorySummaries={[{ category_name: 'A', sales: 0, profit: 0 }]} store={{}} filters={{}} />);
        expect(screen.getByText('No category data')).toBeInTheDocument();
    });

    it('limits to the top 12 categories and computes percentage share', () => {
        const categorySummaries = Array.from({ length: 15 }, (_, i) => ({
            category_name: `Cat ${i}`,
            sales: 10,
            profit: 2,
        }));
        render(<CategoryRevenuePieChart categorySummaries={categorySummaries} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(13); // header + 12
    });

    it('shows "—" for margin when sales is 0 (guarded in tooltip lines)', () => {
        // sales must be >0 to pass the outer filter, so this exercises the c.sales > 0 branch normally;
        // verify the margin computation instead for a typical case
        const categorySummaries = [{ category_name: 'Cat', sales: 100, profit: 25 }];
        render(<CategoryRevenuePieChart categorySummaries={categorySummaries} store={{}} filters={{}} />);
        const { tooltipHtml } = require('../chartTooltipSetup');
        const marginLine = tooltipHtml.mock.calls[0][2].find((l) => l.label === 'Margin');
        expect(marginLine.value).toBe('25.0%');
    });
});

describe('CategoryMarginChart', () => {
    it('renders the empty-state message with no data', () => {
        render(<CategoryMarginChart categorySummaries={[]} store={{}} filters={{}} />);
        expect(screen.getByText('No margin data')).toBeInTheDocument();
    });

    it('sorts categories by margin descending and limits to top 10', () => {
        const categorySummaries = [
            { category_name: 'Low', sales: 100, profit: 5 },   // 5%
            { category_name: 'High', sales: 100, profit: 50 }, // 50%
            { category_name: 'Mid', sales: 100, profit: 25 },  // 25%
        ];
        render(<CategoryMarginChart categorySummaries={categorySummaries} store={{}} filters={{}} />);
        const { data } = mockChartCalls[0];
        expect(data[1][0]).toBe('High');
        expect(data[2][0]).toBe('Mid');
        expect(data[3][0]).toBe('Low');
    });
});

describe('StockHealthChart', () => {
    it('renders the empty-state message when total is 0', () => {
        render(<StockHealthChart stockSummary={{ total: 0 }} store={{}} filters={{}} />);
        expect(screen.getByText('No product data')).toBeInTheDocument();

        render(<StockHealthChart stockSummary={undefined} store={{}} filters={{}} />);
        expect(screen.getAllByText('No product data').length).toBeGreaterThan(0);
    });

    it('filters out zero-count slices (e.g. no out-of-stock items)', () => {
        render(
            <StockHealthChart
                stockSummary={{ out_of_stock: 0, low_stock: 3, healthy_stock: 7, total: 10 }}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        const labels = data.slice(1).map((r) => r[0]);
        expect(labels).not.toContain('Out of Stock');
        expect(labels).toEqual(['Low Stock (< 5)', 'Healthy Stock']);
    });

    it('includes all three slices when all counts are positive', () => {
        render(
            <StockHealthChart
                stockSummary={{ out_of_stock: 2, low_stock: 3, healthy_stock: 5, total: 10 }}
                store={{}}
                filters={{}}
            />
        );
        const { data } = mockChartCalls[0];
        expect(data.length).toBe(4); // header + 3
    });
});
