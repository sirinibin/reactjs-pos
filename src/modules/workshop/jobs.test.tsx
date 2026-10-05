import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { JobEditorPage, JobListPage, JobViewPage } from './jobs';
import { PREFILL_KEY } from './lib/jobCalc';

// Heavy user-event flows; keep headroom when the suite runs on a busy machine.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const JOBS = [
  { id: 'j1', job_number: 'RJ-1', title: 'Engine oil & filter change', date: '2026-09-23T18:00:00Z', customer_id: 'c1', customer_name: 'Ahmed Al-Qahtani', vehicle_id: 'v1', vehicle_number: 'ABC 1234', brand: 'Toyota', model: 'Camry', km: 85000, technician_name: 'Ramesh Kumar', labour_charge: 50, parts_total: 100, total: 150, total_with_vat: 165, status: 'completed', estimated_delivery: '2026-09-24T18:00:00Z', order_id: 'o1', order_code: 'S-INV-000010', order_net_total: 165 },
  { id: 'j2', job_number: 'RJ-2', title: 'Front brake pads', date: '2026-10-03T18:00:00Z', customer_name: 'Mohammed', vehicle_number: 'DEF 5678', status: 'in_progress', total_with_vat: 292.5 },
];
const FULL = { ...JOBS[1], id: 'j2', customer_id: 'c2', vehicle_id: 'v2', brand: 'Toyota', model: 'Hilux', km: 140000, labour_charge: 120, vat_percent: 15, parts: [{ product_id: 'p9', part_number: 'BP-F', name: 'Front Brake Pads Set', qty: 1, purchase_unit_price: 80, unit_price: 150, unit_price_with_vat: 172.5, unit_discount: 0, unit_discount_with_vat: 0, total_price: 150, total_price_with_vat: 172.5 }], technician_ids: ['e1'], technician_names: ['Arun Nair'] };

describe('Repair job list', () => {
  it('loads jobs with the legacy projection, timezone offset and link chips', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/repair-job', reply: { status: true, total_count: 2, result: JOBS } }]);
    renderApp(<JobListPage />, { at: '/workshop/jobs' });
    const table = await screen.findByRole('table', { name: 'Repair Jobs' });
    expect(await within(table).findByText('Engine oil & filter change')).toBeInTheDocument();
    expect(within(table).getByText('S-INV-000010')).toBeInTheDocument();
    expect(within(table).getByText('165.00')).toBeInTheDocument();
    expect(within(table).getByText('Completed')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/repair-job');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[timezone_offset]')).toBe(String(new Date().getTimezoneOffset() / 60));
    expect(c.url.searchParams.get('select')).toContain('non_vat_sales_code');
  });

  it('archived view sends search[archived]=1 and status filter is exact', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/repair-job', reply: { status: true, total_count: 2, result: JOBS } }]);
    renderApp(<JobListPage />, { at: '/workshop/jobs?f.status=in_progress' });
    await screen.findAllByText('RJ-1');
    expect(calls(f, 'GET', '/v1/repair-job')[0].url.searchParams.get('search[status]')).toBe('in_progress');
    await userEvent.click(screen.getByRole('tab', { name: /^Archived/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/repair-job').some((c) => c.url.searchParams.get('search[archived]') === '1')).toBe(true));
  });

  it('shows an error state with retry', async () => {
    mockApi([{ method: 'GET', path: '/v1/repair-job', status: 500, reply: { status: false, errors: { find: 'db down' } } }]);
    renderApp(<JobListPage />, { at: '/workshop/jobs' });
    expect(await screen.findByText(/db down/)).toBeInTheDocument();
  });
});

