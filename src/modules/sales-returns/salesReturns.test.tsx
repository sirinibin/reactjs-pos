import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { SalesReturnEditorPage, SalesReturnListPage, SalesReturnViewPage } from './salesReturns';

// The shared machine is busy (parallel agents); give async queries more room than the 1s default.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20000 });

const RETURNS = [
  { id: 'r1', code: 'S-RET-000001', order_id: 'o1', order_code: 'S-INV-000043', date: '2026-10-01T10:00:00Z', customer_name: 'AL NOOR TRADING EST.', net_total: 48.3, vat_price: 6.3, total_payment_paid: 48.3, balance_amount: 0, payment_status: 'paid', zatca: { compliance_passed: false, reporting_passed: false } },
  { id: 'r2', code: 'S-RET-000002', order_id: 'o2', order_code: 'S-INV-000050', date: '2026-10-02T10:00:00Z', customer_name: 'Walk-in', net_total: 100, vat_price: 13.04, total_payment_paid: 0, balance_amount: 100, payment_status: 'not_paid' },
];
const META = { total_sales_return: 148.3, paid_sales_return: 48.3, unpaid_sales_return: 100, cash_sales_return: 48.3, bank_account_sales_return: 0, sales_sales_return: 0, vat_price: 19.34, discount: 0, cash_discount: 0, net_profit: 5, net_loss: 0 };
const listMock = () => mockApi([{ method: 'GET', path: '/v1/sales-return', reply: { status: true, total_count: 2, result: RETURNS, meta: META } }]);

const ORDER = {
  id: 'o1', code: 'S-INV-000043', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', phone: '0554128890', vat_no: '', vat_percent: 15, net_total: 271.4, total_payment_received: 271.4, return_amount: 48.3, payment_status: 'paid',
  discount: 0, discount_with_vat: 0, cash_discount: 0, shipping_handling_fees: 0, auto_rounding_amount: true,
  products: [
    { product_id: 'p1', name: 'Spark Plug Iridium', part_number: 'SP-NGK-IR', quantity: 4, quantity_returned: 1, unit_price: 42, unit_price_with_vat: 48.3, unit: 'pc' },
    { product_id: 'p2', name: 'Wiper Blade 22" Aero', quantity: 2, quantity_returned: 0, unit_price: 34, unit_price_with_vat: 39.1 },
  ],
};

