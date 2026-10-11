// The header's WhatsApp and email unread badges poll /v1/rfq-whatsapp-unread and
// /v1/email-unread. A store with the RFQ module off (or the channel not connected)
// must never send those requests, and the API answers them cheaply for such a store.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { apiClient } = require('./api');

test.use({ storageState: AUTH_STATE });

const UNREAD = /\/v1\/(rfq-whatsapp-unread|email-unread)\b/;
const TOPBAR_STORE_GET = /\/v1\/store\/[0-9a-f]{24}\?select=id,code,name_in_arabic,settings,zatca/;

function recordUnreadCalls(page) {
  const seen = [];
  page.on('request', (req) => { if (UNREAD.test(req.url())) seen.push(new URL(req.url()).pathname); });
  return seen;
}

async function storeSettings(request) {
  const api = apiClient(request);
  return { api, settings: (await api.get(`/v1/store/${api.storeId}`)).result.settings || {} };
}

test('no unread polling for a store with the RFQ module off @devices', async ({ page, request }) => {
  const { settings } = await storeSettings(request);
  expect(settings.enable_rfq_module, 'the shared e2e store is expected to have the RFQ module off').toBeFalsy();

  const seen = recordUnreadCalls(page);
  await page.clock.install();
  const storeLoaded = page.waitForResponse(TOPBAR_STORE_GET);
  await page.goto('/dashboard/sales');
  await storeLoaded;
  await expect(page.getByText('E2E Admin').first()).toBeVisible();

  // Five minutes of fallback-poll intervals (30 s each).
  await page.clock.runFor(5 * 60 * 1000);
  await page.waitForTimeout(500);
  expect(seen).toEqual([]);
  await expect(page.locator('#wa-unread-toggle')).toHaveCount(0);
  await expect(page.locator('#email-unread-toggle')).toHaveCount(0);
});

test('the unread endpoints answer an empty, disabled feed for that store', async ({ request }) => {
  const { api } = await storeSettings(request);
  for (const path of ['/v1/rfq-whatsapp-unread', '/v1/email-unread']) {
    const res = await request.get(`${path}?store_id=${api.storeId}`, { headers: { Authorization: api.token } });
    expect(res.status(), path).toBe(200);
    expect(await res.json(), path).toEqual({ items: [], total_unread: 0, enabled: false });
  }
  const unknown = await request.get(`/v1/email-unread?store_id=${'0'.repeat(24)}`, { headers: { Authorization: api.token } });
  expect(unknown.status()).toBe(404);
  const bad = await request.get('/v1/rfq-whatsapp-unread?store_id=nope', { headers: { Authorization: api.token } });
  expect(bad.status()).toBe(400);
});

// Positive control: the same page polls once the store's settings say WhatsApp is
// connected. The store itself is left alone; only the settings the header reads
// are changed on their way to the browser.
test('polls only the connected channel once the RFQ module is on', async ({ page }) => {
  await page.route(TOPBAR_STORE_GET, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.result.settings = { ...(body.result.settings || {}), enable_rfq_module: true, store_rfq_waba_phone_number_id: '100000000000001' };
    await route.fulfill({ response: res, json: body });
  });
  const seen = recordUnreadCalls(page);
  await page.clock.install();
  const storeLoaded = page.waitForResponse(TOPBAR_STORE_GET);
  await page.goto('/dashboard/sales');
  await storeLoaded;
  await expect(page.locator('#wa-unread-toggle')).toBeVisible();

  await expect.poll(() => seen.filter((p) => p === '/v1/rfq-whatsapp-unread').length).toBeGreaterThanOrEqual(1);
  const before = seen.filter((p) => p === '/v1/rfq-whatsapp-unread').length;
  await page.clock.runFor(60 * 1000);
  await expect.poll(() => seen.filter((p) => p === '/v1/rfq-whatsapp-unread').length).toBeGreaterThanOrEqual(before + 2);
  expect(seen.filter((p) => p === '/v1/email-unread')).toEqual([]);
  await expect(page.locator('#email-unread-toggle')).toHaveCount(0);
});
