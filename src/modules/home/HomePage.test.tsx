import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import HomePage from './HomePage';
import { addMonths, monthKey } from './dashboard';

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const cur = monthKey(new Date());
const prev = addMonths(cur, -1);
const MONTHLY = [
  { month_str: prev, sales_amount: 1000, sales_count: 4, purchase_amount: 400, expense_amount: 100 },
  { month_str: cur, sales_amount: 2000, sales_count: 5, sales_return_amount: 100, purchase_amount: 800, expense_amount: 200, payment_cash: 1200, payment_bank_transfer: 600 },
];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function dashMocks(o: { monthly?: any[]; openSales?: any[]; meta?: any; stock?: any; extra?: any[] } = {}) {
  return [
    ...(o.extra || []),
    { method: 'GET', path: '/v1/dashboard/monthly', reply: { status: true, result: o.monthly ?? MONTHLY } },
    { method: 'GET', path: '/v1/dashboard/products', reply: { status: true, result: [{ product_name: 'Car Battery 70Ah AGM', total_revenue: 3640 }, { product_name: 'Engine Oil 5W-30', total_revenue: 3072 }] } },
    { method: 'GET', path: '/v1/dashboard/customers', reply: { status: true, result: [{ customer_name: 'RIYADH AUTO CARE', total_amount: 1800 }, { customer_name: 'NOBODY', total_amount: 0 }] } },
    { method: 'GET', path: '/v1/dashboard/accounts', reply: { status: true, result: [{ account_type: 'cash', balance: 1000 }, { account_type: 'bank', balance: 2500 }] } },
    { method: 'GET', path: '/v1/dashboard/stock', reply: { status: true, result: o.stock ?? { out_of_stock: 2, low_stock: 1, healthy_stock: 20, total: 23 } } },
    { method: 'GET', path: '/v1/dashboard/employee', reply: { status: true, result: { salary_balance: -500, employee_breakdown: [] } } },
    { method: 'GET', path: '/v1/order', reply: (u: URL) => (u.searchParams.get('search[zatca.reporting_passed]')
      ? { status: true, total_count: 1, result: [{ id: 'z' }] }
      : { status: true, total_count: (o.openSales ?? [1]).length, result: o.openSales ?? [{ id: 'o1', date: daysAgo(45), balance_amount: 300 }] }) },
    { method: 'GET', path: '/v1/purchase', reply: { status: true, total_count: 0, result: [] } },
    { method: 'GET', path: '/v1/account', reply: { status: true, total_count: 1, result: [{ id: 'a' }], meta: o.meta ?? { debit_balance_total: 100, credit_balance_total: 100 } } },
  ];
}

