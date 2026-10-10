// Users, user roles (RBAC) and passwords, full stack: roles and users are
// created on the real screens, then the new user signs in through the real
// login page in a fresh browser and is checked against what the role allows.
// Every user has a unique @startpos.test e-mail and is deleted at the end.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { secondStore, miscApi, openUserMenuItem, signInFresh, freshClientHeaders, recordWrites, uniqEmail, typeInto, uniq } = require('./helpers/misc');

test.use({ storageState: AUTH_STATE });

const PASSWORD = 'Secret-123';

// Every resource of the menu (the role matrix rows), read from the app's own menu config.
const ALL_RESOURCES = [...new Set([...require('fs').readFileSync(
  require('path').join(__dirname, '..', '..', 'src', 'sidebar_menu_config.js'), 'utf8',
).matchAll(/resource: "([a-z_]+)"/g)].map((m) => m[1]))];
const isUserPost = (r) => r.request().method() === 'POST' && /\/v1\/user(\?|$)/.test(r.url());
const isRolePost = (r) => r.request().method() === 'POST' && /\/v1\/user-role(\?|$)/.test(r.url());

/** All resources of the role matrix (from the API's view of a stored role). */
function permsOf(role) {
  return Object.fromEntries(role.permissions.map((p) => [p.resource, p]));
}

