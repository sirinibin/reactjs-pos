import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_USER } from '@/test/utils';
import { VehicleEditorPage, VehicleListPage, VehicleViewPage } from './vehicles';

// Heavy user-event flows; keep headroom when the suite runs on a busy machine.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const VEHICLES = [
  { id: 'v1', customer_id: 'c1', customer_name: 'Ahmed Al-Qahtani', vehicle_number: 'RSJ 4821', brand: 'Toyota', model: 'Camry', variant: 'GLX', year: 2020, istimara_no: 'IST-1', chassis_number: 'JTNB11', current_km: 85000, color: 'White', created_at: '2026-10-01T10:00:00Z' },
  { id: 'v2', customer_id: 'c2', customer_name: 'Mohammed', vehicle_number: 'DEF 5678', brand: 'Toyota', model: 'Hilux', year: 2019, current_km: 0 },
];
const BRANDS = [{ brand: 'Toyota', models: ['Camry', 'Hilux'] }, { brand: 'Nissan', models: ['Patrol'] }];
const CUSTOMER = { id: 'c1', name: 'Ahmed Al-Qahtani', code: 'C-1', phone: '0501', credit_balance: 120 };

describe('Vehicle list', () => {
  it('loads store-scoped vehicles with the legacy projection and newest first', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/vehicle', reply: { status: true, total_count: 2, result: VEHICLES } }]);
    renderApp(<VehicleListPage />, { at: '/workshop/vehicles' });
    const table = await screen.findByRole('table', { name: 'Vehicles' });
    expect(await within(table).findByText('Ahmed Al-Qahtani')).toBeInTheDocument();
    expect(within(table).getByText('85,000')).toBeInTheDocument();
    expect(within(table).getAllByText('ر س ح').length).toBe(1); // Saudi plate badge
    const [c] = calls(f, 'GET', '/v1/vehicle');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
    expect(c.url.searchParams.get('select')).toContain('istimara_no');
  });

  it('free-text search goes to search[search]', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/vehicle', reply: { status: true, total_count: 2, result: VEHICLES } }]);
    renderApp(<VehicleListPage />, { at: '/workshop/vehicles' });
    await screen.findAllByText('Ahmed Al-Qahtani');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'camry');
    await waitFor(() => expect(calls(f, 'GET', '/v1/vehicle').some((c) => c.url.searchParams.get('search[search]') === 'camry')).toBe(true), { timeout: 2000 });
  });

  it('shows the empty state', async () => {
    mockApi([{ method: 'GET', path: '/v1/vehicle', reply: { status: true, total_count: 0, result: [] } }]);
    renderApp(<VehicleListPage />, { at: '/workshop/vehicles' });
    expect((await screen.findAllByText('No Vehicles to display')).length).toBeGreaterThan(0);
  });

  it('hides Create/Edit without permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/vehicle', reply: { status: true, total_count: 2, result: VEHICLES } },
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'vehicles', read: true, create: false, update: false, delete: false }] } },
    ], { user: { ...TEST_USER, admin: false, role: 'User' }, store: { id: STORE_ID, name: 'S', settings: { enable_rbac_module: true, enable_automobile_module: true } } });
    renderApp(<VehicleListPage />, { at: '/workshop/vehicles' });
    await screen.findAllByText('Ahmed Al-Qahtani');
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: 'Edit' })).toHaveLength(0);
  });
});

describe('Vehicle editor', () => {
  const mocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/vehicle/brands', reply: { status: true, result: BRANDS } },
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [CUSTOMER] } },
    { method: 'GET', path: '/v1/customer/c1', reply: { status: true, result: CUSTOMER } },
    { method: 'GET', path: '/v1/vehicle', reply: { status: true, result: [VEHICLES[0]] } },
  ]);

  it('validates customer first, then plate, without calling the API', async () => {
    const f = mocks();
    renderApp(<VehicleEditorPage />, { at: '/workshop/vehicles/new', path: '/workshop/vehicles/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Customer is required')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: /Customer/ }), 'ahmed');
    await userEvent.click(await screen.findByRole('option', { name: /Ahmed Al-Qahtani/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Vehicle number is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/vehicle')).toHaveLength(0);
  });

  it('creates a vehicle with brand/model from the brands API and posts the exact body', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/vehicle', reply: { status: true, result: { id: 'new1' } } }]);
    renderApp(<VehicleEditorPage />, { at: '/workshop/vehicles/new', path: '/workshop/vehicles/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: /Customer/ }), 'ahmed');
    await userEvent.click(await screen.findByRole('option', { name: /Ahmed Al-Qahtani/ }));
    const model = screen.getByRole('combobox', { name: /^Model/ });
    expect(model).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Toyota' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^Brand/ }), 'Toyota');
    await userEvent.selectOptions(model, 'Hilux');
    await userEvent.type(screen.getByRole('textbox', { name: /Vehicle Number/ }), 'RSJ 4821');
    await userEvent.type(screen.getByRole('textbox', { name: /Manufacture Year/ }), '20x21');
    await userEvent.type(screen.getByRole('textbox', { name: /Current KM/ }), '1,500');
    expect(await screen.findByText('Vehicles (1)')).toBeInTheDocument();
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/vehicle')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/vehicle');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toEqual({ store_id: STORE_ID, customer_id: 'c1', vehicle_number: 'RSJ 4821', brand: 'Toyota', model: 'Hilux', variant: '', year: 2021, istimara_no: '', chassis_number: '', engine_number: '', color: '', remarks: '', current_km: 1500 });
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });

  it('edit: PUTs without current_km (server ignores it) and maps server errors', async () => {
    const f = mocks([
      { method: 'GET', path: '/v1/vehicle/v1', reply: { status: true, result: VEHICLES[0] } },
      { method: 'PUT', path: '/v1/vehicle/v1', status: 400, reply: { status: false, errors: { brand: 'Brand is required', foo: 'Something odd' } } },
    ]);
    renderApp(<VehicleEditorPage />, { at: '/workshop/vehicles/v1/edit', path: '/workshop/vehicles/:id/edit' });
    expect(await screen.findByDisplayValue('RSJ 4821')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Current KM/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /^Save changes Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/vehicle/v1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/vehicle/v1')[0].body).not.toHaveProperty('current_km');
    expect(await screen.findByText('Brand is required')).toBeInTheDocument();
    expect(screen.getByText(/Something odd/)).toBeInTheDocument();
  });
});

describe('Vehicle view', () => {
  it('shows details and lazily loads repair history by vehicle', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vehicle/v1', reply: { status: true, result: VEHICLES[0] } },
      { method: 'GET', path: '/v1/repair-job', reply: { status: true, result: [{ id: 'j1', job_number: 'RJ-1', title: 'Oil change', date: '2026-10-01T00:00:00Z', status: 'completed', total_with_vat: 165, km: 85000, order_id: 'o1', order_code: 'S-INV-1' }] } },
    ]);
    renderApp(<VehicleViewPage />, { at: '/workshop/vehicles/v1', path: '/workshop/vehicles/:id' });
    expect(await screen.findByRole('heading', { name: /Toyota Camry/ })).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/repair-job')).toHaveLength(0);
    await userEvent.click(screen.getByRole('tab', { name: /Repair Jobs/ }));
    expect(await screen.findByText('Oil change')).toBeInTheDocument();
    expect(screen.getByText('S-INV-1')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/repair-job')[0].url.searchParams.get('search[vehicle_id]')).toBe('v1');
  });
});
