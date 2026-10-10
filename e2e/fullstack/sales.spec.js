// A cashier's day on the Sales screen, done the way a person does it: type a
// few letters, pick the suggestion, type quantities, choose the payment
// method, press Create. Every result is then read back from the real API and
// MongoDB: lines, VAT, totals, payment status and the stock it moved.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { apiClient, uniq } = require('./api');

test.use({ storageState: AUTH_STATE });

const form = (page) => page.locator('#sales_create_form');

/** Types into an input like a person: focus, select what's there, type. */
async function typeInto(input, text) {
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.press('Control+A');
  await input.pressSequentially(String(text), { delay: 40 });
}

function waitForCalc(page) {
  return page.waitForResponse((r) => r.url().includes('/v1/order/calculate-net-total') && r.status() === 200);
}

async function openSalesCreate(page) {
  await page.goto('/dashboard/sales');
  await page.getByRole('button', { name: 'Create' }).first().click();
  await expect(form(page).getByText('Create New Sales Order')).toBeVisible();
}

async function pickCustomer(page, name) {
  const box = form(page).getByPlaceholder('Customer Name / Mob / VAT # / ID');
  await typeInto(box, name);
  await page.getByRole('option', { name: new RegExp(name, 'i') }).first().click();
  await expect(form(page).getByText(name.toUpperCase()).first()).toBeVisible();
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

const netTotal = (page) => form(page).getByText('Net Total (inc. VAT)').locator('xpath=..').locator('span').last();

async function choosePaymentMethod(page, method = 'Cash', row = 0) {
  await form(page).locator('select').filter({ hasText: 'Bank Cheque' }).nth(row).selectOption({ label: method });
}

/** Presses Create and returns the order the API stored. */
async function save(page) {
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/order(\?|$)/.test(r.url()));
  const button = form(page).getByRole('button', { name: 'Create', exact: true }).last();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const res = await saved;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status, JSON.stringify(body.errors)).toBe(true);
  return body.result;
}

