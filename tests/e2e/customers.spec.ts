import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';
import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// fixtures.seed() uses __dirname, which is undefined in Playwright's ESM loader — read the seed here.
const SEED_PATH = resolve(process.cwd(), 'tests/.seed.json');
const S = existsSync(SEED_PATH) ? JSON.parse(readFileSync(SEED_PATH, 'utf8')) : {};
const ALNOOR = (S.customers || []).find((c: any) => /AL NOOR/.test(c.name))?.id || S.customers?.[0]?.id;
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

test.describe('Customers', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list loads with totals and fits the viewport', async ({ page }) => {
    await page.goto('/sales/customers');
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
    if (isMobile(page)) {
      await expect(page.locator('.mlist .mi').first()).toBeVisible();
      await expect(page.locator('.tw.resp')).toBeHidden();
    } else {
      await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    }
    await expect(page.locator('.sum-mini').getByText('Credit balance')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('views and search narrow the list', async ({ page }) => {
    await page.goto('/sales/customers');
    await page.getByRole('tab', { name: /^With balance/ }).click();
    await expect(page).toHaveURL(/view=balance/);
    await page.getByRole('searchbox', { name: 'Search' }).fill('noor');
    await expect(page).toHaveURL(/q=noor/);
    const hit = isMobile(page) ? page.locator('.mlist .mi').filter({ hasText: 'AL NOOR' }).first() : page.locator('table.dg tbody tr').filter({ hasText: 'AL NOOR' }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/sales\/customers\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /AL NOOR/ })).toBeVisible();
  });

  test('Customer 360 shows facets, aging, credit, contact, open invoices and the ledger', async ({ page }) => {
    test.skip(!ALNOOR, 'seed missing');
    await page.goto(`/sales/customers/${ALNOOR}`);
    await expect(page.getByRole('heading', { name: /AL NOOR/ })).toBeVisible();
    await expect(page.getByText('Lifetime sales')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Receivables aging' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Credit', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /Credit used/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Open invoices/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: 'Ledger' }).click();
    await expect(page).toHaveURL(/tab=ledger/);
    await expect(page.getByRole('table', { name: 'Account statement' })).toBeVisible();
    await expect(page.getByText('Closing balance')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: /^Invoices/ }).click();
    await expect(page.getByText(/S-INV-\d+/).locator('visible=true').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Contacts & addresses' }).click();
    await expect(page.getByRole('heading', { name: 'National address' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('create a customer, then edit it', async ({ page }) => {
    const name = `E2E CUSTOMER ${uniq()}`;
    await page.goto('/sales/customers/new');
    await expect(page.getByRole('heading', { name: 'New customer' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByLabel(/^Name\s*\*?$/).fill(name);
    await page.getByLabel(/^Phone$/).fill('0550001122');
    await page.getByLabel(/^City$/).fill('Riyadh');
    await page.getByLabel(/^Credit limit/).fill('5000');
    await save(page);
    await expect(page).toHaveURL(/\/sales\/customers\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText(`${name} created`)).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByLabel(/^Email/).fill('e2e@example.sa');
    await save(page);
    await expect(page).toHaveURL(/\/sales\/customers\/[0-9a-f]{24}$/);
    await page.getByRole('tab', { name: 'Contacts & addresses' }).click();
    await expect(page.getByText('e2e@example.sa')).toBeVisible();
  });

  test('invalid VAT is caught before saving', async ({ page }) => {
    await page.goto('/sales/customers/new');
    await expect(page.getByRole('heading', { name: 'New customer' })).toBeVisible();
    await page.getByLabel(/^Name\s*\*?$/).fill('VAT CHECK');
    await page.getByLabel(/^VAT no\./).fill('12345');
    await save(page);
    await expect(page.getByText('VAT No. should be 15 digits')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  test('Ctrl+K finds a customer', async ({ page }) => {
    test.skip(isMobile(page), 'keyboard palette is a desktop affordance');
    await page.goto('/sales/customers');
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
    await page.keyboard.press('Control+k');
    const dlg = page.getByRole('dialog', { name: 'Command palette' });
    await expect(page.locator('.cmdk-in input')).toBeFocused();
    await page.keyboard.type('noor');
    await expect(dlg.getByRole('option', { name: /AL NOOR TRADING/ }).first()).toBeVisible();
    await dlg.getByRole('option', { name: /AL NOOR TRADING/ }).first().click();
    await expect(page.getByRole('heading', { name: /AL NOOR/ })).toBeVisible();
  });
});

test.describe('Receivables & payables', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('receive a payment from Customer 360 and print the receipt', async ({ page, context }) => {
    test.skip(!ALNOOR, 'seed missing');
    await page.goto(`/sales/customers/${ALNOOR}`);
    await page.locator('.obj-acts').getByRole('button', { name: 'Receive payment' }).click();
    await expect(page).toHaveURL(/\/sales\/receivables\/new\?customer_id=/);
    await expect(page.getByRole('combobox', { name: /Customer/ })).toHaveValue(/AL NOOR/);
    await expectNoHorizontalOverflow(page);
    const amount = (1 + Math.random() * 90).toFixed(2);
    await page.getByLabel(/^Amount/).fill(amount);
    await page.getByLabel(/^Method/).selectOption('cash');
    await page.getByLabel(/^Description/).fill('E2E receipt');
    await save(page);
    await expect(page).toHaveURL(/\/sales\/receivables\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Received from')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print' }).click()]);
    await popup.waitForLoadState();
    await expect(popup.locator('.paper')).toBeVisible();
    await expect(popup.getByText(/In Words/)).toBeVisible();
  });

  test('receivables list and new form validate', async ({ page }) => {
    await page.goto('/sales/receivables');
    await expect(page.getByRole('heading', { name: 'Receivables' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/sales/receivables/new');
    await expect(page.getByRole('heading', { name: 'New receivable' })).toBeVisible();
    await save(page);
    await expect(page.getByText('Customer is required')).toBeVisible();
    await expect(page.getByText('Payment amount is required').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('payables list loads', async ({ page }) => {
    await page.goto('/buying/payables');
    await expect(page.getByRole('heading', { name: 'Payables' })).toBeVisible();
    await expect(page.locator('.sum-mini').getByText('To customers')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('customer packages (admin) list and form', async ({ page }) => {
    await page.goto('/sales/customer-packages');
    await expect(page.getByRole('heading', { name: 'Customer packages' })).toBeVisible();
    await page.getByRole('button', { name: 'New package' }).click();
    const dlg = page.getByRole('dialog', { name: 'New customer package' });
    await expect(dlg.getByRole('checkbox', { name: 'Customers' })).toBeVisible();
    await dlg.getByRole('button', { name: 'Select all' }).click();
    await expect(dlg.getByRole('checkbox', { name: 'Customers' })).toBeChecked();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
  });
});
