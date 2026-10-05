import { api } from '@/api/client';
import type { PickerOption } from '@/ui/AsyncPicker';
import { buildInvoicePrefill, LABOUR_NAME, PREFILL_KEY, type FullJob, type InvoicePrefill } from './jobCalc';

export const VEHICLE = '/v1/vehicle';
export const JOB = '/v1/repair-job';
export const EMPLOYEE = '/v1/employee';
export const SALARY = '/v1/employee-salary-payment';
export const DASHBOARD = '/v1/automobile/dashboard';

export interface Vehicle {
  id: string; customer_id?: string; customer_name?: string; customer_name_arabic?: string; vehicle_number?: string; chassis_number?: string;
  brand?: string; model?: string; variant?: string; year?: number; engine_number?: string; current_km?: number; istimara_no?: string; color?: string; remarks?: string; created_at?: string;
}
export interface Employee {
  id: string; code?: string; name: string; name_in_arabic?: string; position?: string; mob1?: string; mob2?: string; iqama_no?: string; address?: string;
  salary?: number; salary_day?: number; joining_date?: string; opening_balance?: number; opening_balance_date?: string | null; opening_balance_posted?: boolean;
  opening_balance_type?: string; is_active?: boolean; account?: { id?: string; name?: string; type?: string; balance?: number } | null; created_at?: string; created_by_name?: string;
}

export const vehicleLabel = (v: Partial<Vehicle>) => [v.vehicle_number, [v.brand, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' — ');

export async function searchVehicles(storeId: string, q: string, signal?: AbortSignal, customerId?: string | null, limit = 20): Promise<Vehicle[]> {
  const r = await api.get<Vehicle[]>(VEHICLE, { search: { store_id: storeId, search: q || undefined, customer_id: customerId || undefined }, limit, sort: '-created_at', select: 'id,vehicle_number,chassis_number,istimara_no,brand,model,variant,year,color,current_km,customer_id,customer_name' }, signal);
  return r.result || [];
}
export const vehicleToOption = (v: Vehicle): PickerOption<Vehicle> => ({
  id: v.id, label: vehicleLabel(v) || v.id, sub: [v.customer_name, v.chassis_number && `VIN ${v.chassis_number}`].filter(Boolean).join(' · '), data: v,
});

export async function searchEmployees(storeId: string, q: string, signal?: AbortSignal, limit = 20): Promise<Employee[]> {
  const r = await api.get<Employee[]>(EMPLOYEE, { search: { store_id: storeId, search: q || undefined }, limit, page: 1, select: 'id,name,position,salary,salary_day,account' }, signal);
  return r.result || [];
}
export const employeeToOption = (e: Employee): PickerOption<Employee> => ({ id: e.id, label: e.name, sub: e.position || '', data: e });

export interface Brand { brand: string; models: string[] }
let brandsCache: Promise<Brand[]> | null = null;
export function loadBrands(): Promise<Brand[]> {
  if (!brandsCache) brandsCache = api.get<Brand[]>(`${VEHICLE}/brands`).then((r) => r.result || []).catch((e) => { brandsCache = null; throw e; });
  return brandsCache;
}

/** Find the "Labour Charge" service product (exact name, case-insensitive) or create it. */
export async function ensureLabourProduct(storeId: string): Promise<string | null> {
  const r = await api.get<{ id: string; name: string }[]>('/v1/product', { search: { store_id: storeId, name: LABOUR_NAME, is_service: 1 }, limit: 10, select: 'id,name' });
  const hit = (r.result || []).find((p) => p.name.trim().toLowerCase() === LABOUR_NAME.toLowerCase());
  if (hit) return hit.id;
  const c = await api.post<{ id: string }>('/v1/product', { name: LABOUR_NAME, is_service: true, store_id: storeId }, { search: { store_id: storeId } });
  return c.result?.id || null;
}

/**
 * Build the sales-invoice prefill for the given jobs, stash it in sessionStorage
 * (`workshop_invoice_prefill`) and return it. The sales editor at /sales/invoices/new consumes it.
 */
export async function prepareInvoiceFromJobs(storeId: string, jobIds: string[], vat: number, customer?: { id: string; name: string } | null): Promise<InvoicePrefill> {
  const jobs = await Promise.all(jobIds.map(async (id) => (await api.get<FullJob>(`${JOB}/${id}`, { search: { store_id: storeId } })).result as FullJob));
  const needsLabour = jobs.some((j) => (Number(j.labour_charge) || 0) > 0);
  const labourId = needsLabour ? await ensureLabourProduct(storeId) : null;
  const prefill = buildInvoicePrefill(jobs, vat, labourId, customer);
  if (prefill.customer_id && !prefill.customer_name) {
    // GET /v1/repair-job/{id} does not back-fill customer_name (only the list does).
    const c = await api.get<{ name: string }>(`/v1/customer/${prefill.customer_id}`, { search: { store_id: storeId }, select: 'id,name' }).catch(() => null);
    prefill.customer_name = c?.result?.name || '';
  }
  sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
  return prefill;
}
