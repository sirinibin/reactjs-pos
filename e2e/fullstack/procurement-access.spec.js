// The procurement message endpoints (supplier emails, WhatsApp threads, unread
// badges) need a sign-in and only serve the user's own stores. The procurement
// screens still load their data with the signed-in user's token.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { apiClient } = require('./api');

test.use({ storageState: AUTH_STATE });

const ROUTES = [
  '/v1/procurement-messages',
  '/v1/procurement-message-threads',
  '/v1/email-unread',
  '/v1/rfq-whatsapp-unread',
  '/v1/procurement-rfq-history?email=supplier@example.com',
  '/v1/procurement-messages/disk-usage',
];

test('procurement endpoints refuse requests without a sign-in', async ({ request }) => {
  const { storeId } = apiClient(request);
  for (const path of ROUTES) {
    const res = await request.get(`${path}${path.includes('?') ? '&' : '?'}store_id=${storeId}`);
    expect(res.status(), path).toBe(401);
  }
  const msg = await request.get(`/v1/procurement-messages/${'a'.repeat(24)}`);
  expect(msg.status()).toBe(401);
  const send = await request.post(`/v1/procurement-email-send?store_id=${storeId}`, { data: { to: 'x@example.com' } });
  expect(send.status()).toBe(401);
});

test('procurement endpoints answer the signed-in user for their store', async ({ request }) => {
  const api = apiClient(request);
  for (const path of ROUTES) {
    const res = await request.get(`${path}${path.includes('?') ? '&' : '?'}store_id=${api.storeId}`, { headers: { Authorization: api.token } });
    expect(res.status(), path).toBe(200);
  }
});

for (const screen of ['/dashboard/procurement-emails', '/dashboard/procurement-whatsapp']) {
  test(`${screen} loads its messages with the user's sign-in @devices`, async ({ page }) => {
    const refused = [];
    const loaded = [];
    page.on('response', (res) => {
      if (!/\/v1\/procurement-/.test(res.url())) return;
      if (res.status() === 401 || res.status() === 403) refused.push(`${res.status()} ${res.url()}`);
      else loaded.push(res.url());
    });
    await page.goto(screen);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const landed = new URL(page.url()).pathname;
    test.skip(landed !== screen, `${screen} is not shown for this store`);
    expect(refused).toEqual([]);
    expect(loaded.length, 'the screen calls the procurement API').toBeGreaterThan(0);
  });
}
