// The owner's morning: sign in, create the audit store through the Stores screen,
// switch to it, build one RBAC role per job on the User Roles screen and hire one user
// per persona on the Users screen, all through the real UI (with the corner cases a
// person hits on these forms). Nothing here touches another store: the guard
// (guard.js) blocks it.
const fs = require('fs');
const path = require('path');
const { expectThat } = require('./actor');
const { escapeRe } = require('./i18n');
const { RBAC_ROLES } = require('./personas');
const { auditRoleName } = require('./config');
const { activateStore, adoptStore } = require('./guard');

const vis = (loc) => loc.filter({ visible: true }).first();
const topDialog = (page) => page.locator('[role=dialog]:visible').last();

/** Types like a person: click, select what is there, type with a small delay. */
async function typeInto(page, locator, text, delay = 25) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click();
  await page.keyboard.press('ControlOrMeta+A');
  if (String(text) === '') await page.keyboard.press('Backspace');
  else await locator.pressSequentially(String(text), { delay });
}

/** DEFAULT_MENU rows [{resource, label}] in order, read from src/sidebar_menu_config.js (the role form has one row each). */
function menuRows(srcDir) {
  const s = fs.readFileSync(path.join(srcDir, 'sidebar_menu_config.js'), 'utf8');
  const start = s.indexOf('DEFAULT_MENU');
  const body = s.slice(start, s.indexOf('];', start));
  return [...body.matchAll(/resource:\s*"([a-z_]+)",\s*label:\s*"([^"]+)"/g)].map((m) => ({ resource: m[1], label: m[2] }));
}

