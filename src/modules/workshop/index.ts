import { lazy } from 'react';
import type { ModuleRoute } from '@/app/routeTypes';
import { registerArabic } from '@/i18n';
import { registerCreate, registerSearch } from '@/shell/commands';
import { api } from '@/api/client';
import { fmtMoney } from '@/lib/format';
import { ar } from './ar';
import { EMPLOYEE, JOB, VEHICLE } from './lib/api';

const veh = () => import('./vehicles');
const jobs = () => import('./jobs');
const brd = () => import('./board');
const emp = () => import('./employees');
const sal = () => import('./salaries');
const dash = () => import('./dashboard');

export const routes: ModuleRoute[] = [
  { path: '/workshop/dashboard', navId: 'automobile_dashboard', component: lazy(() => dash().then((m) => ({ default: m.DashboardPage }))) },
  { path: '/workshop/board', navId: 'repair_jobs_board', component: lazy(() => brd().then((m) => ({ default: m.BoardPage }))) },
  { path: '/workshop/jobs', navId: 'repair_jobs', component: lazy(() => jobs().then((m) => ({ default: m.JobListPage }))) },
  { path: '/workshop/jobs/new', navId: 'repair_jobs', component: lazy(() => jobs().then((m) => ({ default: m.JobEditorPage }))) },
  { path: '/workshop/jobs/:id', navId: 'repair_jobs', component: lazy(() => jobs().then((m) => ({ default: m.JobViewPage }))) },
  { path: '/workshop/jobs/:id/edit', navId: 'repair_jobs', component: lazy(() => jobs().then((m) => ({ default: m.JobEditorPage }))) },
  { path: '/workshop/vehicles', navId: 'vehicles', component: lazy(() => veh().then((m) => ({ default: m.VehicleListPage }))) },
  { path: '/workshop/vehicles/new', navId: 'vehicles', component: lazy(() => veh().then((m) => ({ default: m.VehicleEditorPage }))) },
  { path: '/workshop/vehicles/:id', navId: 'vehicles', component: lazy(() => veh().then((m) => ({ default: m.VehicleViewPage }))) },
  { path: '/workshop/vehicles/:id/edit', navId: 'vehicles', component: lazy(() => veh().then((m) => ({ default: m.VehicleEditorPage }))) },
  { path: '/workshop/employees', navId: 'employees', component: lazy(() => emp().then((m) => ({ default: m.EmployeeListPage }))) },
  { path: '/workshop/employees/new', navId: 'employees', component: lazy(() => emp().then((m) => ({ default: m.EmployeeEditorPage }))) },
  { path: '/workshop/employees/:id', navId: 'employees', component: lazy(() => emp().then((m) => ({ default: m.EmployeeViewPage }))) },
  { path: '/workshop/employees/:id/edit', navId: 'employees', component: lazy(() => emp().then((m) => ({ default: m.EmployeeEditorPage }))) },
  { path: '/workshop/salaries', navId: 'salaries', component: lazy(() => sal().then((m) => ({ default: m.SalaryListPage }))) },
];

/** Ctrl+K: plates look like "ABC 1234" / digits; anything else is a free-text search. */
export async function searchVehiclesCmd(q: string, storeId: string, signal: AbortSignal) {
  const r = await api.get<any[]>(VEHICLE, { search: { store_id: storeId, search: q }, limit: 5, select: 'id,vehicle_number,brand,model,customer_name', sort: '-created_at' }, signal);
  return (r.result || []).map((v) => ({
    id: `vehicle:${v.id}`, label: `${v.vehicle_number || '—'} · ${[v.brand, v.model].filter(Boolean).join(' ')}`, sub: v.customer_name || '', icon: 'car' as const, path: `/workshop/vehicles/${v.id}`, group: 'Vehicles',
  }));
}

export async function searchJobsCmd(q: string, storeId: string, signal: AbortSignal) {
  const r = await api.get<any[]>(JOB, { search: { store_id: storeId, search: q }, limit: 5, select: 'id,job_number,title,vehicle_number,customer_name,total_with_vat', sort: '-created_at' }, signal);
  return (r.result || []).map((j) => ({
    id: `repair_job:${j.id}`, label: `${j.job_number} · ${j.title || ''}`, sub: [j.vehicle_number, j.customer_name, j.total_with_vat ? fmtMoney(j.total_with_vat) : ''].filter(Boolean).join(' · '), icon: 'wrench' as const, path: `/workshop/jobs/${j.id}`, group: 'Repair Jobs',
  }));
}

export async function searchEmployeesCmd(q: string, storeId: string, signal: AbortSignal) {
  const r = await api.get<any[]>(EMPLOYEE, { search: { store_id: storeId, search: q }, limit: 5, select: 'id,name,position,mob1' }, signal);
  return (r.result || []).map((e) => ({ id: `employee:${e.id}`, label: e.name, sub: [e.position, e.mob1].filter(Boolean).join(' · '), icon: 'badge' as const, path: `/workshop/employees/${e.id}`, group: 'Employees' }));
}

export function setup() {
  registerArabic(ar);
  registerCreate({ label: 'New Repair Job', path: '/workshop/jobs/new', icon: 'wrench', resource: 'repair_jobs', navId: 'repair_jobs' });
  registerCreate({ label: 'New vehicle', path: '/workshop/vehicles/new', icon: 'car', resource: 'vehicles', navId: 'vehicles' });
  registerCreate({ label: 'New employee', path: '/workshop/employees/new', icon: 'badge', resource: 'employees', navId: 'employees' });
  registerSearch({ id: 'vehicles', group: 'Vehicles', resource: 'vehicles', search: searchVehiclesCmd });
  registerSearch({ id: 'repair_jobs', group: 'Repair Jobs', resource: 'repair_jobs', search: searchJobsCmd });
  registerSearch({ id: 'employees', group: 'Employees', resource: 'employees', search: searchEmployeesCmd });
}
