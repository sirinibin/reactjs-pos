const { test, expect } = require('@playwright/test');

test('grouped navigation, active item and footer credit', async ({ page }) => {
    await page.goto('/dashboard/sales');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Sales', exact: true })).toHaveAttribute('aria-current', 'page');
    for (const group of ['Overview', 'Sales', 'Purchasing', 'Inventory', 'Finance', 'Administration']) {
        await expect(nav.getByRole('button', { name: group, exact: true })).toBeVisible();
    }
    await expect(page.getByText('An AI & Software Wing of Gulf Union Ozone').last()).toBeVisible();
});

test('menu filter narrows the navigation', async ({ page }) => {
    await page.goto('/dashboard/sales');
    await page.getByLabel('Find a menu…').fill('brand');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Product Brands' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Customers' })).toHaveCount(0);
});

test('Ctrl+K command palette jumps to a page', async ({ page }) => {
    await page.goto('/dashboard/sales');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('product cat');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard\/product_category$/);
    await expect(page.getByRole('heading', { name: 'Product Categories', level: 1 })).toBeVisible();
});

test('rail mode collapses the sidebar and survives reload', async ({ page }) => {
    await page.goto('/dashboard/sales');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(page.locator('.erp-shell')).toHaveClass(/is-nav-collapsed/);
    await page.reload();
    await expect(page.locator('.erp-shell')).toHaveClass(/is-nav-collapsed/);
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(page.locator('.erp-shell')).not.toHaveClass(/is-nav-collapsed/);
});

test('mobile: navigation opens as a drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/dashboard/sales');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).not.toBeInViewport();
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(nav).toBeInViewport();
    await nav.getByRole('link', { name: 'Customers' }).click();
    await expect(page).toHaveURL(/customers/);
    await expect(nav).not.toBeInViewport();
});

test('legacy screens still work inside the new shell', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await expect(page.locator('.erp-shell .content')).toBeVisible();
    await expect(page.getByRole('button', { name: /create/i }).first()).toBeVisible();
});
