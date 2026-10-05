import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { QsrEditorPage, QsrListPage, QsrViewPage } from './quotationReturns';

const QUOTE = {
  id: 'q1', code: 'QTN-000006', type: 'invoice', date: '2026-10-01T10:00:00Z', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', vat_percent: 15, net_total: 345,
  payment_status: 'paid_partially', total_payment_received: 150, return_amount: 0, discount: 0, auto_rounding_amount: true,
  products: [
    { product_id: 'p1', name: 'Brake Pad Set', quantity: 3, quantity_returned: 1, unit_price: 100, unit_price_with_vat: 115, unit: 'Set' },
    { product_id: 'p2', name: 'Engine Oil 4L', quantity: 1, quantity_returned: 1, unit_price: 50, unit_price_with_vat: 57.5 },
  ],
};
const RETS = [{ id: 'r1', code: 'QSR-000001', date: '2026-10-03T10:00:00Z', customer_name: 'AL NOOR TRADING EST.', quotation_id: 'q1', quotation_code: 'QTN-000006', net_total: 115, total_payment_paid: 60, balance_amount: 55, payment_status: 'paid_partially' }];

describe('Quotation sales return list', () => {
  it('renders rows and totals; searching a QTN number filters by quotation_code', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/quotation-sales-return', reply: { status: true, total_count: 1, result: RETS, meta: { total_quotation_sales_return: 115, paid_quotation_sales_return: 60, unpaid_quotation_sales_return: 55 } } }]);
    renderApp(<QsrListPage />, { at: '/sales/quotation-returns' });
    const table = await screen.findByRole('table', { name: 'Quotation sales returns' });
    expect(await within(table).findByText('QSR-000001')).toBeInTheDocument();
    expect(within(table).getByText('QTN-000006')).toBeInTheDocument();
    expect(screen.getAllByText('55.00').length).toBeGreaterThan(0);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'QTN-6');
    await waitFor(() => expect(calls(f, 'GET', '/v1/quotation-sales-return').some((c) => c.url.searchParams.get('search[quotation_code]') === 'QTN-6')).toBe(true), { timeout: 2000 });
  });

  it('a quotation filter from the URL sends quotation_id', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/quotation-sales-return', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<QsrListPage />, { at: '/sales/quotation-returns?f.quotation=q1|QTN-000006' });
    await waitFor(() => expect(calls(f, 'GET', '/v1/quotation-sales-return').some((c) => c.url.searchParams.get('search[quotation_id]') === 'q1')).toBe(true));
  });
});

const editorMocks = (extra: any[] = [], quote: any = QUOTE) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/quotation/q1', reply: { status: true, result: quote } },
  { method: 'POST', path: '/v1/quotation-sales-return/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
]);

