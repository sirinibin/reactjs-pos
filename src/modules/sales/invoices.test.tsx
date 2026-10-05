import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { SalesEditorPage, SalesListPage, SalesViewPage } from './invoices';

const ORDERS = [
  { id: 'o1', code: 'S-INV-000001', date: '2026-10-01T10:00:00Z', customer_name: 'AL NOOR TRADING EST.', vat_no: '310122393500003', net_total: 230, vat_price: 30, total_payment_received: 100, balance_amount: 130, payment_status: 'paid_partially', created_by_name: 'Sirin' },
  { id: 'o2', code: 'S-INV-000002', date: '2026-10-02T11:00:00Z', customer_name: 'Walk-in', net_total: 115, vat_price: 15, total_payment_received: 115, balance_amount: 0, payment_status: 'paid' },
];
const listMock = () => mockApi([{ method: 'GET', path: '/v1/order', reply: { status: true, total_count: 2, result: ORDERS, meta: { total_sales: 345, paid_sales: 215, unpaid_sales: 130, vat_price: 45, net_profit: 80, return_amount: 0 } } }]);

describe('Sales invoice list', () => {
  it('renders rows, totals and status pills from the API', async () => {
    listMock();
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    expect(await within(await screen.findByRole('table', { name: 'Sales invoices' })).findByText('S-INV-000001')).toBeInTheDocument();
    expect(screen.getAllByText('S-INV-000001')).toHaveLength(2); // table + mobile card list
    expect(screen.getAllByText('Partially paid').length).toBeGreaterThan(0);
    expect(screen.getByText('345.00')).toBeInTheDocument();
  });

  it('scopes the request to the active store, asks for stats, sorts newest first', async () => {
    const f = listMock();
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    await screen.findAllByText('S-INV-000001');
    const [c] = calls(f, 'GET', '/v1/order');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
  });

  it('switching to the "Unpaid" view filters by payment status', async () => {
    const f = listMock();
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    await screen.findAllByText('S-INV-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Unpaid/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/order').some((c) => c.url.searchParams.get('search[payment_status]') === 'not_paid')).toBe(true));
  });

  it('typing an invoice number searches by code (debounced)', async () => {
    const f = listMock();
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    await screen.findAllByText('S-INV-000001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), '0001');
    await waitFor(() => expect(calls(f, 'GET', '/v1/order').some((c) => c.url.searchParams.get('search[code]') === '0001')).toBe(true), { timeout: 2000 });
  });

  it('shows an empty state when nothing matches', async () => {
    mockApi([{ method: 'GET', path: '/v1/order', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
  });

  it('shows a retryable error when the API fails', async () => {
    mockApi([{ method: 'GET', path: '/v1/order', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<SalesListPage />, { at: '/sales/invoices' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

const PRODUCT = { id: 'p1', name: 'Brake Pad Set', part_number: 'BP-1', unit: 'Set', product_stores: { [STORE_ID]: { retail_unit_price: 100, retail_unit_price_with_vat: 115, purchase_unit_price: 60, stock: 3 } } };

describe('Sales invoice editor', () => {
  const editorMocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [{ id: 'c1', name: 'AL NOOR TRADING EST.', phone: '0554128890', vat_no: '310122393500003', credit_limit: 0 }] } },
    { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
    { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
    { method: 'POST', path: '/v1/order/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, net_total: 230, vat_price: 30, total: 200 } }) },
  ]);

  it('refuses to save an empty invoice and explains why', async () => {
    const f = editorMocks();
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new', path: '/sales/invoices/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Add at least one item.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/order')).toHaveLength(0);
  });

  it('adds a product, computes VAT totals and posts the exact API body', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/order', reply: { status: true, result: { id: 'new1', code: 'S-INV-000099' } } }]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new', path: '/sales/invoices/new' });
    const add = await screen.findByRole('combobox', { name: 'Add item' });
    await userEvent.type(add, 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    const qty = await screen.findByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '2{Enter}');
    expect(await screen.findAllByText('230.00')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/order')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/order');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, vat_percent: 15, auto_rounding_amount: true });
    expect(post.body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 2, unit_price: 100, unit_price_with_vat: 115 })]);
    expect(post.body.payments_input).toEqual([expect.objectContaining({ amount: 230, method: 'cash' })]);
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('warns when quantity exceeds stock', async () => {
    editorMocks();
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new', path: '/sales/invoices/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    const qty = await screen.findByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '5{Enter}');
    const items = await screen.findByRole('table', { name: 'Items' });
    await waitFor(() => expect(within(items).getByText(/3 Set in stock/)).toHaveClass('low'));
  });

  it('maps server validation errors back onto the form', async () => {
    editorMocks([{ method: 'POST', path: '/v1/order', status: 400, reply: { status: false, errors: { customer_credit_limit: 'Exceeding customer credit limit' } } }]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new', path: '/sales/invoices/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Exceeding customer credit limit')).length).toBeGreaterThan(0);
  });
});

describe('Sales invoice view', () => {
  it('shows facets and opens the receive-payment dialog prefilled with the balance', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/order/o1', reply: { status: true, result: { ...ORDERS[0], products: [{ name: 'Brake Pad Set', quantity: 2, unit_price: 100, unit_price_with_vat: 115, unit_discount: 0, unit_discount_with_vat: 0 }], total: 200, vat_percent: 15, payments: [] } } },
      { method: 'POST', path: '/v1/sales-payment', reply: { status: true, result: { id: 'pay1' } } },
    ]);
    renderApp(<SalesViewPage />, { at: '/sales/invoices/o1', path: '/sales/invoices/:id' });
    expect(await screen.findByRole('heading', { name: /S-INV-000001/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Receive payment' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('130');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/sales-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/sales-payment')[0].body).toMatchObject({ order_id: 'o1', amount: 130, method: 'cash', store_id: STORE_ID });
  });

  it('blocks overpayment on the client', async () => {
    mockApi([{ method: 'GET', path: '/v1/order/o1', reply: { status: true, result: { ...ORDERS[0], products: [], payments: [] } } }]);
    renderApp(<SalesViewPage />, { at: '/sales/invoices/o1', path: '/sales/invoices/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Receive payment' }));
    const dlg = await screen.findByRole('dialog');
    const amt = within(dlg).getByRole('textbox', { name: /Amount/ });
    await userEvent.clear(amt);
    await userEvent.type(amt, '500');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record payment' }));
    expect(await within(dlg).findByText(/can’t exceed the balance due/)).toBeInTheDocument();
  });
});

