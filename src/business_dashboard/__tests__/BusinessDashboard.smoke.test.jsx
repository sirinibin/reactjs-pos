/**
 * Smoke test for BusinessDashboard (index.js)
 * React 17, CRA, @testing-library/react v11, no TypeScript
 */

// ── Chart child mocks ─────────────────────────────────────────────────────────

jest.mock('../charts/KPICards', () => () => null);

jest.mock('../charts/RevenueCharts', () => ({
    MonthlyRevenueTrendChart: () => null,
    CumulativeRevenueChart:   () => null,
    Last30DaysSalesChart:     () => null,
    SalesVsReturnsChart:      () => null,
}));

jest.mock('../charts/PaymentCharts', () => ({
    PaymentMethodPieChart:  () => null,
    PaymentStatusPieChart:  () => null,
    CashVsBankTrendChart:   () => null,
}));

jest.mock('../charts/ProductCharts', () => ({
    TopProductsChart:        () => null,
    CategoryRevenuePieChart: () => null,
    CategoryMarginChart:     () => null,
    StockHealthChart:        () => null,
}));

jest.mock('../charts/CustomerCharts', () => ({
    TopCustomersChart:             () => null,
    OutstandingReceivablesChart:   () => null,
}));

jest.mock('../charts/FinancialCharts', () => ({
    AccountBalancesChart:  () => null,
    VendorSpendPieChart:   () => null,
    PurchaseVsSalesChart:  () => null,
}));

// ── Timer / fetch setup ───────────────────────────────────────────────────────

beforeAll(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ status: true, result: {}, data: [], total_count: 0 }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── Test ──────────────────────────────────────────────────────────────────────

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BusinessDashboard from '../index';

describe('BusinessDashboard', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <BusinessDashboard />
            </MemoryRouter>
        );
    });
});
