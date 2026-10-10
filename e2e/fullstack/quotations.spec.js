// Quotations through the real UI, checked against the real API and MongoDB:
// a quotation typed into the Quotation Create form is stored with the right
// lines and totals, shows up in the list, can be edited, and can be turned
// into a sale with "Switch to Sales".
const { test, expect, AUTH_STATE } = require('./fixtures');
const {
  salesApi, chooseCustomer, addProduct, setNumber, quotationNetTotal, openQuotationCreate, findRow, typeInto,
} = require('./helpers/sales');

test.use({ storageState: AUTH_STATE });

const isQuotationPost = (r) => r.request().method() === 'POST' && /\/v1\/quotation\?/.test(r.url());

test.describe('quotations', () => {
  test.describe.configure({ timeout: 120_000 });
  test('@devices a quotation with a customer and two edited lines is saved with exact totals and is listed', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer, products: [a, b] } = await api.arrangeSale(2); // retail 100 each

    const dialog = await openQuotationCreate(page);
    await chooseCustomer(page, dialog, customer);
    const ia = await addProduct(page, dialog, a, 'quotation');
    const ib = await addProduct(page, dialog, b, 'quotation');

    // A: 3 x 100 with 5 off each (285). B: 1 x 70 (70). 10 off the bill.
    await setNumber(page, dialog.locator(`#quotation_product_quantity_${ia}`), 3);
    await setNumber(page, dialog.locator(`#quotation_unit_discount_${ia}`), 5);
    await setNumber(page, dialog.locator(`#quotation_product_unit_price_${ib}`), 70);
    await setNumber(page, dialog.locator('input[name="sales_discount"]'), 10);

    // 355 - 10 = 345 taxable, + 15% VAT 51.75 = 396.75
    await expect(dialog.locator(`#quotation_product_line_total_${ia}`)).toHaveValue('285');
    await expect(dialog.locator(`#quotation_product_line_total_${ib}`)).toHaveValue('70');
    await expect(quotationNetTotal(dialog)).toContainText('396.75');

    const saved = page.waitForResponse(isQuotationPost);
    const create = dialog.getByRole('button', { name: 'Create', exact: true }).first();
    await create.click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    expect(body.status).toBe(true);

    const q = await api.getQuotation(body.result.id);
    expect(q.customer_id).toBe(customer.id);
    expect(q.type).toBe('quotation');
    const byId = Object.fromEntries(q.products.map((p) => [p.product_id, p]));
    expect(byId[a.id]).toMatchObject({ quantity: 3, unit_price: 100, unit_discount: 5 });
    expect(byId[b.id]).toMatchObject({ quantity: 1, unit_price: 70, unit_discount: 0 });
    expect(q.total).toBeCloseTo(355, 2);
    expect(q.discount).toBeCloseTo(10, 2);
    expect(q.vat_percent).toBe(15);
    expect(q.vat_price).toBeCloseTo(51.75, 2);
    expect(q.net_total).toBeCloseTo(396.75, 2);

    // The list finds it by code and shows its customer and net total.
    await page.goto('/dashboard/quotations');
    const row = await findRow(page, 'quotation_code', q.code);
    await expect(row).toContainText(customer.name.toUpperCase());
    await expect(row).toContainText('396.75');
  });

  test('editing an existing quotation persists the new quantity, price and totals', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer, products: [a, b] } = await api.arrangeSale(2);
    const created = await api.createQuotation({ customer, lines: [{ product: a, qty: 1, price: 100 }, { product: b, qty: 2, price: 50 }] });
    expect(created.net_total).toBeCloseTo(230, 2);

    await page.goto('/dashboard/quotations');
    const row = await findRow(page, 'quotation_code', created.code);
    await row.locator('button:has(i.bi-pencil)').first().click();
    const dialog = page.getByRole('dialog').filter({ hasText: `Update Quotation #${created.code}` });
    await expect(dialog).toBeVisible();

    const idx = async (pn) => Number((await dialog.locator(`input[id^="quotation_product_part_number"]`).evaluateAll(
      (els, v) => els.find((e) => e.value === v).id, pn)).replace('quotation_product_part_number', ''));
    const ia = await idx(a.part_number);
    const ib = await idx(b.part_number);
    await expect(dialog.locator(`#quotation_product_quantity_${ia}`)).toHaveValue('1');

    // A: 1 -> 4 (400); B: price 50 -> 45 (90). 490 + 73.50 VAT = 563.50
    await setNumber(page, dialog.locator(`#quotation_product_quantity_${ia}`), 4);
    await setNumber(page, dialog.locator(`#quotation_product_unit_price_${ib}`), 45);
    await expect(quotationNetTotal(dialog)).toContainText('563.50');

    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/quotation/${created.id}`));
    await dialog.getByRole('button', { name: 'Update', exact: true }).first().click();
    const res = await saved;
    expect(res.status(), await res.text()).toBe(200);

    const q = await api.getQuotation(created.id);
    expect(q.code).toBe(created.code);
    const byId = Object.fromEntries(q.products.map((p) => [p.product_id, p]));
    expect(byId[a.id].quantity).toBe(4);
    expect(byId[b.id]).toMatchObject({ quantity: 2, unit_price: 45 });
    expect(q.total).toBeCloseTo(490, 2);
    expect(q.vat_price).toBeCloseTo(73.5, 2);
    expect(q.net_total).toBeCloseTo(563.5, 2);
  });

  // Selling below the purchase price is allowed (the form only warns), so a
  // person must still be able to press Create after the warning appears.
  test('@devices a line priced below cost shows a warning but the quotation can still be saved', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer, products: [a] } = await api.arrangeSale(1); // purchase price 60

    const dialog = await openQuotationCreate(page);
    await chooseCustomer(page, dialog, customer);
    const ia = await addProduct(page, dialog, a, 'quotation');
    await setNumber(page, dialog.locator(`#quotation_product_unit_price_${ia}`), 40);
    await expect(dialog.getByText('Unit price should not be less than Purchase Unit Price(without VAT)').first()).toBeVisible();
    await expect(quotationNetTotal(dialog)).toContainText('46.00');

    const saved = page.waitForResponse(isQuotationPost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click({ timeout: 10_000 });
    const body = await (await saved).json();
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const q = await api.getQuotation(body.result.id);
    expect(q.products[0]).toMatchObject({ product_id: a.id, quantity: 1, unit_price: 40 });
    expect(q.net_total).toBeCloseTo(46, 2);
  });

  test('a quotation with no products is refused and nothing is saved', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer } = await api.arrangeSale(0);
    const posts = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/v1\/quotation\?/.test(r.url())) posts.push(r.url()); });

    const dialog = await openQuotationCreate(page);
    await chooseCustomer(page, dialog, customer);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();

    await expect(dialog.getByText('No products added').first()).toBeVisible();
    await expect(dialog).toBeVisible(); // stays open for correction
    expect(posts).toEqual([]);
    const listed = await api.get(`/v1/quotation?search[customer_id]=${customer.id}&limit=5`);
    expect((listed.result || []).filter((x) => x.customer_id === customer.id)).toHaveLength(0);
  });

  test('"Switch to Sales" carries the customer and lines into a sale that saves correctly', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer, products: [a, b] } = await api.arrangeSale(2, { stock: 10 });

    const dialog = await openQuotationCreate(page);
    await chooseCustomer(page, dialog, customer);
    const ia = await addProduct(page, dialog, a, 'quotation');
    await addProduct(page, dialog, b, 'quotation');
    await setNumber(page, dialog.locator(`#quotation_product_quantity_${ia}`), 2);
    await expect(quotationNetTotal(dialog)).toContainText('345.00'); // (200 + 100) * 1.15

    await dialog.getByRole('button', { name: /Switch to Sales/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/sales$/);
    const form = page.locator('#sales_create_form');
    await expect(form).toBeVisible();
    await expect(form.getByPlaceholder('Customer Name / Mob / VAT # / ID')).toHaveValue(new RegExp(customer.name, 'i'));
    const qtyOf = async (pn) => {
      const id = await form.locator('input[id^="sales_product_part_number"]').evaluateAll((els, v) => els.find((e) => e.value === v)?.id, pn);
      expect(id, `sales line for ${pn}`).toBeTruthy();
      return form.locator(`#${id.replace('part_number', 'quantity_')}`);
    };
    await expect(await qtyOf(a.part_number)).toHaveValue('2');
    await expect(await qtyOf(b.part_number)).toHaveValue('1');
    await expect(form.locator('#sales_payment_amount0')).toHaveValue('345');

    // Paid in full in cash.
    await form.locator('select').filter({ has: page.locator('option[value="cash"]') }).first().selectOption('cash');
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/order\?/.test(r.url()));
    await form.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);

    const sale = await api.getSale(body.result.id);
    expect(sale.customer_id).toBe(customer.id);
    const byId = Object.fromEntries(sale.products.map((p) => [p.product_id, p]));
    expect(byId[a.id]).toMatchObject({ quantity: 2, unit_price: 100 });
    expect(byId[b.id]).toMatchObject({ quantity: 1, unit_price: 100 });
    expect(sale.net_total).toBeCloseTo(345, 2);
    expect(sale.payment_status).toBe('paid');
    expect(sale.balance_amount).toBeCloseTo(0, 2);
    // The sale takes the goods out of stock.
    await expect.poll(() => api.stockOf(a.id)).toBe(8);
    await expect.poll(() => api.stockOf(b.id)).toBe(9);
  });
});
