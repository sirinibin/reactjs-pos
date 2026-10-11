// Live screens update by server push, never on a timer (user rule 2026-10-11):
// with the clock run five minutes forward, an open screen sends no request again.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { SCREENS } = require('./screens');

test.use({ storageState: AUTH_STATE });

function recordApiCalls(page) {
  const calls = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/v1/')) calls.push(`${r.method()} ${u.pathname}${decodeURIComponent(u.search)}`);
  });
  return calls;
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

for (const path of ['/dashboard/procurement-whatsapp', '/dashboard/procurement-emails', '/dashboard/users', '/dashboard/sales']) {
  test(`${path} sends nothing while it sits open @devices`, async ({ page }) => {
    await page.clock.install();
    const calls = recordApiCalls(page);
    await page.goto(path);
    await expect(page.getByText('E2E Admin').first()).toBeVisible();
    await settle(page);
    const before = calls.length;
    await page.clock.runFor(5 * 60 * 1000);
    await settle(page);
    // The keep-alive is a WebSocket ping, not an HTTP request.
    expect(calls.slice(before), `requests sent by ${path} on a timer`).toEqual([]);
  });
}

// Every other sidebar screen, on the laptop screen only (the four above run on
// every screen size).
const DEVICE_SCREENS = ['/dashboard/procurement-whatsapp', '/dashboard/procurement-emails', '/dashboard/users', '/dashboard/sales'];
for (const path of SCREENS.filter((p) => !DEVICE_SCREENS.includes(p))) {
  test(`${path} sends nothing on a timer`, async ({ page }) => {
    await page.clock.install();
    const calls = recordApiCalls(page);
    await page.goto(path);
    await expect(page.getByText('E2E Admin').first()).toBeVisible();
    await settle(page);
    const before = calls.length;
    await page.clock.runFor(5 * 60 * 1000);
    await settle(page);
    expect(calls.slice(before), `requests sent by ${path} on a timer`).toEqual([]);
  });
}
