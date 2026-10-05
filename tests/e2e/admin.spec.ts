import { readFileSync } from 'node:fs';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';
import type { Page } from '@playwright/test';

const API = process.env.API_URL || 'http://127.0.0.1:2000';
// fixtures.seed() uses __dirname, which is undefined in this ESM project — read the file directly.
const S = JSON.parse(readFileSync('tests/.seed.json', 'utf8'));

function token(): string {
  const st = JSON.parse(readFileSync('tests/e2e/.auth/state.json', 'utf8'));
  for (const o of st.origins || []) for (const i of o.localStorage || []) if (i.name === 'access_token') return i.value;
  throw new Error('no token in storage state');
}
async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: token(), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

function storeBody(code: string, extra: Record<string, any> = {}) {
  return {
    name: `E2E Store ${code}`, name_in_arabic: `متجر ${code}`, code, branch_name: 'E2E', business_category: 'Retail', registration_number: `CR${code}`.slice(0, 20),
    vat_no: '399999999999993', vat_no_in_arabic: '۳۹۹۹۹۹۹۹۹۹۹۹۹۹۳', phone_in_arabic: '۰۵۵۰۰۰۰۰۰۰', vat_percent: 15, email: `e2e-${code.toLowerCase()}@example.com`, phone: '0550000000', country_code: 'SA', country_name: 'Saudi Arabia',
    national_address: { building_no: '1234', street_name: 'Test St', street_name_arabic: 'شارع', district_name: 'Olaya', district_name_arabic: 'العليا', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '12345' },
    zatca: { phase: '1', env: 'NonProduction' },
    sales_serial_number: { prefix: 'S', start_from_count: 1, padding_count: 4 }, sales_return_serial_number: { prefix: 'SR', start_from_count: 1, padding_count: 4 },
    purchase_serial_number: { prefix: 'P', start_from_count: 1, padding_count: 4 }, purchase_return_serial_number: { prefix: 'PR', start_from_count: 1, padding_count: 4 },
    purchase_order_serial_number: { prefix: 'PO', start_from_count: 1, padding_count: 4 }, quotation_serial_number: { prefix: 'Q', start_from_count: 1, padding_count: 4 },
    customer_serial_number: { prefix: 'C', start_from_count: 1, padding_count: 4 }, vendor_serial_number: { prefix: 'V', start_from_count: 1, padding_count: 4 },
    settings: { enable_rbac_module: true, enable_products: true },
    ...extra,
  };
}
async function dropStore(id?: string) {
  if (!id) return;
  await call('DELETE', `/v1/store/${id}`);
  await call('DELETE', `/v1/store/${id}/permanent`);
}

/** Open the app with a given store as the active one (AuthProvider prefers last_store_<uid>). */
async function useStore(page: Page, storeId: string) {
  const me = await call('GET', '/v1/me');
  await page.addInitScript(([uid, sid]) => {
    localStorage.setItem(`last_store_${uid}`, sid);
    localStorage.setItem('store_id', sid);
  }, [me.result.id, storeId]);
}

