import { beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError } from '../../src/api/client';
import { computeTotals, linesFromApi, linesToApi } from '../../src/framework/doc/calc';
import { buildInvoicePrefill, computeSummary, makePart, serverTotals } from '../../src/modules/workshop/lib/jobCalc';
import { rangeParams, toRange, trendSeries } from '../../src/modules/workshop/lib/dashboard';
import { loadSeed, signIn, S, type Seed } from './helpers';

let seed: Seed;
const tag = `WS${Date.now().toString(36).toUpperCase()}`;
const fails = (p: Promise<unknown>, field: string) => expect(p).rejects.toSatisfy((e: unknown) => e instanceof ApiError && field in e.errors);
const iso = () => {
  const d = new Date();
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};

beforeAll(async () => {
  seed = loadSeed();
  await signIn();
});

describe('vehicles — live API', () => {
  let vid = '';
  it('brands list is static and needs no store', async () => {
    const r = await api.get<{ brand: string; models: string[] }[]>('/v1/vehicle/brands');
    expect(r.result!.length).toBeGreaterThanOrEqual(30);
    expect(r.result!.find((b) => b.brand === 'Toyota')!.models).toContain('Camry');
  });

  it('requires store_id even on list', async () => {
    await fails(api.get('/v1/vehicle', { limit: 1 }), 'store_id');
  });

  it('validates brand, model and customer on create', async () => {
    await expect(api.post('/v1/vehicle', { store_id: seed.storeId, vehicle_number: tag }, S(seed.storeId))).rejects.toSatisfy((e: unknown) => e instanceof ApiError && 'brand' in e.errors && 'model' in e.errors && 'customer_id' in e.errors);
  });

  it('creates, reads, searches and updates (customer_name is server-owned, current_km ignored on PUT)', async () => {
    const c = seed.customers[1];
    const r = await api.post<any>('/v1/vehicle', { store_id: seed.storeId, customer_id: c.id, customer_name: 'spoofed', vehicle_number: `${tag} 4821`, brand: 'Toyota', model: 'Camry', year: 2021, current_km: 1500, istimara_no: `IST-${tag}` }, S(seed.storeId));
    vid = r.result.id;
    expect(r.result.customer_name).toBe(c.name);
    const one = await api.get<any>(`/v1/vehicle/${vid}`, S(seed.storeId));
    expect(one.result).toMatchObject({ vehicle_number: `${tag} 4821`, current_km: 1500, year: 2021 });
    const hit = await api.get<any[]>('/v1/vehicle', { search: { store_id: seed.storeId, search: tag }, select: 'id,vehicle_number' });
    expect(hit.result!.map((v) => v.id)).toContain(vid);
    const byCust = await api.get<any[]>('/v1/vehicle', { search: { store_id: seed.storeId, customer_id: c.id }, limit: 200, select: 'id,customer_id' });
    expect(byCust.result!.every((v) => v.customer_id === c.id)).toBe(true);
    await api.put(`/v1/vehicle/${vid}`, { customer_id: c.id, color: 'Pearl', current_km: 99999 }, S(seed.storeId));
    const after = await api.get<any>(`/v1/vehicle/${vid}`, S(seed.storeId));
    expect(after.result).toMatchObject({ color: 'Pearl', current_km: 1500, brand: 'Toyota', model: 'Camry' });
  });

  it('PUT still requires customer_id', async () => {
    await fails(api.put(`/v1/vehicle/${vid}`, { customer_id: null }, S(seed.storeId)), 'customer_id');
  });
});

