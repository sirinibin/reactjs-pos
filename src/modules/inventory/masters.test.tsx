import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { BrandListPage, CategoryListPage, ServiceCategoryListPage, WarehouseListPage, warehouseToBody, validateWarehouse } from './masters';
import { ServiceListPage, serviceToApi, serviceFromApi, validateService } from './services';

const CATS = [
  { id: 'c1', name: 'Filters', parent_name: '', created_by_name: 'Sirin', created_at: '2026-10-01T10:00:00Z' },
  { id: 'c2', name: 'Oil filters', parent_id: 'c1', parent_name: 'Filters', created_at: '2026-10-02T10:00:00Z' },
];

describe('Product categories', () => {
  it('lists categories scoped to the store and searches by name', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/product-category', reply: { status: true, total_count: 2, result: CATS } }]);
    renderApp(<CategoryListPage />, { at: '/stock/categories' });
    const table = await screen.findByRole('table', { name: 'Product categories' });
    expect(await within(table).findByText('Oil filters')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'oil');
    await waitFor(() => expect(calls(f, 'GET', '/v1/product-category').some((c) => c.url.searchParams.get('search[name]') === 'oil' && c.url.searchParams.get('search[store_id]') === STORE_ID)).toBe(true), { timeout: 2000 });
  });

  it('creates a category from the drawer and maps the duplicate-name error', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/product-category', reply: { status: true, total_count: 2, result: CATS } },
      { method: 'POST', path: '/v1/product-category', status: 400, reply: { status: false, errors: { name: 'Name is Already in use' } } },
    ]);
    renderApp(<CategoryListPage />, { at: '/stock/categories' });
    await screen.findAllByText('Oil filters');
    await userEvent.click(screen.getByRole('button', { name: 'New category' }));
    const dlg = await screen.findByRole('dialog', { name: 'New product category' });
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Name/ }), 'Filters');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/product-category')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/product-category')[0].body).toEqual({ store_id: STORE_ID, name: 'Filters', parent_id: null });
    expect(await within(dlg).findByText('Name is Already in use')).toBeInTheDocument();
  });

  it('opens the create drawer from the shell Create action (?new=1)', async () => {
    mockApi([{ method: 'GET', path: '/v1/product-category', reply: { status: true, total_count: 0, result: [] } }]);
    renderApp(<CategoryListPage />, { at: '/stock/categories?new=1', path: '/stock/categories' });
    expect(await screen.findByRole('dialog', { name: 'New product category' })).toBeInTheDocument();
  });

  it('edits a row with its parent prefilled and PUTs it', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/product-category', reply: { status: true, total_count: 2, result: CATS } },
      { method: 'PUT', path: '/v1/product-category/c2', reply: { status: true, result: { ...CATS[1], name: 'Oil filters 2' } } },
    ]);
    renderApp(<CategoryListPage />, { at: '/stock/categories' });
    const table = await screen.findByRole('table', { name: 'Product categories' });
    await userEvent.click(await within(table).findByText('Oil filters'));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('combobox')).toHaveValue('Filters');
    const name = within(dlg).getByRole('textbox', { name: /Name/ });
    await userEvent.type(name, ' 2');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/product-category/c2')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/product-category/c2')[0].body).toMatchObject({ name: 'Oil filters 2', parent_id: 'c1' });
    expect(calls(f, 'PUT', '/v1/product-category/c2')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });
});

describe('Service categories', () => {
  it('uses the service-category endpoint and restores deleted rows', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/service-category', reply: (u: URL) => ({ status: true, total_count: 1, result: [{ id: 's1', name: 'Diagnostics', deleted: u.searchParams.get('search[deleted]') === '1' }] }) },
      { method: 'POST', path: '/v1/service-category/restore/s1', reply: { status: true, result: {} } },
    ]);
    renderApp(<ServiceCategoryListPage />, { at: '/stock/service-categories?view=deleted' });
    const table = await screen.findByRole('table', { name: 'Service categories' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Restore Diagnostics' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/service-category/restore/s1')).toHaveLength(1));
  });
});

describe('Brands', () => {
  it('requires name and code, and upper-cases the code', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/product-brand', reply: { status: true, total_count: 0, result: [] } },
      { method: 'POST', path: '/v1/product-brand', reply: { status: true, result: { id: 'b9' } } },
    ]);
    renderApp(<BrandListPage />, { at: '/stock/brands' });
    await userEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    const dlg = await screen.findByRole('dialog', { name: 'Brand details' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Name is required')).toBeInTheDocument();
    expect(within(dlg).getByText('Code is required')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Name/ }), 'Denso');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Code/ }), 'dns');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/product-brand')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/product-brand')[0].body).toEqual({ store_id: STORE_ID, name: 'Denso', code: 'DNS' });
  });
});

