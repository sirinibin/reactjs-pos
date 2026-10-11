// The store is loaded once per page and kept current by the server: any change
// to the store (settings, print settings, sidebar, ...) is pushed over the
// WebSocket as store_updated, and the page re-reads it once. Screens never ask
// for the store again on their own.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { apiClient, uniq } = require('./api');

test.use({ storageState: AUTH_STATE });

const STORE_GET = /^\/v1\/store\/[0-9a-f]{24}$/;

function recordStoreGets(page) {
  const seen = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (r.method() === 'GET' && STORE_GET.test(u.pathname)) seen.push(u.pathname + u.search);
  });
  return seen;
}

const settingsCache = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('_store_settings_cache') || '{}'));

async function openSettled(page, path) {
  await page.goto(path);
  await expect(page.getByText('E2E Admin').first()).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

// Lists, forms and dashboards that read the store: each loads it exactly once.
for (const path of ['/dashboard/sales', '/dashboard/stock-transfers', '/dashboard/stats', '/dashboard/business-dashboard',
  '/dashboard/automobile-dashboard', '/dashboard/rfq-suppliers', '/dashboard/repair-jobs', '/dashboard/purchases']) {
  test(`${path} loads the store once, with no field selection`, async ({ page }) => {
    const gets = recordStoreGets(page);
    await openSettled(page, path);
    expect(gets).toHaveLength(1);
    expect(gets[0]).not.toContain('?');
  });
}

test('a store change made elsewhere reaches the open page by push @devices', async ({ page, request }) => {
  const api = apiClient(request);
  const gets = recordStoreGets(page);
  await openSettled(page, '/dashboard/sales');
  expect(gets).toHaveLength(1);

  // Another user (here: the API directly) changes the print settings.
  const marker = uniq('PS');
  const store = (await api.get(`/v1/store/${api.storeId}`)).result;
  const printSettings = { ...((store.settings || {}).print_settings || {}), e2e_marker: { value: marker } };
  const reread = page.waitForRequest((r) => r.method() === 'GET' && STORE_GET.test(new URL(r.url()).pathname));
  await api.put(`/v1/store/${api.storeId}/print-settings`, { print_settings: printSettings });
  await reread;
  await expect.poll(async () => (await settingsCache(page)).print_settings?.e2e_marker?.value).toBe(marker);

  // One re-read for the change, not one per screen part.
  await page.waitForTimeout(1500);
  expect(gets).toHaveLength(2);

  // Saving the same settings again changes nothing, so nothing is pushed.
  await api.put(`/v1/store/${api.storeId}/print-settings`, { print_settings: printSettings });
  await page.waitForTimeout(1500);
  expect(gets).toHaveLength(2);
});

test('a burst of store changes is one re-read', async ({ page, request }) => {
  const api = apiClient(request);
  const gets = recordStoreGets(page);
  await openSettled(page, '/dashboard/sales');
  const store = (await api.get(`/v1/store/${api.storeId}`)).result;
  const base = (store.settings || {}).print_settings || {};
  const last = uniq('B');
  await Promise.all([1, 2, 3].map((i) => api.put(`/v1/store/${api.storeId}/print-settings`, { print_settings: { ...base, e2e_burst: { value: `${last}-${i}` } } })));
  await api.put(`/v1/store/${api.storeId}/print-settings`, { print_settings: { ...base, e2e_burst: { value: last } } });
  await expect.poll(async () => (await settingsCache(page)).print_settings?.e2e_burst?.value).toBe(last);
  await page.waitForTimeout(1500);
  // At most one re-read per bundle window; four writes in a few ms must not mean four.
  expect(gets.length).toBeLessThanOrEqual(3);
  expect(gets.length).toBeGreaterThanOrEqual(2);
});

test('a full store save is pushed and the header picks up the new settings', async ({ page, request }) => {
  const api = apiClient(request);
  await openSettled(page, '/dashboard/sales');
  const store = (await api.get(`/v1/store/${api.storeId}`)).result;
  const before = !!(store.settings || {}).enable_auto_refresh;
  const reread = page.waitForRequest((r) => r.method() === 'GET' && STORE_GET.test(new URL(r.url()).pathname));
  try {
    await api.put(`/v1/store/${api.storeId}`, { ...store, settings: { ...store.settings, enable_auto_refresh: !before } });
    await reread;
    await expect.poll(async () => !!(await settingsCache(page)).enable_auto_refresh).toBe(!before);
  } finally {
    const fresh = (await api.get(`/v1/store/${api.storeId}`)).result;
    await api.put(`/v1/store/${api.storeId}`, { ...fresh, settings: { ...fresh.settings, enable_auto_refresh: before } });
  }
});
