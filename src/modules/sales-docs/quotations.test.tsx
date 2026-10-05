import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE, TEST_USER } from '@/test/utils';
import { QuotationEditorPage, QuotationListPage, QuotationViewPage } from './quotations';

const QUOTES = [
  { id: 'q1', code: 'QTN-000001', date: '2026-10-01T10:00:00Z', type: 'quotation', status: 'delivered', customer_name: 'AL NOOR TRADING EST.', net_total: 230, validity_days: 400, order_id: null },
  { id: 'q2', code: 'QTN-000002', date: '2026-10-02T11:00:00Z', type: 'invoice', status: 'delivered', customer_name: 'RIYADH AUTO CARE', net_total: 115, total_payment_received: 50, balance_amount: 65, payment_status: 'paid_partially', order_id: 'o9', order_code: 'S-INV-000009', order_ids: ['o9'], order_codes: ['S-INV-000009'] },
];
const META = { total_quotation: 345, invoiced_count: 1, invoiced_amount: 115, profit: 80, loss: 0, invoice_total_sales: 115, invoice_paid_sales: 50, invoice_unpaid_sales: 65, invoice_vat_price: 15, invoice_net_profit: 20 };
const listMock = (store?: any) => mockApi([{ method: 'GET', path: '/v1/quotation', reply: { status: true, total_count: 2, result: QUOTES, meta: META } }], store ? { store } : {});

describe('Quotation list', () => {
  it('renders rows, type/payment columns and totals; scopes to store with stats', async () => {
    const f = listMock();
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    const table = await screen.findByRole('table', { name: 'Quotations' });
    expect(await within(table).findByText('QTN-000001')).toBeInTheDocument();
    expect(within(table).getByText('S-INV-000009')).toBeInTheDocument();
    expect(within(table).getAllByText('Sales').length).toBeGreaterThan(0);
    expect(screen.getAllByText('345.00').length).toBeGreaterThan(0);
    const [c] = calls(f, 'GET', '/v1/quotation');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
  });

  it('views filter by type and invoiced state', async () => {
    const f = listMock();
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    await screen.findAllByText('QTN-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Sales/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/quotation').some((c) => c.url.searchParams.get('search[type]') === 'invoice')).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: /^Not invoiced/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/quotation').some((c) => c.url.searchParams.get('search[invoiced]') === '0')).toBe(true));
  });

  it('search box: quotation numbers search code, invoice numbers search order_code', async () => {
    const f = listMock();
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    await screen.findAllByText('QTN-000001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'S-INV-9');
    await waitFor(() => expect(calls(f, 'GET', '/v1/quotation').some((c) => c.url.searchParams.get('search[order_code]') === 'S-INV-9')).toBe(true), { timeout: 2000 });
  });

  it('hides sales-in-quotation columns and views when the setting is off', async () => {
    listMock({ ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_sales_in_quotation: false } });
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    const table = await screen.findByRole('table', { name: 'Quotations' });
    await within(table).findByText('QTN-000001');
    expect(within(table).queryByRole('columnheader', { name: 'Type' })).toBeNull();
    expect(screen.queryByRole('tab', { name: /^Sales/ })).toBeNull();
  });

  it('shows empty and error states', async () => {
    mockApi([{ method: 'GET', path: '/v1/quotation', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });

  it('hides "New quotation" without create permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/quotation', reply: { status: true, total_count: 0, result: [], meta: {} } },
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'quotations', read: true, create: false, update: false, delete: false }] } },
    ], { user: { ...TEST_USER, role: 'Sales', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<QuotationListPage />, { at: '/sales/quotations' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'New quotation' })).toBeNull();
  });
});

