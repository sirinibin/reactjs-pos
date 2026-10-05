import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, ApiError, request, setBaseUrl } from '../../src/api/client';
import { KEYS } from '../../src/api/session';
import { buildStoreBody, newStoreDefaults, storeForEdit } from '../../src/modules/admin/lib/storeForm';
import { buildMatrix, matrixToPermissions, resourcesFromNav } from '../../src/modules/admin/lib/rbac';
import { NAV } from '../../src/shell/nav';
import { API_URL, loadSeed, signIn, S, type Seed } from './helpers';

/**
 * Administration against the live API. Everything destructive happens on a throwaway store,
 * users and roles created here (and removed in afterAll) — the seeded GUO store is only read.
 */
let seed: Seed;
let storeId = '';
const extraStores: string[] = [];
const users: string[] = [];
const u = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** Reuse the E2E session token when it is still valid — /v1/authorize is rate-limited per IP. */
async function authenticate() {
  setBaseUrl(API_URL);
  const p = resolve(__dirname, '../e2e/.auth/state.json');
  if (existsSync(p)) {
    try {
      const st = JSON.parse(readFileSync(p, 'utf8'));
      const tok = st.origins?.flatMap((o: any) => o.localStorage || []).find((x: any) => x.name === 'access_token')?.value;
      if (tok) {
        (globalThis as any).window.localStorage.setItem(KEYS.token, tok);
        await api.get('/v1/me');
        return;
      }
    } catch { /* fall through to a real sign-in */ }
  }
  await signIn();
}

function storeInput(code: string, extra: Record<string, any> = {}) {
  return buildStoreBody({
    ...newStoreDefaults(),
    name: `IT Admin ${code}`, name_in_arabic: `متجر ${code}`, code, branch_name: 'Integration', business_category: 'Retail', registration_number: `CR${code}`.replace(/[^A-Za-z0-9]/g, ''),
    vat_no: '399999999999993', vat_percent: 15, email: `it-${code.toLowerCase()}@example.com`, phone: '0550000000', country_code: 'SA',
    national_address: { building_no: '1234', street_name: 'Test St', street_name_arabic: 'شارع', district_name: 'Olaya', district_name_arabic: 'العليا', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '12345' },
    ...extra,
  });
}
const rejects = async (p: Promise<unknown>): Promise<ApiError> => {
  try { await p; } catch (e) { if (e instanceof ApiError) return e; throw e; }
  throw new Error('expected the request to fail');
};

beforeAll(async () => {
  seed = loadSeed();
  await authenticate();
  const r = await api.post<any>('/v1/store', storeInput(`IT${u()}`.toUpperCase().slice(0, 12), { settings: { ...newStoreDefaults().settings, enable_rbac_module: true } }));
  storeId = r.result.id;
});

afterAll(async () => {
  for (const id of users) await api.del(`/v1/user/${id}`).catch(() => undefined);
  for (const id of [storeId, ...extraStores]) {
    if (!id) continue;
    await api.del(`/v1/store/${id}`).catch(() => undefined);
    await api.del(`/v1/store/${id}/permanent`).catch(() => undefined);
  }
});