describe('Sales return list', () => {
  it('renders rows and return totals from meta, scoped to the store and newest first', async () => {
    const f = listMock();
    renderApp(<SalesReturnListPage />, { at: '/sales/returns' });
    const table = await screen.findByRole('table', { name: 'Sales returns' });
    expect(await within(table).findByText('S-RET-000001')).toBeInTheDocument();
    expect(within(table).getByText('S-INV-000043')).toBeInTheDocument();
    expect(screen.getByText('148.30')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/sales-return');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
  });

  it('a fresh return shows "Not reported", not "Compliance failed"', async () => {
    listMock();
    renderApp(<SalesReturnListPage />, { at: '/sales/returns' });
    const table = await screen.findByRole('table', { name: 'Sales returns' });
    await within(table).findByText('S-RET-000001');
    expect(within(table).queryByText('Compliance failed')).toBeNull();
    expect(within(table).getAllByText('Not reported').length).toBeGreaterThan(0);
  });

  it('the invoice link from the sales view (?f.order=) filters by order_id', async () => {
    const f = listMock();
    renderApp(<SalesReturnListPage />, { at: '/sales/returns?f.order=o1' });
    await screen.findAllByText('S-RET-000001');
    expect(calls(f, 'GET', '/v1/sales-return')[0].url.searchParams.get('search[order_id]')).toBe('o1');
  });

  it('"Not refunded" view and invoice-number search send the right keys', async () => {
    const f = listMock();
    renderApp(<SalesReturnListPage />, { at: '/sales/returns' });
    await screen.findAllByText('S-RET-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Not refunded/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/sales-return').some((c) => c.url.searchParams.get('search[payment_status]') === 'not_paid,paid_partially')).toBe(true));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'S-INV-43');
    await waitFor(() => expect(calls(f, 'GET', '/v1/sales-return').some((c) => c.url.searchParams.get('search[order_code]') === 'S-INV-43')).toBe(true), { timeout: 2000 });
  });

  it('admins get a Deleted view that asks for search[deleted]=1', async () => {
    const f = listMock();
    renderApp(<SalesReturnListPage />, { at: '/sales/returns?view=deleted' });
    await screen.findAllByText('S-RET-000001');
    expect(calls(f, 'GET', '/v1/sales-return')[0].url.searchParams.get('search[deleted]')).toBe('1');
  });

  it('shows an empty state', async () => {
    mockApi([{ method: 'GET', path: '/v1/sales-return', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<SalesReturnListPage />, { at: '/sales/returns' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
  });
});

const editorMocks = (extra: any[] = [], order: any = ORDER) => mockApi([
  ...extra,
  { method: 'GET', path: `/v1/order/${order.id}`, reply: { status: true, result: order } },
  { method: 'GET', path: '/v1/order', reply: { status: true, result: [order] } },
  { method: 'POST', path: '/v1/sales-return/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
]);

async function selectLine(name: RegExp) {
  await userEvent.click(await screen.findByRole('checkbox', { name }));
}

describe('Sales return editor', () => {
  it('without an invoice it asks which invoice to return, then loads it', async () => {
    editorMocks();
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new', path: '/sales/returns/new' });
    expect(await screen.findByText('Which invoice is being returned?')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox'), 'S-INV');
    await userEvent.click(await screen.findByRole('option', { name: /S-INV-000043/ }));
    expect(await screen.findByRole('table', { name: 'Items' })).toBeInTheDocument();
    expect(screen.getByText(/Sold 4/)).toBeInTheDocument();
  });

  it('prefills from ?order_id, shows sold/returned, caps the quantity and posts the exact body', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/sales-return', reply: { status: true, result: { id: 'new1', code: 'S-RET-000009' } } }]);
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new' });
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(within(items).getByText(/Returned 1/)).toBeInTheDocument();
    expect(within(items).getByText(/max 3/)).toBeInTheDocument();
    await selectLine(/Return Spark Plug/);
    const qty = screen.getByRole('textbox', { name: /Return quantity Spark Plug/ });
    await userEvent.clear(qty);
    await userEvent.type(qty, '9{Enter}');
    expect(qty).toHaveValue('3');
    await userEvent.clear(qty);
    await userEvent.type(qty, '1{Enter}');
    expect((await screen.findAllByText('48.30')).length).toBeGreaterThan(0);
    // Refund row follows the refundable amount (≤ received − already returned).
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('48.3'));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-return')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/sales-return');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, order_id: 'o1', order_code: 'S-INV-000043', customer_id: 'c1', status: 'received', vat_percent: 15, total_payment_paid: 48.3 });
    expect(post.body.products).toHaveLength(2);
    expect(post.body.products[0]).toMatchObject({ product_id: 'p1', selected: true, quantity: 1, unit_price: 42 });
    expect(post.body.products[1]).toMatchObject({ product_id: 'p2', selected: false });
    expect(post.body.payments_input).toEqual([expect.objectContaining({ amount: 48.3, method: 'cash' })]);
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('refuses to save with nothing selected', async () => {
    const f = editorMocks();
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new' });
    await screen.findByRole('table', { name: 'Items' });
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Select at least one item to return.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/sales-return')).toHaveLength(0);
  });

  it('blocks a refund above what was received on the invoice', async () => {
    const f = editorMocks();
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new' });
    await selectLine(/Return Spark Plug/);
    const amt = await screen.findByRole('textbox', { name: 'Amount paid' });
    await userEvent.clear(amt);
    await userEvent.type(amt, '999');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText(/Refunds can’t exceed/)).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/sales-return')).toHaveLength(0);
  });

  it('maps server line errors (quantity_<index>) onto the row', async () => {
    editorMocks([{ method: 'POST', path: '/v1/sales-return', status: 400, reply: { status: false, errors: { quantity_1: 'Quantity should not be greater than purchased quantity: 0.00' } } }]);
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new' });
    await selectLine(/Return Wiper Blade/);
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    const items = screen.getByRole('table', { name: 'Items' });
    expect(await within(items).findByText(/purchased quantity: 0.00/)).toBeInTheDocument();
  });

  it('an unpaid invoice gets no refund rows and posts payments_input: []', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/sales-return', reply: { status: true, result: { id: 'n2', code: 'S-RET-000010' } } }], { ...ORDER, payment_status: 'not_paid', total_payment_received: 0 });
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new' });
    expect(await screen.findByText(/never paid/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Amount paid' })).toBeNull();
    await selectLine(/Return Wiper Blade/);
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-return')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/sales-return')[0].body.payments_input).toEqual([]);
  });

  it('a ZATCA-reported return is locked (lines disabled) but refunds stay editable; PUT keeps line order', async () => {
    const existing = {
      id: 'r1', code: 'S-RET-000001', order_id: 'o1', order_code: 'S-INV-000043', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', vat_percent: 15, net_total: 48.3, auto_rounding_amount: true,
      zatca: { reporting_passed: true },
      products: [{ ...ORDER.products[0], quantity: 1, selected: true }, { ...ORDER.products[1], selected: false }],
      payments: [{ id: 'pay1', amount: 48.3, method: 'cash', date: '2026-10-01T10:00:00Z' }],
    };
    const f = editorMocks([
      { method: 'GET', path: '/v1/sales-return/r1', reply: { status: true, result: existing } },
      { method: 'PUT', path: '/v1/sales-return/r1', reply: { status: true, result: { id: 'r1' } } },
    ]);
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/r1/edit', path: '/sales/returns/:id/edit' });
    expect(await screen.findByText('Locked by ZATCA')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Return Spark Plug/ })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /Return quantity Spark Plug/ })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Amount paid' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/sales-return/r1')).toHaveLength(1));
    const body = calls(f, 'PUT', '/v1/sales-return/r1')[0].body;
    expect(body.products.map((p: any) => [p.product_id, p.selected, p.quantity])).toEqual([['p1', true, 1], ['p2', false, 2]]);
    expect(body.payments_input).toEqual([expect.objectContaining({ id: 'pay1', amount: 48.3 })]);
  });
});