test.describe('sales', () => {
  test('@devices a cashier sells two products to a customer for cash and the invoice is right', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    const pads = await api.createProduct({ name: `Brake Pad ${w}`, partNumber: `BP-${w}`, price: 100, purchasePrice: 60 });
    const oil = await api.createProduct({ name: `Oil Filter ${w}`, partNumber: `OF-${w}`, price: 50, purchasePrice: 20 });
    const padsBefore = await api.stockOf(pads.id);
    const oilBefore = await api.stockOf(oil.id);

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `BP-${w}`);
    await setQuantity(page, 0, 3);
    await addProduct(page, `OF-${w}`);

    // 3 x 100 + 1 x 50 = 350, + 15% VAT = 402.50, shown before saving.
    await expect(netTotal(page)).toHaveText('402.50');
    await choosePaymentMethod(page, 'Cash');
    await expect(form(page).locator('#sales_payment_amount0')).toHaveValue('402.5');
    await expect(form(page).getByText('Paid', { exact: true })).toBeVisible();

    const order = await save(page);

    // The printable invoice opens with the stored invoice number and total.
    await expect(page.getByText('Sales Preview')).toBeVisible();
    await expect(page.getByText(order.code).first()).toBeVisible();
    await expect(page.getByText('402.50').first()).toBeVisible();

    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.customer_id).toBe(customer.id);
    expect(stored.products.map((p) => [p.part_number, p.quantity, p.unit_price])).toEqual([
      [`BP-${w}`, 3, 100],
      [`OF-${w}`, 1, 50],
    ]);
    expect(stored.total).toBe(350);
    expect(stored.vat_percent).toBe(15);
    expect(stored.vat_price).toBe(52.5);
    expect(stored.net_total).toBe(402.5);
    expect(stored.total_payment_received).toBe(402.5);
    expect(stored.balance_amount).toBe(0);
    expect(stored.payment_status).toBe('paid');
    expect(stored.payment_methods).toEqual(['cash']);
    expect(stored.profit).toBe(3 * (100 - 60) + (50 - 20));

    // Selling takes the goods off the shelf.
    expect(await api.stockOf(pads.id)).toBe(padsBefore - 3);
    expect(await api.stockOf(oil.id)).toBe(oilBefore - 1);

    // The sale is listed under its invoice number.
    await page.goto('/dashboard/sales');
    await expect(page.getByText(order.code).first()).toBeVisible();
  });

  test('a part payment leaves the rest as the balance', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    await api.createProduct({ partNumber: `PP-${w}`, price: 200 });

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `PP-${w}`);
    await expect(netTotal(page)).toHaveText('230.00');
    await typeInto(form(page).locator('#sales_payment_amount0'), 100);
    await choosePaymentMethod(page, 'Bank Transfer');
    await expect(form(page).getByText('130.00').first()).toBeVisible(); // balance shown in the form

    const order = await save(page);
    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.net_total).toBe(230);
    expect(stored.total_payment_received).toBe(100);
    expect(stored.balance_amount).toBe(130);
    expect(stored.payment_status).toBe('paid_partially');
    expect(stored.payment_methods).toEqual(['bank_transfer']);
  });

  test('a credit sale with the payment removed is saved as not paid', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    await api.createProduct({ partNumber: `CR-${w}`, price: 40 });

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `CR-${w}`);
    await setQuantity(page, 0, 5);
    await form(page).locator('#sales_payment_amount0').locator('xpath=ancestor::tr').locator('button:has(i.bi-trash)').click();
    await expect(form(page).locator('#sales_payment_amount0')).toHaveCount(0);

    const order = await save(page);
    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.net_total).toBe(230);
    expect(stored.total_payment_received).toBe(0);
    expect(stored.balance_amount).toBe(230);
    expect(stored.payment_status).toBe('not_paid');
  });

  test('a unit discount is taken off before VAT', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    await api.createProduct({ partNumber: `DS-${w}`, price: 80 });

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `DS-${w}`);
    await setQuantity(page, 0, 2);
    const calc = waitForCalc(page);
    await typeInto(form(page).locator('#sales_unit_discount_0'), 10);
    await calc;
    // (80 - 10) x 2 = 140, + 15% VAT = 161.00
    await expect(netTotal(page)).toHaveText('161.00');
    await choosePaymentMethod(page, 'Cash');

    const order = await save(page);
    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.products[0].unit_discount).toBe(10);
    expect(stored.total).toBe(140);
    expect(stored.vat_price).toBe(21);
    expect(stored.net_total).toBe(161);
  });

  test('picking the same product twice adds to its quantity instead of a second line', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    await api.createProduct({ partNumber: `DU-${w}`, price: 10 });

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `DU-${w}`);
    await addProduct(page, `DU-${w}`);
    await expect(form(page).locator('#sales_product_quantity_1')).toHaveCount(0);
    await expect(form(page).locator('#sales_product_quantity_0')).toHaveValue('2');
    await expect(netTotal(page)).toHaveText('23.00');
  });

  test('a sale with no products is refused and nothing is saved', async ({ page, request }) => {
    const api = apiClient(request);
    const customer = await api.createCustomer({ name: `Cust ${uniq('S')}` });
    await openSalesCreate(page);
    await pickCustomer(page, customer.name);

    const posts = [];
    page.on('response', (r) => {
      if (r.request().method() === 'POST' && /\/v1\/order(\?|$)/.test(r.url())) posts.push(r);
    });
    await form(page).getByRole('button', { name: 'Create', exact: true }).last().click();
    await expect(form(page).getByText(/product/i).filter({ hasText: /required|add|select|atleast|at least/i }).first()).toBeVisible();
    await expect(form(page)).toBeVisible(); // the form stays open for correction
    for (const r of posts) expect((await r.json()).status).toBe(false);
    const list = await api.get(`/v1/order?search[customer_id]=${customer.id}`);
    expect(list.result || []).toHaveLength(0);
  });

  test('editing a saved sale changes its quantity, totals and stock', async ({ page, request }) => {
    const api = apiClient(request);
    const w = uniq('S');
    const customer = await api.createCustomer({ name: `Cust ${w}` });
    const product = await api.createProduct({ partNumber: `ED-${w}`, price: 100 });
    const before = await api.stockOf(product.id);

    await openSalesCreate(page);
    await pickCustomer(page, customer.name);
    await addProduct(page, `ED-${w}`);
    await setQuantity(page, 0, 4);
    await choosePaymentMethod(page, 'Cash');
    const order = await save(page);
    expect(await api.stockOf(product.id)).toBe(before - 4);

    // Open it again from the list and sell one fewer.
    await page.goto('/dashboard/sales');
    const row = page.locator('tr', { hasText: order.code }).first();
    await row.locator('button:has(i.bi-pencil)').first().click();
    await expect(form(page).getByText('Update Sales').first()).toBeVisible();
    await setQuantity(page, 0, 3);
    await expect(netTotal(page)).toHaveText('345.00');
    // The cash received was the old total; record the new one.
    await typeInto(form(page).locator('#sales_payment_amount0'), 345);

    const updated = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/order/${order.id}`));
    await form(page).getByRole('button', { name: /^\s*Update\s*$/ }).last().click();
    const res = await updated;
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe(true);

    const stored = (await api.get(`/v1/order/${order.id}`)).result;
    expect(stored.products[0].quantity).toBe(3);
    expect(stored.net_total).toBe(345);
    expect(stored.payment_status).toBe('paid');
    expect(await api.stockOf(product.id)).toBe(before - 3);
  });
});
