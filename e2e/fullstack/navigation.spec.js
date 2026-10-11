// Every screen in the sidebar opens against the real API without crashing,
// without a server error, without contacting the live API, and without sending
// the same request twice (screens used to load each list two or three times).
const { test, expect, AUTH_STATE } = require('./fixtures');

test.use({ storageState: AUTH_STATE });

const { SCREENS } = require('./screens');

// Requests a screen repeats on purpose while it is open.
const EXPECTED_REPEATS = [
  // The users list reloads once when this tab's own sign-in shows the user online.
  (path, call, n) => path === '/dashboard/users' && call.startsWith('GET /v1/user?') && n <= 2,
];

for (const path of SCREENS) {
  test(`opens ${path}`, async ({ page }) => {
    const calls = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.pathname.startsWith('/v1/')) calls.push(`${r.method()} ${u.pathname}${decodeURIComponent(u.search)}`);
    });
    // Stores that keep print settings on the server: opening a screen used to read the
    // store and PUT the print settings once per print preview it mounted.
    await page.addInitScript(() => {
      let s = {};
      try { s = JSON.parse(localStorage.getItem('_store_settings_cache') || '{}') || {}; } catch (_) { s = {}; }
      localStorage.setItem('_store_settings_cache', JSON.stringify({ ...s, save_print_settings_to_server: true }));
    });
    await page.goto(path);
    // Branches can lag behind each other (test may not have every screen yet);
    // the app sends unknown screens to the landing page.
    const landed = new URL(page.url()).pathname;
    test.skip(landed !== path && landed === '/dashboard/business-dashboard', `${path} is not in this build`);
    await expect(page).toHaveURL(new RegExp(path.replace(/[-/]/g, '\\$&')));
    // The shell (sidebar brand + signed-in user) renders on every screen.
    await expect(page.getByText('Start POS').first()).toBeVisible();
    await expect(page.getByText('E2E Admin').first()).toBeVisible();
    // Let the screen's first API calls settle so their errors are caught.
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const counts = {};
    calls.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    const repeated = Object.entries(counts)
      .filter(([c, n]) => n > 1 && !EXPECTED_REPEATS.some((ok) => ok(path, c, n)))
      .map(([c, n]) => `${n}x ${c}`);
    expect(repeated, `requests sent more than once on ${path}`).toEqual([]);
    // The store is one shared copy per page (src/utils/storeUtils.js), whatever
    // fields each part of the screen reads: at most one store GET per screen.
    const storeGets = calls.filter((c) => /^GET \/v1\/store\/[0-9a-f]{24}(\?|$)/.test(c));
    expect(storeGets.length, `store loaded ${storeGets.length} times on ${path}: ${storeGets.join(', ')}`).toBeLessThanOrEqual(1);
    // Opening a screen changes nothing (no print-settings save or any other write),
    // waiting out the 1.5 s print-settings save delay.
    await page.waitForTimeout(1000);
    expect(calls.filter((c) => !c.startsWith('GET ')), `writes on opening ${path}`).toEqual([]);
  });
}
