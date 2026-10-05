import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

test.describe('Sales invoices', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list loads with totals and is usable at this viewport', async ({ page }) => {
    await page.goto('/sales/invoices');
    await expect(page.getByRole('heading', { name: 'Sales invoices' })).toBeVisible();
    if (isMobile(page)) {
      await expect(page.locator('.mlist .mi').first()).toBeVisible();
      await expect(page.locator('.tw.resp')).toBeHidden();
    } else {
      await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    }
    await expect(page.getByText('VAT collected')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('saved views and search narrow the list', async ({ page }) => {
    await page.goto('/sales/invoices');
    await page.getByRole('tab', { name: /^Unpaid/ }).click();
    await expect(page).toHaveURL(/view=unpaid/);
    await page.getByRole('searchbox', { name: 'Search' }).fill('S-INV');
    await expect(page).toHaveURL(/q=S-INV/);
  });

  test('open an invoice, see document flow and print view', async ({ page, context }) => {
    await page.goto('/sales/invoices');
    const first = isMobile(page) ? page.locator('.mlist .mi').first() : page.locator('table.dg tbody tr').first();
    await first.click();
    await expect(page.getByRole('heading', { name: /S-INV-\d+/ })).toBeVisible();
    await expect(page.getByText('Document flow')).toBeVisible();
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print' }).click()]);
    await popup.waitForLoadState();
    await expect(popup.locator('.paper')).toBeVisible();
    await expect(popup.getByText(/TAX INVOICE|SIMPLIFIED TAX INVOICE/)).toBeVisible();
    await expect(popup.locator('.paper [role=img][aria-label="ZATCA QR code"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('create a sales invoice end-to-end with keyboard shortcuts', async ({ page }) => {
    await page.goto('/sales/invoices/new');
    const customer = page.getByRole('combobox', { name: /Customer/ }).first();
    await customer.fill('al noor');
    await page.getByRole('option', { name: /AL NOOR TRADING/ }).click();
    await expect(customer).toHaveValue(/AL NOOR TRADING/);
    await page.keyboard.press('F2');
    await page.keyboard.type('oil');
    await expect(page.getByRole('option', { name: /Engine Oil/ }).first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table', { name: 'Items' }).getByText(/Engine Oil/).first()).toBeVisible();
    if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
    else await page.keyboard.press('Control+s');
    await expect(page).toHaveURL(/\/sales\/invoices\/[0-9a-f]{24}$/);
    await expect(page.getByText(/S-INV-\d+ created/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /S-INV-\d+/ })).toBeVisible();
  });

  test('empty invoice cannot be saved', async ({ page }) => {
    await page.goto('/sales/invoices/new');
    if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
    else await page.getByRole('button', { name: /^Save Ctrl S/ }).click();
    await expect(page.getByText('Add at least one item.')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });
});
