import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { VendorListPage, VendorViewPage } from './vendors';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const V = {
  id: 'v1', code: 'V-000001', name: 'AL JAZIRA AUTO PARTS', phone: '0112223344', vat_no: '300112233400003', credit_balance: 5304.95, credit_limit: 0, vat_percent: 15,
  national_address: { building_no: '1234', street_name: 'Industrial Rd', city_name: 'Riyadh', zipcode: '14322' }, category_id: ['c1'], category_name: ['Parts'], product_categories: ['brakes'],
  stores: { [STORE_ID]: { purchase_count: 2, purchase_amount: 7898.2, purchase_paid_amount: 2593.25, purchase_balance_amount: 5304.95, purchase_return_count: 0, purchase_return_amount: 0 } },
};
const META = { purchase: 45880.4, purchase_paid: 26789.25, purchase_credit_balance: 19091.15, sales_unpaid_count: 3, purchase_return: 0, purchase_return_credit_balance: 0 };

describe('Vendor list', () => {
  it('shows per-store purchase stats, meta totals and searches with search[query]', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/vendor', reply: { status: true, total_count: 1, result: [V], meta: META } }]);
    renderApp(<VendorListPage />, { at: '/buying/vendors' });
    const table = await screen.findByRole('table', { name: 'Vendors' });
    expect(await within(table).findByText('AL JAZIRA AUTO PARTS')).toBeInTheDocument();
    expect(within(table).getByText('7,898.20')).toBeInTheDocument();
    expect(screen.getByText('19,091.15')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'jazira');
    await waitFor(() => expect(calls(f, 'GET', '/v1/vendor').some((c) => c.url.searchParams.get('search[query]') === 'jazira')).toBe(true), { timeout: 2000 });
    await userEvent.click(screen.getByRole('tab', { name: /^With balance/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/vendor').some((c) => c.url.searchParams.get('search[ignore_zero_credit_balance]') === '1')).toBe(true));
  });

  it('creates a vendor: validates VAT, flattens address, sends categories/tags', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor', reply: { status: true, total_count: 0, result: [], meta: {} } },
      { method: 'GET', path: '/v1/vendor-category', reply: { status: true, result: [{ id: 'c1', name: 'Parts' }, { id: 'c2', name: 'Oils' }] } },
      { method: 'POST', path: '/v1/vendor', reply: { status: true, result: { id: 'v9', name: 'NEW CO' } } },
    ]);
    renderApp(<VendorListPage />, { at: '/buying/vendors', extraRoutes: <Route path="/buying/vendors/:id" element={<div>vendor 360</div>} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'New vendor' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Name\*?$/ }), 'New Co');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /VAT no\./ }), '12345');
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'City' }), 'Jeddah');
    await userEvent.click(await within(dlg).findByRole('checkbox', { name: 'Oils' }));
    const tags = within(dlg).getByRole('textbox', { name: 'Product categories' });
    await userEvent.type(tags, 'filters{Enter}');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('VAT No. must be 15 digits, starting and ending with 3')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/vendor')).toHaveLength(0);
    const vat = within(dlg).getByRole('textbox', { name: /VAT no\./ });
    await userEvent.clear(vat);
    await userEvent.type(vat, '300998877600003');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/vendor')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/vendor')[0].body;
    expect(body).toMatchObject({ store_id: STORE_ID, name: 'New Co', vat_no: '300998877600003', vat_percent: 15, category_id: ['c2'], product_categories: ['filters'], national_address: expect.objectContaining({ city_name: 'Jeddah' }) });
    expect(body).not.toHaveProperty('na_city_name');
    expect(await screen.findByText('vendor 360')).toBeInTheDocument();
  }, 20000);

  it('maps a duplicate (409) error onto the VAT field', async () => {
    mockApi([
      { method: 'GET', path: '/v1/vendor', reply: { status: true, total_count: 0, result: [], meta: {} } },
      { method: 'GET', path: '/v1/vendor-category', reply: { status: true, result: [] } },
      { method: 'POST', path: '/v1/vendor', status: 409, reply: { status: false, errors: { vat_no: 'VAT No. already exists with vendor name: X' } } },
    ]);
    renderApp(<VendorListPage />, { at: '/buying/vendors' });
    await userEvent.click(await screen.findByRole('button', { name: 'New vendor' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Name\*?$/ }), 'X');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('VAT No. already exists with vendor name: X')).toBeInTheDocument();
  });

  it('manages vendor categories in a modal', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor', reply: { status: true, total_count: 0, result: [], meta: {} } },
      { method: 'GET', path: '/v1/vendor-category', reply: { status: true, result: [{ id: 'c1', name: 'Parts', created_by_name: 'Sirin' }] } },
      { method: 'POST', path: '/v1/vendor-category', reply: { status: true, result: { id: 'c3', name: 'Tyres' } } },
      { method: 'DELETE', path: '/v1/vendor-category/c1', reply: { status: true, result: 'ok' } },
    ]);
    renderApp(<VendorListPage />, { at: '/buying/vendors' });
    await userEvent.click(await screen.findByRole('button', { name: 'Categories' }));
    let dlg = await screen.findByRole('dialog', { name: 'Vendor categories' });
    expect(await within(dlg).findByText('Parts')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'New category' }));
    dlg = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Name/ }), 'Tyres');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/vendor-category')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/vendor-category')[0].body).toEqual({ store_id: STORE_ID, name: 'Tyres' });
    dlg = await screen.findByRole('dialog', { name: 'Vendor categories' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete Parts' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: /Delete category/ })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/vendor-category/c1')).toHaveLength(1));
  });

  it('hides delete actions without permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'vendors', read: true, create: false, delete: false }] } },
      { method: 'GET', path: '/v1/vendor', reply: { status: true, total_count: 1, result: [V], meta: META } },
    ], { user: { id: 'u2', name: 'Clerk', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<VendorListPage />, { at: '/buying/vendors' });
    await screen.findAllByText('AL JAZIRA AUTO PARTS');
    expect(screen.queryByRole('button', { name: /Delete AL JAZIRA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New vendor' })).not.toBeInTheDocument();
  });
});

