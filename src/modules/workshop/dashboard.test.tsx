import { describe, expect, it, vi } from 'vitest';
import { configure, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { DashboardPage } from './dashboard';

// Heavy user-event flows; keep headroom when the suite runs on a busy machine.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const DASH = {
  total_profit: 2877.3, monthly_profit: 2877.3, month_name: 'October', counter_cash: 2650.4, bank_cash: 342.7, spare_parts_value: { purchase_value: 128793.9, retail_value: 207921.5 },
  total_credit: 86.6, labour_profit: 115, spare_profit: 912, additional_profit: 0, unpaid_bill: 0, salary_balance: -7000, additional_expense: 0,
  monthly_breakdown: [{ month: '2025-11', revenue: 100, total_profit: 40 }, { month: '2026-10', labour_profit: 0, spare_profit: 912, additional_profit: 0, total_profit: 912, revenue: 3220 }],
  vat_box: { net_vat: 120, sales_vat: 150, purchase_vat: 30 }, vat_box_monthly: { net_vat: -5 },
  total_profit_breakdown: { sales_revenue: 2877.3, total_revenue: 2877.3, total_expenses: 0 }, labour_breakdown: { sales_profit: 115 },
  employee_breakdown: null, expense_category_breakdown: null, customer_credit_breakdown: [{ name: 'RIYADH AUTO CARE', credit_balance: 86.6 }], vendor_payables_breakdown: null,
};

describe('Workshop dashboard', () => {
  it('loads all-time KPIs, handles null breakdowns and renders charts', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/automobile/dashboard', reply: { status: true, result: DASH } }]);
    renderApp(<DashboardPage />, { at: '/workshop/dashboard' });
    expect(await screen.findByText('Total Profit')).toBeInTheDocument();
    expect(screen.getAllByText('2,877.30').length).toBeGreaterThan(0);
    expect(screen.getByText('Monthly Profit (October)')).toBeInTheDocument();
    expect(screen.getByText('Owed to Employees')).toBeInTheDocument();
    expect(screen.getByText('RIYADH AUTO CARE')).toBeInTheDocument();
    expect(screen.queryByText('TOTAL VAT')).not.toBeInTheDocument(); // enable_vat_box off
    expect(screen.getByText('Monthly P&L Trend (Last 12 Months)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Labour Profit 11%, Spare Profit 89%|Spare Profit 89%, Labour Profit 11%/ })).toBeInTheDocument();
    const p = calls(f, 'GET', '/v1/automobile/dashboard')[0].url.searchParams;
    expect(p.get('search[store_id]')).toBe(STORE_ID);
    expect(p.get('from_month')).toBeNull();
  });

  it('each date mode sends the right range; incomplete ranges are not sent', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/automobile/dashboard', reply: { status: true, result: DASH } }]);
    renderApp(<DashboardPage />, { at: '/workshop/dashboard' });
    await screen.findByText('Total Profit');
    const last = () => calls(f, 'GET', '/v1/automobile/dashboard').at(-1)!.url.searchParams;
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01' } });
    expect(last().get('from_month')).toBeNull();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03' } });
    await waitFor(() => expect(last().get('to_month')).toBe('2026-03'));
    expect(last().get('from_month')).toBe('2026-01');
    expect(await screen.findByText('Monthly P&L Trend (Jan 2026 → Mar 2026)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Single Date' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-05' } });
    await waitFor(() => expect(last().get('from_date')).toBe('2026-10-05'));
    expect(last().get('to_date')).toBe('2026-10-05');

    await userEvent.click(screen.getByRole('button', { name: 'Year' }));
    await waitFor(() => expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('Year'), '2025');
    await waitFor(() => expect(last().get('from_month')).toBe('2025-01'));
    expect(last().get('to_month')).toBe('2025-12');

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(last().get('from_month')).toBeNull());
  });

  it('shows VAT cards when enable_vat_box is on, and an error state on failure', async () => {
    mockApi([{ method: 'GET', path: '/v1/automobile/dashboard', reply: { status: true, result: DASH } }], { store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_vat_box: true } } });
    const { unmount } = renderApp(<DashboardPage />, { at: '/workshop/dashboard' });
    expect(await screen.findByText('TOTAL VAT')).toBeInTheDocument();
    expect(screen.getByText('Payable to Authority')).toBeInTheDocument();
    expect(screen.getByText('Refundable')).toBeInTheDocument();
    unmount();
    mockApi([{ method: 'GET', path: '/v1/automobile/dashboard', reply: { status: false, errors: { dashboard: 'aggregate failed' } } }]);
    renderApp(<DashboardPage />, { at: '/workshop/dashboard' });
    expect(await screen.findByText(/aggregate failed/)).toBeInTheDocument();
  });
});