describe('Repair job editor', () => {
  const PRODUCT = { id: 'p1', name: 'Oil Filter', part_number: 'OF-1', product_stores: { [STORE_ID]: { retail_unit_price: 25, retail_unit_price_with_vat: 28.75, purchase_unit_price: 12, stock: 60 } } };
  const mocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [{ id: 'c1', name: 'Ahmed Al-Qahtani' }] } },
    { method: 'GET', path: '/v1/vehicle', reply: { status: true, result: [{ id: 'v1', vehicle_number: 'RSJ 4821', brand: 'Toyota', model: 'Camry', customer_id: 'c1', customer_name: 'Ahmed Al-Qahtani', current_km: 85000 }] } },
    { method: 'GET', path: '/v1/employee', reply: { status: true, result: [{ id: 'e1', name: 'Ramesh Kumar', position: 'Technician' }] } },
    { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
  ]);

  it('requires a title', async () => {
    const f = mocks();
    renderApp(<JobEditorPage />, { at: '/workshop/jobs/new', path: '/workshop/jobs/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/repair-job')).toHaveLength(0);
  });

  it('creates a job: vehicle sets its owner + km, technicians, parts and VAT-inclusive labour', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/repair-job', reply: { status: true, result: { id: 'nj', job_number: 'RJ-11' } } }]);
    renderApp(<JobEditorPage />, { at: '/workshop/jobs/new', path: '/workshop/jobs/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: /^Title/ }), 'AC repair');
    await userEvent.type(screen.getByRole('combobox', { name: /^Vehicle/ }), 'rsj');
    await userEvent.click(await screen.findByRole('option', { name: /RSJ 4821/ }));
    expect(screen.getByRole('combobox', { name: /^Customer/ })).toHaveValue('Ahmed Al-Qahtani');
    expect(screen.getByRole('textbox', { name: /^KM/ })).toHaveValue('85000');
    await userEvent.type(screen.getByRole('combobox', { name: /^Technicians/ }), 'ram');
    await userEvent.click(await screen.findByRole('option', { name: /Ramesh Kumar/ }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Search products or services to add...' }), 'filter');
    await userEvent.click(await screen.findByRole('option', { name: /Oil Filter/ }));
    const parts = await screen.findByRole('table', { name: 'Parts' });
    const qty = within(parts).getByRole('textbox', { name: 'Qty' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '2{Enter}');
    const labour = screen.getByRole('textbox', { name: 'Labour Charge' });
    await userEvent.clear(labour);
    await userEvent.type(labour, '115{Enter}');
    // parts 50 + labour 100 excl → 150 + 22.50 VAT
    expect((await screen.findAllByText('172.50')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/repair-job')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/repair-job')[0].body;
    expect(body).toMatchObject({
      store_id: STORE_ID, title: 'AC repair', status: 'todo', customer_id: 'c1', vehicle_id: 'v1', vehicle_number: 'RSJ 4821', km: 85000,
      technician_id: 'e1', technician_name: 'Ramesh Kumar', technician_ids: ['e1'], technician_names: ['Ramesh Kumar'],
      labour_charge: 115, vat_percent: 15, parts_total: 50, parts_total_with_vat: 57.5, total: 165, total_with_vat: 172.5, estimated_delivery: null,
    });
    expect(body.parts).toEqual([expect.objectContaining({ product_id: 'p1', name: 'Oil Filter', qty: 2, unit_price: 25, unit_price_with_vat: 28.75, total_price: 50, total_price_with_vat: 57.5, purchase_unit_price: 12 })]);
    expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_map')!)).toEqual({ nj: 'todo' });
  });

  it('edit loads the job and PUTs; clearing technicians sends null (not "")', async () => {
    const f = mocks([
      { method: 'GET', path: '/v1/repair-job/j2', reply: { status: true, result: FULL } },
      { method: 'PUT', path: '/v1/repair-job/j2', reply: { status: true, result: { id: 'j2' } } },
    ]);
    renderApp(<JobEditorPage />, { at: '/workshop/jobs/j2/edit', path: '/workshop/jobs/:id/edit' });
    expect(await screen.findByDisplayValue('Front brake pads')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Arun Nair' }));
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j2')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/repair-job/j2')[0].body).toMatchObject({ technician_id: null, technician_ids: [], status: 'in_progress', date: FULL.date, total_with_vat: 292.5 });
  });
});

describe('Repair job view', () => {
  it('creates a sales-invoice prefill (labour product looked up) and opens the sales editor', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/repair-job/j2', reply: { status: true, result: FULL } },
      { method: 'GET', path: '/v1/product', reply: { status: true, result: [{ id: 'lab', name: 'Labour Charge' }] } },
    ]);
    renderApp(<JobViewPage />, { at: '/workshop/jobs/j2', path: '/workshop/jobs/:id', extraRoutes: <Route path="/sales/invoices/new" element={<div data-testid="sales-new" />} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'Create Sales Invoice' }));
    expect(await screen.findByTestId('sales-new')).toBeInTheDocument();
    const lab = calls(f, 'GET', '/v1/product')[0].url.searchParams;
    expect(lab.get('search[name]')).toBe('Labour Charge');
    expect(lab.get('search[is_service]')).toBe('1');
    const pre = JSON.parse(sessionStorage.getItem(PREFILL_KEY)!);
    expect(pre).toMatchObject({ customer_id: 'c2', customer_name: 'Mohammed', vehicle_id: 'v2', km_driven: 140000, repair_job_ids: ['j2'] });
    expect(pre.products).toEqual([
      expect.objectContaining({ product_id: 'p9', quantity: 1, unit_price: 150, unit_price_with_vat: 172.5 }),
      expect.objectContaining({ product_id: 'lab', name: 'Labour Charge', unit_price_with_vat: 120, unit_price: 104.3478 }),
    ]);
  });

  it('creates the Labour Charge product when missing', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/repair-job/j2', reply: { status: true, result: FULL } },
      { method: 'GET', path: '/v1/product', reply: { status: true, result: [{ id: 'x', name: 'Labour Charge Extra' }] } },
      { method: 'POST', path: '/v1/product', reply: { status: false, result: { id: 'newlab' } } },
    ]);
    renderApp(<JobViewPage />, { at: '/workshop/jobs/j2', path: '/workshop/jobs/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Create Sales Invoice' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/product')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/product')[0].body).toEqual({ name: 'Labour Charge', is_service: true, store_id: STORE_ID });
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem(PREFILL_KEY)!).products[1].product_id).toBe('newlab'));
  });

  it('linked jobs show the invoice instead of the create action; archive asks first', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/repair-job/j1', reply: { status: true, result: { ...JOBS[0], parts: [] } } },
      { method: 'PUT', path: '/v1/repair-job/j1', reply: { status: true, result: { id: 'j1' } } },
    ]);
    renderApp(<JobViewPage />, { at: '/workshop/jobs/j1', path: '/workshop/jobs/:id' });
    expect(await screen.findByRole('button', { name: 'S-INV-000010' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Sales Invoice' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    const dlg = await screen.findByRole('dialog', { name: 'Archive this repair job?' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/repair-job/j1')[0].body).toEqual({ archived: true });
  });
});