const PRODUCT = { id: 'p1', name: 'Brake Pad Set', part_number: 'BP-1', unit: 'Set', product_stores: { [STORE_ID]: { retail_unit_price: 100, retail_unit_price_with_vat: 115, purchase_unit_price: 60, stock: 3 } } };
const editorMocks = (extra: any[] = [], store?: any) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/customer', reply: { status: true, result: [{ id: 'c1', name: 'AL NOOR TRADING EST.', phone: '0554128890' }] } },
  { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
  { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
  { method: 'POST', path: '/v1/quotation/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
], store ? { store } : {});

async function addBrakePads(qty = '2') {
  await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
  await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
  const q = await screen.findByRole('textbox', { name: 'Quantity' });
  await userEvent.clear(q);
  await userEvent.type(q, `${qty}{Enter}`);
}

describe('Quotation editor', () => {
  it('posts a quotation with terms, no payments, and the exact line body', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation', reply: { status: true, result: { id: 'nq', code: 'QTN-000099' } } }]);
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new', path: '/sales/quotations/new' });
    expect(await screen.findByRole('textbox', { name: /Validity \(days\)/ })).toHaveValue('2');
    expect(screen.getByRole('textbox', { name: /Delivery \(days\)/ })).toHaveValue('7');
    expect(screen.queryByText('Payment')).toBeNull();
    await addBrakePads();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/quotation');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, type: 'quotation', status: 'delivered', validity_days: 2, delivery_days: 7, delivery_from: 'Payment', payments_input: [], delivered_by: 'u1', vat_percent: 15 });
    expect(post.body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 2, unit_price: 100, unit_price_with_vat: 115 })]);
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });

  it('?customer_id= (Customer 360) prefills the customer while keeping quotation defaults', async () => {
    const f = editorMocks([
      { method: 'GET', path: '/v1/customer/c7', reply: { status: true, result: { id: 'c7', name: 'DESERT LINE LOGISTICS', phone: '0551112223', vat_no: '' } } },
      { method: 'POST', path: '/v1/quotation', reply: { status: true, result: { id: 'nq', code: 'QTN-000102' } } },
    ]);
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new?customer_id=c7', path: '/sales/quotations/new' });
    expect(await screen.findByRole('combobox', { name: /Customer/ })).toHaveValue('DESERT LINE LOGISTICS');
    expect(screen.getByRole('textbox', { name: /Validity \(days\)/ })).toHaveValue('2');
    expect(calls(f, 'GET', '/v1/customer/c7')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    await addBrakePads('1');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/quotation')[0].body).toMatchObject({ customer_id: 'c7', customer_name: 'DESERT LINE LOGISTICS', phone: '0551112223', validity_days: 2 });
  });

  it('?from_rfq= consumes the AI-procurement prefill once: customer, RFQ link, priced lines with cost', async () => {
    sessionStorage.setItem('rfq_quotation_prefill_active', JSON.stringify({
      rfq_code: 'RFQ-000004', rfq_received_id: 'r4', rfq_received_code: 'RFQ-000004', customer_id: 'c7', customer_name: 'DESERT LINE LOGISTICS', customer_phone: '0551112223',
      items: [{ product_id: 'p1', product_name: 'Brake Pad Set', part_no: 'BP-1', quantity: 3, unit: 'set', cost_price: 80, unit_price: 100 }],
    }));
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation', reply: { status: true, result: { id: 'nq', code: 'QTN-000103' } } }]);
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new?from_rfq=r4', path: '/sales/quotations/new' });
    expect(await screen.findByRole('combobox', { name: /Customer/ })).toHaveValue('DESERT LINE LOGISTICS');
    expect(sessionStorage.getItem('rfq_quotation_prefill_active')).toBeNull();
    expect(screen.getByRole('table', { name: 'Items' })).toHaveTextContent('Brake Pad Set');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/quotation')[0].body;
    expect(body).toMatchObject({ customer_id: 'c7', rfq_received_id: 'r4', rfq_received_code: 'RFQ-000004', remarks: 'RFQ: RFQ-000004', validity_days: 2 });
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 3, unit_price: 100, unit_price_with_vat: 115, purchase_unit_price: 80 })]);
  });

  it('validates validity / delivery days on the client', async () => {
    const f = editorMocks();
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new', path: '/sales/quotations/new' });
    const v = await screen.findByRole('textbox', { name: /Validity \(days\)/ });
    await userEvent.clear(v);
    await addBrakePads('1');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Validity days are required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(0);
  });

  it('switching to "Sales (invoice)" shows payments and posts them', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation', reply: { status: true, result: { id: 'nq', code: 'QTN-000100' } } }]);
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new', path: '/sales/quotations/new' });
    await addBrakePads('1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'invoice');
    expect(await screen.findByRole('textbox', { name: 'Amount paid' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Items' })).toHaveTextContent('Brake Pad Set');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('115'));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/quotation')[0].body).toMatchObject({ type: 'invoice', payments_input: [expect.objectContaining({ amount: 115, method: 'cash' })] });
  });

  it('with no_tax_for_quotation_invoice the invoice type carries 0% VAT', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/quotation', reply: { status: true, result: { id: 'nq', code: 'QTN-000101' } } }], { ...TEST_STORE, settings: { ...TEST_STORE.settings, no_tax_for_quotation_invoice: true } });
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/new?type=invoice', path: '/sales/quotations/new' });
    await addBrakePads('1');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/quotation')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/quotation')[0].body;
    expect(body).toMatchObject({ type: 'invoice', vat_percent: 0 });
    expect(body.products[0]).toMatchObject({ unit_price: 100, unit_price_with_vat: 100 });
  });

  it('maps server errors onto fields and updates with PUT', async () => {
    const existing = { id: 'q1', code: 'QTN-000001', date: '2026-10-01T10:00:00Z', type: 'quotation', status: 'created', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', vat_percent: 15, validity_days: 2, delivery_days: 7, delivery_from: 'Payment', products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100, unit_price_with_vat: 115 }] };
    const f = editorMocks([
      { method: 'GET', path: '/v1/quotation/q1', reply: { status: true, result: existing } },
      { method: 'PUT', path: '/v1/quotation/q1', status: 400, reply: { status: false, errors: { delivery_days: 'Delivery days should be greater than 0' } } },
    ]);
    renderApp(<QuotationEditorPage />, { at: '/sales/quotations/q1/edit', path: '/sales/quotations/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save changes/ }));
    expect((await screen.findAllByText('Delivery days should be greater than 0')).length).toBeGreaterThan(0);
    const [put] = calls(f, 'PUT', '/v1/quotation/q1');
    expect(put.body).toMatchObject({ customer_id: 'c1', type: 'quotation', validity_days: 2 });
  });
});

describe('Quotation view', () => {
  const quote = { ...QUOTES[0], customer_id: 'c1', vat_percent: 15, total: 200, vat_price: 30, delivery_days: 7, delivery_from: 'Payment', products: [{ name: 'Brake Pad Set', quantity: 2, unit_price: 100, unit_price_with_vat: 115, unit_discount: 0, unit_discount_with_vat: 0 }] };

  it('offers "Create invoice" which opens the invoice editor prefilled from the quotation', async () => {
    mockApi([{ method: 'GET', path: '/v1/quotation/q1', reply: { status: true, result: quote } }]);
    renderApp(<QuotationViewPage />, { at: '/sales/quotations/q1', path: '/sales/quotations/:id', extraRoutes: <></> });
    expect(await screen.findByRole('heading', { name: /QTN-000001/ })).toBeInTheDocument();
    expect(screen.getByText('Valid until')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create invoice' }));
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });

  it('lists linked invoices and unlinks one after confirmation', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/quotation/q2', reply: { status: true, result: { ...QUOTES[1], products: [] } } },
      { method: 'DELETE', path: '/v1/quotation/q2/order/o9', reply: { status: true, result: { ...QUOTES[1], order_id: null, order_ids: [], order_codes: [] } } },
    ]);
    renderApp(<QuotationViewPage />, { at: '/sales/quotations/q2', path: '/sales/quotations/:id' });
    await userEvent.click(await screen.findByRole('tab', { name: 'Sales invoices' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Unlink S-INV-000009' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/quotation/q2/order/o9')).toHaveLength(1));
    expect(calls(f, 'DELETE', '/v1/quotation/q2/order/o9')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });

  it('invoice-type quotation shows payment facets and a Return action', async () => {
    mockApi([{ method: 'GET', path: '/v1/quotation/q2', reply: { status: true, result: { ...QUOTES[1], products: [] } } }]);
    renderApp(<QuotationViewPage />, { at: '/sales/quotations/q2', path: '/sales/quotations/:id' });
    expect(await screen.findByRole('heading', { name: /QTN-000002/ })).toBeInTheDocument();
    expect(screen.getByText('Balance due')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create invoice' })).toBeNull();
  });

  it('deletes (soft) after confirmation', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/quotation/q1', reply: { status: true, result: quote } },
      { method: 'DELETE', path: '/v1/quotation/q1', reply: { status: true, result: 'deleted' } },
    ]);
    renderApp(<QuotationViewPage />, { at: '/sales/quotations/q1', path: '/sales/quotations/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/quotation/q1')).toHaveLength(1));
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });
});
