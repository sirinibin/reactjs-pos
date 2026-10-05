import type { Page } from '@playwright/test';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

async function openFirstRow(page: Page) {
  const first = isMobile(page) ? page.locator('.mlist .mi').first() : page.locator('table.dg tbody tr:has(td.code)').first();
  await expect(first).toBeVisible();
  await first.click();
}

async function addItem(page: Page, q: string, name: RegExp) {
  const add = page.getByRole('combobox', { name: 'Add item' });
  await add.click();
  await add.fill(q);
  await page.getByRole('option', { name }).first().click();
  await expect(page.getByRole('table', { name: 'Items' }).getByText(name).first()).toBeVisible();
}

test.describe('Buying', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('purchase bill list shows totals and fits the viewport', async ({ page }) => {
    await page.goto('/buying/purchases');
    await expect(page.getByRole('heading', { name: 'Purchase bills' })).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').first()).toBeVisible();
    else await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    await expect(page.getByText('VAT paid')).toBeVisible();
    await page.getByRole('tab', { name: /^To pay/ }).click();
    await expect(page).toHaveURL(/view=open/);
    await expectNoHorizontalOverflow(page);
  });

  test('open a purchase bill: flow, lines with purchase prices, print view', async ({ page, context }) => {
    await page.goto('/buying/purchases');
    await openFirstRow(page);
    await expect(page.getByRole('heading', { name: /P-INV-\d+/ })).toBeVisible();
    await expect(page.getByText('Document flow')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print' }).click()]);
    await popup.waitForLoadState();
    await expect(popup.locator('.paper')).toBeVisible();
    await expect(popup.getByText(/PURCHASE INVOICE/i).first()).toBeVisible();
    await popup.close();
  });

  test('create a purchase bill, then return part of it', async ({ page }) => {
    await page.goto('/buying/purchases/new');
    await expect(page.getByRole('heading', { name: 'New purchase bill' })).toBeVisible();
    const vendor = page.getByRole('combobox', { name: /Vendor/ }).first();
    await vendor.fill('jazira');
    await page.getByRole('option', { name: /AL JAZIRA/ }).first().click();
    await expect(vendor).toHaveValue(/AL JAZIRA/);
    await page.getByRole('textbox', { name: 'Vendor invoice #' }).fill(`E2E-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    await addItem(page, 'spark', /Spark Plug/);
    await expect(page.getByText('Selling prices')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/buying\/purchases\/[0-9a-f]{24}$/);
    await expect(page.getByText(/P-INV-\d+ created/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /P-INV-\d+/ })).toBeVisible();
    const purchaseUrl = page.url();
    const id = purchaseUrl.split('/').pop();

    await page.goto(`/buying/returns/new?purchase_id=${id}`);
    await expect(page.getByRole('heading', { name: 'New purchase return' })).toBeVisible();
    const items = page.getByRole('table', { name: 'Items' });
    await expect(items.getByText(/Spark Plug/).first()).toBeVisible();
    const qty = items.getByRole('textbox', { name: 'Quantity' }).first();
    await qty.fill('1');
    await qty.press('Enter');
    await save(page);
    await expect(page).toHaveURL(/\/buying\/returns\/[0-9a-f]{24}$/);
    await expect(page.getByText('Document flow')).toBeVisible();
    await expect(page.getByRole('link', { name: /P-INV-\d+/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('empty purchase cannot be saved', async ({ page }) => {
    await page.goto('/buying/purchases/new');
    await expect(page.getByRole('heading', { name: 'New purchase bill' })).toBeVisible();
    await save(page);
    await expect(page.getByText('Add at least one item.')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  test('purchase order: create, then convert to a purchase bill', async ({ page }) => {
    await page.goto('/buying/orders/new');
    await expect(page.getByRole('heading', { name: 'New purchase order' })).toBeVisible();
    const vendor = page.getByRole('combobox', { name: /Vendor/ }).first();
    await vendor.fill('bosch');
    await page.getByRole('option', { name: /BOSCH/ }).first().click();
    await addItem(page, 'wiper', /Wiper Blade/);
    await save(page);
    await expect(page).toHaveURL(/\/buying\/orders\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /PO-?\w*\d+/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Convert to purchase' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/buying\/purchases\/new\?from_po=/);
    await expect(page.getByRole('table', { name: 'Items' }).getByText(/Wiper Blade/).first()).toBeVisible();
    await save(page);
    await expect(page).toHaveURL(/\/buying\/purchases\/[0-9a-f]{24}/);
    await expect(page.getByText(/marked as received/)).toBeVisible();
  });

  test('purchase requests list and a new request', async ({ page }) => {
    await page.goto('/buying/requests');
    await expect(page.getByRole('heading', { name: 'Purchase requests' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'New request' }).click();
    await expect(page).toHaveURL(/\/buying\/requests\/new$/);
    await expect(page.getByRole('heading', { name: 'New purchase request' })).toBeVisible();
    await page.getByRole('combobox', { name: /Assign to/ }).click();
    await page.getByRole('option').first().click();
    await addItem(page, 'coolant', /Coolant/);
    await save(page);
    await expect(page).toHaveURL(/\/buying\/requests\/[0-9a-f]{24}$/);
    await expect(page.getByText('Document flow')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('vendor list → vendor 360 with purchase history', async ({ page }) => {
    await page.goto('/buying/vendors');
    await expect(page.getByRole('heading', { name: 'Vendors' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('searchbox', { name: 'Search' }).fill('jazira');
    await expect(page).toHaveURL(/q=jazira/);
    await openFirstRow(page);
    await expect(page.getByRole('heading', { name: /AL JAZIRA/ })).toBeVisible();
    await page.getByRole('tab', { name: /Purchase bills/ }).click();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').first()).toBeVisible();
    else await expect(page.getByRole('table', { name: 'Purchase bills' }).locator('tbody tr').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('textbox', { name: /^Name/ }).first()).toHaveValue(/AL JAZIRA/);
    await page.keyboard.press('Escape');
  });

  test('payment, refund and cash-discount registers load', async ({ page }) => {
    for (const [path, title] of [['/buying/payments', 'Purchase payments'], ['/buying/return-payments', 'Return refunds'], ['/buying/cash-discounts', 'Cash discounts']] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByText(/Couldn’t load/)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }
  });
});