describe('Warehouses', { timeout: 20000 }, () => {
  it('validates phone, building no. and zip like the server', () => {
    expect(validateWarehouse({ phone: '12345', national_address_building_no: '12', national_address_zipcode: '1' })).toEqual({
      phone: 'Invalid phone no.', national_address_building_no: 'Building number must be 4 digits', national_address_zipcode: 'Zip code must be 5 digits',
    });
    expect(validateWarehouse({ phone: '+966501234567', national_address_building_no: '1234', national_address_zipcode: '12345' })).toEqual({});
  });

  it('nests the national address and fills Arabic digits', () => {
    const b = warehouseToBody({ name: 'Jeddah', phone: '0501234567', national_address_building_no: '1234', national_address_zipcode: '23456', national_address_city_name: 'Jeddah', national_address_city_name_arabic: 'جدة', country_code: 'SA' });
    expect(b.national_address).toMatchObject({ building_no: '1234', building_no_arabic: '۱۲۳٤', zipcode: '23456', city_name: 'Jeddah', city_name_arabic: 'جدة' });
    expect(b.phone_in_arabic).toBe('۰۵۰۱۲۳٤۵٦۷');
    expect(b.country_name).toBe('Saudi Arabia');
  });

  it('lists warehouses with transfer stats and has no delete', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/warehouse', reply: { status: true, total_count: 1, result: [{ id: 'w1', code: 'WH1', name: 'Dammam Warehouse', name_in_arabic: 'مستودع الدمام', stock_transfer_sent_count: 2, stock_transfer_sent_quantity: 15, national_address: { city_name: 'Dammam' } }] } },
      { method: 'POST', path: '/v1/warehouse', reply: { status: true, result: { id: 'w2' } } },
    ]);
    renderApp(<WarehouseListPage />, { at: '/stock/warehouses' });
    const table = await screen.findByRole('table', { name: 'Warehouses' });
    expect(await within(table).findByText('Dammam Warehouse')).toBeInTheDocument();
    expect(within(table).getByText('2 · 15')).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New warehouse' }));
    const dlg = await screen.findByRole('dialog', { name: 'New warehouse' });
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Name\*?$/ }), 'Jeddah');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Phone/ }), '123');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Invalid phone no.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/warehouse')).toHaveLength(0);
  });
});

const SERVICES = [{ id: 's1', name: 'Wheel Alignment', service_category_name: 'Tyres', unit: 'hour', duration_minutes: 90, duration_unit: 'minutes', delivery_mode: 'in_store', booking_required: true, product_stores: { [STORE_ID]: { retail_unit_price: 120 } } }];

describe('Services', { timeout: 20000 }, () => {
  it('lists only services with legacy units normalised', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/product', reply: { status: true, total_count: 1, result: SERVICES } }]);
    renderApp(<ServiceListPage />, { at: '/stock/services' });
    const table = await screen.findByRole('table', { name: 'Services' });
    expect(await within(table).findByText('Wheel Alignment')).toBeInTheDocument();
    expect(within(table).getByText('Hour')).toBeInTheDocument();
    expect(within(table).getByText('1h 30m')).toBeInTheDocument();
    expect(within(table).getByText('120.00')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/product')[0].url.searchParams.get('search[is_service]')).toBe('1');
  });

  it('creates a service with is_service and store prices', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/product', reply: { status: true, total_count: 0, result: [] } },
      { method: 'POST', path: '/v1/product', reply: { status: false, result: { id: 's9', name: 'Battery check' } } },
    ]);
    renderApp(<ServiceListPage />, { at: '/stock/services' });
    await userEvent.click(await screen.findByRole('button', { name: 'New service' }));
    const dlg = await screen.findByRole('dialog', { name: 'New service' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Name is required')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Name\*?$/ }), 'Battery check');
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'Retail Incl. VAT' }), '57.5');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/product')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/product')[0].body;
    expect(body).toMatchObject({ store_id: STORE_ID, is_service: true, name: 'Battery check', unit: 'C62', duration_unit: 'minutes' });
    expect(body.product_stores[STORE_ID]).toMatchObject({ retail_unit_price: 50, retail_unit_price_with_vat: 57.5 });
  });

  it('maps a service round-trip and validates', () => {
    const f = serviceFromApi({ ...SERVICES[0], service_category_id: 'sc1', product_stores: { [STORE_ID]: { retail_unit_price: 120, sales_count: 3 } } } as any, STORE_ID);
    expect(f.unit).toBe('HUR');
    expect(f.category).toEqual({ id: 'sc1', label: 'Tyres' });
    const b = serviceToApi(f, STORE_ID, { sales_count: 3 });
    expect(b.product_stores[STORE_ID]).toMatchObject({ sales_count: 3, retail_unit_price: 120 });
    expect(b.service_category_id).toBe('sc1');
    expect(validateService({ ...f, name: 'ab' }).name).toMatch(/min\. 3/);
  });
});
