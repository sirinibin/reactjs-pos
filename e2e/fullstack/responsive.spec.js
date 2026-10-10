// The app must work on PCs, tablets and phones at every resolution. These
// specs run on every screen size in playwright.fullstack.config.js (they are
// tagged @devices) against the real API: the page never scrolls sideways
// (wide tables scroll inside their own box), the main actions are on screen,
// and the menu can take you between screens.
const { test, expect, E2E_EMAIL, E2E_PASSWORD, AUTH_STATE } = require('./fixtures');

// Screens a shop uses all day, plus the ones with the widest tables.
const SCREENS = [
  '/dashboard/business-dashboard', '/dashboard/sales', '/dashboard/salesreturn', '/dashboard/sales-payments',
  '/dashboard/purchases', '/dashboard/purchasereturn', '/dashboard/purchase-payments', '/dashboard/quotations',
  '/dashboard/products', '/dashboard/customers', '/dashboard/vendors', '/dashboard/expenses',
  '/dashboard/delivery-notes', '/dashboard/stock-transfers', '/dashboard/ledger', '/dashboard/stats',
];

/** How far the page itself scrolls sideways, in CSS pixels. */
const sidewaysOverflow = (page) => page.evaluate(() =>
  Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);

test.describe('login @devices', () => {
  test('the sign-in form fits the screen and signs in by tapping', async ({ page }) => {
    await page.goto('/');
    const email = page.getByPlaceholder('Enter your email');
    await expect(email).toBeInViewport();
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
    await email.click();
    await email.pressSequentially(E2E_EMAIL, { delay: 15 });
    const password = page.getByPlaceholder('Enter your password');
    await password.click();
    await password.pressSequentially(E2E_PASSWORD, { delay: 15 });
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/dashboard\//);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
  });
});

test.describe('screens @devices', () => {
  test.use({ storageState: AUTH_STATE });

  for (const path of SCREENS) {
    test(`${path} does not scroll sideways and its Create button is on screen`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      expect(await sidewaysOverflow(page), 'page is wider than the screen').toBeLessThanOrEqual(1);

      const create = page.getByRole('button', { name: /^\s*(\+\s*)?Create\s*$/ }).first();
      if (await create.count()) {
        await create.scrollIntoViewIfNeeded();
        const box = await create.boundingBox();
        const width = page.viewportSize().width;
        expect(box.x, 'Create starts off the left edge').toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, 'Create runs off the right edge').toBeLessThanOrEqual(width + 1);
      }
    });
  }

  test('the menu opens the Sales screen and the sales form fits', async ({ page }) => {
    await page.goto('/dashboard/business-dashboard');
    const width = page.viewportSize().width;
    // Narrow screens hide the sidebar behind the menu button.
    // It slides off-screen rather than hiding, so check the viewport.
    const sidebarLink = page.locator('#sidebar a[href="/dashboard/sales"]').first();
    const onScreen = async () => {
      const box = await sidebarLink.boundingBox();
      return !!box && box.x >= 0 && box.x + box.width <= width + 1;
    };
    if (!(await onScreen())) await page.locator('.js-sidebar-toggle').click();
    await expect.poll(onScreen, { message: 'menu did not slide in' }).toBe(true);
    await sidebarLink.click();
    await expect(page).toHaveURL(/\/dashboard\/sales$/);

    await page.getByRole('button', { name: 'Create' }).first().click();
    const form = page.locator('#sales_create_form');
    await expect(form.getByText('Create New Sales Order')).toBeVisible();
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
    // The fields a cashier needs first are reachable without sideways scrolling.
    for (const placeholder of ['Customer Name / Mob / VAT # / ID', 'Part No. | Name | Name in Arabic | Brand | Country']) {
      const box = await form.getByPlaceholder(placeholder).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + Math.min(box.width, 120)).toBeLessThanOrEqual(width + 1);
    }
  });
});
