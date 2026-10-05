import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { StatsPage } from './StatsPage';
import { AnalyticsPage } from './AnalyticsPage';

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const meta = (m: Record<string, number>) => ({ status: true, total_count: 0, result: [], meta: m });
const statMocks = (extra: any[] = []) => [
  ...extra,
  { method: 'GET', path: '/v1/order', reply: meta({ total_sales: 1150, paid_sales: 1000, unpaid_sales: 150, net_profit: 230, vat_price: 150, cash_discount: 0, commission: 0 }) },
  { method: 'GET', path: '/v1/sales-return', reply: meta({ total_sales_return: 115, vat_price: 15 }) },
  { method: 'GET', path: '/v1/purchase', reply: meta({ total_purchase: 460, vat_price: 60 }) },
  { method: 'GET', path: '/v1/purchase-return', reply: meta({ total_purchase_return: 0 }) },
  { method: 'GET', path: '/v1/expense', reply: meta({ total: 100, cash: 100, bank: 0, purchase_fund: 0, vat: 0, salary_paid: 0 }) },
  { method: 'GET', path: '/v1/customer-deposit', reply: meta({ total: 0, total_customer: 50, total_vendor: 10 }) },
  { method: 'GET', path: '/v1/customer-withdrawal', reply: meta({ total: 0 }) },
  { method: 'GET', path: '/v1/quotation', reply: meta({ total_quotation: 0 }) },
  { method: 'GET', path: '/v1/quotation-sales-return', reply: meta({}) },
  { method: 'GET', path: '/v1/non-vat-sales', reply: meta({ net_total: 0 }) },
  { method: 'GET', path: '/v1/non-vat-sales-return', reply: meta({}) },
];

describe('Statistics', () => {
  it('queries every module with stats=1 and computes profit / loss', async () => {
    const f = mockApi(statMocks());
    renderApp(<StatsPage />, { at: '/insights/stats' });
    expect(await screen.findByText('Profit / loss statement')).toBeInTheDocument();
    // revenue 1035, expense 100 + 460 = 560 → profit 475
    expect(await screen.findByText('475.00')).toBeInTheDocument();
    const c = calls(f, 'GET', '/v1/order')[0].url.searchParams;
    expect([c.get('search[store_id]'), c.get('search[stats]'), c.get('limit')]).toEqual([STORE_ID, '1', '1']);
    expect(screen.getByText('Net receivables')).toBeInTheDocument();
    expect(screen.getAllByText('60.00').length).toBeGreaterThan(0);
  });

  it('date filter re-queries with the API date format', async () => {
    const f = mockApi(statMocks());
    renderApp(<StatsPage />, { at: '/insights/stats' });
    await screen.findByText('Profit / loss statement');
    await userEvent.click(screen.getByRole('button', { name: /^Date/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/expense').some((c) => /^[A-Z][a-z]{2} \d{2} \d{4}$/.test(c.url.searchParams.get('search[from_date]') || ''))).toBe(true));
  });

  it('forecasts use search[store_id] (the legacy plain store_id always failed) and empty → "No forecast yet"', async () => {
    const f = mockApi(statMocks());
    renderApp(<StatsPage />, { at: '/insights/stats' });
    expect((await screen.findAllByText('No forecast yet')).length).toBe(3);
    const fc = calls(f, 'GET', '/v1/bi/report-result/download');
    expect(fc).toHaveLength(3);
    expect(fc[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });

  it('renders forecast CSV rows', async () => {
    const csv = 'month_name,year,predicted_expense\nNov,2026,1200\nDec,2026,800\n';
    const fn = mockApi(statMocks());
    const orig = fn.getMockImplementation()!;
    fn.mockImplementation(async (input: any, init?: any) => (String(input).includes('expense_forecast_6m') ? new Response(csv, { status: 200, headers: { 'content-type': 'text/csv' } }) : orig(input, init)));
    renderApp(<StatsPage />, { at: '/insights/stats' });
    const card = (await screen.findByText('Expense forecast (next 6 months)')).closest('section')!;
    expect(await within(card as HTMLElement).findByText('Nov 2026')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('2,000.00')).toBeInTheDocument();
  });

  it('sections can be hidden and the choice is remembered', async () => {
    mockApi(statMocks());
    renderApp(<StatsPage />, { at: '/insights/stats' });
    await screen.findByText('Profit / loss statement');
    await userEvent.click(screen.getByRole('button', { name: 'Customize' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('checkbox', { name: 'Payables' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('heading', { name: 'Payables' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('stats_section_settings')!).find((x: any) => x.key === 'payables').visible).toBe(false);
  });

  it('skips modules the user cannot read', async () => {
    const f = mockApi(statMocks([{ method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'purchases', read: false }, { resource: 'stats', read: true }] } }]),
      { user: { id: 'u3', name: 'Viewer', admin: false, role: 'User' }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<StatsPage />, { at: '/insights/stats' });
    await screen.findByText('Profit / loss statement');
    await screen.findByText('Expenses');
    expect(calls(f, 'GET', '/v1/purchase')).toHaveLength(0);
  });
});

describe('Analytics', () => {
  const y = new Date().getFullYear();
  const orders = [{ date: new Date(y, 0, 15, 10).toISOString(), net_total: 100, net_profit: 20 }, { date: new Date(y, 0, 20, 10).toISOString(), net_total: 50, net_profit: 5 }];
  const anMocks = () => mockApi([
    { method: 'GET', path: '/v1/order', reply: { status: true, result: orders } },
    { method: 'GET', path: '/v1/expense', reply: { status: true, result: [{ date: new Date(y, 0, 3).toISOString(), amount: 30 }] } },
  ]);

  it('loads every record of the selected series (limit 1000, newest first) and plots it', async () => {
    const f = anMocks();
    renderApp(<AnalyticsPage />, { at: '/insights/analytics' });
    await userEvent.click(await screen.findByRole('button', { name: 'Table' }));
    const table = await screen.findByRole('table', { name: 'Analytics table' });
    expect(within(within(table).getByText('Jan').closest('tr')!).getByText('150.00')).toBeInTheDocument();
    const c = calls(f, 'GET', '/v1/order')[0].url.searchParams;
    expect([c.get('limit'), c.get('sort'), c.get('search[store_id]')]).toEqual(['1000', '-date', STORE_ID]);
    expect(c.get('select')).toContain('net_profit');
    expect(calls(f, 'GET', '/v1/expense')).toHaveLength(0);
  });

  it('adding a series fetches its module; the table view shows monthly sums', async () => {
    const f = anMocks();
    renderApp(<AnalyticsPage />, { at: '/insights/analytics' });
    await waitFor(() => expect(calls(f, 'GET', '/v1/order')).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Expense' }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/expense')).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    const table = await screen.findByRole('table', { name: 'Analytics table' });
    const jan = within(table).getByText('Jan').closest('tr')!;
    expect(within(jan).getByText('150.00')).toBeInTheDocument();
    expect(within(jan).getByText('30.00')).toBeInTheDocument();
  });

  it('limits the chart to three series at a time', async () => {
    anMocks();
    renderApp(<AnalyticsPage />, { at: '/insights/analytics' });
    await screen.findByRole('button', { name: 'Sales profit' });
    await userEvent.click(screen.getByRole('button', { name: 'Sales profit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Paid sales' }));
    expect(screen.getByRole('button', { name: 'Credit sales' })).toBeDisabled();
  });
});
