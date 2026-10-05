import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { CashDiscountsPage, PurchasePaymentsPage, ReturnPaymentsPage, paymentBody, validatePayment } from './payments';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const PAYMENTS = [
  { id: 'pp1', date: '2026-10-01T10:00:00Z', amount: 500, method: 'bank_transfer', purchase_id: 'p1', purchase_code: 'P-INV-000001', created_by_name: 'Sirin' },
  { id: 'pp2', date: '2026-10-02T10:00:00Z', amount: 40, method: 'purchase_return', purchase_id: 'p1', purchase_code: 'P-INV-000001', reference_type: 'purchase_return', reference_code: 'PR-1' },
];
const PURCHASES = [{ id: 'p1', code: 'P-INV-000001', vendor_name: 'AL JAZIRA', net_total: 1000, balance_amount: 460, total: 870, date: '2026-10-01T10:00:00Z' }];

describe('payment helpers', () => {
  it('builds the API body and validates against the bill balance', () => {
    const v = { purchase: { id: 'p1', label: 'P-INV-000001', data: { balance_amount: 100 } }, date: '2026-10-05T10:30', amount: '120', method: 'cash', description: '' };
    expect(paymentBody(v)).toMatchObject({ purchase_id: 'p1', purchase_code: 'P-INV-000001', amount: 120, method: 'cash' });
    expect(paymentBody(v).date_str).toMatch(/^2026-10-05T10:30:00[+-]\d{2}:\d{2}$/);
    expect(validatePayment(v, false)).toHaveProperty('amount');
    expect(validatePayment(v, true)).toEqual({});
    expect(validatePayment({ ...v, amount: '0' }, true)).toHaveProperty('amount');
  });
});

describe('Purchase payments', () => {
  it('lists payments with total, locks system payments and deletes after confirmation', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-payment', reply: { status: true, total_count: 2, result: PAYMENTS, meta: { total_payment: 540 } } },
      { method: 'DELETE', path: '/v1/purchase-payment/pp1', reply: { status: true, result: 'ok' } },
    ]);
    renderApp(<PurchasePaymentsPage />, { at: '/buying/payments?f.purchase=P-INV-000001' });
    const table = await screen.findByRole('table', { name: 'Purchase payments' });
    expect((await within(table).findAllByText('P-INV-000001')).length).toBe(2);
    expect(screen.getByText('540.00')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/purchase-payment')[0].url.searchParams.get('search[purchase_code]')).toBe('P-INV-000001');
    expect(within(table).getAllByRole('button', { name: 'Delete payment' })).toHaveLength(1); // the purchase_return mirror is read-only
    await userEvent.click(within(table).getByRole('button', { name: 'Delete payment' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/purchase-payment/pp1')).toHaveLength(1));
    expect(calls(f, 'DELETE', '/v1/purchase-payment/pp1')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });

  it('records a payment against an open bill', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-payment', reply: { status: true, total_count: 0, result: [], meta: { total_payment: 0 } } },
      { method: 'GET', path: '/v1/purchase', reply: { status: true, result: PURCHASES } },
      { method: 'POST', path: '/v1/purchase-payment', reply: { status: true, result: { id: 'pp9' } } },
    ]);
    renderApp(<PurchasePaymentsPage />, { at: '/buying/payments' });
    await userEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('combobox', { name: 'Purchase bill' }));
    await userEvent.click(await within(dlg).findByRole('option', { name: /P-INV-000001/ }));
    const lookup = calls(f, 'GET', '/v1/purchase').at(-1)!;
    expect(lookup.url.searchParams.get('search[payment_status]')).toBe('not_paid,paid_partially');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Amount/ }), '600');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText(/can’t exceed the balance due/)).toBeInTheDocument();
    await userEvent.clear(within(dlg).getByRole('textbox', { name: /Amount/ }));
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Amount/ }), '460');
    await userEvent.selectOptions(within(dlg).getByRole('combobox', { name: /Method/ }), 'vendor_account');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase-payment')[0].body).toMatchObject({ store_id: STORE_ID, purchase_id: 'p1', purchase_code: 'P-INV-000001', amount: 460, method: 'vendor_account' });
  });

  it('"Deleted" view lists soft-deleted payments', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-payment', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<PurchasePaymentsPage />, { at: '/buying/payments' });
    await userEvent.click(await screen.findByRole('tab', { name: /^Deleted/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-payment').some((c) => c.url.searchParams.get('search[deleted]') === '1')).toBe(true));
  });
});

describe('Return refunds', () => {
  it('is read-only and searches by return number', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-return-payment', reply: { status: true, total_count: 1, result: [{ id: 'rp1', purchase_return_id: 'r1', purchase_return_code: 'PR-000001', purchase_code: 'P-INV-000001', amount: 50, method: 'cash', date: '2026-10-02T10:00:00Z' }], meta: { total_payment: 50 } } }]);
    renderApp(<ReturnPaymentsPage />, { at: '/buying/return-payments' });
    const table = await screen.findByRole('table', { name: 'Return refunds' });
    expect(await within(table).findByText('PR-000001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New|Record/ })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'PR-0');
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-return-payment').some((c) => c.url.searchParams.get('search[purchase_return_code]') === 'PR-0')).toBe(true), { timeout: 2000 });
  });
});

describe('Cash discounts', () => {
  it('creates a cash discount below the bill total and warns it overwrites the bill', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-cash-discount', reply: { status: true, total_count: 0, result: [], meta: { total_cash_discount: 0 } } },
      { method: 'GET', path: '/v1/purchase', reply: { status: true, result: PURCHASES } },
      { method: 'POST', path: '/v1/purchase-cash-discount', reply: { status: true, result: { id: 'cd1' } } },
    ]);
    renderApp(<CashDiscountsPage />, { at: '/buying/cash-discounts' });
    await userEvent.click(await screen.findByRole('button', { name: 'New cash discount' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/replaces the cash discount on the bill/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('combobox', { name: 'Purchase bill' }));
    await userEvent.click(await within(dlg).findByRole('option', { name: /P-INV-000001/ }));
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Amount/ }), '870');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText(/must be less than the bill total/)).toBeInTheDocument();
    await userEvent.clear(within(dlg).getByRole('textbox', { name: /Amount/ }));
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Amount/ }), '20');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-cash-discount')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase-cash-discount')[0].body).toEqual({ store_id: STORE_ID, purchase_id: 'p1', purchase_code: 'P-INV-000001', amount: 20 });
  });
});