describe('Vendor 360', () => {
  it('shows balance facets, details and the vendor’s purchase bills', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor/v1', reply: { status: true, result: V } },
      { method: 'GET', path: '/v1/purchase', reply: { status: true, total_count: 1, result: [{ id: 'p1', code: 'P-INV-000001', date: '2026-10-01T10:00:00Z', net_total: 5304.95, balance_amount: 5304.95, payment_status: 'not_paid' }] } },
    ]);
    renderApp(<VendorViewPage />, { at: '/buying/vendors/v1', path: '/buying/vendors/:id', extraRoutes: <Route path="/buying/purchases/new" element={<div>new purchase</div>} /> });
    expect(await screen.findByRole('heading', { name: /AL JAZIRA AUTO PARTS/ })).toBeInTheDocument();
    expect(screen.getAllByText('5,304.95').length).toBeGreaterThan(0);
    expect(screen.getByText(/1234, Industrial Rd, Riyadh, 14322/)).toBeInTheDocument();
    expect(screen.getByText('brakes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Purchase bills/ }));
    const table = await screen.findByRole('table', { name: 'Purchase bills' });
    expect(await within(table).findByText('P-INV-000001')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/purchase')[0].url.searchParams.get('search[vendor_id]')).toBe('v1');
    await userEvent.click(screen.getByRole('button', { name: 'New purchase' }));
    expect(await screen.findByText('new purchase')).toBeInTheDocument();
  });

  it('edit drawer is prefilled from the record (national address flattened)', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor/v1', reply: { status: true, result: V } },
      { method: 'GET', path: '/v1/vendor-category', reply: { status: true, result: [{ id: 'c1', name: 'Parts' }] } },
      { method: 'PUT', path: '/v1/vendor/v1', reply: { status: true, result: V } },
    ]);
    renderApp(<VendorViewPage />, { at: '/buying/vendors/v1', path: '/buying/vendors/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('textbox', { name: 'City' })).toHaveValue('Riyadh');
    expect(await within(dlg).findByRole('checkbox', { name: 'Parts' })).toBeChecked();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/vendor/v1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/vendor/v1')[0].body).toMatchObject({ category_id: ['c1'], national_address: expect.objectContaining({ city_name: 'Riyadh', building_no: '1234' }) });
  });
});