/** Field by its visible label; tolerates the required-field asterisk. */
const field = (page: Page, text: string) => page.getByLabel(new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`));

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

test.describe('Admin · stores', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('store list shows the seeded store and is usable at this viewport', async ({ page }) => {
    await page.goto('/admin/stores');
    await expect(page.getByRole('heading', { name: 'Stores', exact: true })).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').filter({ hasText: S.storeCode || 'GUO' }).first()).toBeVisible();
    else await expect(page.locator('table.dg tbody tr').filter({ hasText: 'GUO' }).first()).toBeVisible();
    await page.getByRole('tab', { name: /^Deleted/ }).click();
    await expect(page).toHaveURL(/view=deleted/);
    await expectNoHorizontalOverflow(page);
  });

  test('store profile → settings tabs render; client validation blocks a bad save', async ({ page }) => {
    await page.goto(`/admin/stores/${S.storeId}`);
    await expect(page.getByRole('heading', { name: /Gulf Union Ozone/ })).toBeVisible();
    await expect(page.getByText('National address').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/stores/${S.storeId}/settings`));
    for (const tab of ['National address', 'Invoice titles', 'Document numbering', 'Preferences', 'Print & layout', 'ZATCA']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByRole('tabpanel', { name: tab })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
    await page.getByRole('tab', { name: 'Company', exact: true }).click();
    const name = field(page, 'Registered company name');
    await name.fill('');
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible();
    await save(page);
    await expect(page.getByRole('alert').filter({ hasText: 'Name is required' }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /Company/ })).toContainText('1');
  });

  test('create a store through the form, edit a setting, then delete it', async ({ page }) => {
    const code = `E${uniq()}`.slice(0, 10);
    let createdId = '';
    try {
      await page.goto('/admin/stores/new');
      await expect(page.getByRole('heading', { name: 'New store' })).toBeVisible();
      await field(page, 'Registered company name').fill(`E2E UI ${code}`);
      await field(page, 'Registered company name (Arabic)').fill(`متجر ${code}`);
      await field(page, 'Commercial registration (CRN)').fill(`CR${code}`);
      await field(page, 'VAT number').fill('399999999999993');
      await field(page, 'Branch code').fill(code);
      await field(page, 'Branch name').fill('UI branch');
      await save(page);
      // Address and contact are still missing → jumps to the first tab with errors.
      await expect(page.getByRole('tabpanel', { name: 'National address' })).toBeVisible();
      await field(page, 'Building number').fill('1234');
      await field(page, 'Street name').fill('Main St');
      await field(page, 'Street name (Arabic)').fill('الشارع الرئيسي');
      await field(page, 'District').fill('Olaya');
      await field(page, 'District (Arabic)').fill('العليا');
      await field(page, 'City').fill('Riyadh');
      await field(page, 'City (Arabic)').fill('الرياض');
      await field(page, 'Zipcode').fill('12345');
      await page.getByRole('tab', { name: /Contact/ }).click();
      await field(page, 'Phone').fill('0551112222');
      await field(page, 'Email').fill(`ui-${code.toLowerCase()}@example.com`);
      await save(page);
      await expect(page).toHaveURL(/\/admin\/stores\/[0-9a-f]{24}$/);
      createdId = page.url().split('/').pop()!;
      await expect(page.getByRole('heading', { name: new RegExp(`E2E UI ${code}`) })).toBeVisible();

      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('tab', { name: 'Preferences', exact: true }).click();
      const sw = page.getByRole('switch', { name: 'Warehouses & stock transfers' });
      await sw.check({ force: true });
      await save(page);
      await expect(page.getByText('Store updated successfully!')).toBeVisible();
      const after = await call('GET', `/v1/store/${createdId}`);
      expect(after.result.settings.enable_warehouse_module).toBe(true);
      expect(after.result.vat_no_in_arabic).toBe('۳۹۹۹۹۹۹۹۹۹۹۹۹۹۳');

      await page.goto(`/admin/stores/${createdId}`);
      await page.getByRole('button', { name: 'Delete store' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Store deleted')).toBeVisible();
      await expect(page.getByText('Deleted', { exact: true }).first()).toBeVisible();
    } finally {
      // Also catch a store that was created but not reached (e.g. the page reloaded mid-test).
      const found = await call('GET', `/v1/store?search[code]=${code}&search[deleted]=all&select=id`);
      for (const id of new Set([createdId, ...(found.result || []).map((x: any) => x.id)].filter(Boolean))) await dropStore(id as string);
    }
  });
});

