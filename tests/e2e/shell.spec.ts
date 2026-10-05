import { test, expect, login, expectNoHorizontalOverflow, isMobile, AUTH_PROJECTS } from './fixtures';

test.describe('Sign-in form', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeEach(({}, info) => test.skip(!AUTH_PROJECTS.includes(info.project.name), 'sign-in form covered on desktop + phone only'));

  test('sign-in validates input and rejects wrong passwords', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await page.locator('#email').fill('sirinibin2006@gmail.com');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText(/wrong|Password/i);
    await expectNoHorizontalOverflow(page);
  });

  test('deep link redirects to login and back', async ({ page }) => {
    await page.goto('/sales/invoices');
    await expect(page).toHaveURL(/\/login/);
    await page.locator('#email').fill('sirinibin2006@gmail.com');
    await page.locator('#password').fill('123456');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/sales\/invoices/);
  });

});

test.describe('Shell and navigation', () => {
  test('legacy v1 URLs redirect to their v2 pages', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/sales');
    await expect(page).toHaveURL(/\/sales\/invoices$/);
  });

  test('navigation works at this viewport (rail/panel or drawer + tab bar)', async ({ page }) => {
    await login(page);
    if (isMobile(page)) {
      await expect(page.locator('.tabbar')).toBeVisible();
      await page.locator('.tabbar').getByRole('button', { name: 'Menu' }).click();
      await expect(page.locator('.panel')).toBeInViewport();
      await page.locator('.rail').getByRole('button', { name: 'Sales' }).click();
      await page.getByRole('link', { name: 'Sales invoices' }).click();
      await expect(page.locator('.panel')).not.toBeInViewport();
    } else {
      await page.getByRole('button', { name: 'Sales' }).first().click();
      await page.getByRole('link', { name: 'Sales invoices' }).click();
    }
    await expect(page).toHaveURL(/\/sales\/invoices/);
    await expectNoHorizontalOverflow(page);
  });

  test('command palette jumps to pages (Ctrl+K)', async ({ page }) => {
    await login(page);
    await page.keyboard.press('Control+k');
    await expect(page.locator('.cmdk-in input')).toBeFocused();
    await page.keyboard.type('sales invoices');
    await expect(page.locator('.cmdk-l [role=option]').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/sales\/invoices/);
  });

  test('Arabic switches the whole UI to right-to-left', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: /العربية/ }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.goto('/sales/invoices');
    await expect(page.getByRole('heading', { name: 'فواتير المبيعات' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'اللغة' }).click();
    await page.getByRole('menuitemradio', { name: /English/ }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('every offered language loads and Urdu is right-to-left', async ({ page }) => {
    await login(page);
    for (const [name, dir] of [['اردو', 'rtl'], ['हिन्दी', 'ltr'], ['മലയാളം', 'ltr'], ['বাংলা', 'ltr'], ['Русский', 'ltr'], ['English', 'ltr']] as const) {
      await page.locator('.top button[aria-haspopup="menu"]').first().click();
      await page.getByRole('menuitemradio', { name: new RegExp(name) }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
    }
    await expectNoHorizontalOverflow(page);
  });

  test('sign out clears the local session', async ({ page }) => {
    await login(page);
    // Revoke locally only: the shared setup token must stay valid for other tests.
    await page.route('**/v1/logout', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":true}' }));
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/sales/invoices');
    await expect(page).toHaveURL(/\/login/);
  });
});