describe('Quotation sales return editor', () => {
  it('without a quotation asks which invoice-type quotation to return', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/quotation', reply: { status: true, result: [{ id: 'q1', code: 'QTN-000006', customer_name: 'AL NOOR', net_total: 345 }] } }]);
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new', path: '/sales/quotation-returns/new' });
    const picker = await screen.findByRole('combobox', { name: 'Quotation invoice' });
    await userEvent.click(picker);
    expect(await screen.findByRole('option', { name: /QTN-000006/ })).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/quotation')[0].url.searchParams.get('search[type]')).toBe('invoice');
  });

  it('refuses to save with nothing selected', async () => {
    const f = editorMocks();
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new?quotation_id=q1', path: '/sales/quotation-returns/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Select at least one item to return.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/quotation-sales-return')).toHaveLength(0);
  });

  it('fully returned lines cannot be selected; quantity over the limit is blocked', async () => {
    editorMocks();
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new?quotation_id=q1', path: '/sales/quotation-returns/new' });
    expect(await screen.findByRole('checkbox', { name: 'Return Engine Oil 4L' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Return Brake Pad Set' }));
    const qty = screen.getByRole('textbox', { name: 'Return quantity 1' });
    expect(qty).toHaveValue('2');
    await userEvent.clear(qty);
    await userEvent.type(qty, '3{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('More than what is left to return.')).toBeInTheDocument();
  });

  it('posts all lines with selected flags and a refund capped at what was paid', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation-sales-return', reply: { status: true, result: { id: 'nr', code: 'QSR-000009' } } }]);
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new?quotation_id=q1', path: '/sales/quotation-returns/new' });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Return Brake Pad Set' }));
    // 2 × 115 = 230, but only 150 was paid on the invoice → refund auto-fills to 150.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('150'));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation-sales-return')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/quotation-sales-return');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ quotation_id: 'q1', quotation_code: 'QTN-000006', customer_id: 'c1', status: 'received', total_payment_paid: 150 });
    expect(post.body.products.map((p: any) => [p.product_id, p.selected, p.quantity])).toEqual([['p1', true, 2], ['p2', false, 1]]);
    expect(post.body.payments_input).toEqual([expect.objectContaining({ amount: 150, method: 'cash' })]);
  });

  it('unpaid invoice: no refund section, no payments sent; server errors map to lines', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation-sales-return', status: 400, reply: { status: false, errors: { quantity_0: 'Quantity should not be greater than purchased quantity: 2.00 Set' } } }], { ...QUOTE, payment_status: 'not_paid', total_payment_received: 0 });
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new?quotation_id=q1', path: '/sales/quotation-returns/new' });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Return Brake Pad Set' }));
    expect(screen.queryByRole('textbox', { name: 'Amount paid' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    const table = screen.getByRole('table', { name: 'Items to return' });
    expect(await within(table).findByText('Quantity should not be greater than purchased quantity: 2.00 Set')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/quotation-sales-return')[0].body.payments_input).toEqual([]);
  });

  it('refuses plain quotations', async () => {
    editorMocks([], { ...QUOTE, type: 'quotation' });
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/new?quotation_id=q1', path: '/sales/quotation-returns/new' });
    expect(await screen.findByText(/Only sales recorded as quotation invoices can be returned/)).toBeInTheDocument();
  });

  it('editing PUTs index-aligned lines with the old quantity added back to the limit', async () => {
    const existing = { id: 'r1', code: 'QSR-000001', quotation_id: 'q1', date: '2026-10-03T10:00:00Z', vat_percent: 15, auto_rounding_amount: true, payments: [],
      products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100, unit_price_with_vat: 115, selected: true }, { product_id: 'p2', name: 'Engine Oil 4L', quantity: 1, unit_price: 50, selected: false }] };
    const f = editorMocks([
      { method: 'GET', path: '/v1/quotation-sales-return/r1', reply: { status: true, result: existing } },
      { method: 'PUT', path: '/v1/quotation-sales-return/r1', reply: { status: true, result: { id: 'r1', code: 'QSR-000001' } } },
    ]);
    renderApp(<QsrEditorPage />, { at: '/sales/quotation-returns/r1/edit', path: '/sales/quotation-returns/:id/edit' });
    expect(await screen.findByText('max 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/quotation-sales-return/r1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/quotation-sales-return/r1')[0].body.products.map((p: any) => p.selected)).toEqual([true, false]);
  });
});

describe('Quotation sales return view', () => {
  it('records a refund through quotation-sales-return-payment', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/quotation-sales-return/r1', reply: { status: true, result: { ...RETS[0], products: [], payments: [] } } },
      { method: 'POST', path: '/v1/quotation-sales-return-payment', reply: { status: true, result: { id: 'p1' } } },
    ]);
    renderApp(<QsrViewPage />, { at: '/sales/quotation-returns/r1', path: '/sales/quotation-returns/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Record refund' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('55');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation-sales-return-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/quotation-sales-return-payment')[0].body).toMatchObject({ quotation_sales_return_id: 'r1', quotation_sales_return_code: 'QSR-000001', quotation_id: 'q1', amount: 55, store_id: STORE_ID });
  });

  it('lists refunds and deletes one after confirmation', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/quotation-sales-return/r1', reply: { status: true, result: { ...RETS[0], products: [], payments: [] } } },
      { method: 'GET', path: '/v1/quotation-sales-return-payment', reply: { status: true, total_count: 0, result: [{ id: 'pay1', date: '2026-10-03T10:00:00Z', amount: 60, method: 'cash' }] } },
      { method: 'DELETE', path: '/v1/quotation-sales-return-payment/pay1', reply: { status: true, result: 'ok' } },
    ]);
    renderApp(<QsrViewPage />, { at: '/sales/quotation-returns/r1', path: '/sales/quotation-returns/:id' });
    await userEvent.click(await screen.findByRole('tab', { name: 'Refunds' }));
    await userEvent.click(await screen.findByRole('button', { name: /Delete refund/ }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/quotation-sales-return-payment/pay1')).toHaveLength(1));
    expect(calls(f, 'GET', '/v1/quotation-sales-return-payment')[0].url.searchParams.get('search[quotation_sales_return_id]')).toBe('r1');
  });
});