/** Users helper bound to the admin API client. */
function usersApi(request) {
  const api = miscApi(request);
  const created = [];
  return Object.assign(api, {
    created,
    async usersByEmail(email) {
      const body = await this.get(`/v1/user?search[email]=${encodeURIComponent(email)}&limit=20`);
      return (body.result || []).filter((u) => u.email === email && !u.deleted);
    },
    async createUser({ email = uniqEmail(), password = PASSWORD, role = 'SalesMan', roleIds = [] } = {}) {
      const body = await this.post('/v1/user', {
        name: `E2E User ${uniq()}`, email, password, mob: '0551234567', role,
        store_ids: [this.storeId], role_ids: roleIds,
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      created.push(body.result.id);
      return { ...body.result, password };
    },
    async assignRoles(userId, roleIds) {
      const user = (await this.get(`/v1/user/${userId}`)).result;
      delete user.password;
      user.role_ids = roleIds;
      await this.put(`/v1/user/${userId}`, user);
    },
    async createRole(name, allowed) {
      const permissions = allowed.map(([resource, actions]) => ({
        resource, read: actions.includes('r'), create: actions.includes('c'), update: actions.includes('u'), delete: actions.includes('d'),
      }));
      const body = await this.post('/v1/user-role', { name, permissions });
      return body.result;
    },
    async rolesNamed(name) {
      const body = await this.get(`/v1/user-role?search[name]=${encodeURIComponent(name)}&limit=20`);
      return (body.result || []).filter((r) => r.name === name && !r.deleted);
    },
    async cleanup() {
      for (const id of created) await this.raw('DELETE', `/v1/user/${id}`);
    },
  });
}

/** Access token of a user through the real authorize + accesstoken calls. */
async function tokenFor(request, email, password) {
  const auth = await request.post('/v1/authorize', { headers: freshClientHeaders(), data: { email, password } });
  if (auth.status() !== 200) return { status: auth.status() };
  const code = (await auth.json()).result.code;
  const tok = await request.post('/v1/accesstoken', { headers: { Authorization: code } });
  return { status: tok.status(), token: (await tok.json()).result?.access_token };
}

async function openUserCreate(page) {
  await page.goto('/dashboard/users');
  await page.getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Create New User' });
  await expect(dialog.getByPlaceholder('Name', { exact: true })).toBeVisible();
  return dialog;
}

async function fillAccount(page, dialog, { name, email, password, mob = '0551234567' }) {
  if (name !== undefined) await typeInto(page, dialog.getByPlaceholder('Name', { exact: true }), name, 5);
  if (email !== undefined) await typeInto(page, dialog.getByPlaceholder('Email', { exact: true }), email, 5);
  if (password !== undefined && password !== '') await typeInto(page, dialog.getByPlaceholder('Password', { exact: true }), password, 5);
  if (mob) await typeInto(page, dialog.getByPlaceholder('Mobile number', { exact: true }), mob, 5);
}

/** On the Permissions tab: picks the role and the e2e store. */
async function choosePermissions(page, dialog, store, role = 'SalesMan') {
  await dialog.getByRole('button', { name: 'Permissions' }).first().click();
  await dialog.locator('select').selectOption(role);
  await dialog.getByRole('button', { name: 'Add Stores' }).click();
  await dialog.getByPlaceholder('Search stores...').fill(store.name);
  await dialog.locator('label').filter({ hasText: `${store.name} - ${store.branch_name} (${store.code})` }).locator('input').check();
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog.getByText(`${store.name} - ${store.branch_name} (${store.code})`)).toBeVisible();
}

async function submitUser(page, dialog) {
  const posted = page.waitForResponse(isUserPost);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  return posted;
}

test.describe('user roles', () => {
  test('a role with limited permissions created on the User Roles screen is stored once, even on a double click', async ({ page, request }) => {
    const api = usersApi(request);
    const name = `E2E Role ${uniq()}`;
    const posts = recordWrites(page, /\/v1\/user-role(\?|$)/);
    await page.goto('/dashboard/user-roles');
    await page.getByRole('button', { name: 'New Role' }).click();
    const dialog = page.getByRole('dialog');
    await typeInto(page, dialog.getByPlaceholder('e.g. Sales Manager'), name, 5);
    // Start from nothing allowed, then allow reading + creating sales and reading customers.
    await dialog.locator('thead input[type=checkbox]').last().uncheck();
    const row = (label) => dialog.locator('tbody tr').filter({ has: page.getByRole('cell', { name: label, exact: true }) });
    await row('Sales').locator('input').nth(0).check();
    await row('Sales').locator('input').nth(1).check();
    await row('Customers').locator('input').nth(0).check();
    await expect(row('Purchases').locator('input').nth(0)).not.toBeChecked();

    const saved = page.waitForResponse(isRolePost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).dblclick();
    const res = await saved;
    expect(res.status()).toBe(200);
    await expect(page.getByText(name).first()).toBeVisible();

    const roles = await api.rolesNamed(name);
    expect(roles, 'exactly one role stored').toHaveLength(1);
    expect(posts).toHaveLength(1);
    const p = permsOf(roles[0]);
    expect(p.sales).toMatchObject({ read: true, create: true, update: false, delete: false });
    expect(p.customers).toMatchObject({ read: true, create: false, update: false, delete: false });
    expect(p.purchases).toMatchObject({ read: false, create: false, update: false, delete: false });
    expect(roles[0].store_id).toBe(api.storeId);
  });

  test('a role without a name is refused with a visible error and nothing is stored', async ({ page }) => {
    await page.goto('/dashboard/user-roles');
    await page.getByRole('button', { name: 'New Role' }).click();
    const dialog = page.getByRole('dialog');
    const saved = page.waitForResponse(isRolePost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    const res = await saved;
    expect((await res.json()).errors.name).toBe('Role name is required');
    expect(res.status(), 'a validation error is a client error').toBe(400);
    await expect(dialog.getByText('Role name is required')).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Create New Role')).toBeVisible();
    await expect(page.getByText('Role created!')).toHaveCount(0);
  });

  test('the Users form offers RBAC roles when the store has the RBAC module on', async ({ page, request }) => {
    const api = usersApi(request);
    const restore = await api.setStoreSettings({ enable_rbac_module: true });
    try {
      const store = await api.getStore();
      const dialog = await openUserCreate(page);
      await choosePermissions(page, dialog, store);
      await expect(dialog.getByPlaceholder('Search and assign roles...')).toBeVisible({ timeout: 5000 });
    } finally {
      await restore();
    }
  });
});

test.describe('users', () => {
  let api;
  test.beforeEach(({ request }) => { api = usersApi(request); });
  test.afterEach(async () => { await api.cleanup(); });

  test('a user created on the Users screen signs in and only reaches what the role allows @devices', async ({ page, request, browser }, testInfo) => {
    test.setTimeout(120_000);
    const restore = await api.setStoreSettings({ enable_rbac_module: true });
    try {
      const store = await api.getStore();
      // Only sales may be read and created; every other screen is explicitly denied.
      const role = await api.createRole(`E2E Sales Only ${uniq()}`, ALL_RESOURCES.map((r) => [r, r === 'sales' ? 'rc' : '']));
      const email = uniqEmail('salesman');
      const name = `E2E Sales Man ${uniq()}`;

      const dialog = await openUserCreate(page);
      await fillAccount(page, dialog, { name, email, password: PASSWORD });
      await choosePermissions(page, dialog, store, 'SalesMan');
      const res = await submitUser(page, dialog);
      const body = await res.json();
      expect(res.status(), JSON.stringify(body.errors)).toBe(200);
      api.created.push(body.result.id);
      await expect(page.getByRole('dialog').getByText(email).first()).toBeVisible();

      const [stored] = await api.usersByEmail(email);
      expect(stored).toMatchObject({ name, role: 'SalesMan', store_ids: [api.storeId] });
      expect(stored.admin).toBeFalsy();

      // The role is assigned through the API (picking it in the form is covered above).
      await api.assignRoles(stored.id, [role.id]);

      const { context, page: userPage, authStatus } = await signInFresh(browser, testInfo, email, PASSWORD);
      try {
        expect(authStatus).toBe(200);
        await userPage.waitForURL(/\/dashboard\/sales/);
        const menu = userPage.locator('#sidebar .sidebar-nav .sidebar-link span');
        await expect(menu.filter({ hasText: /^Sales$/ })).toHaveCount(1);
        expect(await menu.allTextContents()).not.toContain('Purchases');
        expect(await menu.allTextContents()).not.toContain('Users');
        // The allowed screen works…
        await expect(userPage.getByRole('button', { name: /Create/ }).first()).toBeVisible();
        // …and a forbidden one is blocked even when typed into the address bar.
        await userPage.goto('/dashboard/purchases');
        await expect(userPage.getByText('Access Denied')).toBeVisible();
        await expect(userPage.getByText("You don't have permission to view this page.")).toBeVisible();

        // The API refuses what a SalesMan may not do.
        const userToken = await userPage.evaluate(() => localStorage.getItem('access_token'));
        const roles = await request.get(`/v1/user-role?search[store_id]=${api.storeId}`, { headers: { Authorization: userToken } });
        expect(roles.status()).toBe(403);
        const fresh = await api.getStore();
        const putStore = await request.put(`/v1/store/${api.storeId}`, { headers: { Authorization: userToken }, data: fresh });
        expect(putStore.status()).toBe(403);
      } finally {
        await context.close();
      }
    } finally {
      await restore();
    }
  });

  test('an e-mail that is already in use is refused and no second user is stored', async ({ page }) => {
    const existing = await api.createUser();
    const dialog = await openUserCreate(page);
    await fillAccount(page, dialog, { name: 'E2E Duplicate', email: existing.email, password: PASSWORD });
    const res = await submitUser(page, dialog);
    expect([400, 409]).toContain(res.status());
    expect((await res.json()).errors.email).toBe('E-mail is Already in use');
    await expect(dialog.getByText('E-mail is Already in use', { exact: true })).toBeVisible();
    await expect(page.getByText('Failed to process user!')).toBeVisible();
    expect(await api.usersByEmail(existing.email)).toHaveLength(1);
  });

  test('an invalid e-mail address is refused with a visible error', async ({ page }) => {
    const name = `E2E Bad Mail ${uniq()}`;
    const dialog = await openUserCreate(page);
    await fillAccount(page, dialog, { name, email: 'not-an-email@', password: PASSWORD });
    const res = await submitUser(page, dialog);
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.email).toBe('Invalid e-mail address');
    await expect(dialog.getByText('Invalid e-mail address', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Create New User')).toBeVisible();
    const body = await api.get(`/v1/user?search[name]=${encodeURIComponent(name)}&limit=5`);
    expect((body.result || []).filter((u) => u.name === name)).toHaveLength(0);
  });

  test('a blank password and blank required fields are refused with visible errors', async ({ page }) => {
    const email = uniqEmail();
    const dialog = await openUserCreate(page);
    await fillAccount(page, dialog, { email, password: '', mob: '' });
    const res = await submitUser(page, dialog);
    expect(res.status()).toBe(400);
    const { errors } = await res.json();
    expect(errors).toMatchObject({ password: 'Password is required', name: 'Name is required', mob: 'Mob is required' });
    await expect(dialog.getByText('Password is required', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Name is required', { exact: true })).toBeVisible();
    expect(await api.usersByEmail(email)).toHaveLength(0);
  });

  test('a weak password (3 characters) is refused when creating a user', async ({ page }) => {
    const email = uniqEmail();
    const dialog = await openUserCreate(page);
    await fillAccount(page, dialog, { name: `E2E Weak ${uniq()}`, email, password: '123' });
    const res = await submitUser(page, dialog);
    if (res.status() === 200) api.created.push((await res.json()).result.id);
    expect(await api.usersByEmail(email)).toHaveLength(0);
    expect(res.status()).toBe(400);
  });

  test('the user creation API response does not expose the password hash', async ({ request }) => {
    const res = await request.post(`/v1/user?search[store_id]=${api.storeId}`, {
      headers: { Authorization: api.token },
      data: { name: `E2E Hash ${uniq()}`, email: uniqEmail(), password: PASSWORD, mob: '0551234567', role: 'SalesMan', store_ids: [api.storeId] },
    });
    const body = await res.json();
    if (body.result?.id) api.created.push(body.result.id);
    expect(res.status()).toBe(200);
    expect(body.result.password || '').toBe('');
  });

  test('a SalesMan cannot create users through the API and lists only the users of their own store', async ({ request }) => {
    const salesman = await api.createUser({ role: 'SalesMan' });
    // A user of the other e2e store only (not created by the salesman).
    const other = await secondStore(request, api.token);
    const outsiderEmail = uniqEmail('otherstore');
    const outsider = await request.post(`/v1/user?search[store_id]=${other.id}`, {
      headers: { Authorization: api.token },
      data: { name: `E2E Other Store User ${uniq()}`, email: outsiderEmail, password: PASSWORD, mob: '0551234567', role: 'SalesMan', store_ids: [other.id] },
    });
    const outsiderBody = await outsider.json();
    expect(outsider.status(), JSON.stringify(outsiderBody.errors)).toBe(200);
    api.created.push(outsiderBody.result.id);

    const { token } = await tokenFor(request, salesman.email, PASSWORD);
    expect(token).toBeTruthy();
    const email = uniqEmail('escalated');
    const create = await request.post(`/v1/user?search[store_id]=${api.storeId}`, {
      headers: { Authorization: token },
      data: { name: 'E2E Escalated', email, password: PASSWORD, mob: '0550000000', role: 'Manager', store_ids: [api.storeId] },
    });
    const made = await create.json().catch(() => ({}));
    if (made.result?.id) api.created.push(made.result.id);
    expect(create.status()).toBe(403);
    expect(made.errors?.authorization).toBe('Only Admin or Manager can create users');
    expect(await api.usersByEmail(email)).toHaveLength(0);

    // Many screens list users (filters, assignees), so a SalesMan may list them,
    // but only the users who share a store with them, and without password hashes.
    const list = await request.get(`/v1/user?search[email]=${encodeURIComponent(outsiderEmail)}&limit=20`, { headers: { Authorization: token } });
    expect(list.status()).toBe(200);
    expect((await list.json()).result || []).toHaveLength(0);
    const own = await (await request.get(`/v1/user?search[email]=${encodeURIComponent(salesman.email)}&limit=20`, { headers: { Authorization: token } })).json();
    expect(own.result.map((u) => u.email)).toEqual([salesman.email]);
    expect(own.result[0].password || '').toBe('');
  });
});

test.describe('store access', () => {
  let api;
  test.beforeEach(({ request }) => { api = usersApi(request); });
  test.afterEach(async () => { await api.cleanup(); });

  test('a user limited to the e2e store gets 403 for another store and the UI shows none of its data', async ({ request, browser }, testInfo) => {
    test.setTimeout(120_000);
    const other = await secondStore(request, api.token);
    const secret = `E2E Other Store Customer ${uniq()}`;
    const made = await request.post(`/v1/customer?search[store_id]=${other.id}`, {
      headers: { Authorization: api.token }, data: { store_id: other.id, name: secret, phone: '0501231231' },
    });
    expect(made.status(), await made.text()).toBe(200);

    const user = await api.createUser({ role: 'Manager' }); // assigned to the e2e store only
    const { token } = await tokenFor(request, user.email, PASSWORD);
    const h = { Authorization: token };
    // Own store: allowed.
    expect((await request.get(`/v1/customer?search[store_id]=${api.storeId}&limit=1`, { headers: h })).status()).toBe(200);
    // Another store, named in the query, the body or the path: refused.
    const q = await request.get(`/v1/customer?search[store_id]=${other.id}&search[name]=${encodeURIComponent(secret)}`, { headers: h });
    expect(q.status()).toBe(403);
    expect((await q.json()).errors.store_id).toBe("You don't have access to this store");
    expect(JSON.stringify(await q.json())).not.toContain(secret);
    const b = await request.post(`/v1/customer?search[store_id]=${other.id}`, { headers: h, data: { store_id: other.id, name: 'E2E Intruder', phone: '0500000009' } });
    expect(b.status()).toBe(403);
    expect((await request.get(`/v1/store/${other.id}`, { headers: h })).status()).toBe(403);

    // In the browser: the store switcher only offers the user's store, and forcing the
    // other store's id into the session shows none of its customers.
    const { context, page, authStatus } = await signInFresh(browser, testInfo, user.email, PASSWORD);
    try {
      expect(authStatus).toBe(200);
      await page.waitForURL(/\/dashboard\//);
      await page.evaluate((id) => localStorage.setItem('store_id', id), other.id);
      const refused = page.waitForResponse((r) => r.url().includes('/v1/customer?') && r.url().includes(other.id));
      await page.goto('/dashboard/customers');
      expect((await refused).status()).toBe(403);
      await expect(page.getByText(secret)).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(secret)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

test.describe('passwords', () => {
  let api;
  test.beforeEach(({ request }) => { api = usersApi(request); });
  test.afterEach(async () => { await api.cleanup(); });

  test('a user changes their own password; the old one stops working and the new one signs in', async ({ browser, request }, testInfo) => {
    const user = await api.createUser({ role: 'Manager' });
    const newPassword = `New-${uniq()}`;
    const { context, page, authStatus } = await signInFresh(browser, testInfo, user.email, PASSWORD);
    try {
      expect(authStatus).toBe(200);
      await page.waitForURL(/\/dashboard\//);
      await openUserMenuItem(page, 'Change Password');
      const dialog = page.locator('form, .modal').filter({ has: page.getByPlaceholder('Enter current password') }).last();

      // Mistakes first: wrong current password, then confirmation that does not match.
      await dialog.getByPlaceholder('Enter current password').fill('wrong-password');
      await dialog.getByPlaceholder('Enter new password').fill(newPassword);
      await dialog.getByPlaceholder('Repeat new password').fill(`${newPassword}x`);
      await dialog.getByRole('button', { name: /Change Password|Update Password|Save/ }).last().click();
      await expect(dialog.getByText('Passwords do not match')).toBeVisible();

      await dialog.getByPlaceholder('Repeat new password').fill(newPassword);
      let res = page.waitForResponse((r) => r.url().includes('/change-password'));
      await dialog.getByRole('button', { name: /Change Password|Update Password|Save/ }).last().click();
      expect((await (await res).json()).errors.current_password).toBe('Current password is incorrect');
      await expect(dialog.getByText('Current password is incorrect')).toBeVisible();

      await dialog.getByPlaceholder('Enter current password').fill(PASSWORD);
      res = page.waitForResponse((r) => r.url().includes('/change-password'));
      await dialog.getByRole('button', { name: /Change Password|Update Password|Save/ }).last().click();
      expect((await res).status()).toBe(200);
      await expect(page.getByText('Password changed successfully!').first()).toBeVisible();
    } finally {
      await context.close();
    }

    expect((await tokenFor(request, user.email, PASSWORD)).status).not.toBe(200);
    expect((await tokenFor(request, user.email, newPassword)).status).toBe(200);

    // And through the real login page: the old password is refused with a visible error.
    const old = await signInFresh(browser, testInfo, user.email, PASSWORD);
    try {
      expect(old.authStatus).not.toBe(200);
      await expect(old.page.getByText(/incorrect|invalid|wrong/i).first()).toBeVisible();
      await expect(old.page).not.toHaveURL(/\/dashboard\//);
    } finally {
      await old.context.close();
    }
  });

  test('a new password shorter than 6 characters is refused in the form', async ({ browser }, testInfo) => {
    const user = await api.createUser({ role: 'Manager' });
    const { context, page } = await signInFresh(browser, testInfo, user.email, PASSWORD);
    try {
      await page.waitForURL(/\/dashboard\//);
      const writes = recordWrites(page, /change-password/);
      await openUserMenuItem(page, 'Change Password');
      const dialog = page.locator('form, .modal').filter({ has: page.getByPlaceholder('Enter current password') }).last();
      await dialog.getByPlaceholder('Enter current password').fill(PASSWORD);
      await dialog.getByPlaceholder('Enter new password').fill('abc');
      await dialog.getByPlaceholder('Repeat new password').fill('abc');
      await dialog.getByRole('button', { name: /Change Password|Update Password|Save/ }).last().click();
      await expect(dialog.getByText('Must be at least 6 characters')).toBeVisible();
      expect(writes).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
});
