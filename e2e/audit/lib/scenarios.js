// What each persona does in a working day in a StartPOS store, done in the browser the
// way a person does it (click, type with a small delay, pick the type-ahead
// suggestion), with the corner cases a busy shop produces: empty and invalid input,
// very long and Arabic names, HTML in names, zero / negative / huge numbers, double
// taps, going back after saving, screens and API calls the role should not have.
//
// Labels are matched in English and Arabic (a.T reads the app's own locale files); form
// fields are found by their ids where the app has them, so the same scenario runs in
// both languages. A failed expectation is a product finding; a control the script could
// not find is a "harness" finding with a screenshot, so the two can be told apart.
const { expectThat, sleep } = require('./actor');
const { escapeRe } = require('./i18n');
const { addProbeStore } = require('./guard');
const { GUARDED_SCREENS, screenExpectation, API_PROBES, can } = require('./personas');
const { vis, topDialog, typeInto, openSidebar } = require('./setup');

const LONG_EN = 'Extra long product name to test wrapping on invoices and narrow phone screens 1234567890';
const LONG_AR = 'اسم منتج طويل جداً لاختبار التفاف النص في الفواتير وشاشات الجوال الضيقة';
const TRICKY = `O'Brien & "Sons" <b>bold</b> <img src=x onerror=alert(1)>`;
const PRODUCT_SEARCH = 'Part No. | Name | Name in Arabic | Brand | Country';
const CUSTOMER_SEARCH = 'Customer Name / Mob / VAT # / ID';
const VENDOR_SEARCH = 'Vendor Name / Mob / VAT # / ID';

// a short tag unique to this cell, so records made on different devices never collide
const tag = (a) => `${a.cfg.runId.slice(-4)}${a.role.id.slice(0, 2)}${a.device.id.replace(/[^a-z0-9]/gi, '').slice(-4)}${a.lang}${Math.floor(Math.random() * 1e4)}`.toUpperCase();
// steps include typing at human speed, so they are not timed as a whole; what the user waits for
// (a save, a list opening, a search) is timed on its own with a.time
const step = (a, name, fn, o = {}) => a.step(name, fn, { timed: false, ...o });
const pathOf = (url) => { try { return new URL(url).pathname; } catch (_) { return url; } };

/** The Create / Save button of a dialog (the app labels it "Create" for new records). */
const createButton = (a, scope) => vis(scope.getByRole('button', { name: a.T('Create', { exact: true }) }));
const ph = (a, scope, en) => scope.getByPlaceholder(a.T(en, { exact: true }));

/** Opens a list screen's Create form; returns the dialog. */
async function openCreate(a, route, button = 'Create') {
  await a.go(route);
  await vis(a.page.getByRole('button', { name: a.T(button, { exact: true }) })).click();
  const d = topDialog(a.page);
  await d.waitFor();
  await sleep(300);
  return d;
}

/** Watches the API writes of one kind; `.ok()` = how many the server accepted. */
function watchWrites(a, method, re) {
  const seen = [];
  const on = async (r) => {
    if (r.request().method() !== method || !re.test(pathOf(r.url()))) return;
    let body = null;
    try { body = await r.json(); } catch (_) { /* not json */ }
    seen.push({ status: r.status(), body });
  };
  a.page.on('response', on);
  return {
    seen,
    ok: () => seen.filter((s) => s.status < 300 && s.body && s.body.status !== false).length,
    last: () => seen[seen.length - 1],
    stop: () => a.page.off('response', on),
    reset: () => { seen.length = 0; },
  };
}

/** Clicks and waits for the matching API write (or `ms` without one). Returns {status, body} or null. */
async function clickAndCapture(a, button, method, re, ms = 20_000, label = '') {
  const t0 = Date.now();
  const res = a.page.waitForResponse((r) => r.request().method() === method && re.test(pathOf(r.url())), { timeout: ms }).catch(() => null);
  await button.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await button.click({ timeout: 6000 });
  } catch (e) {
    if (!/intercepts pointer events/.test(String(e.message))) throw e;
    a.finding({ severity: 'medium', category: 'layout', title: 'A message banner covers the form\'s Create button', detail: 'The validation / error banner at the top of the form sits over the Create button, so it cannot be clicked until the banner goes away. ' + (String(e.message).match(/<[^>]+> (?:from <[^>]+> subtree )?intercepts pointer events/) || [''])[0].slice(0, 200), screenshot: await a.shot('covered-create') });
    await button.click({ force: true });
  }
  const r = await res;
  if (!r) return null;
  a.time(label || `Save: ${method} ${pathOf(r.url()).replace(/\/[0-9a-f]{24}/g, '/:id')}`, Date.now() - t0);
  let body = null;
  try { body = await r.json(); } catch (_) { /* not json */ }
  return { status: r.status(), body };
}

/** How many validation messages the form shows. */
async function errorsShown(scope) {
  const byClass = await scope.locator('.invalid-feedback, .text-danger, .is-invalid, [role=alert], .alert-danger').filter({ visible: true }).count();
  if (byClass) return byClass;
  return scope.page().getByText(/is required|required|invalid|please fix|مطلوب|غير صالح|خطأ/i).filter({ visible: true }).count();
}

/** Picks "cash" in the form's first payment-method select, as a cashier does. */
async function payCash(a, scope) {
  const method = scope.locator('select').filter({ has: a.page.locator('option[value="bank_cheque"]') }).filter({ visible: true }).first();
  if (await method.isVisible().catch(() => false)) await method.selectOption('cash');
}

/** Clicks like a person; when something covers the control, that is a layout finding (then it clicks through). */
async function clickOrReport(a, loc, what) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await loc.click({ timeout: 6000 });
  } catch (e) {
    // what sits on top of the control's centre (a banner, a menu, another row)?
    const cover = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top || top === el || el.contains(top)) return '';
      return `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}${top.className && typeof top.className === 'string' ? '.' + top.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} "${(top.innerText || '').trim().slice(0, 60)}"`;
    }).catch(() => '');
    if (!cover && !/intercepts pointer events/.test(String(e.message))) throw e;
    const by = cover ? `covered by ${cover}` : (String(e.message).split('\n').find((l) => /intercepts pointer events/.test(l)) || '').replace(/\u001b\[[0-9;]*m/g, '').trim().slice(0, 240);
    a.finding({ severity: 'medium', category: 'layout', title: `${what} is covered by another element and cannot be tapped`, detail: `On ${a.device.label}: ${by}`, screenshot: await a.shot('covered-' + what) });
    await loc.click({ force: true });
  }
}

