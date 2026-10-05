import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { ReturnEditorPage, ReturnListPage, ReturnViewPage } from './returns';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const PURCHASE = {
  id: 'p1', code: 'P-INV-000001', vendor_id: 'v1', vendor_name: 'AL JAZIRA AUTO PARTS', vat_percent: 15, discount: 0, discount_with_vat: 0, payment_status: 'not_paid', order_placed_by: 'u7', auto_rounding_amount: true,
  products: [
    { product_id: 'a', name: 'Brake Pad Set', quantity: 10, quantity_returned: 4, unit: 'Set', purchase_unit_price: 100, purchase_unit_price_with_vat: 115, unit_discount: 0, unit_discount_with_vat: 0 },
    { product_id: 'b', name: 'Oil Filter', quantity: 2, quantity_returned: 2, purchase_unit_price: 20, purchase_unit_price_with_vat: 23, unit_discount: 0, unit_discount_with_vat: 0 },
    { product_id: 'c', name: 'Air Filter', quantity: 3, quantity_returned: 0, purchase_unit_price: 10, purchase_unit_price_with_vat: 11.5, unit_discount: 0, unit_discount_with_vat: 0 },
  ],
};

const editorMocks = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: PURCHASE } },
  { method: 'GET', path: '/v1/vendor', reply: { status: true, result: [] } },
  { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
  { method: 'GET', path: '/v1/user', reply: { status: true, result: [{ id: 'u7', name: 'Buyer One' }] } },
  { method: 'POST', path: '/v1/purchase-return/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, net_total: 0 } }) },
]);

describe('Purchase return list', () => {
  it('lists returns with the purchase bill and refund totals', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-return', reply: { status: true, total_count: 1, result: [{ id: 'r1', code: 'PR-000001', purchase_code: 'P-INV-000001', purchase_id: 'p1', vendor_name: 'AL JAZIRA', net_total: 115, total_payment_paid: 0, balance_amount: 115, payment_status: 'not_paid', date: '2026-10-02T10:00:00Z' }], meta: { total_purchase_return: 115, unpaid_purchase_return: 115 } } }]);
    renderApp(<ReturnListPage />, { at: '/buying/returns?f.purchase_code=P-INV-000001' });
    const table = await screen.findByRole('table', { name: 'Purchase returns' });
    expect(await within(table).findByText('PR-000001')).toBeInTheDocument();
    expect(within(table).getByText('P-INV-000001')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/purchase-return')[0].url.searchParams.get('search[purchase_code]')).toBe('P-INV-000001');
    expect(screen.getAllByText('115.00').length).toBeGreaterThan(0);
  });
});

describe('Purchase return editor', () => {
  it('asks for the purchase bill first when opened without one', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase', reply: { status: true, result: [{ id: 'p1', code: 'P-INV-000001', vendor_name: 'AL JAZIRA', net_total: 1 }] } }]);
    renderApp(<ReturnEditorPage />, { at: '/buying/returns/new', path: '/buying/returns/new' });
    expect(await screen.findByText('Which purchase bill are you returning goods from?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Purchase bill' }));
    expect(await screen.findByRole('option', { name: /P-INV-000001/ })).toBeInTheDocument();
  });

  it('prefills returnable lines with max quantity and posts the full product list with selected flags', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/purchase-return', reply: { status: true, result: { id: 'r9', code: 'PR-000009' } } }]);
    renderApp(<ReturnEditorPage />, { at: '/buying/returns/new?purchase_id=p1', path: '/buying/returns/new', extraRoutes: <Route path="/buying/returns/:id" element={<div>viewing</div>} /> });
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(within(items).getByText('Brake Pad Set')).toBeInTheDocument();
    expect(within(items).queryByText('Oil Filter')).not.toBeInTheDocument(); // fully returned
    expect(within(items).getByText('max 6')).toBeInTheDocument();
    expect(screen.getByText(/2 of 3 returnable items selected/)).toBeInTheDocument();
    // not returning the air filter
    await userEvent.click(within(items).getByRole('button', { name: 'Remove Air Filter' }));
    const qty = within(items).getByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '9{Enter}'); // clamped to max
    expect(qty).toHaveValue('6');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-return')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/purchase-return');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ purchase_id: 'p1', purchase_code: 'P-INV-000001', vendor_id: 'v1', purchase_returned_by: 'u7', payments_input: [] });
    expect(post.body.products.map((p: any) => [p.product_id, p.selected, p.quantity])).toEqual([['a', true, 6], ['b', false, 0], ['c', false, 3]]);
    expect(post.body.products[0]).toMatchObject({ purchasereturn_unit_price: 100, purchasereturn_unit_price_with_vat: 115 });
    expect(post.body.products[0]).not.toHaveProperty('unit_price');
    expect(post.body).not.toHaveProperty('returned_by_opt');
    expect(await screen.findByText('viewing')).toBeInTheDocument();
  });

  it('refuses a return with every line removed', async () => {
    const f = editorMocks();
    renderApp(<ReturnEditorPage />, { at: '/buying/returns/new?purchase_id=p1', path: '/buying/returns/new' });
    const items = await screen.findByRole('table', { name: 'Items' });
    await userEvent.click(within(items).getByRole('button', { name: 'Remove Brake Pad Set' }));
    await userEvent.click(within(items).getByRole('button', { name: 'Remove Air Filter' }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('No products selected')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/purchase-return')).toHaveLength(0);
  });

  it('says so when everything on the bill was already returned', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: { ...PURCHASE, products: [PURCHASE.products[1]] } } }]);
    renderApp(<ReturnEditorPage />, { at: '/buying/returns/new?purchase_id=p1', path: '/buying/returns/new' });
    expect(await screen.findByText('Everything on P-INV-000001 has already been returned.')).toBeInTheDocument();
  });
});

