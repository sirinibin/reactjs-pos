// Helpers shared by the "remaining features" specs: store settings,
// users/roles, procurement, automobile and misc sales screens.
const { expect } = require('@playwright/test');
const { apiClient, uniq } = require('../api');
const { typeInto, escapeRe } = require('./purchase');

/** Raw call without asserting HTTP 200, for refusals. Returns { status, body }. */
async function rawCall(request, token, method, path, data, storeId) {
  const url = storeId ? `${path}${path.includes('?') ? '&' : '?'}search[store_id]=${storeId}` : path;
  const res = await request.fetch(url, { method, headers: { Authorization: token }, data });
  let body;
  try { body = await res.json(); } catch (_) { body = {}; }
  return { status: res.status(), body };
}

/**
 * The API client from ../api plus calls for store settings.
 */
function miscApi(request) {
  const api = apiClient(request);
  return Object.assign(api, {
    raw: (method, path, data) => rawCall(request, api.token, method, path, data, api.storeId),

    async getStore() {
      return (await this.get(`/v1/store/${this.storeId}`)).result;
    },

    /**
     * Sets store.settings keys on the e2e store (fresh read, full PUT like the
     * Store Settings screen does) and returns a function that puts back the
     * previous values of only those keys.
     */
    async setStoreSettings(patch) {
      const store = await this.getStore();
      const before = {};
      for (const k of Object.keys(patch)) before[k] = store.settings?.[k];
      store.settings = { ...(store.settings || {}), ...patch };
      await this.put(`/v1/store/${this.storeId}`, store);
      return async () => {
        const fresh = await this.getStore();
        fresh.settings = { ...(fresh.settings || {}), ...before };
        await this.put(`/v1/store/${this.storeId}`, fresh);
      };
    },
  });
}

/**
 * The one extra store these specs share (found by code, created once), for
 * checks that need a store the e2e user is not limited to. pos-rest gives every
 * store its own database, so never create more than this one.
 */
const SECOND_STORE_CODE = 'E2EX2';
async function secondStore(request, token) {
  const headers = { Authorization: token };
  const list = await (await request.get(`/v1/store?search[code]=${SECOND_STORE_CODE}&limit=50`, { headers })).json();
  const found = (list.result || []).find((s) => s.code === SECOND_STORE_CODE && !s.deleted);
  if (found) return found;
  const serials = {};
  for (const k of ['sales', 'sales_return', 'purchase', 'purchase_return', 'purchase_order', 'quotation', 'customer', 'vendor']) {
    serials[`${k}_serial_number`] = { prefix: `X${k.slice(0, 2).toUpperCase()}-`, start_from_count: 1, padding_count: 4 };
  }
  const res = await request.post('/v1/store', {
    headers,
    data: {
      ...serials,
      name: 'E2E Second Store', name_in_arabic: 'المتجر الثاني', code: SECOND_STORE_CODE, branch_name: 'Second Branch',
      country_code: 'SA', business_category: 'Trading', registration_number: '2020202020', registration_number_in_arabic: '٢٠٢٠٢٠٢٠٢٠',
      email: 'second@startpos.test', phone: '0500000002', phone_in_arabic: '٠٥٠٠٠٠٠٠٠٢',
      vat_no: '300000000000003', vat_no_in_arabic: '٣٠٠٠٠٠٠٠٠٠٠٠٠٠٣', vat_percent: 15,
      national_address: {
        building_no: '4321', building_no_arabic: '٤٣٢١', street_name: 'Olaya Street', street_name_arabic: 'شارع العليا',
        district_name: 'Olaya', district_name_arabic: 'العليا', city_name: 'Riyadh', city_name_arabic: 'الرياض',
        zipcode: '12345', zipcode_arabic: '١٢٣٤٥', additional_no: '1111', unit_no: '2',
      },
      zatca: { phase: '1' },
    },
  });
  const body = await res.json();
  expect(res.status(), JSON.stringify(body.errors)).toBe(200);
  return body.result;
}

/** Opens an item of the signed-in user's menu (top bar on desktop, ⋮ drawer on phones). */
async function openUserMenuItem(page, label) {
  const toggle = page.locator('#user-menu-toggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.getByRole('button', { name: label }).or(page.locator('.dropdown-item', { hasText: label })).first().click();
  } else {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: label }).last().click();
  }
}

/**
 * Headers that make one sign-in come from its own client address.
 * pos-rest allows 10 /v1/authorize calls per client IP (X-Real-IP) per
 * 15 minutes, counting successful logins too, and the config gives the whole
 * run one address. The specs that sign in as freshly created users (about a
 * dozen, mostly users-roles.spec.js at the end of a run) would otherwise hit
 * HTTP 429 depending on how many logins earlier specs made in the same window.
 * Each of those users is a separate person, so a separate address is real.
 */
function freshClientHeaders(use = {}) {
  const b = () => Math.floor(Math.random() * 254) + 1;
  return { ...(use.extraHTTPHeaders || {}), 'X-Real-IP': `10.${b()}.${b()}.${b()}` };
}

/**
 * Signs in through the real login page in a fresh browser context (no saved
 * session) and returns { context, page }. The caller closes the context.
 */
async function signInFresh(browser, testInfo, email, password) {
  const use = testInfo.project.use;
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: use.baseURL,
    extraHTTPHeaders: freshClientHeaders(use),
    viewport: use.viewport,
    hasTouch: use.hasTouch,
    isMobile: use.isMobile,
    deviceScaleFactor: use.deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  const auth = page.waitForResponse((r) => r.url().includes('/v1/authorize'));
  await page.getByRole('button', { name: 'Login' }).click();
  const res = await auth;
  return { context, page, authStatus: res.status() };
}

/** Records the responses of non-GET calls whose URL matches `re`. */
function recordWrites(page, re) {
  const seen = [];
  page.on('response', (r) => {
    if (r.request().method() !== 'GET' && re.test(r.url())) seen.push(r);
  });
  return seen;
}

/** A unique e-mail address on the reserved test domain. */
function uniqEmail(prefix = 'e2e') {
  return `${prefix}.${uniq('U').toLowerCase()}@startpos.test`;
}

module.exports = { secondStore, miscApi, rawCall, openUserMenuItem, signInFresh, freshClientHeaders, recordWrites, uniqEmail, typeInto, escapeRe, uniq };