/** A type-ahead: type, then pick the suggestion matching `match`. */
async function pick(a, input, text, match) {
  await clickOrReport(a, input, 'A search box');
  await input.focus();
  await a.page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(String(text), { delay: 30 });
  // match null: the typed text is unique to this run, so the only suggestion is ours (long names are cut short in the menu)
  const re = match == null ? null : match instanceof RegExp ? match : new RegExp(escapeRe(match) + '(?![\\d-])', 'i');
  // Skip disabled rows (the Sales customer menu's column-header row is one).
  const all = a.page.locator('.rbt-menu [role=option], [role=listbox] [role=option]')
    .and(a.page.locator(':not(.disabled):not([aria-disabled=true])'));
  const opt = vis(re ? all.filter({ hasText: re }) : all);
  await opt.waitFor({ timeout: 12_000 });
  await opt.click();
}

/** A product search box squeezed to a sliver on a phone is unusable: report it. */
async function searchWidth(a, input, form) {
  const box = await input.boundingBox().catch(() => null);
  if (box && box.width < 120)
    a.finding({ severity: 'medium', category: 'layout', title: `${form} form: the product search box is only ${Math.round(box.width)} px wide`,
      detail: `On ${a.device.label} the "${PRODUCT_SEARCH}" box is ${Math.round(box.width)}×${Math.round(box.height)} px, too narrow to read what is typed.`, screenshot: await a.shot(form + '-search-width') });
}

// ---- data the scenarios share (made through the UI where a scenario does it, else via the API)
async function ensureProduct(a) {
  if (a.data.products.length) return a.data.products[a.data.products.length - 1];
  const t = tag(a);
  const sid = a.data.storeId;
  const r = await a.api('POST', `/v1/product?search[store_id]=${sid}`, {
    store_id: sid, name: `ZZ Audit stock item ${t}`, part_number: `ZZ-${t}`, unit: 'PC',
    product_stores: { [sid]: { store_id: sid, retail_unit_price: 100, retail_unit_price_with_vat: 115, purchase_unit_price: 60, purchase_unit_price_with_vat: 69 } },
  });
  if (!r.json?.result?.id) throw new Error(`could not add a product for the sale: HTTP ${r.status} ${JSON.stringify(r.json?.errors || {}).slice(0, 200)}`);
  const p = { id: r.json.result.id, name: r.json.result.name, part_number: r.json.result.part_number };
  a.data.products.push(p);
  return p;
}

async function ensureCustomer(a) {
  if (a.data.customers.length) return a.data.customers[a.data.customers.length - 1];
  const sid = a.data.storeId;
  const r = await a.api('POST', `/v1/customer?search[store_id]=${sid}`, { store_id: sid, name: `ZZ Audit customer ${tag(a)}`, phone: '0551230002' });
  if (!r.json?.result?.id) throw new Error(`could not add a customer for the sale: HTTP ${r.status}`);
  const c = { id: r.json.result.id, name: r.json.result.name };
  a.data.customers.push(c);
  return c;
}

// ---- permissions --------------------------------------------------------------------
async function permissionSweep(a) {
  const opened = [];
  const blockedWrongly = [];
  const createShown = [];
  for (const s of GUARDED_SCREENS) {
    const want = screenExpectation(a.role, s);
    await step(a, `Permissions: open ${s.label}`, async () => {
      await a.go(s.path);
      await sleep(400);
      const denied = await a.page.getByText('Access Denied', { exact: true }).first().isVisible().catch(() => false);
      const create = !denied && await a.page.getByRole('button', { name: a.T(s.resource === 'user_roles' ? 'New Role' : 'Create', { exact: true }) })
        .filter({ visible: true }).count().then((n) => n > 0).catch(() => false);
      if (!denied && !want.read) opened.push(s);
      if (denied && want.read) blockedWrongly.push(s);
      if (!want.create && want.read && create) createShown.push(s);
      if (!denied && !want.read && s.adminOnly)
        a.finding({ severity: 'medium', category: 'permission', url: s.path,
          title: `A role without "${s.resource}" access can open ${s.label}`,
          detail: `${a.role.label} opened ${s.path} and saw the screen, not "Access Denied".`, screenshot: await a.shot('perm-' + s.label) });
    }, { optional: true, timed: false });
  }
  if (opened.length)
    a.finding({
      severity: 'medium', category: 'permission', url: '/dashboard/*',
      title: 'Screens the RBAC role has no read permission for still open',
      detail: `${a.role.label} (${a.role.rbac ? 'RBAC role "' + a.role.rbac + '"' : a.role.baseRole}) opened: ${opened.map((s) => s.path).join(', ')}. ` +
        'Dashboard.js RouteGuard only blocks a resource that is listed in the user\'s permissions with read=false; a resource the role leaves out (or a role without permissions) is let through.',
    });
  if (blockedWrongly.length)
    a.finding({ severity: 'medium', category: 'permission', url: '/dashboard/*', title: 'Screens the role may read show "Access Denied"', detail: `${a.role.label}: ${blockedWrongly.map((s) => s.path).join(', ')}` });
  if (createShown.length)
    a.finding({
      severity: 'low', category: 'permission', url: '/dashboard/*', title: 'Create buttons are shown to roles without create permission',
      detail: `${a.role.label} sees Create on ${createShown.map((s) => s.path).join(', ')}; the UI should hide entry points the role cannot use.`,
    });
}

