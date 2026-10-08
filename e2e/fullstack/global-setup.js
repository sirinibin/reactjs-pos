// Prepares the database and a signed-in browser session before the specs run.
//
// The admin user itself is created by `go run ./e2e/seed` in pos-rest; here we
// make sure that user has a store (creating one through the API like the Stores
// screen does) and save a signed-in browser state for the specs that need it.
const { chromium, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { E2E_EMAIL, E2E_PASSWORD, AUTH_STATE } = require('./fixtures');

const STORE = {
  name: 'E2E Test Store',
  name_in_arabic: 'متجر الاختبار',
  code: 'E2E1',
  branch_name: 'E2E Branch',
  country_code: 'SA',
  business_category: 'Trading',
  registration_number: '1010101010',
  registration_number_in_arabic: '١٠١٠١٠١٠١٠',
  email: 'store@startpos.test',
  phone: '0500000001',
  phone_in_arabic: '٠٥٠٠٠٠٠٠٠١',
  vat_no: '300000000000003',
  vat_no_in_arabic: '٣٠٠٠٠٠٠٠٠٠٠٠٠٠٣',
  vat_percent: 15,
  national_address: {
    building_no: '1234', building_no_arabic: '١٢٣٤',
    street_name: 'King Fahd Road', street_name_arabic: 'طريق الملك فهد',
    district_name: 'Olaya', district_name_arabic: 'العليا',
    city_name: 'Riyadh', city_name_arabic: 'الرياض',
    zipcode: '12345', zipcode_arabic: '١٢٣٤٥',
    additional_no: '5678', unit_no: '1',
  },
  zatca: { phase: '1' },
};
for (const k of ['sales', 'sales_return', 'purchase', 'purchase_return', 'purchase_order', 'quotation', 'customer', 'vendor']) {
  STORE[`${k}_serial_number`] = { prefix: `${k.slice(0, 3).toUpperCase()}-`, start_from_count: 1, padding_count: 4 };
}

async function apiLogin(api) {
  const auth = await api.post('/v1/authorize', { data: { email: E2E_EMAIL, password: E2E_PASSWORD } });
  const authBody = await auth.json();
  if (!auth.ok() || !authBody.status) {
    throw new Error(`E2E login failed (HTTP ${auth.status()}): ${JSON.stringify(authBody.errors)}. ` +
      'Was the database seeded with `go run ./e2e/seed` in pos-rest?');
  }
  const tok = await api.post('/v1/accesstoken', { headers: { Authorization: authBody.result.code } });
  const tokBody = await tok.json();
  if (!tok.ok() || !tokBody.result?.access_token) throw new Error(`accesstoken failed: HTTP ${tok.status()}`);
  return tokBody.result.access_token;
}

module.exports = async (config) => {
  const { baseURL, extraHTTPHeaders } = config.projects[0].use;

  // Wait for the API (the CI job starts it just before the tests).
  const api = await request.newContext({ baseURL, extraHTTPHeaders });
  const deadline = Date.now() + 90_000;
  for (;;) {
    try {
      const res = await api.get('/v1/me');
      if (res.status() === 401) break;
    } catch (_) { /* not up yet */ }
    if (Date.now() > deadline) throw new Error(`API at ${baseURL} did not come up`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const token = await apiLogin(api);
  const stores = await (await api.get('/v1/store?limit=1', { headers: { Authorization: token } })).json();
  if (!stores.result || stores.result.length === 0) {
    const res = await api.post('/v1/store', { headers: { Authorization: token }, data: STORE });
    const body = await res.json();
    if (!res.ok() || !body.status) throw new Error(`Creating the e2e store failed: ${JSON.stringify(body.errors)}`);
  }
  await api.dispose();

  // Sign in through the real login page once and reuse that session.
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, extraHTTPHeaders });
  await page.goto('/');
  await page.getByPlaceholder('Enter your email').fill(E2E_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 60_000 });
  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE });
  await browser.close();
};
