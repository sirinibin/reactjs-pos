import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { CashDiscountsPage, ReturnPaymentsPage, SalesPaymentsPage } from './payments';

// The shared machine is busy (parallel agents); give async queries more room than the 1s default.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20000 });

const PAYMENTS = [
  { id: 'sp1', date: '2026-10-01T10:00:00Z', amount: 120, method: 'cash', order_id: 'o1', order_code: 'S-INV-000001', created_by_name: 'Sirin', created_at: '2026-10-01T10:00:00Z' },
  { id: 'sp2', date: '2026-10-02T10:00:00Z', amount: 50, method: 'customer_account', reference_type: 'customer_deposit', reference_code: 'RCV-0001', order_id: 'o2', order_code: 'S-INV-000002' },
];
const ORDER_HIT = { id: 'o1', code: 'S-INV-000001', customer_name: 'AL NOOR', net_total: 230, balance_amount: 130, total_payment_received: 100, cash_discount: 0, payment_status: 'paid_partially' };

describe('Sales payments list', () => {
  const list = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/sales-payment', reply: { status: true, total_count: 2, result: PAYMENTS, meta: { total_payment: 170 } } },
    { method: 'GET', path: '/v1/order', reply: { status: true, result: [ORDER_HIT] } },
  ]);

  it('renders rows, the meta total and filters by method', async () => {
    const f = list();
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments?f.method=cash' });
    const table = await screen.findByRole('table', { name: 'Sales payments' });
    expect(await within(table).findByText('S-INV-000001')).toBeInTheDocument();
    expect(screen.getByText('170.00')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/sales-payment');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[method]')).toBe('cash');
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-date');
  });

  it('search box searches by invoice number', async () => {
    const f = list();
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    await screen.findAllByText('S-INV-000001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), '0001');
    await waitFor(() => expect(calls(f, 'GET', '/v1/sales-payment').some((c) => c.url.searchParams.get('search[order_code]') === '0001')).toBe(true), { timeout: 2000 });
  });

  it('system-generated rows (receivables) cannot be edited or deleted', async () => {
    list();
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    const table = await screen.findByRole('table', { name: 'Sales payments' });
    await within(table).findByText('S-INV-000002');
    expect(within(table).getByRole('button', { name: /Edit S-INV-000002/ })).toBeDisabled();
    expect(within(table).getByRole('button', { name: /Delete S-INV-000002/ })).toBeDisabled();
    expect(within(table).getByRole('button', { name: /Edit S-INV-000001/ })).toBeEnabled();
  });

  it('create: picks an invoice, prefills its balance, blocks overpayment, then posts the exact body', async () => {
    const f = list([{ method: 'POST', path: '/v1/sales-payment', reply: { status: true, result: { id: 'sp9' } } }]);
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    await screen.findAllByText('S-INV-000001');
    await userEvent.click(screen.getByRole('button', { name: 'Receive payment' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    expect(await within(dlg).findByText('Sales invoice is required')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByRole('combobox', { name: /Sales invoice/ }), 'S-INV');
    await userEvent.click(await screen.findByRole('option', { name: /S-INV-000001/ }));
    const amt = within(dlg).getByRole('textbox', { name: /Amount/ });
    expect(amt).toHaveValue('130');
    await userEvent.clear(amt);
    await userEvent.type(amt, '500');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    expect(await within(dlg).findByText(/can’t exceed the balance due/)).toBeInTheDocument();
    await userEvent.clear(amt);
    await userEvent.type(amt, '30');
    await userEvent.selectOptions(within(dlg).getByRole('combobox', { name: /Method/ }), 'bank_transfer');
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'Bank reference' }), 'TRX-1');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-payment')).toHaveLength(1));
    const post = calls(f, 'POST', '/v1/sales-payment')[0];
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ order_id: 'o1', order_code: 'S-INV-000001', amount: 30, method: 'bank_transfer', bank_reference: 'TRX-1', store_id: STORE_ID });
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('edit loads the record and PUTs; server errors land on the field', async () => {
    const f = list([
      { method: 'GET', path: '/v1/sales-payment/sp1', reply: { status: true, result: PAYMENTS[0] } },
      { method: 'PUT', path: '/v1/sales-payment/sp1', status: 400, reply: { status: false, errors: { amount: 'Total payment should not exceed: 230.00 (Net Total - Cash Discount)' } } },
    ]);
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    const table = await screen.findByRole('table', { name: 'Sales payments' });
    await userEvent.click(await within(table).findByRole('button', { name: /Edit S-INV-000001/ }));
    const dlg = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('120'));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save changes' }));
    expect(await within(dlg).findByText(/should not exceed: 230.00/)).toBeInTheDocument();
    expect(calls(f, 'PUT', '/v1/sales-payment/sp1')[0].body).toMatchObject({ id: 'sp1', order_id: 'o1', amount: 120 });
  });

  it('delete asks for confirmation', async () => {
    const f = list([{ method: 'DELETE', path: '/v1/sales-payment/sp1', reply: { status: true, result: {} } }]);
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    const table = await screen.findByRole('table', { name: 'Sales payments' });
    await userEvent.click(await within(table).findByRole('button', { name: /Delete S-INV-000001/ }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/sales-payment/sp1')).toHaveLength(1));
  });

  it('?new=1 (Create menu) opens the form', async () => {
    list();
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments?new=1' });
    expect(await screen.findByRole('dialog', { name: 'New sales payment' })).toBeInTheDocument();
  });

  it('hides create/edit/delete without permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'sales', read: true, create: false, update: false, delete: false }] } },
      { method: 'GET', path: '/v1/sales-payment', reply: { status: true, total_count: 1, result: [PAYMENTS[0]], meta: { total_payment: 120 } } },
    ], { user: { id: 'u2', name: 'Clerk', email: 'c@x.com', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<SalesPaymentsPage />, { at: '/sales/payments' });
    const table = await screen.findByRole('table', { name: 'Sales payments' });
    await within(table).findByText('S-INV-000001');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Receive payment' })).toBeNull());
    expect(within(table).queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(within(table).queryByRole('button', { name: /Delete/ })).toBeNull();
  });
});

