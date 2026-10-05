import { describe, expect, it } from 'vitest';
import { calls, mockApi, STORE_ID } from '@/test/utils';
import { getCreates, getProviders } from '@/shell/commands';
import i18n from '@/i18n';
import { routes, searchJobsCmd, searchVehiclesCmd, setup } from './index';

describe('workshop module registration', () => {
  it('declares every assigned route with its nav id', () => {
    const m = Object.fromEntries(routes.map((r) => [r.path, r.navId]));
    expect(m).toMatchObject({
      '/workshop/dashboard': 'automobile_dashboard', '/workshop/board': 'repair_jobs_board', '/workshop/jobs': 'repair_jobs', '/workshop/jobs/new': 'repair_jobs',
      '/workshop/jobs/:id': 'repair_jobs', '/workshop/jobs/:id/edit': 'repair_jobs', '/workshop/vehicles': 'vehicles', '/workshop/vehicles/:id/edit': 'vehicles',
      '/workshop/employees': 'employees', '/workshop/employees/new': 'employees', '/workshop/employees/:id/edit': 'employees', '/workshop/salaries': 'salaries',
    });
  });

  it('registers Ctrl+K search, create actions and Arabic strings', () => {
    setup();
    expect(getProviders().map((p) => p.id)).toEqual(expect.arrayContaining(['vehicles', 'repair_jobs', 'employees']));
    expect(getCreates().map((c) => c.path)).toEqual(expect.arrayContaining(['/workshop/jobs/new', '/workshop/vehicles/new', '/workshop/employees/new']));
    expect(i18n.getResource('ar', 'translation', 'Repair Jobs Board')).toBe('لوح مهام الإصلاح');
    expect(i18n.getResource('ar', 'translation', 'Pay Salary')).toBe('صرف الراتب');
  });

  it('vehicle search hits by plate and links to the vehicle', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/vehicle', reply: { status: true, result: [{ id: 'v1', vehicle_number: 'RSJ 4821', brand: 'Toyota', model: 'Camry', customer_name: 'Ahmed' }] } }]);
    const hits = await searchVehiclesCmd('4821', STORE_ID, new AbortController().signal);
    expect(hits).toEqual([expect.objectContaining({ label: 'RSJ 4821 · Toyota Camry', sub: 'Ahmed', path: '/workshop/vehicles/v1', group: 'Vehicles' })]);
    expect(calls(f, 'GET', '/v1/vehicle')[0].url.searchParams.get('search[search]')).toBe('4821');
  });

  it('job search links to the job card', async () => {
    mockApi([{ method: 'GET', path: '/v1/repair-job', reply: { status: true, result: [{ id: 'j1', job_number: 'RJ-1', title: 'Oil', vehicle_number: 'X', total_with_vat: 165 }] } }]);
    const hits = await searchJobsCmd('RJ-1', STORE_ID, new AbortController().signal);
    expect(hits[0]).toMatchObject({ label: 'RJ-1 · Oil', path: '/workshop/jobs/j1', sub: 'X · 165.00' });
  });
});