async function apiProbes(a) {
  const sid = a.data.storeId;
  for (const p of API_PROBES) {
    if (can(a.role, p.resource, p.verb)) continue; // only probe what the role must NOT be able to do
    await step(a, `Security: server refuses ${p.id} ${p.verb} for ${a.role.label}`, async () => {
      a.expectNetwork({ path: new RegExp('^' + escapeRe(p.path) + '$') });
      const r = await a.api(p.method, `${p.path}?search[store_id]=${sid}`, p.body({ storeId: sid, runId: a.cfg.runId, data: a.data }));
      if (r.status >= 200 && r.status < 300 && r.json?.status !== false)
        a.finding({
          severity: p.resource === 'user_roles' ? 'critical' : 'high', category: 'security', url: p.path,
          title: `Server accepts ${p.method} ${p.path} from a role without ${p.resource} ${p.verb} permission`,
          detail: `${a.role.label} (${a.role.baseRole}${a.role.rbac ? ' + RBAC "' + a.role.rbac + '"' : ''}) called the API directly with their own session and it was saved (HTTP ${r.status}, id ${r.json?.result?.id || '?'}). ` +
            'Hiding menu entries is not enough: pos-rest only checks RBAC permissions for /v1/user-role, so every other write is open to any signed-in user of the store.',
        });
      else if (r.status !== 401 && r.status !== 403)
        a.finding({ severity: 'info', category: 'security', url: p.path, title: `Server answered ${r.status} (not 403) to a forbidden ${p.id} ${p.verb}`, detail: JSON.stringify(r.json?.errors || r.json || r.error || '').slice(0, 300) });
    }, { optional: true, timed: false });
  }
}

/**
 * Store isolation: a staff user may only use the stores assigned to them (the audit store).
 * Reads naming another store id must get 403. The id is made up (no store has it), so the
 * probe can never see real data; the guard lets only GETs name it.
 */
async function crossStoreProbe(a) {
  if (a.role.baseRole === 'Admin') return; // admins may use every store
  const other = addProbeStore(a.guard);
  for (const p of ['/v1/product', '/v1/customer', '/v1/order']) {
    await step(a, `Security: ${p} with a store id the user is not assigned to is refused`, async () => {
      a.expectNetwork({ path: new RegExp('^' + escapeRe(p) + '$') });
      const r = await a.api('GET', `${p}?search[store_id]=${other}&limit=1`);
      if (r.status === 403) return;
      a.finding({
        severity: r.status >= 200 && r.status < 300 ? 'critical' : 'medium', category: 'security', url: p,
        title: r.status >= 200 && r.status < 300 ? `GET ${p} answers for a store the user is not assigned to` : `GET ${p} for a store the user is not assigned to answers ${r.status}, not 403`,
        detail: `${a.role.label} is assigned only to the audit store; GET ${p}?search[store_id]=<a store id outside their assignment> returned HTTP ${r.status}: ${JSON.stringify(r.json?.errors || (r.json?.result ? r.json.result.length + ' rows' : (r.error || ''))).slice(0, 200)}`,
      });
    }, { optional: true });
  }
}

// ---- keyboard ----------------------------------------------------------------------
// runs in the browser: what has keyboard focus and whether you can see it
function focusInfo() {
  const el = document.activeElement;
  if (!el || el === document.body) return { tag: 'body' };
  const cs = getComputedStyle(el);
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
  const name = (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.id || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);
  const r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), name, inDialog: !!el.closest('[role=dialog]'), visibleFocus: !!ring, key: el.tagName + name + Math.round(r.x) + Math.round(r.y) };
}