describe('Return refunds list', () => {
  it('shows return numbers, filters by return and records a refund with all parent ids', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/sales-return-payment', reply: { status: true, total_count: 1, result: [{ id: 'rp1', amount: 48.3, method: 'cash', date: '2026-10-01T10:00:00Z', sales_return_id: 'r1', sales_return_code: 'S-RET-000001', order_id: 'o1', order_code: 'S-INV-000043' }], meta: { total_payment: 48.3 } } },
      { method: 'GET', path: '/v1/sales-return', reply: { status: true, result: [{ id: 'r2', code: 'S-RET-000002', order_id: 'o2', order_code: 'S-INV-000050', net_total: 100, balance_amount: 100 }] } },
      { method: 'POST', path: '/v1/sales-return-payment', reply: { status: true, result: { id: 'rp2' } } },
    ]);
    renderApp(<ReturnPaymentsPage />, { at: '/sales/return-payments?f.return=r1|S-RET-000001' });
    const table = await screen.findByRole('table', { name: 'Return refunds' });
    expect(await within(table).findByText('S-RET-000001')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/sales-return-payment')[0].url.searchParams.get('search[sales_return_id]')).toBe('r1');
    await userEvent.click(screen.getByRole('button', { name: 'Record refund' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByRole('combobox', { name: /Sales return/ }), 'S-RET');
    await userEvent.click(await screen.findByRole('option', { name: /S-RET-000002/ }));
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('100');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-return-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/sales-return-payment')[0].body).toMatchObject({ sales_return_id: 'r2', sales_return_code: 'S-RET-000002', order_id: 'o2', order_code: 'S-INV-000050', amount: 100 });
  });
});

describe('Cash discounts list', () => {
  it('has no delete (no backend route), shows the total and enforces "< amount received"', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/sales-cash-discount', reply: { status: true, total_count: 1, result: [{ id: 'cd1', amount: 5, method: 'cash', date: '2026-10-01T10:00:00Z', order_id: 'o1', order_code: 'S-INV-000001' }], meta: { total_cash_discount: 5 } } },
      { method: 'GET', path: '/v1/order', reply: { status: true, result: [ORDER_HIT] } },
      { method: 'POST', path: '/v1/sales-cash-discount', reply: { status: true, result: { id: 'cd2' } } },
    ]);
    renderApp(<CashDiscountsPage />, { at: '/sales/cash-discounts' });
    const table = await screen.findByRole('table', { name: 'Cash discounts' });
    await within(table).findByText('S-INV-000001');
    expect(within(table).queryByRole('button', { name: /Delete/ })).toBeNull();
    expect(screen.getAllByText('5.00').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'New cash discount' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).queryByRole('textbox', { name: 'Bank reference' })).toBeNull();
    await userEvent.type(within(dlg).getByRole('combobox', { name: /Sales invoice/ }), 'S-INV');
    await userEvent.click(await screen.findByRole('option', { name: /S-INV-000001/ }));
    const amt = within(dlg).getByRole('textbox', { name: /Amount/ });
    await userEvent.type(amt, '100');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    expect(await within(dlg).findByText(/must be less than 100.00/)).toBeInTheDocument();
    await userEvent.clear(amt);
    await userEvent.type(amt, '10');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-cash-discount')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/sales-cash-discount')[0].body).toMatchObject({ order_id: 'o1', order_code: 'S-INV-000001', amount: 10, method: 'cash' });
    expect(calls(f, 'POST', '/v1/sales-cash-discount')[0].body).not.toHaveProperty('bank_reference');
  });
});