describe('repair jobs — live API', () => {
  let vehicle: any;
  let job: any;
  beforeAll(async () => {
    const c = seed.customers[0];
    vehicle = (await api.post<any>('/v1/vehicle', { store_id: seed.storeId, customer_id: c.id, vehicle_number: `${tag} 7740`, brand: 'Nissan', model: 'Patrol' }, S(seed.storeId))).result;
  });

  it('title is required', async () => {
    await fails(api.post('/v1/repair-job', { title: '' }, S(seed.storeId)), 'title');
  });

  it('creates with RJ-n number, default status open, vehicle owner wins, totals match our summary when vat_percent is sent', async () => {
    const p = seed.products[0];
    const parts = [makePart({ product_id: p.id, name: p.name, unit_price: 185, qty: 2, purchase_unit_price: 120 }, 15), makePart({ name: 'Shop supplies', unit_price: 9.99, unit_price_with_vat: 11.49, qty: 3 }, 15)];
    const s = computeSummary(parts, 115, 15);
    const r = await api.post<any>('/v1/repair-job', {
      title: `${tag} engine warning light`, customer_id: seed.customers[1].id, vehicle_id: vehicle.id, labour_charge: 115, vat_percent: 15, parts, km: 120500,
      estimated_delivery: new Date(Date.now() - 2 * 86400000).toISOString(),
    }, S(seed.storeId));
    job = r.result;
    expect(job.job_number).toMatch(/^RJ-\d+$/);
    expect(job.status).toBe('open');
    expect(job.customer_id).toBe(seed.customers[0].id); // vehicle's owner overrides the chosen customer
    expect(job).toMatchObject({ vehicle_number: `${tag} 7740`, brand: 'Nissan', model: 'Patrol' });
    expect(job.total_with_vat).toBe(s.totalIncl);
    expect(job.parts_total).toBeCloseTo(s.partsExcl, 2);
    expect(serverTotals({ parts, labour_charge: 115, vat_percent: 15 }).total_with_vat).toBe(job.total_with_vat);
  });

  it('quirk: GET by id does not resolve customer_name from customer_id (list back-fills it), so the UI sends it', async () => {
    const c = seed.customers[1];
    const r = await api.post<any>('/v1/repair-job', { title: `${tag} name check`, customer_id: c.id }, S(seed.storeId));
    expect((await api.get<any>(`/v1/repair-job/${r.result.id}`, S(seed.storeId))).result.customer_name || '').toBe('');
    const listed = await api.get<any[]>('/v1/repair-job', { search: { store_id: seed.storeId, customer_id: c.id }, sort: '-created_at', limit: 5, select: 'id,customer_id,customer_name' });
    expect(listed.result!.find((j) => j.id === r.result.id)!.customer_name).toBe(c.name);
    const named = await api.post<any>('/v1/repair-job', { title: `${tag} name sent`, customer_id: c.id, customer_name: c.name }, S(seed.storeId));
    expect((await api.get<any>(`/v1/repair-job/${named.result.id}`, S(seed.storeId))).result.customer_name).toBe(c.name);
  });

  it('a job with no customer is assigned the UNKNOWN customer', async () => {
    const r = await api.post<any>('/v1/repair-job', { title: `${tag} walk-in` }, S(seed.storeId));
    expect(r.result.customer_name).toBe('UNKNOWN');
  });

  it('board status writes are partial merges (closed/open keep everything else)', async () => {
    await api.put(`/v1/repair-job/${job.id}`, { status: 'closed' }, S(seed.storeId));
    const a = (await api.get<any>(`/v1/repair-job/${job.id}`, S(seed.storeId))).result;
    expect(a).toMatchObject({ status: 'closed', title: job.title, labour_charge: 115, total_with_vat: job.total_with_vat });
    expect(a.parts).toHaveLength(2);
    await api.put(`/v1/repair-job/${job.id}`, { status: 'open' }, S(seed.storeId));
    expect((await api.get<any>(`/v1/repair-job/${job.id}`, S(seed.storeId))).result.status).toBe('open');
  });

  it('list filters: search, vehicle, status, archived', async () => {
    const q = (search: Record<string, any>) => api.get<any[]>('/v1/repair-job', { search: { store_id: seed.storeId, ...search }, limit: 100, select: 'id,status,archived,vehicle_id' });
    expect((await q({ search: tag })).result!.map((j) => j.id)).toContain(job.id);
    expect((await q({ vehicle_id: vehicle.id })).result!.map((j) => j.id)).toEqual([job.id]);
    expect((await q({ status: 'open', search: tag })).result!.every((j) => j.status === 'open')).toBe(true);
    await api.put(`/v1/repair-job/${job.id}`, { archived: true }, S(seed.storeId));
    expect((await q({ vehicle_id: vehicle.id })).result).toEqual([]);
    expect((await q({ vehicle_id: vehicle.id, archived: 1 })).result!.map((j) => j.id)).toEqual([job.id]);
    await api.put(`/v1/repair-job/${job.id}`, { archived: false }, S(seed.storeId));
  });

  it('estimated-delivery range filter uses the API date format', async () => {
    const d = new Date(Date.now() - 2 * 86400000);
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    const day = `${mon} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
    const r = await api.get<any[]>('/v1/repair-job', { search: { store_id: seed.storeId, estimated_delivery_from: day, estimated_delivery_to: day, timezone_offset: new Date().getTimezoneOffset() / 60 }, limit: 200, select: 'id' });
    expect(r.result!.map((j) => j.id)).toContain(job.id);
  });

  it('invoice prefill → sales invoice with repair_job_ids links the job back (order_id/order_code)', async () => {
    const full = (await api.get<any>(`/v1/repair-job/${job.id}`, S(seed.storeId))).result;
    const lab = (await api.get<any[]>('/v1/product', { search: { store_id: seed.storeId, name: 'Labour Charge', is_service: 1 }, limit: 10, select: 'id,name' })).result!.find((p) => p.name.toLowerCase() === 'labour charge');
    expect(lab, 'seeded Labour Charge service').toBeTruthy();
    const pre = buildInvoicePrefill([full], 15, lab!.id);
    expect(pre.products.at(-1)).toMatchObject({ name: 'Labour Charge', unit_price_with_vat: 115, unit_price: 100 });
    // What the sales editor would do with the prefill:
    const lines = linesFromApi(pre.products.filter((p) => p.product_id), 15);
    const t = computeTotals({ lines, vat_percent: 15, auto_rounding_amount: true });
    const order = await api.post<any>('/v1/order', {
      store_id: seed.storeId, date_str: iso(), customer_id: pre.customer_id, vat_percent: 15, products: linesToApi(lines), auto_rounding_amount: true,
      discount: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: [], vehicle_id: pre.vehicle_id, km_driven: pre.km_driven, repair_job_ids: pre.repair_job_ids,
    }, S(seed.storeId));
    expect(order.result.net_total).toBe(t.net_total);
    expect(order.result.vehicle_snapshot).toMatchObject({ vehicle_number: `${tag} 7740`, brand: 'Nissan' });
    const linked = (await api.get<any>(`/v1/repair-job/${job.id}`, S(seed.storeId))).result;
    expect(linked).toMatchObject({ order_id: order.result.id, order_code: order.result.code });
  });
});

describe('employees & salaries — live API', () => {
  let emp: any;
  it('validates the employee form server-side', async () => {
    await expect(api.post('/v1/employee', { name: '', salary: -1, salary_day: 31, opening_balance: 10, opening_balance_type: 'x' }, S(seed.storeId)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && ['name', 'salary', 'salary_day', 'joining_date'].every((k) => k in e.errors));
  });

  it('creates an employee with a liability account; mob1 must be unique', async () => {
    const mob = `05${String(Date.now()).slice(-8)}`;
    const r = await api.post<any>('/v1/employee', { store_id: seed.storeId, name: `${tag} Tech`, position: 'Technician', mob1: mob, salary: 3000, salary_day: 1, joining_date: new Date(Date.now() - 40 * 86400000).toISOString(), is_active: true, opening_balance: 0 }, S(seed.storeId));
    emp = r.result;
    expect(emp.id).toBeTruthy();
    const one = (await api.get<any>(`/v1/employee/${emp.id}`, S(seed.storeId))).result;
    expect(one.account).toMatchObject({ type: 'liability' });
    expect(one.account.name).toBe(`EMP: ${tag} TECH`);
    await fails(api.post('/v1/employee', { store_id: seed.storeId, name: `${tag} Dup`, mob1: mob, salary: 1, salary_day: 1, joining_date: new Date().toISOString() }, S(seed.storeId)), 'mob1');
  });

  it('stats meta has the summary fields', async () => {
    const r = await api.get<any[]>('/v1/employee', { search: { store_id: seed.storeId, stats: 1, search: tag }, limit: 5 });
    expect(r.meta).toEqual(expect.objectContaining({ total_employees: 1, total_salary: 3000 }));
    expect(r.meta).toHaveProperty('total_owed_to_employees');
    expect(r.meta).toHaveProperty('total_employees_owe');
  });

  it('salary payment: validation, create with ledger, PUT is a full replace of editable fields, delete', async () => {
    await expect(api.post('/v1/employee-salary-payment', { store_id: seed.storeId, amount: 0, month: 13, year: 1999 }, S(seed.storeId)))
      .rejects.toSatisfy((e: unknown) => e instanceof ApiError && ['employee_id', 'amount', 'payment_method', 'month', 'year'].every((k) => k in e.errors));
    const d = new Date();
    const r = await api.post<any>('/v1/employee-salary-payment', { store_id: seed.storeId, employee_id: emp.id, amount: 1200, payment_method: 'cash', date: d.toISOString(), month: d.getMonth() + 1, year: d.getFullYear(), description: tag }, S(seed.storeId));
    const pid = r.result.id;
    expect(r.result.code).toMatch(/^SAL-[0-9A-F]{6}$/);
    const list = await api.get<any[]>('/v1/employee-salary-payment', { search: { store_id: seed.storeId, employee_id: emp.id, stats: 1 } });
    expect(list.result!.map((x) => x.id)).toEqual([pid]);
    expect(list.result![0].employee_name).toBe(`${tag} Tech`);
    await api.put(`/v1/employee-salary-payment/${pid}`, { amount: 1300, payment_method: 'bank_transfer', date: d.toISOString(), month: d.getMonth() + 1, year: d.getFullYear(), description: '' }, S(seed.storeId));
    const upd = (await api.get<any>(`/v1/employee-salary-payment/${pid}`, S(seed.storeId))).result;
    expect(upd).toMatchObject({ amount: 1300, payment_method: 'bank_transfer', description: '', employee_id: emp.id });
    const bank = await api.get<any[]>('/v1/employee-salary-payment', { search: { store_id: seed.storeId, payment_method: 'bank_transfer', employee_name: tag } });
    expect(bank.result!.map((x) => x.id)).toContain(pid);
    await api.del(`/v1/employee-salary-payment/${pid}`, S(seed.storeId));
    expect((await api.get<any[]>('/v1/employee-salary-payment', { search: { store_id: seed.storeId, employee_id: emp.id } })).result).toEqual([]);
  });

  it('permanent delete removes the employee', async () => {
    const r = await api.del<string>(`/v1/employee/permanent/${emp.id}`, S(seed.storeId));
    expect(r.result).toBe('Deleted permanently');
    await expect(api.get(`/v1/employee/${emp.id}`, S(seed.storeId))).rejects.toBeInstanceOf(ApiError);
  });
});

describe('automobile dashboard — live API', () => {
  it('all-time load has 12 months of breakdown and tolerates null arrays', async () => {
    const r = (await api.get<any>('/v1/automobile/dashboard', S(seed.storeId))).result;
    expect(r).toHaveProperty('total_profit');
    expect(r).toHaveProperty('month_name');
    expect(r.monthly_breakdown.length).toBe(12);
    const t = trendSeries(r.monthly_breakdown);
    expect(t.labels).toHaveLength(12);
    expect(t.expense.every((x, i) => Math.abs(t.revenue[i] - t.profit[i] - x) < 1e-6)).toBe(true);
  });

  it('every period mode is accepted and narrows the breakdown months', async () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ymd = `${ym}-${String(now.getDate()).padStart(2, '0')}`;
    const cases: [Parameters<typeof toRange>, number][] = [
      [['single_month', ym, ''], 1], [['month_range', `${now.getFullYear()}-01`, ym], now.getMonth() + 1], [['year', String(now.getFullYear()), ''], 12],
      [['single_date', ymd, ''], 1], [['date_range', `${ym}-01`, ymd], 1], [['year_range', String(now.getFullYear() - 1), String(now.getFullYear())], 24],
    ];
    for (const [args, months] of cases) {
      const r = (await api.get<any>('/v1/automobile/dashboard', { search: { store_id: seed.storeId }, ...rangeParams(toRange(...args)) })).result;
      expect({ mode: args[0], months: r.monthly_breakdown.length }).toEqual({ mode: args[0], months });
    }
  });
});
