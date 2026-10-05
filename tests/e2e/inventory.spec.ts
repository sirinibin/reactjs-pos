import type { Page } from '@playwright/test';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

/** Call the API with the signed-in session (fixtures we create and clean up ourselves). */
async function apiCall(page: Page, method: string, path: string, body?: unknown): Promise<any> {
  return page.evaluate(async ({ method, path, body }) => {
    const token = localStorage.getItem('access_token') || '';
    const sid = localStorage.getItem('store_id') || '';
    const sep = path.includes('?') ? '&' : '?';
    const r = await fetch(`${path}${sep}search[store_id]=${sid}`, { method, headers: { Authorization: token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify({ store_id: sid, ...(body as object) }) });
    return r.headers.get('content-type')?.includes('json') ? r.json() : null;
  }, { method, path, body });
}

const storeId = (page: Page) => page.evaluate(() => localStorage.getItem('store_id') || '');
const uniq = (p: string) => `${p} ${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4)}`;

async function save(page: Page, label = /^(Save|Create)/) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else if (label) await page.keyboard.press('Control+s');
}

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('product list loads with stock totals and is usable at this viewport', async ({ page }) => {
    await page.goto('/stock/products');
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByText('Stock value (retail)')).toBeVisible();
    if (isMobile(page)) {
      await expect(page.locator('.mlist .mi').first()).toBeVisible();
      await expect(page.locator('.tw.resp')).toBeHidden();
    } else {
      await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    }
    await page.getByRole('tab', { name: /^Out of stock/ }).click();
    await expect(page).toHaveURL(/view=out/);
    await page.getByRole('searchbox', { name: 'Search' }).fill('filter');
    await expect(page).toHaveURL(/q=filter/);
    await expectNoHorizontalOverflow(page);
  });

  test('product view shows stock by location, monthly chart and movements', async ({ page }) => {
    await page.goto('/stock/products');
    const first = isMobile(page) ? page.locator('.mlist .mi').first() : page.locator('table.dg tbody tr').first();
    await first.click();
    await expect(page).toHaveURL(/\/stock\/products\/[0-9a-f]{24}$/);
    await expect(page.getByText('Stock by location')).toBeVisible();
    await expect(page.getByText('Units sold per month')).toBeVisible();
    await expect(page.getByText('Barcode label')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: 'Stock movements' }).click();
    await expect(page.getByRole('heading', { name: 'Stock movements' })).toBeVisible();
    await page.getByRole('tab', { name: 'Prices' }).click();
    await expect(page.getByRole('heading', { name: 'Unit prices' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('create a product with prices and opening stock, then edit it', async ({ page }) => {
    const name = uniq('E2E Cabin Filter');
    await page.goto('/stock/products/new');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page.getByRole('textbox', { name: 'Purchase Excl. VAT' }).fill('40');
    await expect(page.getByRole('textbox', { name: 'Purchase Incl. VAT' })).toHaveValue('46');
    await page.getByRole('textbox', { name: 'Retail Incl. VAT' }).fill('69');
    await expect(page.getByRole('textbox', { name: 'Retail Excl. VAT' })).toHaveValue('60');
    await page.getByRole('textbox', { name: 'Adjustment quantity' }).fill('5');
    await page.getByRole('button', { name: 'Add stock' }).click();
    await expect(page.getByRole('table', { name: 'Stock adjustments' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/stock\/products\/[0-9a-f]{24}$/);
    const id = page.url().split('/').pop()!;
    try {
      await expect(page.getByRole('heading', { name })).toBeVisible();
      await expect(page.locator('.facet').filter({ hasText: 'On hand' })).toContainText('5');
      await page.getByRole('button', { name: 'Edit' }).click();
      await expect(page).toHaveURL(/\/edit$/);
      await page.getByRole('textbox', { name: 'Name in Arabic' }).fill('فلتر مكيف');
      await save(page);
      await expect(page).toHaveURL(new RegExp(`/stock/products/${id}$`));
      await expect(page.getByText('فلتر مكيف').first()).toBeVisible();
    } finally {
      await apiCall(page, 'DELETE', `/v1/product/${id}`);
    }
  });

  test('empty product name is rejected on the client', async ({ page }) => {
    await page.goto('/stock/products/new');
    if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
    else await page.getByRole('button', { name: /^Create Ctrl S/ }).click();
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
  });

  test('categories: create in the drawer, delete and restore', async ({ page }) => {
    const name = uniq('E2E Category');
    await page.goto('/stock/categories');
    await expect(page.getByRole('heading', { name: 'Product categories' })).toBeVisible();
    await page.getByRole('button', { name: 'New category' }).click();
    const dlg = page.getByRole('dialog', { name: 'New product category' });
    await dlg.getByRole('textbox', { name: /Name/ }).fill(name);
    await dlg.getByRole('button', { name: 'Create' }).click();
    await expect(dlg).toBeHidden();
    await page.getByRole('searchbox', { name: 'Search' }).fill(name);
    const row = isMobile(page) ? page.locator('.mlist .mi').filter({ hasText: name }) : page.locator('table.dg tbody tr').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const res = await apiCall(page, 'GET', `/v1/product-category?search[name]=${encodeURIComponent(name)}&select=id`);
    const id = res.result[0].id;
    if (!isMobile(page)) {
      await row.getByRole('button', { name: `Delete ${name}` }).click();
      await page.getByRole('dialog', { name: 'Delete category?' }).getByRole('button', { name: 'Delete' }).click();
      await expect(row).toBeHidden();
      await page.getByRole('tab', { name: /^Deleted/ }).click();
      await page.locator('table.dg tbody tr').filter({ hasText: name }).getByRole('button', { name: `Restore ${name}` }).click();
      await expect(page.locator('table.dg tbody tr').filter({ hasText: name })).toBeHidden();
    }
    await apiCall(page, 'DELETE', `/v1/product-category/${id}`);
  });

  test('brands, service categories, warehouses and services load', async ({ page }) => {
    for (const [path, title] of [['/stock/brands', 'Brands'], ['/stock/service-categories', 'Service categories'], ['/stock/warehouses', 'Warehouses'], ['/stock/services', 'Services']] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    await expect(page.getByText(/No records found|Wheel|Labour|Refill|Service/).first()).toBeVisible();
    await page.getByRole('button', { name: 'New service' }).click();
    const dlg = page.getByRole('dialog', { name: 'New service' });
    await expect(dlg.getByRole('textbox', { name: 'Retail Incl. VAT' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await page.goto('/stock/warehouses');
    await expect(page.locator(isMobile(page) ? '.mlist' : 'table.dg').getByText('WH1', { exact: true }).first()).toBeVisible();
  });

  test('stock transfer Main Store → warehouse end-to-end', async ({ page }) => {
    const sid = await storeId(page);
    const name = uniq('E2E Transfer item');
    const created = await apiCall(page, 'POST', '/v1/product', {
      name, product_stores: { [sid]: { store_id: sid, purchase_unit_price: 10, purchase_unit_price_with_vat: 11.5, retail_unit_price: 20, retail_unit_price_with_vat: 23, stock_adjustments: [{ date_str: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), type: 'adding', quantity: 8, reason: 'e2e', warehouse_id: null, warehouse_code: null }] } },
    });
    const pid = created.result.id as string;
    try {
      await page.goto(`/stock/products/${pid}`);
      await expect(page.getByRole('heading', { name })).toBeVisible();
      await page.goto(`/stock/transfers/new?product_id=${pid}`);
      await expect(page.getByRole('table', { name: 'Items' }).getByText(name)).toBeVisible();
      await expect(page.getByRole('combobox', { name: /^From/ })).toHaveValue('');
      await expect(page.getByRole('combobox', { name: /^To/ })).not.toHaveValue('');
      await expectNoHorizontalOverflow(page);
      if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
      else await page.keyboard.press('Control+s');
      await expect(page).toHaveURL(/\/stock\/transfers\/[0-9a-f]{24}$/);
      await expect(page.locator('#content h1').first()).toBeVisible();
      await expect(page.getByRole('table', { name: 'Items' }).getByText(name)).toBeVisible();
      await expect(page.locator('.facet').filter({ hasText: 'From' })).toContainText('Main Store');
      await expectNoHorizontalOverflow(page);
      await page.goto('/stock/transfers');
      await expect(page.getByRole('heading', { name: 'Stock transfers' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    } finally {
      await apiCall(page, 'DELETE', `/v1/product/${pid}`);
    }
  });

  test('Ctrl+K finds products', async ({ page }) => {
    test.skip(isMobile(page), 'keyboard palette is a desktop shortcut');
    await page.goto('/stock/products');
    await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(page.locator('.cmdk-in input')).toBeFocused();
    await page.locator('.cmdk-in input').fill('air filter');
    const hit = page.locator('.cmdk-l [role=option]').filter({ hasText: /Air Filter/i }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/stock\/products\/[0-9a-f]{24}$/);
  });
});