describe('Sales invoice conversions', () => {
  const baseMocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [] } },
    { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
    { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
    { method: 'POST', path: '/v1/order/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
    { method: 'POST', path: '/v1/order', reply: { status: true, result: { id: 'new1', code: 'S-INV-000100' } } },
  ]);
  const save = async () => userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));

  it('?quotation_id= prefills from the quotation and links it on save', async () => {
    const f = baseMocks([{ method: 'GET', path: '/v1/quotation/q1', reply: { status: true, result: { id: 'q1', code: 'QTN-000006', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', phone: '0554128890', vat_percent: 15, discount: 0, products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 2, quantity_returned: 0, unit_price: 100, unit_price_with_vat: 115 }] } } }]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new?quotation_id=q1', path: '/sales/invoices/new' });
    expect(await screen.findByText('From quotation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'QTN-000006' })).toHaveAttribute('href', '/sales/quotations/q1');
    expect(within(screen.getByRole('table', { name: 'Items' })).getByText('Brake Pad Set')).toBeInTheDocument();
    await save();
    await waitFor(() => expect(calls(f, 'POST', '/v1/order')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/order')[0].body;
    expect(body).toMatchObject({ customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', phone: '0554128890', quotation_id: 'q1', quotation_code: 'QTN-000006', quotation_ids: ['q1'], quotation_codes: ['QTN-000006'] });
    expect(body).not.toHaveProperty('_source');
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 2, unit_price: 100 })]);
  });

  it('?delivery_note_id= prefills, fetches current prices for unpriced lines and links the note', async () => {
    const f = baseMocks([
      { method: 'GET', path: '/v1/delivery-note/d1', reply: { status: true, result: { id: 'd1', code: 'DN-000001', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1 }] } } },
      { method: 'GET', path: '/v1/product/p1', reply: { status: true, result: PRODUCT } },
    ]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new?delivery_note_id=d1', path: '/sales/invoices/new' });
    expect(await screen.findByText('From delivery note')).toBeInTheDocument();
    await save();
    await waitFor(() => expect(calls(f, 'POST', '/v1/order')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/order')[0].body;
    expect(body).toMatchObject({ customer_id: 'c1', delivery_note_id: 'd1' });
    expect(body.products[0]).toMatchObject({ product_id: 'p1', quantity: 1, unit_price: 100, unit_price_with_vat: 115 });
  });

  it('consumes the workshop hand-over from sessionStorage once', async () => {
    sessionStorage.setItem('workshop_invoice_prefill', JSON.stringify({ customer_id: 'c2', customer_name: 'RIYADH AUTO CARE', vehicle_id: 'v1', km_driven: 120500, repair_job_ids: ['j1', 'j2'], products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100, unit_price_with_vat: 115 }] }));
    const f = baseMocks();
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new', path: '/sales/invoices/new' });
    expect(await screen.findByText('From workshop job card')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem('workshop_invoice_prefill')).toBeNull());
    await save();
    await waitFor(() => expect(calls(f, 'POST', '/v1/order')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/order')[0].body).toMatchObject({ customer_id: 'c2', vehicle_id: 'v1', km_driven: 120500, repair_job_id: 'j1', repair_job_ids: ['j1', 'j2'], products: [expect.objectContaining({ product_id: 'p1' })] });
  });

  it('?customer_id= (Customer 360) prefills the customer and contact details', async () => {
    const f = baseMocks([{ method: 'GET', path: '/v1/customer/c7', reply: { status: true, result: { id: 'c7', name: 'DESERT LINE LOGISTICS', phone: '0551112223', vat_no: '310000000000003', address: 'Riyadh', remarks: 'Deliver to gate 3', use_remarks_in_sales: true } } }]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new?customer_id=c7', path: '/sales/invoices/new' });
    expect(await screen.findByRole('combobox', { name: /Customer/ })).toHaveValue('DESERT LINE LOGISTICS');
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('0551112223');
    const [get] = calls(f, 'GET', '/v1/customer/c7');
    expect(get.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(get.url.searchParams.get('select')).toContain('use_remarks_in_sales');
    await userEvent.type(screen.getByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    await save();
    await waitFor(() => expect(calls(f, 'POST', '/v1/order')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/order')[0].body).toMatchObject({ customer_id: 'c7', customer_name: 'DESERT LINE LOGISTICS', phone: '0551112223', vat_no: '310000000000003', remarks: 'Deliver to gate 3' });
  });

  it('shows a retryable error when the source document can’t be loaded', async () => {
    baseMocks([{ method: 'GET', path: '/v1/quotation/missing', status: 404, reply: { status: false, errors: { find: 'not found' } } }]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/new?quotation_id=missing', path: '/sales/invoices/new' });
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('editing keeps the quotation / workshop links in the PUT body', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/order/o1', reply: { status: true, result: { ...ORDERS[0], customer_id: 'c1', quotation_id: 'q1', quotation_code: 'QTN-000006', quotation_ids: ['q1'], quotation_codes: ['QTN-000006'], vehicle_id: 'v1', km_driven: 5, products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100, unit_price_with_vat: 115 }], payments: [] } } },
      { method: 'POST', path: '/v1/order/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
      { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
      { method: 'PUT', path: '/v1/order/o1', reply: { status: true, result: { id: 'o1', code: 'S-INV-000001' } } },
    ]);
    renderApp(<SalesEditorPage />, { at: '/sales/invoices/o1/edit', path: '/sales/invoices/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/order/o1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/order/o1')[0].body).toMatchObject({ quotation_id: 'q1', quotation_code: 'QTN-000006', quotation_ids: ['q1'], vehicle_id: 'v1', km_driven: 5 });
  });

  it('view shows the delivery note and quotation in the document flow, plus PDF / WhatsApp actions', async () => {
    mockApi([{ method: 'GET', path: '/v1/order/o1', reply: { status: true, result: { ...ORDERS[0], quotation_id: 'q1', quotation_code: 'QTN-000006', delivery_note_id: 'd1', products: [], payments: [] } } }]);
    renderApp(<SalesViewPage />, { at: '/sales/invoices/o1', path: '/sales/invoices/:id' });
    expect(await screen.findByRole('heading', { name: /S-INV-000001/ })).toBeInTheDocument();
    expect(screen.getByText('QTN-000006')).toBeInTheDocument();
    expect(screen.getByText('Delivery note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeInTheDocument();
  });
});
