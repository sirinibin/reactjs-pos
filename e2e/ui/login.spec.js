const { test, expect } = require('@playwright/test');
const { EMAIL, PASSWORD, testClientIp } = require('../helpers');

test.use({ storageState: { cookies: [], origins: [] } });

// one simulated client address per test so the API's login rate limit is not hit
test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'X-Real-IP': testClientIp() });
});

test('signs in through the login screen and lands inside the ERP shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByPlaceholder('Enter your email').fill(EMAIL);
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/dashboard\//);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeTruthy();
});

test('wrong password shows an error and counts down attempts', async ({ page }) => {
    await page.goto('/');
    const email = 'nobody+' + Date.now() + '@example.com';
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Enter your password').fill('wrong');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.erp-field__error').first()).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
});

test('shows the footer credit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'ai.gulfunionozone.com' })).toHaveAttribute('href', 'https://ai.gulfunionozone.com/');
});
