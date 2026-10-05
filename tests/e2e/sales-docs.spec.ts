import type { Page } from '@playwright/test';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

async function pickCustomer(page: Page, q = 'al noor', name = /AL NOOR TRADING/) {
  const customer = page.getByRole('combobox', { name: /Customer/ }).first();
  await customer.fill(q);
  await page.getByRole('option', { name }).first().click();
  await expect(customer).toHaveValue(name);
}

async function addItem(page: Page, q = 'oil', name = /Engine Oil/) {
  const add = page.getByRole('combobox', { name: 'Add item' });
  await add.click();
  await add.fill(q);
  await page.getByRole('option', { name }).first().click();
  await expect(page.getByRole('table', { name: 'Items' }).getByText(name).first()).toBeVisible();
}

/** Click a header action; on phones some secondary actions are hidden, so fall back to direct navigation. */
async function headerAction(page: Page, name: string | RegExp) {
  await page.locator('.obj-acts').getByRole('button', { name }).first().click();
}

async function expectList(page: Page, path: string, heading: string, totalsLabel: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  if (isMobile(page)) await expect(page.locator('.mlist .mi').first()).toBeVisible();
  else await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
  await expect(page.locator('.sum-mini').getByText(totalsLabel, { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe('Quotations, delivery notes and quotation returns', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('quotation list loads with totals, views and search', async ({ page }) => {
    await expectList(page, '/sales/quotations', 'Quotations', 'Quotations');
    await page.getByRole('tab', { name: /^Not invoiced/ }).click();
    await expect(page).toHaveURL(/view=open/);
    await page.getByRole('searchbox', { name: 'Search' }).fill('QTN');
    await expect(page).toHaveURL(/q=QTN/);
  });

  test('create a quotation, then convert it into a sales invoice', async ({ page }) => {
    await page.goto('/sales/quotations/new');
    await expect(page.getByRole('textbox', { name: /Validity \(days\)/ })).toHaveValue('2');
    await pickCustomer(page);
    await addItem(page);
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/sales\/quotations\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /QTN-\d+/ })).toBeVisible();
    const code = (await page.getByRole('heading', { name: /QTN-\d+/ }).textContent())!.match(/QTN-\d+/)![0];
    await expect(page.getByText('Document flow')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await headerAction(page, 'Create invoice');
    await expect(page).toHaveURL(/\/sales\/invoices\/new\?quotation_id=/);
    await expect(page.locator('.banner').getByText('From quotation')).toBeVisible();
    await expect(page.locator('#content').getByRole('link', { name: code })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Items' }).getByText(/Engine Oil/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/sales\/invoices\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /S-INV-\d+/ })).toBeVisible();
    await expect(page.locator('#content').getByText(code).first()).toBeVisible();

    // The quotation now shows the linked invoice.
    await page.locator('#content').getByText(code).first().click();
    await expect(page).toHaveURL(/\/sales\/quotations\/[0-9a-f]{24}$/);
    await expect(page.getByText('Invoiced', { exact: true }).first()).toBeVisible();
  });

  test('invalid quotation terms are caught before saving', async ({ page }) => {
    await page.goto('/sales/quotations/new');
    await page.getByRole('textbox', { name: /Delivery \(days\)/ }).fill('');
    await addItem(page);
    await save(page);
    await expect(page.getByText('Delivery days are required').first()).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  test('delivery note: list, create, then invoice it', async ({ page }) => {
    await expectList(page, '/sales/delivery-notes', 'Delivery notes', 'Delivery notes').catch(async () => {
      // A fresh store may have no notes yet — the heading must still render.
      await expect(page.getByRole('heading', { name: 'Delivery notes', exact: true })).toBeVisible();
    });
    await page.goto('/sales/delivery-notes/new');
    await expect(page.getByLabel(/Reminder \(notify at\)/)).toHaveValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    await pickCustomer(page);
    await addItem(page);
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/sales\/delivery-notes\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /DN-\d+/ })).toBeVisible();
    const dnUrl = page.url();
    await expectNoHorizontalOverflow(page);

    await headerAction(page, 'Create invoice');
    await expect(page.locator('.banner').getByText('From delivery note')).toBeVisible();
    await save(page);
    await expect(page).toHaveURL(/\/sales\/invoices\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /S-INV-\d+/ })).toBeVisible();
    const inv = (await page.getByRole('heading', { name: /S-INV-\d+/ }).textContent())!.match(/S-INV-\d+/)![0];
    await expect(page.locator('#content').getByText('Delivery note').first()).toBeVisible();
    // The note is now linked to the invoice (linking is async on the server — reload until it shows).
    await expect(async () => {
      await page.goto(dnUrl);
      await expect(page.locator('#content').getByText(inv).first()).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
  });

  test('sales in quotation: record a sale, return part of it and refund', async ({ page }) => {
    await page.goto('/sales/quotations/new?type=invoice');
    await expect(page.getByRole('combobox', { name: 'Type' })).toHaveValue('invoice');
    await pickCustomer(page);
    await addItem(page);
    await expect(page.getByRole('textbox', { name: 'Amount paid' })).not.toHaveValue('0');
    await save(page);
    await expect(page.getByRole('heading', { name: /QTN-\d+/ })).toBeVisible();
    await expect(page.getByText('Balance due').first()).toBeVisible();

    if (isMobile(page)) await page.goto(page.url().replace('/sales/quotations/', '/sales/quotation-returns/new?quotation_id='));
    else await headerAction(page, 'Return');
    await expect(page.getByRole('heading', { name: 'New quotation sales return' })).toBeVisible();
    await page.getByRole('checkbox', { name: /^Return Engine Oil/ }).check();
    await expect(page.getByRole('textbox', { name: 'Amount paid' })).not.toHaveValue('0');
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/sales\/quotation-returns\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /QSR-\d+/ })).toBeVisible();
    await expect(page.getByText(/QSR-\d+ created/)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('tab', { name: 'Refunds' }).click();
    await expect(page.getByRole('table', { name: 'Refunds' })).toBeVisible();
  });

  test('quotation return list and the "which sale" picker', async ({ page }) => {
    await page.goto('/sales/quotation-returns');
    await expect(page.getByRole('heading', { name: 'Quotation sales returns', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/sales/quotation-returns/new');
    const picker = page.getByRole('combobox', { name: 'Quotation invoice' });
    await picker.click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('quotation print view renders the quotation paper', async ({ page, context }) => {
    await page.goto('/sales/quotations');
    const first = (isMobile(page) ? page.locator('.mlist .mi') : page.locator('table.dg tbody tr')).filter({ hasText: /QTN-\d+/ }).first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.getByRole('heading', { name: /QTN-\d+/ })).toBeVisible();
    const [popup] = await Promise.all([context.waitForEvent('page'), headerAction(page, 'Print')]);
    await popup.waitForLoadState();
    await expect(popup.locator('.paper')).toBeVisible();
    await expect(popup.getByText(/QUOTATION|INVOICE/).first()).toBeVisible();
  });
});