describe('Purchase return view', () => {
  const RET = { id: 'r1', code: 'PR-000001', purchase_id: 'p1', purchase_code: 'P-INV-000001', date: '2026-10-02T10:00:00Z', vendor_name: 'AL JAZIRA', vat_percent: 15, net_total: 115, total: 100, vat_price: 15, balance_amount: 115, total_payment_paid: 0, payment_status: 'not_paid',
    products: [{ product_id: 'a', name: 'Brake Pad Set', quantity: 1, selected: true, purchasereturn_unit_price: 100, purchasereturn_unit_price_with_vat: 115 }, { product_id: 'c', name: 'Air Filter', quantity: 3, selected: false, purchasereturn_unit_price: 10 }],
    payments: [{ id: 'rp1', date: '2026-10-02T10:00:00Z', amount: 0, method: 'cash', deleted: true }] };

  it('shows only returned lines and records a refund by PUTting payments_input on the return', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-return/r1', reply: { status: true, result: RET } },
      { method: 'PUT', path: '/v1/purchase-return/r1', reply: { status: true, result: RET } },
    ]);
    renderApp(<ReturnViewPage />, { at: '/buying/returns/r1', path: '/buying/returns/:id' });
    expect(await screen.findByRole('heading', { name: /PR-000001/ })).toBeInTheDocument();
    expect(screen.queryByText('Air Filter')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /P-INV-000001/ })).toHaveAttribute('href', '/buying/purchases/p1');
    await userEvent.click(screen.getByRole('button', { name: 'Record refund' }));
    const dlg = await screen.findByRole('dialog');
    const amt = within(dlg).getByRole('textbox', { name: /Amount/ });
    expect(amt).toHaveValue('115');
    await userEvent.clear(amt);
    await userEvent.type(amt, '200');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record refund' }));
    expect(await within(dlg).findByText(/can’t exceed the balance due/)).toBeInTheDocument();
    await userEvent.clear(amt);
    await userEvent.type(amt, '50');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record refund' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/purchase-return/r1')).toHaveLength(1));
    const [put] = calls(f, 'PUT', '/v1/purchase-return/r1');
    expect(put.body).toMatchObject({ store_id: STORE_ID, date_str: RET.date });
    expect(put.body.payments_input).toEqual([expect.objectContaining({ amount: 50, method: 'cash' })]);
    expect(calls(f, 'POST', '/v1/purchase-return-payment')).toHaveLength(0);
  });

  it('maps a server total_payment error onto the amount field', async () => {
    mockApi([
      { method: 'GET', path: '/v1/purchase-return/r1', reply: { status: true, result: RET } },
      { method: 'PUT', path: '/v1/purchase-return/r1', status: 400, reply: { status: false, errors: { total_payment: 'Total payment should not exceed 100' } } },
    ]);
    renderApp(<ReturnViewPage />, { at: '/buying/returns/r1', path: '/buying/returns/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Record refund' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record refund' }));
    expect(await within(dlg).findByText('Total payment should not exceed 100')).toBeInTheDocument();
  });
});
