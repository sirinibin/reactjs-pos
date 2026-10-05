import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { PurchaseEditorPage, PurchaseListPage, PurchaseViewPage } from './purchases';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const ROWS = [
  { id: 'p1', code: 'P-INV-000001', date: '2026-10-01T10:00:00Z', vendor_id: 'v1', vendor_name: 'AL JAZIRA AUTO PARTS', vendor_invoice_no: 'AJ-77', net_total: 5304.95, vat_price: 691.95, total_payment_paid: 0, balance_amount: 5304.95, payment_status: 'not_paid', payment_methods: [], return_count: 0 },
  { id: 'p2', code: 'P-INV-000002', date: '2026-10-02T11:00:00Z', vendor_id: 'v2', vendor_name: 'GULF LUBRICANTS', net_total: 1150, vat_price: 150, total_payment_paid: 1150, balance_amount: 0, payment_status: 'paid', payment_methods: ['bank_transfer'], return_count: 1, return_amount: 115 },
];
const META = { total_purchase: 6454.95, paid_purchase: 1150, unpaid_purchase: 5304.95, cash_purchase: 0, bank_account_purchase: 1150, vat_price: 841.95, discount: 0, cash_discount: 0, return_amount: 115 };
const listMock = (extra: any[] = []) => mockApi([...extra, { method: 'GET', path: '/v1/purchase', reply: { status: true, total_count: 2, result: ROWS, meta: META } }]);

describe('Purchase bill list', () => {
  it('renders rows, vendor invoice numbers and totals from meta', async () => {
    listMock();
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    const table = await screen.findByRole('table', { name: 'Purchase bills' });
    expect(await within(table).findByText('P-INV-000001')).toBeInTheDocument();
    expect(within(table).getByText(/AJ-77/)).toBeInTheDocument();
    expect(screen.getByText('6,454.95')).toBeInTheDocument();
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0);
  });

  it('scopes to the store, asks for stats and sorts by bill date', async () => {
    const f = listMock();
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    await screen.findAllByText('P-INV-000001');
    const [c] = calls(f, 'GET', '/v1/purchase');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-date');
    expect(c.url.searchParams.get('select')).toContain('vendor_invoice_no');
  });

  it('"To pay" view sends the CSV payment status filter', async () => {
    const f = listMock();
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    await screen.findAllByText('P-INV-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^To pay/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase').some((c) => c.url.searchParams.get('search[payment_status]') === 'not_paid,paid_partially')).toBe(true));
  });

  it('typing a bill number searches by code, other text by vendor invoice #', async () => {
    const f = listMock();
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    await screen.findAllByText('P-INV-000001');
    const box = screen.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(box, 'P-INV');
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase').some((c) => c.url.searchParams.get('search[code]') === 'P-INV')).toBe(true), { timeout: 2000 });
    await userEvent.clear(box);
    await userEvent.type(box, 'AJ');
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase').some((c) => c.url.searchParams.get('search[vendor_invoice_no]') === 'AJ')).toBe(true), { timeout: 2000 });
  });

  it('vendor deep link (?f.vendor=id|name) filters by vendor_id', async () => {
    const f = listMock();
    renderApp(<PurchaseListPage />, { at: '/buying/purchases?f.vendor=v1|AL%20JAZIRA' });
    await screen.findAllByText('P-INV-000001');
    expect(calls(f, 'GET', '/v1/purchase')[0].url.searchParams.get('search[vendor_id]')).toBe('v1');
  });

  it('hides "New purchase" without create permission (RBAC)', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'purchases', read: true, create: false, update: false }] } },
      { method: 'GET', path: '/v1/purchase', reply: { status: true, total_count: 2, result: ROWS, meta: META } },
    ], { user: { id: 'u2', name: 'Clerk', role: 'Staff', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    await screen.findAllByText('P-INV-000001');
    expect(screen.queryByRole('button', { name: /New purchase/ })).not.toBeInTheDocument();
  });

  it('shows empty and error states', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    const { unmount } = renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
    unmount();
    mockApi([{ method: 'GET', path: '/v1/purchase', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<PurchaseListPage />, { at: '/buying/purchases' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });
});

const PRODUCT = { id: 'pr1', name: 'Brake Pad Set', part_number: 'BP-1', unit: 'Set', product_stores: { [STORE_ID]: { retail_unit_price: 185, retail_unit_price_with_vat: 212.75, purchase_unit_price: 120, purchase_unit_price_with_vat: 138, wholesale_unit_price: 150, stock: 3 } } };
const SERVICE = { id: 'sv1', name: 'Wheel Alignment', is_service: true, product_stores: { [STORE_ID]: { purchase_unit_price: 50, purchase_unit_price_with_vat: 57.5 } } };

const editorMocks = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/vendor', reply: { status: true, result: [{ id: 'v1', name: 'AL JAZIRA AUTO PARTS', phone: '0112223344', vat_no: '300112233400003' }] } },
  { method: 'GET', path: '/v1/product', reply: (u: URL) => ({ status: true, result: u.searchParams.get('search[ids]') ? [{ id: 'pr1', product_stores: PRODUCT.product_stores }] : /wheel/i.test(u.searchParams.get('search[search_text]') || '') ? [SERVICE] : [PRODUCT] }) },
  { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [] } },
  { method: 'POST', path: '/v1/purchase/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, net_total: 276, vat_price: 36, total: 240 } }) },
]);

