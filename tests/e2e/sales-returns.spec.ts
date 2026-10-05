import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

// fixtures.seed() uses __dirname, which is undefined in this ESM project — read the seed directly.
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/.seed.json'), 'utf8'));

const iso = () => {
  const d = new Date();
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};

/** Fresh paid invoice per test (via the API with the signed-in session) so returns never run out of quantity. */
async function createPaidInvoice(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  const storeId = await page.evaluate(() => localStorage.getItem('store_id'));
  const p = SEED.products[3];
  const headers = { Authorization: token || '', 'Content-Type': 'application/json' };
  const unitWithVat = Math.round(p.price * 115) / 100;
  const net = Math.round(unitWithVat * 2 * 100) / 100;
  const r = await page.request.post(`/v1/order?search[store_id]=${storeId}`, {
    headers,
    data: { store_id: storeId, date_str: iso(), customer_id: SEED.customers[0].id, customer_name: SEED.customers[0].name, vat_percent: 15, auto_rounding_amount: true, discount: 0, shipping_handling_fees: 0, cash_discount: 0,
      products: [{ product_id: p.id, name: p.name, quantity: 2, unit_price: p.price, unit_price_with_vat: unitWithVat }], payments_input: [{ date_str: iso(), amount: net, method: 'cash' }] },
  });
  const j = await r.json();
  expect(j.status, JSON.stringify(j.errors)).toBe(true);
  return j.result as { id: string; code: string };
}

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

test.describe('Sales returns', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list loads with totals and fits the viewport', async ({ page }) => {
    await page.goto('/sales/returns');
    await expect(page.getByRole('heading', { name: 'Sales returns' })).toBeVisible();
    await expect(page.getByText('Credit (not refunded)')).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.tw.resp')).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('return against an invoice: prefill, quantity cap, refund, view, print', async ({ page, context }) => {
    const inv = await createPaidInvoice(page);
    await page.goto(`/sales/returns/new?order_id=${inv.id}`);
    const items = page.getByRole('table', { name: 'Items' });
    await expect(items.getByText(/Sold 2/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await items.getByRole('checkbox', { name: /^Return / }).first().check();
    const qty = items.getByRole('textbox', { name: /Return quantity/ }).first();
    await qty.fill('5');
    await qty.press('Enter');
    await expect(qty).toHaveValue('2');
    await qty.fill('1');
    await qty.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Amount paid' })).not.toHaveValue('0');
    await save(page);
    await expect(page).toHaveURL(/\/sales\/returns\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /S-RET-\d+/ })).toBeVisible();
    await expect(page.getByText('Document flow')).toBeVisible();
    await expect(page.getByRole('link', { name: inv.code }).or(page.getByText(inv.code)).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Print' }).click()]);
    await popup.waitForLoadState();
    await expect(popup.locator('.paper')).toBeVisible();
    await expect(popup.getByText(/CREDIT NOTE/i)).toBeVisible();
    await popup.close();

    // The invoice's returned quantity now limits the next return.
    await page.goto(`/sales/returns/new?order_id=${inv.id}`);
    await expect(page.getByRole('table', { name: 'Items' }).getByText(/Returned 1/)).toBeVisible();
  });

  test('saving without selecting anything is refused', async ({ page }) => {
    const inv = await createPaidInvoice(page);
    await page.goto(`/sales/returns/new?order_id=${inv.id}`);
    await expect(page.getByRole('table', { name: 'Items' })).toBeVisible();
    await save(page);
    await expect(page.getByText('Select at least one item to return.')).toBeVisible();
    await expect(page).toHaveURL(/\/new\?order_id=/);
  });

  test('new return without an invoice asks for one', async ({ page }) => {
    await page.goto('/sales/returns/new');
    await expect(page.getByText('Which invoice is being returned?')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Non-VAT sales', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('create a non-VAT sale, then return part of it', async ({ page }) => {
    await page.goto('/sales/non-vat/new');
    await expect(page.getByRole('checkbox', { name: 'Exclude service tax' })).toBeChecked();
    await page.getByRole('combobox', { name: 'Add item' }).fill('spark');
    await page.getByRole('option', { name: /Spark Plug/ }).first().click();
    await expect(page.getByRole('table', { name: 'Items' }).getByText(/Spark Plug/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/sales\/non-vat\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /NV-\d+/ })).toBeVisible();
    await expect(page.getByText('No VAT invoice')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    if (isMobile(page)) await page.getByRole('link', { name: /Create return/ }).or(page.getByText('Create return')).first().click();
    else await page.getByRole('button', { name: 'Return', exact: true }).click();
    await expect(page).toHaveURL(/\/sales\/non-vat-returns\/new\?non_vat_sales_id=/);
    const items = page.getByRole('table', { name: 'Items' });
    await items.getByRole('checkbox', { name: /^Return / }).first().check();
    await save(page);
    await expect(page).toHaveURL(/\/sales\/non-vat-returns\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /NVR?-?\d+/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('lists load without overflow', async ({ page }) => {
    for (const [path, title] of [['/sales/non-vat', 'Non-VAT sales'], ['/sales/non-vat-returns', 'Non-VAT sales returns']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});

test.describe('Money-in lists', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sales payments: list, totals and the receive-payment form', async ({ page }) => {
    await page.goto('/sales/payments');
    await expect(page.getByRole('heading', { name: 'Sales payments' })).toBeVisible();
    await expect(page.getByText('Total received')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Receive payment' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('combobox', { name: /Sales invoice/ })).toBeVisible();
    await dlg.getByRole('button', { name: 'Save' }).click();
    await expect(dlg.getByText('Sales invoice is required')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
  });

  test('a return refund shows up in the return refunds list', async ({ page }) => {
    const inv = await createPaidInvoice(page);
    // Return one unit so the invoice has a refundable credit, then check the refund list shows it.
    await page.goto(`/sales/returns/new?order_id=${inv.id}`);
    await page.getByRole('table', { name: 'Items' }).getByRole('checkbox', { name: /^Return / }).first().check();
    await save(page);
    await expect(page.getByRole('heading', { name: /S-RET-\d+/ })).toBeVisible();
    const code = (await page.getByRole('heading', { name: /S-RET-\d+/ }).textContent())!.match(/S-RET-\d+/)![0];
    await page.goto(`/sales/return-payments?q=${code}`);
    await expect(page.getByRole('heading', { name: 'Return refunds' })).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').getByText(code).first()).toBeVisible();
    else await expect(page.locator('table.dg').getByText(code).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('cash discounts list has no delete and a create form', async ({ page }) => {
    await page.goto('/sales/cash-discounts?new=1');
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(/must stay below the amount received/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Cash discounts' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
