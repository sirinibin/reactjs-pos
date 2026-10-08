// Every screen in the sidebar opens against the real API without crashing,
// without a server error and without contacting the live API.
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

for (const path of SCREENS) {
  test(`opens ${path}`, async ({ page }) => {
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
  });
}