async function addBrakePads(qty = '2') {
  await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
  await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
  const q = await screen.findByRole('textbox', { name: 'Quantity' });
  await userEvent.clear(q);
  await userEvent.type(q, `${qty}{Enter}`);
}

describe('Purchase bill editor', () => {
  it('refuses to save an empty bill', async () => {
    const f = editorMocks();
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new', path: '/buying/purchases/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Add at least one item.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/purchase')).toHaveLength(0);
  });

  it('uses the purchase price, posts purchase keys, vendor and the selling prices', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/purchase', reply: { status: true, result: { id: 'np1', code: 'P-INV-000099' } } }]);
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new', path: '/buying/purchases/new', extraRoutes: <Route path="/buying/purchases/:id" element={<div>viewing</div>} /> });
    const vendor = (await screen.findAllByRole('combobox', { name: /Vendor/ }))[0];
    await userEvent.type(vendor, 'jazira');
    await userEvent.click(await screen.findByRole('option', { name: /AL JAZIRA/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Vendor invoice #' }), 'AJ-501');
    await addBrakePads('2');
    expect((await screen.findAllByText('276.00')).length).toBeGreaterThan(0);
    // selling prices: current retail is loaded; raise it
    const retail = await screen.findByRole('textbox', { name: 'Retail price Brake Pad Set' });
    await waitFor(() => expect(retail).toHaveValue('185'));
    await userEvent.clear(retail);
    await userEvent.type(retail, '199');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/purchase');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, vendor_id: 'v1', vendor_name: 'AL JAZIRA AUTO PARTS', vendor_invoice_no: 'AJ-501', status: 'delivered', vat_percent: 15, order_placed_by: 'u1' });
    expect(post.body.products).toEqual([expect.objectContaining({ product_id: 'pr1', quantity: 2, purchase_unit_price: 120, purchase_unit_price_with_vat: 138, retail_unit_price: 199 })]);
    expect(post.body.products[0]).not.toHaveProperty('unit_price');
    expect(post.body).not.toHaveProperty('sell');
    expect(post.body.payments_input).toEqual([expect.objectContaining({ amount: 276, method: 'cash' })]);
    expect(post.body.balance_amount).toBe(0);
    expect(await screen.findByText('viewing')).toBeInTheDocument();
  });

  it('blocks a retail price below the purchase price', async () => {
    const f = editorMocks();
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new', path: '/buying/purchases/new' });
    await addBrakePads('1');
    const retail = await screen.findByRole('textbox', { name: 'Retail price Brake Pad Set' });
    await waitFor(() => expect(retail).toHaveValue('185'));
    await userEvent.clear(retail);
    await userEvent.type(retail, '100');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Purchase price is higher than the retail price.')).length).toBeGreaterThan(0);
    expect(calls(f, 'POST', '/v1/purchase')).toHaveLength(0);
  });

  it('rejects services on a purchase', async () => {
    const f = editorMocks();
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new', path: '/buying/purchases/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'wheel');
    await userEvent.click(await screen.findByRole('option', { name: /Wheel Alignment/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Services can’t be purchased.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/purchase')).toHaveLength(0);
  });

  it('maps a duplicate vendor invoice error back onto the field', async () => {
    editorMocks([{ method: 'POST', path: '/v1/purchase', status: 400, reply: { status: false, errors: { vendor_invoice_no: 'Vendor Invoice No. already exists' } } }]);
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new', path: '/buying/purchases/new' });
    await addBrakePads('1');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Vendor Invoice No. already exists')).length).toBeGreaterThan(0);
  });

  it('prefills from a purchase order and marks the PO received after save via the view link', async () => {
    const PO = { id: 'po1', code: 'PO-000003', vendor_id: 'v1', vendor_name: 'AL JAZIRA AUTO PARTS', vat_percent: 15, date: '2026-10-01T10:00:00Z', status: 'confirmed', products: [{ product_id: 'pr1', name: 'Brake Pad Set', quantity: 4, purchase_unit_price: 120, purchase_unit_price_with_vat: 138 }] };
    const f = editorMocks([
      { method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
      { method: 'POST', path: '/v1/purchase', reply: { status: true, result: { id: 'np2', code: 'P-INV-000100' } } },
    ]);
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/new?from_po=po1', path: '/buying/purchases/new', extraRoutes: <Route path="/buying/purchases/:id" element={<div>viewing</div>} /> });
    expect(await screen.findByText('PO-000003')).toBeInTheDocument();
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(within(items).getByText('Brake Pad Set')).toBeInTheDocument();
    expect(within(items).getByRole('textbox', { name: 'Quantity' })).toHaveValue('4');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase')[0].body).toMatchObject({ vendor_id: 'v1', products: [expect.objectContaining({ quantity: 4, purchase_unit_price: 120 })] });
    expect(await screen.findByText('viewing')).toBeInTheDocument();
  });

  it('edits an existing purchase, hydrating purchase prices and sending PUT', async () => {
    const EXIST = { id: 'p1', code: 'P-INV-000001', date: '2026-10-01T10:00:00Z', vendor_id: 'v1', vendor_name: 'AL JAZIRA AUTO PARTS', vat_percent: 15, vendor_invoice_no: 'AJ-77', status: 'delivered', auto_rounding_amount: true,
      products: [{ product_id: 'pr1', name: 'Brake Pad Set', quantity: 2, quantity_returned: 1, purchase_unit_price: 120, purchase_unit_price_with_vat: 138, unit_discount: 0, unit_discount_with_vat: 0 }],
      payments: [{ id: 'pay1', date: '2026-10-01T10:00:00Z', amount: 50, method: 'cash' }] };
    const f = editorMocks([
      { method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: EXIST } },
      { method: 'PUT', path: '/v1/purchase/p1', reply: { status: true, result: { id: 'p1', code: 'P-INV-000001' } } },
    ]);
    renderApp(<PurchaseEditorPage />, { at: '/buying/purchases/p1/edit', path: '/buying/purchases/:id/edit', extraRoutes: <Route path="/buying/purchases/:id" element={<div>viewing</div>} /> });
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(within(items).getByRole('textbox', { name: 'Unit price' })).toHaveValue('120');
    expect(within(items).getByRole('button', { name: /Remove Brake Pad Set/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'From P.O.' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/purchase/p1')).toHaveLength(1));
    const [put] = calls(f, 'PUT', '/v1/purchase/p1');
    expect(put.body).toMatchObject({ vendor_invoice_no: 'AJ-77', products: [expect.objectContaining({ purchase_unit_price: 120, quantity: 2 })] });
    expect(put.body.payments_input).toEqual([expect.objectContaining({ id: 'pay1', amount: 50 })]);
  });
});

const DOC = { ...ROWS[0], total: 4613, vat_percent: 15, products: [{ product_id: 'pr1', name: 'Brake Pad Set', quantity: 20, purchase_unit_price: 120, purchase_unit_price_with_vat: 138, unit_discount: 0, unit_discount_with_vat: 0 }], payments: [], payments_count: 0 };

describe('Purchase bill view', () => {
  it('shows facets, purchase-priced lines and records a payment to /purchase-payment', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: DOC } },
      { method: 'GET', path: '/v1/purchase-cash-discount', reply: { status: true, result: [] } },
      { method: 'POST', path: '/v1/purchase-payment', reply: { status: true, result: { id: 'pay9' } } },
    ]);
    renderApp(<PurchaseViewPage />, { at: '/buying/purchases/p1', path: '/buying/purchases/:id' });
    expect(await screen.findByRole('heading', { name: /P-INV-000001/ })).toBeInTheDocument();
    expect(screen.getAllByText('120.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Create return/ })).toHaveAttribute('href', '/buying/returns/new?purchase_id=p1');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('5304.95');
    expect(within(dlg).getByRole('option', { name: 'Vendor account' })).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-payment')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase-payment')[0].body).toMatchObject({ purchase_id: 'p1', purchase_code: 'P-INV-000001', amount: 5304.95, method: 'cash', store_id: STORE_ID });
  });

  it('after a PO conversion, marks the PO received with a full PUT', async () => {
    const PO = { id: 'po1', code: 'PO-000003', date: '2026-10-01T10:00:00Z', status: 'confirmed', products: [{ product_id: 'pr1' }] };
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: DOC } },
      { method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
      { method: 'PUT', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
    ]);
    renderApp(<PurchaseViewPage />, { at: '/buying/purchases/p1?po_link=po1', path: '/buying/purchases/:id' });
    await waitFor(() => expect(calls(f, 'PUT', '/v1/purchase-order/po1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/purchase-order/po1')[0].body).toMatchObject({ status: 'received', purchase_id: 'p1', purchase_code: 'P-INV-000001', date_str: PO.date, products: PO.products });
    expect(await screen.findByText('PO-000003 marked as received')).toBeInTheDocument();
  });

  it('hides payment and edit actions without update permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'purchases', read: true, update: false }, { resource: 'purchase_return', read: true, create: false }] } },
      { method: 'GET', path: '/v1/purchase/p1', reply: { status: true, result: DOC } },
    ], { user: { id: 'u2', name: 'Clerk', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<PurchaseViewPage />, { at: '/buying/purchases/p1', path: '/buying/purchases/:id' });
    await screen.findByRole('heading', { name: /P-INV-000001/ });
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
  });
});