// ---- sign-in ------------------------------------------------------------------------
async function login(a, { email, password }) {
  await a.go('/');
  const page = a.page;
  // the login form is not translated: its placeholders are English in every language
  await typeInto(page, page.getByPlaceholder(/Enter your email|البريد/), email, 10);
  await typeInto(page, page.getByPlaceholder(/Enter your password|كلمة المرور/), password, 10);
  const t0 = Date.now();
  await page.locator('form button[type=submit]').first().click();
  await page.waitForURL(/\/dashboard\//, { timeout: 45_000 });
  await page.locator('#sidebar, .sidebar').first().waitFor({ timeout: 20_000 }).catch(() => {});
  const ms = Date.now() - t0;
  a.time('Sign in (Login to first screen)', ms);
  await a.settle();
  return ms;
}

/** Opens the side menu on narrow screens (it slides off-screen rather than hiding). */
async function openSidebar(a) {
  const link = a.page.locator('#sidebar a[href^="/dashboard/"]').first();
  const box = await link.boundingBox().catch(() => null);
  const w = a.device.viewport.width;
  if (box && box.x >= 0 && box.x + box.width <= w + 1) return;
  await a.page.locator('.js-sidebar-toggle').first().click();
  await a.page.waitForTimeout(400);
}

// ---- the audit store ----------------------------------------------------------------
async function createStore(a, { cfg, ids }) {
  const page = a.page;
  const d = topDialog(page);
  await a.step('Store: open the Create Store form', async () => {
    await a.go('/dashboard/stores');
    await vis(page.getByRole('button', { name: a.T('Create', { exact: true }) })).click();
    await d.getByPlaceholder('Registered Company Name', { exact: true }).waitFor();
  });
  const tab = (t) => vis(page.locator('button').filter({ hasText: new RegExp(`^\\s*${escapeRe(t)}\\s*\\d*\\s*$`) })).click(); // tabs carry an error-count badge

  await a.step('Store: empty form is refused and lists what is missing', async () => {
    const posts = [];
    const on = (r) => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/v1/store') posts.push(r); };
    page.on('request', on);
    await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
    await page.waitForTimeout(800);
    page.off('request', on);
    const errs = await d.getByText(/is required/i).count();
    expectThat(posts.length === 0 && errs > 0, { severity: 'medium', category: 'ux', title: 'Empty store form is sent to the server instead of listing the missing fields' });
  });
  await a.step('Store: fill general info, national address and contact', async () => {
    await d.getByPlaceholder('Registered Company Name', { exact: true }).fill(cfg.storeName);
    await d.getByPlaceholder('Registered Company Name In Arabic').fill(cfg.storeNameAr);
    await d.getByPlaceholder('Code', { exact: true }).fill(ids.branchCode);
    await d.getByPlaceholder('Branch Name', { exact: true }).fill('Audit branch فرع');
    await d.getByPlaceholder('CRN').fill(ids.crNo);
    await d.getByPlaceholder('VAT NO.').fill(ids.vatNo);
    await tab('National Address');
    const na = { building_no: '1234', street_name: 'King Fahd Rd', street_name_arabic: 'طريق الملك فهد', district_name: 'Olaya', district_name_arabic: 'العليا', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '12345', additional_no: '5678' };
    for (const [k, v] of Object.entries(na)) await d.locator(`[id="national_address.${k}"]`).fill(v);
    const country = d.getByPlaceholder('Country name');
    await typeInto(page, country, 'Saudi');
    await vis(page.getByRole('option', { name: /Saudi/ })).click();
    await tab('Contact');
    await d.locator('#phone').fill(ids.phone);
    await d.locator('#email').fill(`audit-${cfg.runId}-store@${cfg.emailDomain}`);
    await tab('Settings');
    // RBAC so roles apply, RTL so Arabic reads right-to-left, products + warehouses for buying and stock transfer
    for (const label of [/^Enable RBAC Module/, /^Use RTL for Arabic/, /^Enable Products$/, /^Enable Warehouse Module$/]) {
      const c = vis(d.getByRole('checkbox', { name: label }));
      if (!(await c.isChecked())) await c.check();
    }
  }, { timed: false });
  return a.step('Store: create the audit store', async () => {
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/v1/store', { timeout: 30_000 });
    await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
    const res = await saved;
    const body = await res.json().catch(() => ({}));
    if (!body.status) throw new Error(`store not created (HTTP ${res.status()}): ${JSON.stringify(body.errors || body).slice(0, 300)}`);
    return body.result.id;
  });
}

/** Picks the audit store in the top bar's store switcher (reloads the app). */
async function switchToStore(a, storeName) {
  const page = a.page;
  await a.go('/dashboard/stores');
  await page.locator('#store-switcher-toggle').click();
  await vis(page.locator('.dropdown-item').filter({ hasText: storeName })).click();
  await page.waitForFunction((n) => localStorage.getItem('store_name') === n, storeName, { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
  await a.settle();
}

// ---- RBAC roles ---------------------------------------------------------------------
async function createRole(a, { name, perms, rows }) {
  const page = a.page;
  await a.go('/dashboard/user-roles');
  await vis(page.getByRole('button', { name: a.T('New Role') })).click();
  const d = topDialog(page);
  await typeInto(page, d.getByPlaceholder('e.g. Sales Manager'), name, 5);
  // clear every box (unticking "All" under Read clears the row's writes too), then tick the role's
  const readAll = d.locator('thead input[type=checkbox]').first();
  if (await readAll.isChecked()) await readAll.uncheck();
  const VERBS = ['read', 'create', 'update', 'delete'];
  const trs = d.locator('tbody tr');
  const n = await trs.count();
  if (n !== rows.length) throw new Error(`the role form shows ${n} rows, the sidebar menu has ${rows.length}`);
  for (const [i, { resource, label }] of rows.entries()) {
    const p = perms[resource];
    if (!p) continue;
    const row = trs.nth(i);
    const shown = (await row.locator('td').first().innerText()).trim();
    if (shown !== label) throw new Error(`role form row ${i} is "${shown}", expected "${label}"`);
    const boxes = row.locator('input[type=checkbox]');
    for (let i = 0; i < VERBS.length; i++) if (p[VERBS[i]] && !(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
  }
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/v1/user-role');
  await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
  const res = await saved;
  const body = await res.json().catch(() => ({}));
  if (!body.status && !body.result) throw new Error(`role not created (HTTP ${res.status()}): ${JSON.stringify(body.errors || body).slice(0, 300)}`);
  // the saved role really carries the boxes that were ticked
  const saved2 = body.result?.permissions || [];
  const wrong = Object.entries(perms).filter(([r, p]) => {
    const s = saved2.find((x) => x.resource === r);
    return !s || ['read', 'create', 'update', 'delete'].some((v) => !!s[v] !== !!p[v]);
  });
  expectThat(!saved2.length || !wrong.length, {
    severity: 'high', category: 'permission', title: 'Saved RBAC role does not match the boxes ticked on the User Roles form',
    detail: 'Mismatched resources: ' + wrong.map(([r]) => r).join(', '),
  });
  await a.page.keyboard.press('Escape').catch(() => {});
  return body.result?.id;
}

// ---- users --------------------------------------------------------------------------
function auditPhone(email) {
  let h = 0;
  for (const c of String(email)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return '05' + String(h % 1e8).padStart(8, '0');
}

async function openUserForm(a) {
  await a.go('/dashboard/users');
  await vis(a.page.getByRole('button', { name: a.T('Create', { exact: true }) })).click();
  const d = topDialog(a.page);
  await d.locator('#name1').waitFor();
  return d;
}

async function fillAccount(a, d, { name, email, password, mob }) {
  await typeInto(a.page, d.locator('#name1'), name, 5);
  await typeInto(a.page, d.locator('#email1'), email, 5);
  await typeInto(a.page, d.locator('#password1'), password, 5);
  await typeInto(a.page, d.locator('#mob1'), mob, 5);
}

async function permissionsTab(a, d) {
  await vis(d.locator('button').filter({ hasText: /^\s*Permissions\s*$/ })).click();
}

async function createUser(a, { persona, email, password, storeName, roleName, roleIds = {} }) {
  const page = a.page;
  const d = await openUserForm(a);
  await fillAccount(a, d, { name: persona.name, email, password, mob: auditPhone(email) });
  await permissionsTab(a, d);
  await vis(d.locator('select').filter({ has: page.locator('option[value="SalesMan"]') })).selectOption(persona.baseRole);
  await vis(d.getByRole('button', { name: /Add Stores|Manage Stores/ })).click();
  await typeInto(page, vis(d.getByPlaceholder('Search stores...')), storeName, 5);
  await vis(d.locator('label').filter({ hasText: storeName }).locator('input[type=checkbox]')).check();
  await vis(d.getByRole('button', { name: /Apply/ })).click();
  let assignedInUi = false;
  if (roleName) {
    const rbac = d.getByPlaceholder('Search and assign roles...');
    // the field appears once the form has checked the picked store's "Enable RBAC Module" setting
    if (await rbac.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
      await typeInto(page, rbac, roleName.split(' ').slice(-1)[0], 20);
      await vis(page.getByRole('option', { name: new RegExp(escapeRe(roleName)) })).click();
      assignedInUi = true;
    } else {
      a.finding({
        severity: 'high', category: 'bug',
        title: 'Users form never offers RBAC roles, so roles cannot be assigned in the UI',
        detail: 'The store has "Enable RBAC Module" on (settings.enable_rbac_module = true), but the Create User form shows no "RBAC Roles" field. ' +
          'src/user/create.js asks GET /v1/store/<id>?select=id,enable_rbac_module and reads data.result.enable_rbac_module, while pos-rest keeps the flag in result.settings.enable_rbac_module, ' +
          'so rbacEnabled is always false. The audit assigned the role through the API (PUT /v1/user/<id> role_ids) to carry on.',
        screenshot: await a.shot('no-rbac-field'),
      });
    }
  }
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/v1/user', { timeout: 20_000 });
  await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
  const res = await saved;
  const body = await res.json().catch(() => ({}));
  if (!body.status) throw new Error(`user not created (HTTP ${res.status()}): ${JSON.stringify(body.errors || body).slice(0, 300)}`);
  await page.keyboard.press('Escape').catch(() => {});
  const userId = body.result?.id;
  if (roleName && !assignedInUi && userId) await assignRoleByApi(a, { userId, roleId: roleIds[roleName] });
  return userId;
}

/** Setup fallback only: adds an RBAC role to a user this run created, through the API. */
async function assignRoleByApi(a, { userId, roleId }) {
  if (!roleId) throw new Error('no role id to assign');
  const cur = await a.api('GET', `/v1/user/${userId}`);
  const u = cur.json?.result;
  if (!u) throw new Error(`could not read user ${userId}: HTTP ${cur.status}`);
  const res = await a.api('PUT', `/v1/user/${userId}`, {
    name: u.name, email: u.email, mob: u.mob, role: u.role, admin: false,
    store_ids: u.store_ids, store_id: (u.store_ids || [])[0], role_ids: [...new Set([...(u.role_ids || []), roleId])],
  });
  if (res.status !== 200 || !res.json?.status) throw new Error(`assigning the role failed: HTTP ${res.status} ${JSON.stringify(res.json?.errors || {}).slice(0, 200)}`);
}

/** Corner cases on the user form: invalid email, short password, duplicate email. Nothing may be saved. */
async function userFormEdgeCases(a, { existingEmail, cfg }) {
  const page = a.page;
  let posts = [];
  const on = async (r) => {
    if (r.request().method() === 'POST' && new URL(r.url()).pathname === '/v1/user') posts.push({ status: r.status(), body: await r.json().catch(() => ({})) });
  };
  page.on('response', on);
  a.expectNetwork({ path: /^\/v1\/user$/ });
  await a.step('Users: invalid email and 3-character password are refused', async () => {
    const d = await openUserForm(a);
    // still inside the run's audit namespace (the guard allows nothing else), but not a valid address
    await fillAccount(a, d, { name: 'x', email: `audit-${cfg.runId}-bad email@${cfg.emailDomain}`, password: 'abc', mob: '05' });
    await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
    await page.waitForTimeout(1200);
    const ok = posts.filter((p) => p.body?.status);
    const leaked = posts.find((p) => /"password":"\$2[aby]\$/.test(JSON.stringify(p.body || {})));
    if (leaked)
      a.finding({ severity: 'high', category: 'security', title: 'POST /v1/user returns the password hash', detail: 'The create-user response carries the bcrypt hash in result.password; the API should never send password hashes to the browser.' });
    const r0 = ok[0]?.body?.result || {};
    expectThat(ok.length === 0, { severity: 'high', category: 'security', title: 'User form saves an invalid email or a 3-character password',
      detail: `Saved user ${r0.id}: email "${r0.email}", mob "${r0.mob}", password "abc" accepted (no client or server validation).` });
    expectThat(await d.isVisible(), { severity: 'medium', category: 'ux', title: 'User form closes on invalid input instead of showing the errors' });
    await page.keyboard.press('Escape').catch(() => {});
  }, { optional: true });
  await a.step('Users: an email already in use is refused', async () => {
    posts = [];
    const d = await openUserForm(a);
    await fillAccount(a, d, { name: 'Audit duplicate', email: existingEmail, password: cfg.password, mob: '0551112233' });
    await vis(d.getByRole('button', { name: 'Create', exact: true })).click();
    await page.waitForTimeout(1500);
    const ok = posts.filter((p) => p.body?.status);
    expectThat(ok.length === 0, { severity: 'high', category: 'data', title: 'A second user can be created with an email already in use' });
    await page.keyboard.press('Escape').catch(() => {});
  }, { optional: true });
  page.off('response', on);
}

/** Local development only: switch to the store of an earlier run with the same AUDIT_RUN_ID and reuse its users. */
async function reuseStore(a, { cfg, personas, emails, guard, allowEmail, users }) {
  await switchToStore(a, cfg.storeName);
  const { sid, name } = await a.page.evaluate(() => ({ sid: localStorage.getItem('store_id'), name: localStorage.getItem('store_name') }));
  adoptStore(guard, sid, name);
  activateStore(guard, sid);
  for (const p of personas.filter((x) => x.id !== 'owner')) {
    allowEmail(guard, emails[p.id]);
    users.push({ role: p.id, email: emails[p.id] });
  }
  return { storeId: sid };
}

/** Runs the whole setup as the owner. Returns {storeId, roles: {personaId: roleName}}. */
async function setupStore(a, { cfg, ids, personas, emails, srcDir, guard, allowEmail, users }) {
  const storeId = await createStore(a, { cfg, ids });
  if (!storeId || !guard.storeId) throw new Error('the audit store was not created');
  await a.step('Store: switch to the audit store in the top bar', () => switchToStore(a, cfg.storeName));
  const sid = await a.page.evaluate(() => localStorage.getItem('store_id'));
  if (sid !== guard.storeId) throw new Error(`store switcher selected ${sid}, not the audit store ${guard.storeId}`);
  activateStore(guard, sid);
  await a.checkScreen('stores');
  const rows = menuRows(srcDir);
  const roles = {};
  const roleIds = {};
  for (const p of personas.filter((x) => x.rbac)) {
    const name = auditRoleName(cfg.runId, RBAC_ROLES[p.rbac].label);
    const id = await a.step(`Roles: owner creates the "${RBAC_ROLES[p.rbac].label}" role`, () => createRole(a, { name, perms: RBAC_ROLES[p.rbac].perms, rows }), { timed: false });
    roles[p.id] = name;
    roleIds[name] = id;
  }
  await a.checkScreen('user roles');
  for (const p of personas.filter((x) => x.id !== 'owner')) {
    allowEmail(guard, emails[p.id]);
    await a.step(`Users: owner hires the ${p.label}`, () => createUser(a, { persona: p, email: emails[p.id], password: cfg.password, storeName: cfg.storeName, roleName: roles[p.id], roleIds }), { timed: false });
    users.push({ role: p.id, email: emails[p.id] });
  }
  await a.checkScreen('users');
  const staff = personas.find((x) => x.id !== 'owner');
  if (staff) await userFormEdgeCases(a, { existingEmail: emails[staff.id], cfg });
  return { storeId: guard.storeId, roles };
}

module.exports = { reuseStore, vis, topDialog, typeInto, login, openSidebar, createStore, switchToStore, createRole, createUser, userFormEdgeCases, setupStore, menuRows, auditPhone };
