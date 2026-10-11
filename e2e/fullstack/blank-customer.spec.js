// A sale on the test server was saved against a customer with a blank name.
// Typing only spaces into the Sales form's customer box sent that "name" to
// the API, which created a customer from it. A blank typed name must leave
// the sale on the UNKNOWN customer, a typed name is saved trimmed, and the
// customer form refuses a name of only spaces.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { apiClient, uniq } = require('./api');

test.use({ storageState: AUTH_STATE });

const form = (page) => page.locator('#sales_create_form');

async function typeInto(input, text) {
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.press('Control+A');
  await input.pressSequentially(String(text), { delay: 40 });
}

const waitForCalc = (page) =>
  page.waitForResponse((r) => r.url().includes('/v1/order/calculate-net-total') && r.status() === 200);

async function openSalesCreate(page) {
  await page.goto('/dashboard/sales');
  await page.getByRole('button', { name: 'Create' }).first().click();
  await expect(form(page).getByText('Create New Sales Order')).toBeVisible();
}

async function addProduct(page, partNumber) {
  const box = form(page).getByPlaceholder('Part No. | Name | Name in Arabic | Brand | Country');
  const calc = waitForCalc(page);
  await typeInto(box, partNumber);
  await page.getByRole('option', { name: new RegExp(partNumber) }).first().click();
  await calc;
}

async function setQuantity(page, line, qty) {
  const calc = waitForCalc(page);
  await typeInto(form(page).locator(`#sales_product_quantity_${line}`), qty);
  await calc;
}

async function payInCash(page) {
  await form(page).locator('select').filter({ hasText: 'Bank Cheque' }).first().selectOption({ label: 'Cash' });
}

/** Presses Create; returns what the form sent and the order the API stored. */
async function save(page) {
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/order(\?|$)/.test(r.url()));
  const button = form(page).getByRole('button', { name: 'Create', exact: true }).last();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const res = await saved;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status, JSON.stringify(body.errors)).toBe(true);
  return { sent: res.request().postDataJSON(), order: body.result };
}

/** Every customer in the store has a name. */
async function expectNoBlankCustomers(api) {
  const list = await api.get('/v1/customer?limit=500&select=id,code,name');
  for (const c of list.result || []) {
    expect(String(c.name || '').replace(/[\s​‌‍⁠﻿]/g, ''), `customer ${c.code}`).not.toBe('');
  }
}

test.describe('blank customer names', () => {
  test('@devices a sale with only spaces typed as the customer is saved to UNKNOWN', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('BC');
    await api.createProduct({ partNumber: `BC-${w}`, price: 100 });

    await openSalesCreate(page);
    await typeInto(form(page).getByPlaceholder('Customer Name / Mob / VAT # / ID'), '   ');
    await page.keyboard.press('Tab');
    await addProduct(page, `BC-${w}`);
    await setQuantity(page, 0, 2);
    await payInCash(page);

    const { sent, order } = await save(page);
    expect(sent.customer_name).toBe('');
    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.customer_name).toBe('UNKNOWN');
    expect(stored.customer_id).toMatch(/^[0-9a-f]{24}$/);
    await expectNoBlankCustomers(api);
  });

  test('a new customer typed with extra spaces is saved with the trimmed name', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('BT');
    const name = `Walkin ${w}`;
    await api.createProduct({ partNumber: `BT-${w}`, price: 100 });

    await openSalesCreate(page);
    await typeInto(form(page).getByPlaceholder('Customer Name / Mob / VAT # / ID'), `  ${name}  `);
    await page.keyboard.press('Tab');
    await addProduct(page, `BT-${w}`);
    await setQuantity(page, 0, 2);
    await payInCash(page);

    const { sent, order } = await save(page);
    expect(sent.customer_name).toBe(name);
    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.customer_name.toUpperCase()).toBe(name.toUpperCase());
    const customer = (await api.get(`/v1/customer/${stored.customer_id}`)).result;
    expect(customer.name.toUpperCase()).toBe(name.toUpperCase());
  });

  test('@devices the customer form refuses a name of only spaces', async ({ page, request }) => {
    const api = apiClient(request);
    await page.goto('/dashboard/customers');
    await page.getByRole('button', { name: 'Create' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create New Customer')).toBeVisible();

    let posted = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/v1\/customer(\?|$)/.test(r.url())) posted = true;
    });
    await dialog.getByPlaceholder('Name', { exact: true }).fill('    ');
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    await expect(dialog.getByText(/name is required/i).first()).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(posted).toBe(false);
    await expectNoBlankCustomers(api);
  });
});