// ---- the scenarios -----------------------------------------------------------------
const SCENARIOS = [
  {
    id: 'signin',
    title: 'Signs in, lands on the first screen and opens the side menu',
    roles: ['owner', 'manager', 'salesman', 'cashier', 'accountant', 'viewer'],
    rotateRoles: true,
    async run(a) {
      await step(a, 'First screen after sign-in loads', async () => {
        if (!/\/dashboard\//.test(a.page.url())) await a.go('/dashboard/business-dashboard');
        await a.settle();
      });
      await a.checkScreen('first screen');
      if (a.lang === 'ar')
        await step(a, 'Arabic: the app reads right-to-left', async () => {
          const st = () => a.page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, rtl: localStorage.getItem('use_rtl_for_arabic') }));
          let s = await st();
          if (s.dir !== 'rtl') { await a.page.reload(); await a.settle(); const s2 = await st(); if (s2.dir === 'rtl') { a.finding({ severity: 'low', category: 'i18n', title: 'Right-to-left layout only applies after reloading the page', detail: `After sign-in in Arabic the page was dir="${s.dir}" until a reload, although the store has "Use RTL for Arabic" on.` }); s = s2; } }
          expectThat(s.dir === 'rtl', { severity: 'medium', category: 'i18n', title: 'Arabic UI stays left-to-right although the store has "Use RTL for Arabic" on', detail: JSON.stringify(s) });
        }, { optional: true });
      if (a.narrow)
        await step(a, 'Opens the side menu on a narrow screen', async () => {
          await openSidebar(a);
          const links = a.page.locator('#sidebar a[href^="/dashboard/"]').filter({ visible: true });
          const n = await links.count();
          expectThat(n > 0, { severity: 'high', category: 'layout', title: 'Side menu cannot be opened on a narrow screen' });
          const box = await links.first().boundingBox();
          const w = a.device.viewport.width;
          expectThat(box && box.x >= -1 && box.x + box.width <= w + 1, { severity: 'medium', category: 'layout', title: 'Side menu links are off screen after opening the menu', detail: JSON.stringify(box) });
          await a.checkScreen('side menu open');
        }, { optional: true });
    },
  },
  {
    id: 'permissions',
    title: 'Tries every guarded screen and the API writes its role should not have',
    roles: ['manager', 'salesman', 'cashier', 'accountant', 'viewer'],
    rotateRoles: true,
    async run(a) {
      await permissionSweep(a);
      await crossStoreProbe(a);
      await apiProbes(a);
    },
  },
  {
    id: 'catalog',
    title: 'Adds products with long, Arabic and tricky names and edge prices, then finds them',
    roles: ['owner', 'manager'],
    rotateRoles: true,
    async run(a) {
      const page = a.page;
      const POST = /^\/v1\/product$/;
      const posts = watchWrites(a, 'POST', POST);
      a.expectNetwork({ path: POST });
      await step(a, 'Product: empty form is refused', async () => {
        const d = await openCreate(a, '/dashboard/products');
        await d.locator('#product_name').waitFor();
        await createButton(a, d).click();
        await sleep(1000);
        expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title: 'An empty product form is saved' });
        expectThat((await errorsShown(d)) > 0, { severity: 'medium', category: 'ux', title: 'Empty product form shows no message about what is missing' });
        await page.keyboard.press('Escape');
      });
      const t = tag(a);
      const part = `ZZ-${t}`;
      const saved = await step(a, 'Product: long English + Arabic name with prices saves', async () => {
        const d = await openCreate(a, '/dashboard/products');
        await typeInto(page, d.locator('#product_name'), `${LONG_EN} ${t}`, 5);
        await typeInto(page, d.locator('#product_name_arabic'), LONG_AR, 5);
        await typeInto(page, d.locator('#product_part_no'), part, 10);
        await typeInto(page, d.locator('#product_purchase_unit_price_0'), '40', 40);
        await typeInto(page, d.locator('#product_retail_unit_price'), '75.5', 40);
        let vat = '';
        for (let i = 0; i < 10; i++) { vat = await d.locator('#product_retail_unit_price_with_vat').inputValue().catch(() => ''); if (!vat || Math.abs(Number(vat) - 86.825) < 0.01) break; await sleep(200); }
        expectThat(!vat || Math.abs(Number(vat) - 86.825) < 0.01, { severity: 'high', category: 'bug', title: 'Product form shows the wrong price with VAT', detail: `75.5 + 15% VAT shown as ${vat}` });
        const res = await clickAndCapture(a, createButton(a, d), 'POST', POST);
        if (!res?.body?.result?.id) throw new Error(`product not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
        a.data.products.push({ id: res.body.result.id, name: res.body.result.name, part_number: res.body.result.part_number || part });
        await a.settle();
        return res.body.result;
      });
      await step(a, 'Product: HTML and quotes in the name are stored as text, not run', async () => {
        let dialogs = 0;
        const onDialog = (dl) => { dialogs++; dl.dismiss().catch(() => {}); };
        page.on('dialog', onDialog);
        const d = await openCreate(a, '/dashboard/products');
        await typeInto(page, d.locator('#product_name'), `${TRICKY} ${t}`, 3);
        await typeInto(page, d.locator('#product_part_no'), `ZZX-${t}`, 10);
        const res = await clickAndCapture(a, createButton(a, d), 'POST', POST);
        await a.go('/dashboard/products');
        await sleep(800);
        page.off('dialog', onDialog);
        expectThat(dialogs === 0, { severity: 'critical', category: 'security', title: 'HTML in a product name runs as script (stored XSS)' });
        expectThat(!res || res.status < 500, { severity: 'medium', category: 'bug', title: 'Product name with quotes and HTML gives a server error', detail: JSON.stringify(res?.body || '').slice(0, 300) });
      }, { optional: true });
      await step(a, 'Product: negative price is refused', async () => {
        posts.reset();
        const d = await openCreate(a, '/dashboard/products');
        await typeInto(page, d.locator('#product_name'), `ZZ negative price ${t}`, 5);
        await typeInto(page, d.locator('#product_part_no'), `ZZN-${t}`, 10);
        await typeInto(page, d.locator('#product_retail_unit_price'), '-5', 40);
        await createButton(a, d).click();
        await sleep(1500);
        const ok = posts.ok();
        expectThat(ok === 0, { severity: 'high', category: 'data', title: 'A product with a negative selling price is saved', detail: 'Retail unit price -5 was accepted by the form and the API.' });
        await page.keyboard.press('Escape');
      }, { optional: true });
      await step(a, 'Product: a part number already in use is refused', async () => {
        posts.reset();
        const d = await openCreate(a, '/dashboard/products');
        await typeInto(page, d.locator('#product_name'), `ZZ copycat ${t}`, 5);
        await typeInto(page, d.locator('#product_part_no'), part, 10);
        await createButton(a, d).click();
        await sleep(1500);
        expectThat(posts.ok() === 0, { severity: 'medium', category: 'data', title: 'A second product can be saved with a part number already in use', detail: `Part number ${part}` });
        await page.keyboard.press('Escape');
      }, { optional: true });
      if (saved)
        await step(a, 'Product: found again by part number from the list', async () => {
          await a.go('/dashboard/products');
          const search = vis(page.locator('input[type=text], input:not([type])').filter({ visible: true }));
          await search.waitFor();
          const t0 = Date.now();
          const box = page.getByPlaceholder(/Part|رقم/).filter({ visible: true }).first();
          const field = (await box.count()) ? box : search;
          await typeInto(page, field, part, 20);
          await page.getByText(part, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 15_000 }).catch(() => {});
          a.time('Products list: search by part number', Date.now() - t0);
          await a.checkScreen('products list');
        }, { optional: true, timed: false });
      posts.stop();
    },
  },
  {
    id: 'customers',
    title: 'Adds walk-in and company customers, with the mistakes people make',
    roles: ['salesman', 'owner', 'cashier'],
    rotateRoles: true,
    async run(a) {
      const page = a.page;
      const POST = /^\/v1\/customer$/;
      const posts = watchWrites(a, 'POST', POST);
      a.expectNetwork({ path: POST });
      await step(a, 'Customer: nameless form is refused', async () => {
        const d = await openCreate(a, '/dashboard/customers');
        await d.locator('#customer_name').waitFor();
        await createButton(a, d).click();
        await sleep(1000);
        expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title: 'A customer without a name is saved' });
        expectThat((await errorsShown(d)) > 0 && (await d.isVisible()), { severity: 'medium', category: 'ux', title: 'Nameless customer form shows no message about what is missing' });
        await page.keyboard.press('Escape');
      });
      const t = tag(a);
      await step(a, 'Customer: an invalid VAT number is refused', async () => {
        posts.reset();
        const d = await openCreate(a, '/dashboard/customers');
        await typeInto(page, d.locator('#customer_name'), `ZZ Audit bad VAT ${t}`, 5);
        await typeInto(page, d.locator('#customer_phone'), '0551234567', 10);
        await typeInto(page, d.locator('#customer_vat_no'), '12345', 20);
        await createButton(a, d).click();
        await sleep(1500);
        expectThat(posts.ok() === 0, { severity: 'medium', category: 'data', title: 'A customer with a 5-digit VAT number is saved', detail: 'Saudi VAT numbers have 15 digits starting and ending with 3; "12345" was accepted.' });
        await page.keyboard.press('Escape');
      }, { optional: true });
      await step(a, 'Customer: long Arabic name saves and is listed', async () => {
        posts.reset();
        const d = await openCreate(a, '/dashboard/customers');
        const name = `ZZ Audit customer ${t}`;
        await typeInto(page, d.locator('#customer_name'), name, 5);
        await typeInto(page, d.locator('#customer_name_in_arabic'), 'مؤسسة الاختبار التجارية للمواد الغذائية والاستهلاكية المحدودة', 5);
        await typeInto(page, d.locator('#customer_phone'), '0551234567', 10);
        const res = await clickAndCapture(a, createButton(a, d), 'POST', POST);
        if (!res?.body?.result?.id) throw new Error(`customer not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
        a.data.customers.push({ id: res.body.result.id, name: res.body.result.name });
        await a.go('/dashboard/customers');
        const box = ph(a, page, CUSTOMER_SEARCH).filter({ visible: true }).first();
        if (await box.count()) {
          await typeInto(page, box, t, 20);
          await page.getByText(new RegExp(escapeRe(t), 'i')).filter({ visible: true }).first().waitFor({ timeout: 15_000 });
        }
        await a.checkScreen('customers list');
      });
      posts.stop();
    },
  },
  {
    id: 'buying',
    title: 'Adds a vendor and buys stock from them',
    roles: ['manager', 'owner'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const page = a.page;
      const t = tag(a);
      const vendor = await step(a, 'Vendor: add a vendor', async () => {
        const d = await openCreate(a, '/dashboard/vendors');
        await typeInto(page, d.locator('#vendor_name'), `ZZ Audit vendor ${t}`, 5);
        await typeInto(page, d.locator('#vendor_name_arabic'), 'مورد التدقيق', 5).catch(() => {});
        await typeInto(page, d.locator('#vendor_phone'), '0557654321', 10);
        const res = await clickAndCapture(a, createButton(a, d), 'POST', /^\/v1\/vendor$/);
        if (!res?.body?.result?.id) throw new Error(`vendor not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
        a.data.vendors.push(res.body.result);
        return res.body.result;
      });
      if (!vendor) return;
      const product = await ensureProduct(a);
      await step(a, 'Purchase: buys 10 of a product from the vendor', async () => {
        const d = await openCreate(a, '/dashboard/purchases');
        await pick(a, ph(a, d, VENDOR_SEARCH).first(), vendor.name.slice(0, 20), t);
        await searchWidth(a, ph(a, d, PRODUCT_SEARCH).first(), 'Purchase');
        await pick(a, ph(a, d, PRODUCT_SEARCH).first(), product.part_number, product.part_number);
        const q = d.locator('#purchase_product_quantity_0');
        await q.waitFor();
        await typeInto(page, q, '10', 50);
        const method = d.locator('select').filter({ has: page.locator('option[value="bank_cheque"]') }).first();
        if (await method.isVisible().catch(() => false)) await method.selectOption('cash');
        const res = await clickAndCapture(a, createButton(a, d), 'POST', /^\/v1\/purchase$/, 30_000);
        expectThat(res && res.body?.status, { severity: 'high', category: 'bug', title: 'Purchase with a vendor and one product cannot be saved', detail: JSON.stringify(res?.body?.errors || res?.status || 'no request').slice(0, 300) });
        await a.settle();
        await a.checkScreen('purchase saved');
      }, { optional: true });
    },
  },
  {
    id: 'selling',
    title: 'Rings up sales: empty and wrong quantities, a double-tapped Create, Back after saving, a quotation',
    roles: ['cashier', 'salesman'],
    rotateRoles: true,
    async run(a) {
      const page = a.page;
      const form = page.locator('#sales_create_form');
      const POST = /^\/v1\/order$/;
      const posts = watchWrites(a, 'POST', POST);
      a.expectNetwork({ path: POST });
      const [product, customer] = [await ensureProduct(a), await ensureCustomer(a)];
      const saveBtn = () => form.getByRole('button', { name: a.T('Create', { exact: true }) }).last();
      const calc = () => page.waitForResponse((r) => r.url().includes('/v1/order/calculate-net-total'), { timeout: 10_000 }).catch(() => null);
      await step(a, 'Sales: open a new sale', async () => {
        await a.go('/dashboard/sales');
        await vis(page.getByRole('button', { name: a.T('Create', { exact: true }) })).click();
        await form.waitFor();
        await ph(a, form, PRODUCT_SEARCH).first().waitFor();
      });
      await step(a, 'Sales: a sale with no products is refused', async () => {
        await saveBtn().click();
        await sleep(1200);
        expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title: 'A sale without any product is saved' });
      });
      await step(a, 'Sales: pick the customer and add the product', async () => {
        await pick(a, ph(a, form, CUSTOMER_SEARCH).first(), customer.name.split(' ').slice(-1)[0], null);
        await searchWidth(a, ph(a, form, PRODUCT_SEARCH).first(), 'Sales');
        const c = calc();
        await pick(a, ph(a, form, PRODUCT_SEARCH).first(), product.part_number, product.part_number);
        await c;
        await form.locator('#sales_product_quantity_0').waitFor();
      });
      for (const [qty, title] of [['0', 'A sale with quantity 0 is saved'], ['-2', 'A sale with a negative quantity is saved']])
        await step(a, `Sales: quantity ${qty} is refused`, async () => {
          posts.reset();
          const c = calc();
          await typeInto(page, form.locator('#sales_product_quantity_0'), qty, 60);
          await c;
          await saveBtn().click();
          await sleep(1500);
          expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title, detail: `Quantity ${qty} was accepted and the sale stored.` });
          if (posts.ok()) throw new Error('sale already saved, cannot continue on this form');
          await page.locator('[role=dialog]:visible').filter({ hasNotText: /Sales Order|طلب/ }).last().press('Escape').catch(() => {});
        }, { optional: true });
      await step(a, 'Sales: a huge quantity keeps the totals readable', async () => {
        const c = calc();
        await typeInto(page, form.locator('#sales_product_quantity_0'), '99999999', 30);
        await c;
        await sleep(400);
        const overflow = await form.evaluate((f) => f.scrollWidth > f.clientWidth + 2).catch(() => false);
        expectThat(!overflow || !a.narrow, { severity: 'low', category: 'layout', title: 'Sales form scrolls sideways with a 9-digit quantity on a narrow screen' });
      }, { optional: true });
      const order = await step(a, 'Sales: sell 2 for cash with a double-tapped Create', async () => {
        posts.reset();
        const c = calc();
        await typeInto(page, form.locator('#sales_product_quantity_0'), '2', 60);
        await c;
        const method = form.locator('select').filter({ has: page.locator('option[value="bank_cheque"]') }).first();
        if (await method.isVisible().catch(() => false)) await method.selectOption('cash');
        await sleep(300);
        const t0 = Date.now();
        const first = page.waitForResponse((r) => r.request().method() === 'POST' && POST.test(pathOf(r.url())), { timeout: 30_000 });
        await saveBtn().scrollIntoViewIfNeeded();
        await saveBtn().dblclick();
        const res = await first;
        const body = await res.json().catch(() => ({}));
        a.time('Sales: Create to saved', Date.now() - t0);
        await sleep(2000);
        if (!body.status) throw new Error(`sale not saved (HTTP ${res.status()}): ${JSON.stringify(body.errors || {}).slice(0, 300)}`);
        expectThat(posts.ok() <= 1, { severity: 'high', category: 'data', title: 'Double-tapping Create saves the sale twice', detail: `${posts.ok()} orders stored for one double tap.` });
        a.data.sales.push(body.result);
        return body.result;
      });
      if (order) {
        await a.checkScreen('sale saved / preview');
        await step(a, 'Sales: Back after saving does not save again', async () => {
          posts.reset();
          await page.keyboard.press('Escape').catch(() => {});
          await page.goBack().catch(() => {});
          await a.settle();
          await sleep(800);
          expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title: 'Going Back after saving a sale stores it again' });
        }, { optional: true });
        await step(a, 'Sales: the new sale is listed', async () => {
          await a.go('/dashboard/sales');
          await page.getByText(order.code, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 15_000 });
          await a.checkScreen('sales list');
        }, { optional: true });
      }
      posts.stop();
      if (can(a.role, 'quotations', 'create'))
        await step(a, 'Quotation: quote the product to the customer', async () => {
          const d = await openCreate(a, '/dashboard/quotations');
          await pick(a, ph(a, d, CUSTOMER_SEARCH).first(), customer.name.split(' ').slice(-1)[0], null);
          await typeInto(page, ph(a, d, PRODUCT_SEARCH).first(), product.part_number, 30);
          await vis(page.locator('.rbt-menu [role=option]').filter({ hasText: product.part_number })).waitFor();
          await page.keyboard.press('Enter');
          await d.locator('#quotation_product_quantity_0').waitFor();
          const res = await clickAndCapture(a, vis(d.getByRole('button', { name: a.T('Create', { exact: true }) })), 'POST', /^\/v1\/quotation$/, 30_000);
          expectThat(res && res.body?.status, { severity: 'high', category: 'bug', title: 'Quotation with a customer and one product cannot be saved', detail: JSON.stringify(res?.body?.errors || res?.status || 'no request').slice(0, 300) });
          await a.settle();
        }, { optional: true });
    },
  },
  {
    id: 'returns',
    title: 'Takes back part of a sale and checks the payments',
    roles: ['owner', 'salesman'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const page = a.page;
      let sale = a.data.sales[a.data.sales.length - 1];
      if (!sale) {
        const [p, c] = [await ensureProduct(a), await ensureCustomer(a)];
        const sid = a.data.storeId;
        const now = new Date().toISOString();
        const r = await a.api('POST', `/v1/order?search[store_id]=${sid}`, {
          store_id: sid, date_str: now, status: 'delivered', vat_percent: 15, discount: 0, shipping_handling_fees: 0, rounding_amount: 0, auto_rounding_amount: true,
          customer_id: c.id, customer_name: c.name,
          products: [{ product_id: p.id, name: p.name, part_number: p.part_number, unit: 'PC', quantity: 2, unit_price: 100, unit_price_with_vat: 115, purchase_unit_price: 60, purchase_unit_price_with_vat: 69 }],
          payments_input: [{ date_str: now, amount: 230, method: 'cash', deleted: false }],
        });
        if (!r.json?.result?.id) throw new Error(`could not make a sale to return: HTTP ${r.status} ${JSON.stringify(r.json?.errors || {}).slice(0, 200)}`);
        sale = r.json.result;
        a.data.sales.push(sale);
      }
      const row = page.locator('table tbody tr').filter({ hasText: sale.code });
      await step(a, 'Returns: find the sale in the list', async () => {
        await a.go('/dashboard/sales');
        await row.first().waitFor({ timeout: 15_000 });
      });
      await step(a, 'Returns: return 1 of the sale', async () => {
        await vis(row.first().getByRole('button', { name: a.T('Return') })).click();
        const d = page.locator('.modal-content').filter({ hasText: a.T('Create Sales Return', { anywhere: true }) }).last();
        await d.waitFor();
        // the form renders the line table once per layout, so ids repeat: use the visible one
        const sel = vis(d.locator('#select_sales_return_product_0'));
        await sel.scrollIntoViewIfNeeded().catch(() => {});
        if (!(await sel.isChecked())) await sel.check();
        const q = vis(d.locator('#sales_return_product_quantity_0'));
        await typeInto(page, q, '5', 60);
        await payCash(a, d);
        const posts = watchWrites(a, 'POST', /^\/v1\/sales-return$/);
        a.expectNetwork({ path: /^\/v1\/sales-return$/ });
        await vis(d.getByRole('button', { name: a.T('Create', { exact: true }) })).click();
        await sleep(1500);
        expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title: 'A return of more than was sold is saved', detail: `Returned 5 of a sale of ${sale.products?.[0]?.quantity ?? 2}.` });
        posts.reset();
        await typeInto(page, q, '1', 60);
        await payCash(a, d);
        const res = await clickAndCapture(a, vis(d.getByRole('button', { name: a.T('Create', { exact: true }) })), 'POST', /^\/v1\/sales-return$/, 30_000);
        posts.stop();
        expectThat(res && res.body?.status, { severity: 'high', category: 'bug', title: 'Returning one item of a sale cannot be saved', detail: JSON.stringify(res?.body?.errors || res?.status || 'no request').slice(0, 300) });
        await a.settle();
        await a.checkScreen('sales return saved');
      }, { optional: true });
      await step(a, 'Payments: open the sales payments list', async () => {
        await a.go('/dashboard/sales-payments');
        await a.checkScreen('sales payments');
      }, { optional: true });
    },
  },
  {
    id: 'expenses',
    title: 'Records a category and expenses, with zero and negative amounts',
    roles: ['accountant', 'owner'],
    rotateRoles: true,
    async run(a) {
      const page = a.page;
      const t = tag(a);
      const catName = `ZZ Audit fuel ${t}`;
      await step(a, 'Expense category: add one', async () => {
        const d = await openCreate(a, '/dashboard/expense_category');
        await typeInto(page, d.locator('#name'), catName, 10);
        const res = await clickAndCapture(a, createButton(a, d), 'POST', /^\/v1\/expense-category$/);
        if (!res?.body?.result?.id) throw new Error(`category not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
        a.data.expenseCategoryId = res.body.result.id;
      });
      const POST = /^\/v1\/expense$/;
      const posts = watchWrites(a, 'POST', POST);
      a.expectNetwork({ path: POST });
      const fill = async (d, amount) => {
        await typeInto(page, d.locator('#description'), `audit expense ${t}`, 5);
        const method = d.locator('select').filter({ has: page.locator('option[value="cash"]') }).first();
        if (await method.isVisible().catch(() => false)) await method.selectOption('cash');
        await pick(a, ph(a, d, 'Select Categories').first(), catName.slice(-8), t);
        await typeInto(page, d.locator('#amount'), amount, 50);
      };
      for (const [amount, title] of [['0', 'An expense of 0 is saved'], ['-50', 'A negative expense is saved']])
        await step(a, `Expense: amount ${amount} is refused`, async () => {
          posts.reset();
          const d = await openCreate(a, '/dashboard/expenses');
          await fill(d, amount);
          await createButton(a, d).click();
          await sleep(1500);
          expectThat(posts.ok() === 0, { severity: 'high', category: 'data', title, detail: `Amount ${amount} was stored as an expense.` });
          await page.keyboard.press('Escape');
        }, { optional: true });
      await step(a, 'Expense: 125.50 cash saves and is listed', async () => {
        posts.reset();
        const d = await openCreate(a, '/dashboard/expenses');
        await fill(d, '125.5');
        const res = await clickAndCapture(a, createButton(a, d), 'POST', POST);
        if (!res?.body?.status) throw new Error(`expense not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
        await a.go('/dashboard/expenses');
        await a.checkScreen('expenses list');
      });
      posts.stop();
    },
  },
  {
    id: 'stock',
    title: 'Adds a warehouse and moves stock into it',
    roles: ['manager', 'owner'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const page = a.page;
      const t = tag(a);
      const whName = `ZZ Audit WH ${t}`;
      await a.go('/dashboard/warehouses');
      if (!(await page.getByRole('button', { name: a.T('Create', { exact: true }) }).filter({ visible: true }).count())) {
        a.finding({ severity: 'low', category: 'permission', title: 'Warehouses screen has no Create button for this role', detail: `${a.role.label} (${a.role.baseRole}) sees the list but cannot add a warehouse, while the role matrix allows it.`, screenshot: await a.shot('no-warehouse-create') });
        return;
      }
      await step(a, 'Warehouse: empty name refused, then one added', async () => {
        const d = await openCreate(a, '/dashboard/warehouses');
        const posts = watchWrites(a, 'POST', /^\/v1\/warehouse$/);
        a.expectNetwork({ path: /^\/v1\/warehouse$/ });
        await createButton(a, d).click();
        await sleep(1000);
        expectThat(posts.ok() === 0, { severity: 'medium', category: 'data', title: 'A warehouse without a name is saved' });
        posts.stop();
        await typeInto(page, ph(a, d, 'Warehouse name').first(), whName, 10);
        const res = await clickAndCapture(a, createButton(a, d), 'POST', /^\/v1\/warehouse$/);
        if (!res?.body?.result?.id) throw new Error(`warehouse not saved (HTTP ${res?.status}): ${JSON.stringify(res?.body?.errors || {}).slice(0, 300)}`);
      });
      const product = await ensureProduct(a);
      await step(a, 'Stock transfer: move 1 into the new warehouse', async () => {
        const d = await openCreate(a, '/dashboard/stock-transfers');
        await pick(a, ph(a, d, PRODUCT_SEARCH).first(), product.part_number, product.part_number);
        await d.locator('#stocktransfer_product_quantity_0').waitFor();
        const to = d.locator('#to_warehouse_id');
        const label = await to.locator('option').evaluateAll((os, n) => (os.find((o) => o.textContent.includes(n)) || {}).textContent, whName);
        if (!label) throw new Error('the new warehouse is not offered as a destination');
        await to.selectOption({ label });
        await typeInto(page, d.locator('#stocktransfer_product_quantity_0'), '1', 60);
        const res = await clickAndCapture(a, vis(d.getByRole('button', { name: a.T('Create', { exact: true }) })), 'POST', /^\/v1\/stock-transfer$/, 30_000);
        expectThat(res && res.body?.status, { severity: 'high', category: 'bug', title: 'Stock transfer to a new warehouse cannot be saved', detail: JSON.stringify(res?.body?.errors || res?.status || 'no request').slice(0, 300) });
        await a.settle();
      }, { optional: true });
    },
  },
  {
    id: 'reports',
    title: 'Opens the statistics, ledger, accounts and dashboards',
    roles: ['accountant', 'owner', 'manager', 'viewer'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const screens = [
        ['/dashboard/business-dashboard', 'dashboard', 'Business dashboard'],
        ['/dashboard/stats', 'stats', 'Statistics'],
        ['/dashboard/ledger', 'ledger', 'Ledger'],
        ['/dashboard/accounts', 'accounts', 'Accounts'],
        ['/dashboard/analytics', 'analytics', 'Analytics'],
      ];
      for (const [p, resource, label] of screens) {
        if (!can(a.role, resource, 'read')) continue;
        await step(a, `Reports: open ${label}`, async () => {
          const t0 = Date.now();
          await a.go(p);
          a.time(`Open ${label}`, Date.now() - t0);
          await a.checkScreen(label);
        }, { optional: true, timed: false });
      }
    },
  },
  {
    id: 'language',
    title: 'Switches the language in the top bar and back',
    roles: ['owner', 'salesman'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const page = a.page;
      const other = a.lang === 'ar' ? 'en' : 'ar';
      const state = () => page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
      const name = (code) => (code === 'ar' ? /العربية|Arabic/ : /English/);
      const choose = async (code) => {
        const dd = page.locator('#language-dropdown').filter({ visible: true });
        if (await dd.count()) {
          await dd.first().click();
          await vis(page.locator('.dropdown-item').filter({ hasText: name(code) })).click();
        } else {
          // phones: the top bar folds into the ⋮ menu, which has language buttons
          await vis(page.locator('button[aria-label="Open menu"]')).click();
          await vis(page.getByRole('button', { name: name(code) })).click();
        }
        await sleep(600);
      };
      await a.go('/dashboard/customers');
      const switched = await step(a, `Language: switch to ${other}`, async () => {
        await choose(other);
        const s = await state();
        expectThat(s.lang === other, { severity: 'medium', category: 'i18n', title: 'Language menu does not change the page language', detail: JSON.stringify(s) });
        expectThat(s.dir === (other === 'ar' ? 'rtl' : 'ltr'), { severity: 'medium', category: 'i18n', title: `Switching to ${other === 'ar' ? 'Arabic' : 'English'} leaves the text direction ${s.dir}`, detail: 'The store has "Use RTL for Arabic" on.' });
        await a.checkScreen('after language switch');
        return true;
      }, { optional: true });
      if (!switched) return;
      await step(a, 'Language: survives a reload', async () => {
        await page.reload();
        await a.settle();
        const s = await state();
        expectThat(s.lang === other, { severity: 'low', category: 'i18n', title: 'Chosen language is lost on reload' });
      }, { optional: true });
      await step(a, `Language: switch back to ${a.lang}`, async () => {
        await choose(a.lang);
        const s = await state();
        expectThat(s.lang === a.lang, { severity: 'medium', category: 'i18n', title: 'Language menu does not change the page language', detail: JSON.stringify(s) });
      }, { optional: true });
    },
  },
  {
    id: 'keyboard',
    title: 'Fills a form with the keyboard only',
    roles: ['owner'],
    devices: ['desktop'],
    standardCells: 1,
    async run(a) {
      const page = a.page;
      await step(a, 'Keyboard: tab through the Create Customer form', async () => {
        const d = await openCreate(a, '/dashboard/customers');
        await d.locator('#customer_name').focus();
        const seen = [];
        for (let i = 0; i < 20; i++) {
          seen.push(await page.evaluate(focusInfo));
          await page.keyboard.press('Tab');
        }
        const escaped = seen.filter((f) => f.tag === 'body' || !f.inDialog);
        const noRing = [...new Map(seen.filter((f) => f.tag !== 'body' && !f.visibleFocus).map((f) => [f.key, f])).values()];
        expectThat(!escaped.length, { severity: 'medium', category: 'a11y', title: 'Tab leaves the open dialog (focus is not kept inside the form)', detail: escaped.slice(0, 5).map((f) => f.tag + ' ' + f.name).join('; ') });
        if (noRing.length > 2)
          a.finding({ severity: 'low', category: 'a11y', title: 'Some form controls show no visible focus when tabbed to', detail: noRing.slice(0, 8).map((f) => `${f.tag} "${f.name}"`).join('; ') });
        await page.keyboard.press('Escape');
        await sleep(300);
        expectThat(!(await d.isVisible().catch(() => false)), { severity: 'low', category: 'a11y', title: 'Escape does not close the Create Customer dialog' });
      }, { optional: true });
    },
  },
  {
    id: 'browse',
    title: 'Looks things up: lists, search and paging',
    roles: ['viewer', 'cashier', 'accountant'],
    rotateRoles: true,
    standardCells: 2,
    async run(a) {
      const page = a.page;
      for (const [p, resource, label] of [['/dashboard/products', 'products', 'Products'], ['/dashboard/sales', 'sales', 'Sales'], ['/dashboard/purchases', 'purchases', 'Purchases']]) {
        if (!can(a.role, resource, 'read')) continue;
        await step(a, `Browse: open ${label} list`, async () => {
          const t0 = Date.now();
          await a.go(p);
          a.time(`Open ${label} list`, Date.now() - t0);
          await a.checkScreen(label + ' list');
          const next = page.getByRole('button', { name: /^(›|Next|التالي)$/ }).or(page.locator('a.page-link').filter({ hasText: /^(›|Next|التالي)$/ })).filter({ visible: true }).first();
          if (await next.isEnabled().catch(() => false)) { await next.click().catch(() => {}); await a.settle(); }
        }, { optional: true, timed: false });
      }
    },
  },
];

module.exports = { SCENARIOS, focusInfo, tag, watchWrites };
