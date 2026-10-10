// Store settings, the Stores screen and the sidebar Menu Settings, full stack.
// Only harmless fields of the shared e2e store are edited (bank account name),
// and every edit is put back at the end of the test.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { miscApi, openUserMenuItem, recordWrites, typeInto, uniq } = require('./helpers/misc');

test.use({ storageState: AUTH_STATE });

const isStorePut = (r) => r.request().method() === 'PUT' && /\/v1\/store\/[0-9a-f]{24}(\?|$)/.test(r.url());

/** Opens Store Settings from the user menu and returns the dialog once the store is loaded. */
async function openStoreSettings(page) {
  await page.goto('/dashboard/sales');
  await openUserMenuItem(page, 'Store Settings');
  const dialog = page.getByRole('dialog').filter({ hasText: 'Store Settings' });
  await expect(dialog.getByPlaceholder('Registered Company Name', { exact: true })).toHaveValue(/.+/);
  return dialog;
}

async function saveSettings(page, dialog) {
  const put = page.waitForResponse(isStorePut);
  await dialog.getByRole('button', { name: 'Save Changes' }).last().click();
  return put;
}

test.describe('store settings', () => {
  test('a bank account name edited in Store Settings is saved, shown again and restored @devices', async ({ page, request }) => {
    const api = miscApi(request);
    const original = (await api.getStore()).bank_account?.account_name || '';
    const name = `E2E Account ${uniq()} حساب`;
    try {
      let dialog = await openStoreSettings(page);
      await dialog.getByText('Bank Account', { exact: true }).click();
      const field = dialog.getByPlaceholder('Account Name', { exact: true });
      await typeInto(page, field, name, 10);
      const res = await saveSettings(page, dialog);
      expect(res.status(), await res.text()).toBe(200);
      await expect(dialog.getByText('Store settings saved successfully!')).toBeVisible();
      expect((await api.getStore()).bank_account.account_name).toBe(name);

      // Closing and opening the screen again shows the saved value.
      await page.reload();
      dialog = await openStoreSettings(page);
      await dialog.getByText('Bank Account', { exact: true }).click();
      await expect(dialog.getByPlaceholder('Account Name', { exact: true })).toHaveValue(name);

      // Put the original value back through the same screen.
      await dialog.getByPlaceholder('Account Name', { exact: true }).fill(original);
      const back = await saveSettings(page, dialog);
      expect(back.status()).toBe(200);
      expect((await api.getStore()).bank_account.account_name).toBe(original);
    } finally {
      const store = await api.getStore();
      if (store.bank_account?.account_name !== original) {
        store.bank_account.account_name = original;
        await api.put(`/v1/store/${api.storeId}`, store);
      }
    }
  });

  test('an empty company name is refused in the form and nothing is sent', async ({ page, request }) => {
    const api = miscApi(request);
    const before = await api.getStore();
    const puts = recordWrites(page, /\/v1\/store\/[0-9a-f]{24}/);
    const dialog = await openStoreSettings(page);
    await dialog.getByPlaceholder('Registered Company Name', { exact: true }).fill('');
    await dialog.getByRole('button', { name: 'Save Changes' }).last().click();
    await expect(dialog.getByText('Registered Company Name is required', { exact: true })).toBeVisible();
    // The dialog stays open for correction and nothing reached the API.
    await expect(dialog.getByPlaceholder('Registered Company Name', { exact: true })).toHaveClass(/is-invalid/);
    expect(puts).toHaveLength(0);
    expect((await api.getStore()).name).toBe(before.name);
  });

  test('a VAT number that is not 15 digits is refused by the API with a visible error', async ({ page, request }) => {
    const api = miscApi(request);
    const before = await api.getStore();
    const dialog = await openStoreSettings(page);
    const vat = dialog.getByPlaceholder('VAT NO. (15 digits)');
    await typeInto(page, vat, '12345', 10);
    const res = await saveSettings(page, dialog);
    expect((await res.json()).errors.vat_no).toBe('VAT No. should be 15 digits');
    await expect(dialog.getByText('VAT No. should be 15 digits', { exact: true })).toBeVisible();
    await expect(page.getByText('Failed to save. Please check your inputs.')).toBeVisible();
    expect((await api.getStore()).vat_no).toBe(before.vat_no);
    expect(res.status(), 'a validation error is a client error').toBe(400);
  });

  test('a 15 digit VAT number that does not start and end with 3 is refused', async ({ page, request }) => {
    const api = miscApi(request);
    const before = await api.getStore();
    const dialog = await openStoreSettings(page);
    await typeInto(page, dialog.getByPlaceholder('VAT NO. (15 digits)'), '123456789012345', 10);
    const res = await saveSettings(page, dialog);
    await expect(dialog.getByText('VAT No. should start and end with 3', { exact: true })).toBeVisible();
    expect((await api.getStore()).vat_no).toBe(before.vat_no);
    expect(res.status(), 'a validation error is a client error').toBe(400);
  });

  test('an invalid store e-mail is refused in the form', async ({ page, request }) => {
    const api = miscApi(request);
    const before = await api.getStore();
    const puts = recordWrites(page, /\/v1\/store\/[0-9a-f]{24}/);
    const dialog = await openStoreSettings(page);
    await dialog.getByText('Contact', { exact: true }).click();
    await typeInto(page, dialog.getByPlaceholder('Email', { exact: true }), 'not-an-email', 10);
    await dialog.getByRole('button', { name: 'Save Changes' }).last().click();
    await expect(dialog.getByText('Email is not valid', { exact: true })).toBeVisible();
    expect(puts).toHaveLength(0);
    expect((await api.getStore()).email).toBe(before.email);
  });

  test('cancelling Store Settings after edits saves nothing', async ({ page, request }) => {
    const api = miscApi(request);
    const before = await api.getStore();
    const puts = recordWrites(page, /\/v1\/store\/[0-9a-f]{24}/);
    const dialog = await openStoreSettings(page);
    await typeInto(page, dialog.getByPlaceholder('Branch Name', { exact: true }), 'Should Not Be Saved', 10);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(puts).toHaveLength(0);
    expect((await api.getStore()).branch_name).toBe(before.branch_name);
  });
});

