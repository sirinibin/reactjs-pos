import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { PoEditorPage, PoListPage, PoViewPage } from './orders';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const PO = { id: 'po1', code: 'PO-000001', date: '2026-10-01T10:00:00Z', expected_date: '2026-10-09T00:00:00Z', vendor_id: 'v1', vendor_name: 'BOSCH SAUDI', status: 'sent', net_total: 690, total: 600, vat_price: 90, vat_percent: 15, total_quantity: 5,
  products: [{ product_id: 'pr1', name: 'Brake Disc', quantity: 5, purchase_unit_price: 120, purchase_unit_price_with_vat: 138, unit_discount: 0 }] };

describe('Purchase order list', () => {
  it('lists orders with status pills, meta and one view per status', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-order', reply: { status: true, total_count: 1, result: [PO], meta: { count: 1, total_purchase_order: 690, vat_price: 90, discount: 0 } } }]);
    renderApp(<PoListPage />, { at: '/buying/orders' });
    const table = await screen.findByRole('table', { name: 'Purchase orders' });
    expect(await within(table).findByText('PO-000001')).toBeInTheDocument();
    expect(within(table).getByText('Sent')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/purchase-order')[0].url.searchParams.get('sort')).toBe('-created_at');
    await userEvent.click(screen.getByRole('tab', { name: /^Partially received/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-order').some((c) => c.url.searchParams.get('search[status]') === 'partially_received')).toBe(true));
  });

  it('searches vendor names with search[vendor_name]', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-order', reply: { status: true, total_count: 1, result: [PO], meta: {} } }]);
    renderApp(<PoListPage />, { at: '/buying/orders' });
    await screen.findAllByText('PO-000001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'bosch');
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-order').some((c) => c.url.searchParams.get('search[vendor_name]') === 'bosch')).toBe(true), { timeout: 2000 });
  });
});

const PRODUCT = { id: 'pr1', name: 'Brake Disc', product_stores: { [STORE_ID]: { purchase_unit_price: 120, purchase_unit_price_with_vat: 138, stock: 1 } } };
const editorMocks = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/vendor', reply: { status: true, result: [] } },
  { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
  { method: 'POST', path: '/v1/purchase-order/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
]);

describe('Purchase order editor', () => {
  it('creates a draft PO with purchase keys, expected date and free-text vendor', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/purchase-order', reply: { status: true, result: { id: 'po9', code: 'PO-000009' } } }]);
    renderApp(<PoEditorPage />, { at: '/buying/orders/new', path: '/buying/orders/new', extraRoutes: <Route path="/buying/orders/:id" element={<div>viewing</div>} /> });
    const vendor = (await screen.findAllByRole('combobox', { name: /Vendor/ }))[0];
    await userEvent.type(vendor, 'New Supplier');
    await userEvent.click(await screen.findByRole('button', { name: /as a new/ }));
    await userEvent.type(screen.getByLabelText('Expected date'), '2026-10-20');
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'disc');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Disc/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-order')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/purchase-order')[0].body;
    expect(body).toMatchObject({ status: 'draft', vendor_id: null, vendor_name: 'New Supplier', order_placed_by: 'u1' });
    expect(body.expected_date_str).toMatch(/^2026-10-20T00:00:00[+-]\d{2}:\d{2}$/);
    expect(body).not.toHaveProperty('expected_date');
    expect(body).not.toHaveProperty('payments_input');
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'pr1', purchase_unit_price: 120, is_service: false })]);
  });

  it('shows validation errors returned with HTTP 200 + status:false', async () => {
    editorMocks([{ method: 'POST', path: '/v1/purchase-order', reply: { status: false, errors: { date_str: 'Date is required' } } }]);
    renderApp(<PoEditorPage />, { at: '/buying/orders/new', path: '/buying/orders/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'disc');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Disc/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Date is required')).length).toBeGreaterThan(0);
  });

  it('prefills from an accepted purchase request and links it', async () => {
    const PR = { id: 'r1', code: 'PREQ-1', status: 'accepted', notes: 'urgent', vat_percent: 15, products: [{ product_id: 'pr1', name: 'Brake Disc', quantity: 3, purchase_unit_price: 120 }] };
    const f = editorMocks([
      { method: 'GET', path: '/v1/purchase-request/r1', reply: { status: true, result: PR } },
      { method: 'POST', path: '/v1/purchase-order', reply: { status: true, result: { id: 'po9', code: 'PO-000009' } } },
    ]);
    renderApp(<PoEditorPage />, { at: '/buying/orders/new?from_pr=r1', path: '/buying/orders/new', extraRoutes: <Route path="/buying/orders/:id" element={<div>viewing</div>} /> });
    expect(await screen.findByText('PREQ-1')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Items' })).getByRole('textbox', { name: 'Quantity' })).toHaveValue('3');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-order')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase-order')[0].body).toMatchObject({ purchase_request_id: 'r1', purchase_request_code: 'PREQ-1', remarks: 'urgent' });
  });
});

describe('Purchase order view', () => {
  it('changes status with a full-replace PUT', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
      { method: 'PUT', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
    ]);
    renderApp(<PoViewPage />, { at: '/buying/orders/po1', path: '/buying/orders/:id' });
    expect(await screen.findByRole('heading', { name: /PO-000001/ })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Change status' }), 'confirmed');
    await waitFor(() => expect(calls(f, 'PUT', '/v1/purchase-order/po1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/purchase-order/po1')[0].body).toMatchObject({ status: 'confirmed', date_str: PO.date, expected_date_str: PO.expected_date, products: PO.products, vendor_id: 'v1' });
  });

  it('converts to a purchase after confirmation', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } }]);
    renderApp(<PoViewPage />, { at: '/buying/orders/po1', path: '/buying/orders/:id', extraRoutes: <Route path="/buying/purchases/new" element={<div>purchase editor</div>} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'Convert to purchase' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('purchase editor')).toBeInTheDocument();
  });

  it('deletes (hard) only after confirmation', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: PO } },
      { method: 'DELETE', path: '/v1/purchase-order/po1', reply: { status: true, result: 'Purchase order deleted successfully' } },
    ]);
    renderApp(<PoViewPage />, { at: '/buying/orders/po1', path: '/buying/orders/:id', extraRoutes: <Route path="/buying/orders" element={<div>order list</div>} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Cancel' }));
    expect(calls(f, 'DELETE', '/v1/purchase-order/po1')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('order list')).toBeInTheDocument();
    expect(calls(f, 'DELETE', '/v1/purchase-order/po1')).toHaveLength(1);
  });

  it('hides convert for received orders and navigates to the next order', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-order/po1', reply: { status: true, result: { ...PO, status: 'received', purchase_id: 'p5', purchase_code: 'P-INV-000005' } } },
      { method: 'GET', path: '/v1/next-purchase-order/po1', reply: { status: true, result: { id: 'po2' } } },
    ]);
    renderApp(<PoViewPage />, { at: '/buying/orders/po1', path: '/buying/orders/:id', extraRoutes: <Route path="/buying/orders/po2" element={<div>second order</div>} /> });
    await screen.findByRole('heading', { name: /PO-000001/ });
    expect(screen.queryByRole('button', { name: 'Convert to purchase' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /P-INV-000005/ })).toHaveAttribute('href', '/buying/purchases/p5');
    await userEvent.click(screen.getByRole('button', { name: 'Next order' }));
    expect(await screen.findByText('second order')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/next-purchase-order/po1')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });
});
