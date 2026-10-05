import { describe, expect, it } from 'vitest';
import { buildUserBody, eta, fmtDuration, humanBytes, isAccessError, passwordStrength, presenceSince, roleOf, sizeRows, validatePasswordChange, validateUser, type UserFormValues } from './misc';
import { automobileOrder, landingId, mergeMenuConfig, moveItem, resetMenu, setLanding, toggleItem } from './menuConfig';
import { buildMatrix, columnAll, everything, grantedCount, matrixToPermissions, resourcesFromNav, rowAll, setAll, setCell, setColumn, setRow } from './rbac';

describe('jobs helpers', () => {
  it('humanBytes', () => {
    expect(humanBytes(0)).toBe('0 B');
    expect(humanBytes(1536)).toBe('1.5 KB');
    expect(humanBytes(914123)).toBe('893 KB');
    expect(humanBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
  it('sizeRows only lists keys present in the response', () => {
    expect(sizeRows({ mongodb_store_db: 10, mongodb_store_doc: 2, mongodb_users: 0, images_size: 5, zatca_size: 1, total_size: 18 }).map((r) => r.label)).toEqual(['Store database', 'Store record', 'Users', 'Images', 'ZATCA files']);
    expect(sizeRows({ store_doc_size: 1, catalog_collections_size: 2, total_size: 3 }).map((r) => r.label)).toEqual(['Store record', 'Product catalogue']);
    expect(sizeRows(null)).toEqual([]);
  });
  it('duration and ETA', () => {
    expect(fmtDuration(65_000)).toBe('1:05');
    expect(fmtDuration(3_725_000)).toBe('1:02:05');
    expect(eta(10_000, 25)).toBe(30_000);
    expect(eta(10_000, 0)).toBeNull();
    expect(eta(10_000, 100)).toBeNull();
  });
});

describe('users helpers', () => {
  it('password strength buckets', () => {
    expect(passwordStrength('abc').label).toBe('Weak');
    expect(passwordStrength('abcdef1').label).toBe('Fair');
    expect(passwordStrength('Abcdef1').label).toBe('Good');
    expect(passwordStrength('Abcdefghij1!').label).toBe('Strong');
  });
  it('password change validation (legacy messages)', () => {
    expect(validatePasswordChange({ current: '', next: '', confirm: '' }, true)).toEqual({ current_password: 'Current password is required', new_password: 'New password is required', confirm: 'Please confirm your new password' });
    expect(validatePasswordChange({ next: '123', confirm: '123' }, false)).toEqual({ new_password: 'Must be at least 6 characters' });
    expect(validatePasswordChange({ next: '123456', confirm: '1234567' }, false)).toEqual({ confirm: 'Passwords do not match' });
    expect(validatePasswordChange({ next: '123456', confirm: '123456' }, false)).toEqual({});
  });
  it('roleOf treats missing role as Manager and the admin flag as Admin', () => {
    expect(roleOf({ role: 'SalesMan' })).toBe('SalesMan');
    expect(roleOf({})).toBe('Manager');
    expect(roleOf({ admin: true })).toBe('Admin');
    expect(roleOf({ role: 'Manager', admin: true })).toBe('Manager');
  });
  it('presence uses the inverted timestamps (spec quirk)', () => {
    expect(presenceSince({ online: true, last_offline_at: 'A', last_online_at: 'B' })).toBe('A');
    expect(presenceSince({ online: false, last_offline_at: 'A', last_online_at: 'B' })).toBe('B');
  });
  const form = (p: Partial<UserFormValues> = {}): UserFormValues => ({ name: 'A', email: 'a@b.co', mob: '1', password: 'secret1', role: 'Manager', store_ids: ['s1'], role_ids: [], opening_balance: '', opening_balance_type: 'payable', opening_balance_date: '', store_id: '', ...p });
  it('validateUser', () => {
    expect(validateUser(form(), true)).toEqual({});
    expect(validateUser(form({ name: ' ', email: 'x', mob: '', password: '' }), true)).toEqual({ name: 'Name is required', email: 'E-mail is not valid', mob: 'Mob is required', password: 'Password is required' });
    expect(validateUser(form({ password: '' }), false)).toEqual({});
    expect(validateUser(form({ password: '12' }), false)).toEqual({ password: 'Must be at least 6 characters' });
    expect(validateUser(form({ opening_balance: '50' }), false)).toHaveProperty('opening_balance_date');
  });
  it('buildUserBody sends full arrays, admin flag and only a non-empty password', () => {
    const b = buildUserBody(form({ name: ' A ', role: 'Admin', opening_balance: '25', opening_balance_date: '2026-10-01T10:00' }), { creating: true, activeStoreId: 's9', toIso: () => 'ISO' });
    expect(b).toMatchObject({ name: 'A', role: 'Admin', admin: true, store_ids: ['s1'], role_ids: [], store_id: 's9', opening_balance: 25, opening_balance_type: 'payable', opening_balance_date: 'ISO', password: 'secret1' });
    const e = buildUserBody(form({ password: '' }), { creating: false, activeStoreId: 's9', toIso: () => 'ISO' });
    expect(e).not.toHaveProperty('password');
    expect(e).not.toHaveProperty('opening_balance_date');
    expect(e.admin).toBe(false);
  });
  it('access errors are routed to the access card', () => {
    expect(isAccessError('role')).toBe(true);
    expect(isAccessError('store_ids')).toBe(true);
    expect(isAccessError('email')).toBe(false);
  });
});

describe('menu config', () => {
  const D = ['a', 'b', 'c', 'd'];
  it('nothing saved → defaults, all visible', () => {
    expect(mergeMenuConfig(null, D)).toEqual(D.map((id) => ({ id, visible: true })));
    expect(mergeMenuConfig('junk', D)).toHaveLength(4);
  });
  it('keeps saved order/visibility, drops unknown ids, inserts new ids after their predecessor', () => {
    const r = mergeMenuConfig([{ id: 'c', visible: false }, { id: 'zzz', visible: true }, { id: 'a', visible: true }], D);
    expect(r).toEqual([{ id: 'c', visible: false }, { id: 'd', visible: true }, { id: 'a', visible: true }, { id: 'b', visible: true }]);
  });
  it('new first item goes to index 0', () => {
    expect(mergeMenuConfig([{ id: 'b', visible: true }], ['a', 'b']).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('move / toggle / landing / reset', () => {
    const items = resetMenu(D);
    expect(moveItem(items, 0, 2).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(items, 0, 9)).toBe(items);
    expect(toggleItem(items, 'b')[1].visible).toBe(false);
    const hidden = toggleItem(items, 'c');
    expect(setLanding(hidden, 'c')).toEqual([{ id: 'c', visible: true }, { id: 'a', visible: true }, { id: 'b', visible: true }, { id: 'd', visible: true }]);
    expect(landingId(toggleItem(items, 'a'))).toBe('b');
    expect(landingId(items, (id) => id !== 'a')).toBe('b');
  });
  it('automobile order puts workshop items first', () => {
    const items = resetMenu(['sales', 'customers', 'vehicles', 'repair_jobs', 'automobile_dashboard']);
    expect(automobileOrder(items).map((x) => x.id)).toEqual(['automobile_dashboard', 'repair_jobs', 'vehicles', 'customers', 'sales']);
  });
});

describe('rbac matrix', () => {
  const NAV = [{ title: 'Sales', groups: [{ items: [{ label: 'Invoices', resource: 'sales' }, { label: 'Payments', resource: 'sales' }, { label: 'No resource' }] }] }, { title: 'Admin', groups: [{ items: [{ label: 'Signatures', resource: 'signatures' }] }] }];
  const rows = resourcesFromNav(NAV);
  it('derives unique resources with the first label and module group, plus legacy ids', () => {
    expect(rows[0]).toEqual({ resource: 'sales', label: 'Invoices', group: 'Sales' });
    expect(rows[1]).toEqual({ resource: 'signatures', label: 'Signatures', group: 'Admin' });
    expect(rows.find((r) => r.resource === 'repair_jobs')?.group).toBe('Other');
    expect(new Set(rows.map((r) => r.resource)).size).toBe(rows.length);
  });
  it('new role = everything; edit = saved merged, missing → none', () => {
    expect(everything(buildMatrix(rows, null))).toBe(true);
    const m = buildMatrix(rows, [{ resource: 'sales', read: true, create: true }]);
    expect(m.sales).toEqual({ read: true, create: true, update: false, delete: false });
    expect(m.signatures).toEqual({ read: false, create: false, update: false, delete: false });
  });
  it('cell rules: granting an action implies read; removing read removes all', () => {
    let m = buildMatrix(rows, []);
    m = setCell(m, 'sales', 'update', true);
    expect(m.sales).toEqual({ read: true, create: false, update: true, delete: false });
    m = setCell(m, 'sales', 'read', false);
    expect(m.sales).toEqual({ read: false, create: false, update: false, delete: false });
  });
  it('row/column/all toggles and checks', () => {
    let m = buildMatrix(rows, []);
    m = setRow(m, 'sales', true);
    expect(rowAll(m, 'sales')).toBe(true);
    m = setColumn(m, 'delete', true);
    expect(columnAll(m, 'delete')).toBe(true);
    expect(columnAll(m, 'read')).toBe(true);
    m = setAll(m, false);
    expect(grantedCount(matrixToPermissions(m))).toBe(0);
    m = setAll(m, true);
    expect(matrixToPermissions(m)).toHaveLength(rows.length);
    expect(grantedCount(matrixToPermissions(m))).toBe(rows.length);
  });
});