test.describe('stores screen', () => {
  test('the e2e store opens in the details view and HTML in a stored name renders as text', async ({ page, request }) => {
    const api = miscApi(request);
    const store = await api.getStore();
    const original = store.bank_account?.account_name || '';
    const html = `<b id="xss-${uniq()}">bold</b><img src=x onerror="window.__xss=1">`;
    store.bank_account = { ...(store.bank_account || {}), account_name: html };
    await api.put(`/v1/store/${api.storeId}`, store);
    try {
      await page.goto('/dashboard/stores');
      await typeInto(page, page.locator('#code'), store.code, 20);
      const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: store.code, exact: true }) });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(store.name);
      await row.getByRole('button', { name: /Actions/ }).click();
      await page.locator('.dropdown-menu.show').getByText(/^\s*Details\s*$|^\s*View\s*$/).first().click();
      const view = page.getByRole('dialog');
      await expect(view.getByText(store.vat_no).first()).toBeVisible();
      await expect(view.getByText(html, { exact: true })).toBeVisible();
      await expect(view.locator('b[id^="xss-"]')).toHaveCount(0);
      expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    } finally {
      const fresh = await api.getStore();
      fresh.bank_account.account_name = original;
      await api.put(`/v1/store/${api.storeId}`, fresh);
    }
  });
});

test.describe('sidebar menu settings', () => {
  test('hiding a menu item removes it from the sidebar, survives a reload and Reset brings it back', async ({ page }) => {
    await page.goto('/dashboard/sidebar-settings');
    await expect(page.getByRole('heading', { name: 'Menu Settings' })).toBeVisible();
    const sidebar = page.locator('#sidebar');
    const statsLink = sidebar.locator('.sidebar-link span', { hasText: /^Statistics$/ });
    await expect(statsLink).toBeVisible();

    const row = page.locator('.card > div').filter({ has: page.getByText('Statistics', { exact: true }) });
    const toggle = row.getByRole('switch');
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(statsLink).toHaveCount(0);

    await page.reload();
    await expect(page.locator('.card > div').filter({ has: page.getByText('Statistics', { exact: true }) }).getByRole('switch')).not.toBeChecked();
    await expect(sidebar.locator('.sidebar-link span', { hasText: /^Sales$/ })).toBeVisible();
    await expect(statsLink).toHaveCount(0);

    // Reset shows every item again.
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(statsLink).toBeVisible();
    await expect(page.locator('.card > div').filter({ has: page.getByText('Statistics', { exact: true }) }).getByRole('switch')).toBeChecked();
  });

  test('"Set Landing" moves an item to the top of the sidebar', async ({ page }) => {
    await page.goto('/dashboard/sidebar-settings');
    const row = page.locator('.card > div').filter({ has: page.getByText('Customers', { exact: true }) });
    await row.getByRole('button', { name: 'Set Landing' }).click();
    await expect(page.locator('.card > div').first()).toContainText('Customers');
    await expect(page.locator('.card > div').first()).toContainText('Landing');
    await expect(page.locator('#sidebar .sidebar-nav .sidebar-link').first()).toHaveText(/Customers/);
    const order = await page.evaluate(() => JSON.parse(localStorage.getItem('sidebar_config'))[0]);
    expect(order).toEqual({ id: 'customers', visible: true });
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.card > div').first()).not.toContainText('Customers');
  });

  test('hiding every item warns that at least one must stay visible', async ({ page }) => {
    await page.goto('/dashboard/sidebar-settings');
    const switches = page.locator('.card').getByRole('switch');
    const n = await switches.count();
    expect(n).toBeGreaterThan(5);
    for (let i = 0; i < n; i++) {
      const s = switches.nth(i);
      if (await s.isChecked()) await s.uncheck();
    }
    await expect(page.locator('#sidebar .sidebar-nav .sidebar-link span', { hasText: /^Sales$/ })).toHaveCount(0);
    try {
      await expect(page.getByText('At least one item must be visible.')).toBeVisible({ timeout: 3000 });
    } finally {
      await page.getByRole('button', { name: 'Reset' }).click();
    }
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('At least one item must be visible.')).toBeHidden();
  });
});