describe('Home dashboard', () => {
  it('dashboard endpoints use a plain store_id; lists use search[store_id]', async () => {
    const f = mockApi(dashMocks());
    renderApp(<HomePage />, { at: '/home' });
    await screen.findByText('Revenue vs purchases');
    await waitFor(() => expect(calls(f, 'GET', '/v1/dashboard/monthly')).toHaveLength(1));
    const m = calls(f, 'GET', '/v1/dashboard/monthly')[0].url.searchParams;
    expect(m.get('store_id')).toBe(STORE_ID);
    expect(m.get('search[store_id]')).toBeNull();
    expect(m.get('to_month')).toBe(cur);
    expect(m.get('from_month')).toBe(addMonths(cur, -23));
    const o = calls(f, 'GET', '/v1/order').find((c) => c.url.searchParams.get('search[payment_status]'))!;
    expect(o.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(o.url.searchParams.get('search[payment_status]')).toBe('not_paid,paid_partially');
  });

  it('shows KPI tiles computed from monthly rows and switches period presets', async () => {
    mockApi(dashMocks());
    renderApp(<HomePage />, { at: '/home' });
    const kpis = await screen.findByLabelText('Key figures');
    // 12M: revenue = 1000 + 2000 − 100 = 2900 (non-VAT sales flag on → "Total revenue")
    expect(await within(kpis).findByText('2,900')).toBeInTheDocument();
    expect(within(kpis).getByText('Cash & bank')).toBeInTheDocument();
    expect(within(kpis).getByText('3,500')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'MTD' }));
    expect(await within(kpis).findByText('1,900')).toBeInTheDocument();
    // delta vs last month: (1900 − 1000) / 1000 = +90%
    expect(within(kpis).getByText('▲ 90.0%')).toBeInTheDocument();
  });

  it('builds the needs-attention list from real data', async () => {
    mockApi(dashMocks({ meta: { debit_balance_total: 100, credit_balance_total: 196.6 } }));
    renderApp(<HomePage />, { at: '/home', path: '/home' });
    const tasks = await screen.findByRole('list', { name: 'My tasks' });
    expect(await within(tasks).findByText('ZATCA rejected invoices')).toBeInTheDocument();
    expect(within(tasks).getByText('Trial balance is out of balance')).toBeInTheDocument();
    expect(within(tasks).getByText('Overdue receivables (30+ days)')).toBeInTheDocument();
    expect(within(tasks).getByText('Products out of stock')).toBeInTheDocument();
    expect(within(tasks).getByText('Salaries owed to employees')).toBeInTheDocument();
    await userEvent.click(within(within(tasks).getByText('ZATCA rejected invoices').closest('[role=listitem]') as HTMLElement).getByRole('button', { name: 'Review' }));
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });

  it('shows top products, aging and compliance cards', async () => {
    mockApi(dashMocks());
    renderApp(<HomePage />, { at: '/home' });
    expect(await screen.findByText('Car Battery 70Ah AGM')).toBeInTheDocument();
    expect(screen.getByText('Receivables aging')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /31–60/ })).toBeInTheDocument();
    expect(await screen.findByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('2 out · 1 low')).toBeInTheDocument();
    expect(screen.getByText('RIYADH AUTO CARE')).toBeInTheDocument();
    expect(screen.queryByText('NOBODY')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cash 67%, Bank transfer 33%' })).toBeInTheDocument();
  });

  it('greets a brand-new store with an empty state and create actions', async () => {
    mockApi(dashMocks({ monthly: [], openSales: [] }));
    renderApp(<HomePage />, { at: '/home' });
    expect(await screen.findByText('Welcome to StartERP')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New invoice' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Revenue vs purchases')).not.toBeInTheDocument();
  });

  it('role-appropriate: a sales clerk sees sales KPIs only, no profit or cash', async () => {
    const f = mockApi(dashMocks({ extra: [{ method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [
      { resource: 'sales', read: true, create: true }, { resource: 'accounts', read: false }, { resource: 'stats', read: false }, { resource: 'expenses', read: false }, { resource: 'purchases', read: false }, { resource: 'products', read: true },
    ] } }] }), { user: { id: 'u2', name: 'Clerk One', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<HomePage />, { at: '/home' });
    const kpis = await screen.findByLabelText('Key figures');
    expect(await within(kpis).findByText('Total revenue')).toBeInTheDocument();
    expect(within(kpis).getByText('Receivables')).toBeInTheDocument();
    expect(within(kpis).queryByText(/Net (profit|loss)/)).not.toBeInTheDocument();
    expect(within(kpis).queryByText('Cash & bank')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recompute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New expense' })).not.toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/dashboard/accounts')).toHaveLength(0);
    expect(calls(f, 'GET', '/v1/account')).toHaveLength(0);
  });

  it('admins can trigger a recompute (backfill) with plain store_id', async () => {
    const f = mockApi(dashMocks({ extra: [{ method: 'POST', path: '/v1/dashboard/backfill', reply: { status: true, result: { message: 'backfill started' } } }] }));
    renderApp(<HomePage />, { at: '/home' });
    await userEvent.click(await screen.findByRole('button', { name: 'Recompute' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/dashboard/backfill')).toHaveLength(1));
    const q = calls(f, 'POST', '/v1/dashboard/backfill')[0].url.searchParams;
    expect([q.get('store_id'), q.get('months')]).toEqual([STORE_ID, '0']);
    expect(await screen.findByText(/Recomputing dashboard totals/)).toBeInTheDocument();
  });

  it('a failing dashboard endpoint does not break the page', async () => {
    mockApi([{ method: 'GET', path: '/v1/dashboard/products', status: 500, reply: { status: false, errors: { error: 'boom' } } }, ...dashMocks()]);
    renderApp(<HomePage />, { at: '/home' });
    expect(await screen.findByText('No product sales in this period')).toBeInTheDocument();
    expect(screen.getByText('Revenue vs purchases')).toBeInTheDocument();
  });

  it('respects enable_common_dashboard = false', async () => {
    mockApi(dashMocks(), { store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_common_dashboard: false } } });
    renderApp(<HomePage />, { at: '/home' });
    expect(await screen.findByText('The business dashboard is turned off for this store')).toBeInTheDocument();
  });
});