test.describe('Admin · users', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('user list and own profile', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
    const row = isMobile(page) ? page.locator('.mlist .mi').filter({ hasText: 'sirinibin2006@gmail.com' }).first() : page.locator('table.dg tbody tr').filter({ hasText: 'sirinibin2006@gmail.com' }).first();
    await expect(row).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await row.click();
    await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /^Devices/ })).toBeVisible();
    // You cannot deactivate or delete yourself.
    await expect(page.getByRole('button', { name: 'Deactivate' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('create, edit and delete a user', async ({ page }) => {
    const email = `e2e-${uniq().toLowerCase()}@example.com`;
    let id = '';
    try {
      await page.goto('/admin/users/new');
      await expect(page.getByRole('heading', { name: 'New user' })).toBeVisible();
      await save(page);
      await expect(page.getByText('Name is required')).toBeVisible();
      await field(page, 'Name').fill('E2E Person');
      await field(page, 'Email').fill(email);
      await field(page, 'Mobile').fill('0559998877');
      await field(page, 'Password').fill('Secret123!');
      await page.getByRole('button', { name: 'Salesman' }).click();
      await page.getByRole('group', { name: 'Stores' }).getByRole('checkbox', { name: /Gulf Union Ozone/ }).check();
      await save(page);
      await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f]{24}$/);
      id = page.url().split('/').pop()!;
      await expect(page.getByRole('heading', { name: 'E2E Person' })).toBeVisible();
      await expect(page.getByText('Salesman').first()).toBeVisible();

      await page.getByRole('button', { name: 'Edit' }).click();
      await field(page, 'Mobile').fill('0551110000');
      await save(page);
      await expect(page.getByText('User updated successfully!')).toBeVisible();
      await expect(page.getByText('0551110000').first()).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expect(page).toHaveURL(/\/admin\/users$/);
      id = '';
    } finally {
      if (id) await call('DELETE', `/v1/user/${id}`);
    }
  });
});

test.describe('Admin · roles, signatures (throwaway store with RBAC on)', () => {
  let storeId = '';
  test.beforeAll(async () => {
    const r = await call('POST', '/v1/store', storeBody(`R${uniq()}`.slice(0, 10)));
    storeId = r.result?.id;
    expect(storeId, JSON.stringify(r.errors || {})).toBeTruthy();
  });
  test.afterAll(async () => { await dropStore(storeId); });
  test.beforeEach(async ({ page }) => { await useStore(page, storeId); await login(page); });

  test('roles: build a permission matrix, view it read-only, delete it', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page.getByRole('heading', { name: 'Roles & permissions' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'New role' }).click();
    await field(page, 'Role name').fill('E2E cashier');
    await page.getByRole('checkbox', { name: 'Grant everything' }).uncheck();
    await page.getByRole('checkbox', { name: 'Sales invoices · Read', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Sales invoices · Create', exact: true }).check();
    await expectNoHorizontalOverflow(page);
    await save(page);
    await expect(page).toHaveURL(/\/admin\/roles\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: 'E2E cashier' })).toBeVisible();
    await expect(page.getByText('1 resources')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/admin\/roles$/);
  });

  test('signatures: upload an image, rename, delete', async ({ page }) => {
    await page.goto('/admin/signatures');
    await expect(page.getByRole('heading', { name: 'Signatures' })).toBeVisible();
    await page.getByRole('button', { name: 'New signature' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Name').fill('E2E Sig');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await dlg.locator('input[type=file]').setInputFiles({ name: 'sig.png', mimeType: 'image/png', buffer: png });
    await expect(dlg.getByText('Not saved yet')).toBeVisible();
    await dlg.getByRole('button', { name: 'Create' }).click();
    const item = isMobile(page) ? page.locator('.mlist .mi').filter({ hasText: 'E2E Sig' }) : page.locator('table.dg tbody tr').filter({ hasText: 'E2E Sig' });
    await expect(item.first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await item.first().click();
    await page.getByRole('dialog').getByLabel('Name').fill('E2E Sig 2');
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
    const renamed = isMobile(page) ? page.locator('.mlist .mi').filter({ hasText: 'E2E Sig 2' }) : page.locator('table.dg tbody tr').filter({ hasText: 'E2E Sig 2' });
    await expect(renamed.first()).toBeVisible();
    if (!isMobile(page)) {
      await page.getByRole('button', { name: 'Delete E2E Sig 2' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Signature deleted')).toBeVisible();
    }
  });
});

test.describe('Admin · menu settings', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('hide an item, set a landing page and reset', async ({ page }) => {
    await page.goto('/admin/menu');
    await expect(page.getByRole('heading', { name: /Menu settings/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('switch', { name: 'Show Quotations' }).uncheck({ force: true });
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('sidebar_config') || '[]').find((x: any) => x.id === 'quotations')?.visible)).toBe(false);
    await page.locator('.adm-menu li').filter({ hasText: 'Customers' }).first().getByRole('button', { name: 'Set landing' }).click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('sidebar_config') || '[]')[0]?.id)).toBe('customers');
    await expect(page.locator('.adm-menu li').first()).toContainText('Landing');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('sidebar_config') || '[]').every((x: any) => x.visible))).toBe(true);
  });
});