describe('Sales return view', () => {
  const RET = {
    ...RETURNS[1], id: 'r2', customer_id: 'c1', vat_percent: 15, total: 86.96, payments: [], payment_methods: [],
    products: [{ product_id: 'p1', name: 'Spark Plug Iridium', quantity: 2, unit_price: 42, unit_price_with_vat: 48.3, selected: true }, { product_id: 'p2', name: 'Wiper Blade 22" Aero', quantity: 2, unit_price: 34, unit_price_with_vat: 39.1, selected: false }],
  };

  it('lists only returned lines and records a refund against the return', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/sales-return/r2', reply: { status: true, result: RET } },
      { method: 'POST', path: '/v1/sales-return-payment', reply: { status: true, result: { id: 'rp1' } } },
    ]);
    renderApp(<SalesReturnViewPage />, { at: '/sales/returns/r2', path: '/sales/returns/:id' });
    expect(await screen.findByRole('heading', { name: /S-RET-000002/ })).toBeInTheDocument();
    expect(screen.getAllByText('Spark Plug Iridium').length).toBeGreaterThan(0);
    expect(screen.queryByText('Wiper Blade 22" Aero')).toBeNull();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('100');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-return-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/sales-return-payment')[0].body).toMatchObject({ sales_return_id: 'r2', sales_return_code: 'S-RET-000002', order_id: 'o2', order_code: 'S-INV-000050', amount: 100, store_id: STORE_ID });
  });

  it('admin delete asks for confirmation then soft-deletes', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/sales-return/r2', reply: { status: true, result: RET } },
      { method: 'DELETE', path: '/v1/sales-return/r2', reply: { status: true, result: 'deleted' } },
    ]);
    renderApp(<SalesReturnViewPage />, { at: '/sales/returns/r2', path: '/sales/returns/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog');
    expect(calls(f, 'DELETE', '/v1/sales-return/r2')).toHaveLength(0);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/sales-return/r2')).toHaveLength(1));
  });

  it('a deleted return offers Restore', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/sales-return/r2', reply: { status: true, result: { ...RET, deleted: true } } },
      { method: 'POST', path: '/v1/sales-return/restore/r2', reply: { status: true, result: {} } },
    ]);
    renderApp(<SalesReturnViewPage />, { at: '/sales/returns/r2', path: '/sales/returns/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-return/restore/r2')).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('hides edit/delete/refund without permission (RBAC)', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'sales_return', read: true, create: false, update: false, delete: false }] } },
      { method: 'GET', path: '/v1/sales-return/r2', reply: { status: true, result: RET } },
    ], { user: { id: 'u2', name: 'Clerk', email: 'c@x.com', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<SalesReturnViewPage />, { at: '/sales/returns/r2', path: '/sales/returns/:id' });
    expect(await screen.findByRole('heading', { name: /S-RET-000002/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refund' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });

  it('navigates from the editor to the view after create', async () => {
    editorMocks([{ method: 'POST', path: '/v1/sales-return', reply: { status: true, result: { id: 'new1', code: 'S-RET-000009' } } }]);
    renderApp(<SalesReturnEditorPage />, { at: '/sales/returns/new?order_id=o1', path: '/sales/returns/new', extraRoutes: <Route path="/sales/returns/:id" element={<div data-testid="view" />} /> });
    await selectLine(/Return Wiper Blade/);
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByTestId('view')).toBeInTheDocument();
  });
});