describe('stores', () => {
  it('lists stores (seeded GUO included), filters by name and deleted state', async () => {
    const all = await api.get<any[]>('/v1/store', { select: 'id,name,code,deleted', limit: 100, sort: '-created_at' });
    expect(all.result!.some((s) => s.id === seed.storeId)).toBe(true);
    const byName = await api.get<any[]>('/v1/store', { search: { name: 'IT Admin' }, limit: 50 });
    expect(byName.result!.some((s) => s.id === storeId)).toBe(true);
    expect(byName.result!.every((s) => /IT Admin/i.test(s.name))).toBe(true);
    const deleted = await api.get<any[]>('/v1/store', { search: { deleted: 'yes' }, limit: 50 });
    expect(deleted.result!.every((s) => s.deleted)).toBe(true);
  });

  it('the client body builder produces a store the API accepts, with Arabic digit mirrors', async () => {
    const r = await api.get<any>(`/v1/store/${storeId}`);
    expect(r.result.vat_no_in_arabic).toBe('۳۹۹۹۹۹۹۹۹۹۹۹۹۹۳');
    expect(r.result.national_address.zipcode_arabic).toBe('۱۲۳٤۵');
    expect(r.result.settings.invoice.quotation_title).toBe('QUOTATION | اقتباس');
    expect(r.result.customer_deposit_serial_number.prefix).toBe('RCVBLE');
    expect(r.result.settings.enable_rbac_module).toBe(true);
  });

  it('validation failures come back as HTTP 500 with field errors', async () => {
    const e = await rejects(api.post('/v1/store', { name: '', vat_percent: 0 }));
    expect(e.status).toBe(500);
    expect(e.errors).toHaveProperty('name');
    expect(e.errors).toHaveProperty('code');
    expect(e.errors).toHaveProperty('vat_no');
  });

  it('PUT merges onto the stored document; a full edit round-trip keeps everything', async () => {
    await api.put(`/v1/store/${storeId}`, { branch_name: 'Merged branch' });
    let r = await api.get<any>(`/v1/store/${storeId}`);
    expect(r.result.branch_name).toBe('Merged branch');
    expect(r.result.name).toMatch(/^IT Admin/);
    const edited = storeForEdit(r.result);
    edited.settings.enable_warehouse_module = true;
    edited.settings.default_quotation_validity_days = '30';
    const saved = await api.put<any>(`/v1/store/${storeId}`, buildStoreBody(edited));
    expect(saved.result.settings.enable_warehouse_module).toBe(true);
    expect(saved.result.settings.default_quotation_validity_days).toBe(30);
    r = await api.get<any>(`/v1/store/${storeId}`);
    expect(r.result.name).toBe(saved.result.name);
    expect(r.result.settings.enable_rbac_module).toBe(true);
  });

  it('settings.enable_drafts is not in the API model and is silently dropped (quirk)', async () => {
    await api.put(`/v1/store/${storeId}`, { settings: { enable_drafts: true } });
    const r = await api.get<any>(`/v1/store/${storeId}`);
    expect(r.result.settings.enable_drafts).toBeUndefined();
  });

  it('serial locks are reported per document type', async () => {
    const mine = await api.get<any>(`/v1/store/${storeId}/serial-locks`);
    expect(mine.result).toEqual({ sales_locked: false, sales_return_locked: false, customer_deposit_locked: false, customer_withdrawal_locked: false });
    const guo = await api.get<any>(`/v1/store/${seed.storeId}/serial-locks`);
    expect(guo.result.sales_locked).toBe(true);
  });

  it('sidebar-config and print-settings endpoints persist into settings', async () => {
    const cfg = [{ id: 'customers', visible: true }, { id: 'sales', visible: false }];
    await api.put(`/v1/store/${storeId}/sidebar-config`, { sidebar_config: cfg });
    await api.put(`/v1/store/${storeId}/print-settings`, { print_settings: { sales: { fontSize: 12 } } });
    const r = await api.get<any>(`/v1/store/${storeId}`, { select: 'id,settings' });
    expect(r.result.settings.sidebar_config).toEqual(cfg);
    expect(r.result.settings.print_settings).toEqual({ sales: { fontSize: 12 } });
  });

  it('ZATCA connect requires an OTP; clear-reconnect works for admins', async () => {
    const e = await rejects(api.post('/v1/store/zatca/connect', { id: storeId, otp: '' }));
    expect(e.errors).toHaveProperty('otp');
    await api.put(`/v1/store/${storeId}/zatca/clear-reconnect`, {});
    const r = await api.get<any>(`/v1/store/${storeId}`);
    expect(r.result.zatca?.zatca_reconnect_required ?? false).toBe(false);
  });

  it('backup size is reported in bytes', async () => {
    const r = await api.get<any>(`/v1/store/${storeId}/backup/size`);
    expect(r.result.total_size).toBeGreaterThan(0);
    expect(r.result).toHaveProperty('mongodb_store_db');
  });

  it('duplicate-without-data runs as a job and creates a new store', async () => {
    const e = await rejects(api.post(`/v1/store/${storeId}/duplicate-without-data/start`, { new_name: '' }));
    expect(e.errors).toHaveProperty('new_name');
    const start = await api.post<any>(`/v1/store/${storeId}/duplicate-without-data/start`, { new_name: `IT Copy ${u()}`, new_name_in_arabic: 'نسخة' });
    if (start.result.new_store_id) extraStores.push(start.result.new_store_id);
    let p: any;
    for (let i = 0; i < 120; i++) {
      p = (await api.get<any>(`/v1/store/${storeId}/duplicate-without-data/progress`, { job_id: start.result.job_id })).result;
      if (p.done || p.error) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(p.error || '').toBe('');
    expect(p.done).toBe(true);
    expect(p.steps.map((s: any) => s.id)).toEqual(['copy_store_doc', 'create_store_db', 'create_indexes']);
    const copy = await api.get<any>(`/v1/store/${p.new_store_id || start.result.new_store_id}`);
    expect(copy.result.name).toMatch(/^IT Copy/);
    const ghost = await rejects(api.get(`/v1/store/${storeId}/duplicate-without-data/progress`, { job_id: 'nope' }));
    expect(ghost.errors).toHaveProperty('job_id');
  });
});

describe('users', () => {
  const email = `it-${u()}@example.com`;
  let id = '';

  it('creates a user scoped to the throwaway store and rejects a duplicate email with 409', async () => {
    const r = await api.post<any>('/v1/user', { name: 'IT User', email, mob: '0551112233', password: 'secret12', role: 'SalesMan', store_ids: [storeId], role_ids: [], store_id: storeId, opening_balance: 0, opening_balance_type: 'payable' });
    id = r.result.id;
    users.push(id);
    // Quirk: the create response echoes the bcrypt hash (never the plaintext); GET /v1/user/{id} blanks it.
    expect(r.result.password).not.toBe('secret12');
    expect((await api.get<any>(`/v1/user/${id}`)).result.password || '').toBe('');
    expect(r.result.store_ids).toEqual([storeId]);
    const e = await rejects(api.post('/v1/user', { name: 'Dup', email, mob: '1', password: 'secret12' }));
    expect(e.status).toBe(409);
    expect(e.errors.email).toMatch(/already in use/i);
  });

  it('validates required fields and opening balance rules', async () => {
    const e = await rejects(api.post('/v1/user', { name: '', email: '', mob: '' }));
    expect(Object.keys(e.errors)).toEqual(expect.arrayContaining(['name', 'email', 'mob', 'password']));
    const ob = await rejects(api.post('/v1/user', { name: 'X', email: `ob-${u()}@example.com`, mob: '1', password: 'secret12', opening_balance: 50, opening_balance_type: 'payable' }));
    expect(ob.errors).toHaveProperty('opening_balance_date');
  });

  it('lists with filters (email, role) and updates with a full store_ids array', async () => {
    const l = await api.get<any[]>('/v1/user', { search: { email, role: 'SalesMan' }, select: 'id,name,email,role' });
    expect(l.result!.map((x) => x.id)).toEqual([id]);
    const upd = await api.put<any>(`/v1/user/${id}`, { name: 'IT User 2', email, mob: '0559', role: 'Manager', store_ids: [storeId, seed.storeId], role_ids: [] });
    expect(upd.result.name).toBe('IT User 2');
    expect(upd.result.store_ids).toHaveLength(2);
    const back = await api.put<any>(`/v1/user/${id}`, { name: 'IT User 2', email, mob: '0559', role: 'SalesMan', store_ids: [storeId], role_ids: [] });
    expect(back.result.store_ids).toEqual([storeId]);
  });

  it('admins change another user’s password without the current one; too short is rejected', async () => {
    const bad = await rejects(request(`/v1/user/${id}/change-password`, { method: 'PATCH', body: { new_password: '123' } }));
    expect(bad.errors).toHaveProperty('new_password');
    const ok = await request<string>(`/v1/user/${id}/change-password`, { method: 'PATCH', body: { new_password: 'another12' } });
    expect(String(ok.result)).toMatch(/changed/i);
  });

  it('toggle-status deactivates and re-activates; inactive users drop out of the list', async () => {
    await request(`/v1/user/${id}/toggle-status`, { method: 'PATCH' });
    let l = await api.get<any[]>('/v1/user', { search: { email } });
    expect(l.result).toHaveLength(0);
    await request(`/v1/user/${id}/toggle-status`, { method: 'PATCH' });
    l = await api.get<any[]>('/v1/user', { search: { email } });
    expect(l.result).toHaveLength(1);
  });

  it('cannot toggle your own status', async () => {
    const me = await api.get<any>('/v1/me');
    const e = await rejects(request(`/v1/user/${me.result.id}/toggle-status`, { method: 'PATCH' }));
    expect(e.status).toBe(403);
  });
});

describe('roles (RBAC)', () => {
  let roleId = '';
  const rows = resourcesFromNav(NAV);

  it('requires a name; creates a role with the full matrix', async () => {
    const e = await rejects(api.post('/v1/user-role', { name: '', store_id: storeId, permissions: [] }, S(storeId)));
    expect(e.errors).toHaveProperty('name');
    const m = buildMatrix(rows, []);
    m.sales = { read: true, create: true, update: false, delete: false };
    const r = await api.post<any>('/v1/user-role', { name: `IT Cashier ${u()}`, store_id: storeId, permissions: matrixToPermissions(m) }, S(storeId));
    roleId = r.result.id;
    expect(roleId).toBeTruthy();
  });

  it('lists with page_size and reads back the permissions', async () => {
    const l = await api.get<any[]>('/v1/user-role', { search: { store_id: storeId }, page: 1, page_size: 5 });
    expect(l.total_count).toBeGreaterThanOrEqual(1);
    const v = await api.get<any>(`/v1/user-role/${roleId}`, S(storeId));
    expect(v.result.permissions.find((p: any) => p.resource === 'sales')).toMatchObject({ read: true, create: true, update: false, delete: false });
    const multi = await api.get<any[]>('/v1/user-role', { search: { store_ids: storeId, name: 'IT Cashier' } });
    expect(multi.result!.some((x) => x.id === roleId)).toBe(true);
  });

  it('refuses to delete a role assigned to a user, then deletes it once unassigned', async () => {
    const email = `role-${u()}@example.com`;
    const usr = await api.post<any>('/v1/user', { name: 'Role holder', email, mob: '1', password: 'secret12', role: 'SalesMan', store_ids: [storeId], role_ids: [roleId] });
    users.push(usr.result.id);
    const e = await rejects(api.del(`/v1/user-role/${roleId}`, S(storeId)));
    expect(Object.values(e.errors).join(' ')).toMatch(/assigned/i);
    await api.put(`/v1/user/${usr.result.id}`, { name: 'Role holder', email, mob: '1', role: 'SalesMan', store_ids: [storeId], role_ids: [] });
    await api.del(`/v1/user-role/${roleId}`, S(storeId));
    const l = await api.get<any[]>('/v1/user-role', { search: { store_id: storeId } });
    expect(l.result!.some((x) => x.id === roleId)).toBe(false);
  });

  it('effective permissions is an array (empty for an admin without roles)', async () => {
    const r = await api.get<any[]>('/v1/user-role/effective-permissions');
    expect(Array.isArray(r.result)).toBe(true);
  });
});

describe('signatures', () => {
  let sigId = '';
  it('requires a name and an image; stores the image as a file', async () => {
    const e = await rejects(api.post('/v1/signature', { store_id: storeId, name: '' }, S(storeId)));
    expect(e.errors).toHaveProperty('name');
    expect(e.errors).toHaveProperty('signature_content');
    const r = await api.post<any>('/v1/signature', { store_id: storeId, name: 'IT Sig', signature_content: PNG }, S(storeId));
    sigId = r.result.id;
    // Stored as an absolute /images/<store>/signatures/<file> path (resolveImageUrl keeps it as-is).
    expect(r.result.signature).toMatch(new RegExp(`(^|/images/${storeId}/signatures/)signature_[0-9a-f]{24}\\.png$`));
  });

  it('rejects a duplicate name (409), renames, lists and deletes', async () => {
    const dup = await rejects(api.post('/v1/signature', { store_id: storeId, name: 'IT Sig', signature_content: PNG }, S(storeId)));
    expect(dup.status).toBe(409);
    const upd = await api.put<any>(`/v1/signature/${sigId}`, { store_id: storeId, name: 'IT Sig 2' }, S(storeId));
    expect(upd.result.name).toBe('IT Sig 2');
    expect(upd.result.signature).toBeTruthy();
    const l = await api.get<any[]>('/v1/signature', { search: { store_id: storeId, name: 'IT Sig' } });
    expect(l.result!.map((x) => x.name)).toContain('IT Sig 2');
    await api.del(`/v1/signature/${sigId}`, S(storeId));
    const after = await api.get<any[]>('/v1/signature', { search: { store_id: storeId } });
    expect(after.result!.some((x) => x.id === sigId)).toBe(false);
  });
});
