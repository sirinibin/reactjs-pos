import type { Page } from '@playwright/test';
import { test, expect, login, expectNoHorizontalOverflow, isMobile, seed } from './fixtures';

/**
 * The seeded store has the AI RFQ bot / RFQ module switched off and this suite must not change shared
 * store settings, so the store payload is patched in the browser to turn the procurement flags on.
 * Every procurement API call still goes to the real Go API.
 */
async function enableProcurement(page: Page) {
  const storeId: string = seed().storeId;
  // context-wide so pop-ups (print view) see the same flags and don't overwrite the settings cache
  await page.context().route((url) => url.pathname === `/v1/store/${storeId}`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    if (body?.result) body.result.settings = { ...(body.result.settings || {}), enable_ai_rfq_bot: true, enable_rfq_module: true, purchase_markets: ['Riyadh', 'Jeddah'] };
    await route.fulfill({ response: res, json: body });
  });
}

const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

test.describe('AI procurement', () => {
  test.beforeEach(async ({ page }) => {
    await enableProcurement(page);
    await login(page);
  });

  test('RFQ inbox lists and filters at this viewport', async ({ page }) => {
    await page.goto('/procurement/rfq');
    await expect(page.getByRole('heading', { name: 'RFQ inbox' })).toBeVisible();
    await page.getByRole('tab', { name: 'Forwarded' }).click();
    await expect(page).toHaveURL(/view=forwarded/);
    await page.getByRole('searchbox', { name: 'Search' }).fill('RFQ-');
    await expect(page).toHaveURL(/q=RFQ-/);
    await expectNoHorizontalOverflow(page);
  });

  test('create → review → send guidance → edit → print → delete an RFQ', async ({ page, context }) => {
    const name = `E2E Garage ${uid()}`;
    await page.goto('/procurement/rfq/new');
    await expect(page.getByRole('heading', { name: 'New RFQ' })).toBeVisible();
    await page.getByLabel('Customer name').fill(name);
    await page.getByLabel('Customer mobile').fill('966500000777');
    await page.getByLabel('Part No. 1').fill('BP-E2E');
    await page.getByLabel('Product name 1').fill('Brake pad E2E');
    await page.getByLabel('Qty 1').fill('3');
    await page.getByRole('checkbox', { name: /Link new items/ }).uncheck();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/procurement\/rfq\/[0-9a-f]{24}\?tab=send$/);
    await expect(page.getByText(/RFQ created: RFQ-\d+/)).toBeVisible();
    const code = (await page.locator('.obj-name h1 .mono').innerText()).trim();
    expect(code).toMatch(/^RFQ-\d+$/);
    const createdId = page.url().match(/rfq\/([0-9a-f]{24})/)![1];
    try {
      // WhatsApp is not configured locally → clear guidance instead of a broken send.
      await expect(page.getByText(/not connected|template/i).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Procurement settings' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.getByRole('tab', { name: /Items/ }).click();
      await expect(page.getByRole('table', { name: 'Items requested' }).getByText('Brake pad E2E')).toBeVisible();
      await page.getByRole('tab', { name: /Timeline/ }).click();
      await expect(page.getByText(/RFQ created with code/)).toBeVisible();
      await page.getByRole('tab', { name: /Document/ }).click();
      await expect(page.getByTestId('rfq-paper')).toContainText('QUOTATION SUBMISSION INSTRUCTIONS');
      await expectNoHorizontalOverflow(page);

      // Edit
      const id = page.url().match(/rfq\/([0-9a-f]{24})/)![1];
      await page.goto(`/procurement/rfq/${id}/edit`);
      await page.getByLabel('Customer RFQ ID').fill('PO-E2E');
      await page.getByRole('checkbox', { name: /Link new items/ }).uncheck();
      await save(page);
      await expect(page).toHaveURL(new RegExp(`/procurement/rfq/${id}$`));
      await expect(page.getByText(`Saved ${code}`)).toBeVisible();
      await expect(page.getByText('PO-E2E').filter({ visible: true }).first()).toBeVisible();

      // In-app print view (desktop only: opens a new tab)
      if (!isMobile(page)) {
        const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print' }).click()]);
        await popup.waitForLoadState();
        await expect(popup.getByTestId('rfq-paper')).toContainText(code);
        await popup.close();
      }

      // Ctrl+K finds the RFQ (desktop keyboard)
      if (!isMobile(page)) {
        await page.keyboard.press('Control+k');
        await page.keyboard.type(code);
        await expect(page.getByRole('option', { name: new RegExp(code) }).first()).toBeVisible();
        await page.keyboard.press('Escape');
      }

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('dialog', { name: `Delete ${code}?` }).getByRole('button', { name: 'Delete' }).click();
      await expect(page).toHaveURL(/\/procurement\/rfq$/);
      await expect(page.getByText(`Deleted ${code}`)).toBeVisible();
    } finally {
      // leave no fixture behind if an assertion failed midway
      await page.request.delete(`/v1/rfq-received/${createdId}?store_id=${seed().storeId}`).catch(() => undefined);
    }
  });

  test('empty RFQ cannot be saved', async ({ page }) => {
    await page.goto('/procurement/rfq/new');
    await expect(page.getByRole('heading', { name: 'New RFQ' })).toBeVisible();
    await save(page);
    await expect(page.getByText('Add products, upload a file, or enter a description.')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  test('RFQ suppliers: add, find and delete a supplier', async ({ page }) => {
    const name = `E2E Supplier ${uid()}`;
    const phone = `9665${String(Date.now()).slice(-8)}`;
    await page.goto('/procurement/suppliers');
    await expect(page.getByRole('heading', { name: 'RFQ suppliers' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Add supplier' }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Add supplier' });
    await dlg.getByLabel(/^Name/).fill(name);
    await dlg.getByLabel(/^WhatsApp number\*?$/).fill(phone);
    await dlg.getByLabel(/Purchase market/).selectOption('Riyadh');
    await dlg.getByRole('textbox', { name: 'Categories' }).fill('Brakes');
    await dlg.getByRole('textbox', { name: 'Categories' }).press('Enter');
    await expectNoHorizontalOverflow(page);
    await dlg.getByRole('button', { name: 'Add supplier' }).click();
    await expect(page.getByText('Supplier added')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search' }).fill(name);
    if (isMobile(page)) {
      await expect(page.locator('.mlist .mi').filter({ hasText: name })).toBeVisible();
      await page.locator('.mlist .mi').filter({ hasText: name }).click();
      await expect(page.getByRole('dialog', { name: 'Edit supplier' })).toBeVisible();
      await page.getByRole('dialog', { name: 'Edit supplier' }).getByRole('button', { name: 'Cancel' }).click();
      // delete through the API-backed table action is desktop-only UI; clean up via the table on wide screens
      const storeId = seed().storeId;
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      const r = await page.request.get(`/v1/rfq-suppliers?store_id=${storeId}&search=${encodeURIComponent(name)}`, { headers: { Authorization: token! } });
      const id = (await r.json()).result[0].id;
      await page.request.delete(`/v1/rfq-suppliers/${id}?store_id=${storeId}`, { headers: { Authorization: token! } });
    } else {
      const table = page.getByRole('table', { name: 'RFQ suppliers' });
      await expect(table.getByText(name)).toBeVisible();
      await table.getByRole('button', { name: `Delete ${name}` }).click();
      await page.getByRole('dialog', { name: `Delete ${name}?` }).getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Supplier deleted')).toBeVisible();
    }
  });

  test('email and WhatsApp inboxes render their views', async ({ page }) => {
    await page.goto('/procurement/emails');
    await expect(page.getByRole('heading', { name: 'Emails' })).toBeVisible();
    await expect(page.getByText(/No messages|EM-\d+/).filter({ visible: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/procurement/emails?view=conv');
    await expect(page.getByRole('list', { name: 'Conversations' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/procurement/whatsapp');
    await expect(page.getByRole('heading', { name: 'WhatsApp' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Conversations' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('textbox', { name: 'Start new conversation' }).fill('966500000888');
    await page.getByRole('button', { name: 'Start new conversation' }).click();
    await expect(page).toHaveURL(/phone=966500000888/);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/procurement/whatsapp?view=all');
    await expect(page.getByRole('combobox', { name: 'RFQ filter' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('procurement settings tabs load with not-configured states (read-only visit)', async ({ page }) => {
    await page.goto('/procurement/settings');
    await expect(page.getByRole('heading', { name: 'Procurement settings' })).toBeVisible();
    await expect(page.getByText('Not connected').first()).toBeVisible();
    await expect(page.getByText(/Access Token not found|Templates are loaded/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    for (const tab of ['Email', 'Google', 'RFQ rules', 'AI models', 'Purchase bills']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expectNoHorizontalOverflow(page);
    }
    await expect(page.getByRole('button', { name: /^Save/ }).first()).toBeDisabled();
  });
});

test.describe('Public RFQ print route', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('is reachable without sign-in and reports an expired key', async ({ page }) => {
    await page.goto('/rfq-print?key=expired-key');
    await expect(page).toHaveURL(/\/rfq-print\?key=expired-key/);
    await expect(page.getByText(/not found or expired/)).toBeVisible();
    await expect(page.locator('.rail')).toHaveCount(0);
  });
});
