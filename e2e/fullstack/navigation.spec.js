// Every screen in the sidebar opens against the real API without crashing,
// without a server error, without contacting the live API, and without sending
// the same request twice (screens used to load each list two or three times).
const { test, expect, AUTH_STATE } = require('./fixtures');

test.use({ storageState: AUTH_STATE });

const SCREENS = [
  '/dashboard/business-dashboard', '/dashboard/analytics', '/dashboard/sales', '/dashboard/stock-transfers',
  '/dashboard/sales-cash-discounts', '/dashboard/sales-payments', '/dashboard/salesreturn',
  '/dashboard/sales-return-payments', '/dashboard/purchases', '/dashboard/purchase-orders',
  '/dashboard/purchase-requests', '/dashboard/rfq-received', '/dashboard/rfq-suppliers',
  '/dashboard/procurement-emails', '/dashboard/procurement-whatsapp', '/dashboard/purchase-bill-images',
  '/dashboard/purchase-cash-discounts', '/dashboard/purchase-payments', '/dashboard/purchasereturn',
  '/dashboard/purchase-return-payments', '/dashboard/delivery-notes', '/dashboard/quotations',
  '/dashboard/non-vat-sales-returns', '/dashboard/non-vat-sales', '/dashboard/stats', '/dashboard/vendors',
  '/dashboard/stores', '/dashboard/warehouses', '/dashboard/customers', '/dashboard/products',
  '/dashboard/services', '/dashboard/customer-packages', '/dashboard/expenses', '/dashboard/receivables',
  '/dashboard/payables', '/dashboard/capitals', '/dashboard/dividents', '/dashboard/users',
  '/dashboard/user-roles', '/dashboard/signatures', '/dashboard/ledger', '/dashboard/accounts',
  '/dashboard/postings', '/dashboard/automobile-dashboard', '/dashboard/employees', '/dashboard/vehicles',
  '/dashboard/repair-jobs-board', '/dashboard/repair-jobs', '/dashboard/sidebar-settings',
];

// Requests a screen repeats on purpose while it is open.
const EXPECTED_REPEATS = [
  // WhatsApp threads are polled every 5 seconds.
  (path, call) => path === '/dashboard/procurement-whatsapp' && call.startsWith('GET /v1/procurement-message-threads?'),
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
    // Opening a screen changes nothing (no print-settings save or any other write),
    // waiting out the 1.5 s print-settings save delay.
    await page.waitForTimeout(1000);
    expect(calls.filter((c) => !c.startsWith('GET ')), `writes on opening ${path}`).toEqual([]);
  });
}
