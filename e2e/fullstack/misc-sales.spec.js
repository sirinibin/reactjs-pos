// Non-VAT sales and returns, services and service categories, customer
// packages, signatures, the customer account postings of a sale, Analytics and
// Statistics, full stack. Store settings that are switched on for a test are
// put back at the end of it; every record has a unique name.
const { test, expect, knownApiBug, AUTH_STATE } = require('./fixtures');
const { salesApi, typeInto, escapeRe } = require('./helpers/sales');
const { miscApi, rawCall, recordWrites, uniq } = require('./helpers/misc');

test.use({ storageState: AUTH_STATE });

const isPost = (path) => (r) => r.request().method() === 'POST' && new RegExp(`/v1/${path}(\\?|$)`).test(r.url());
const now = () => new Date().toISOString();

// A 4x4 red PNG, the smallest file the signature form resizes and uploads.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGP8z4AATAxEcZgYGAAAJAIBA2NnmJIAAAAASUVORK5CYII=',
  'base64',
);

function miscSalesApi(request) {
  const api = salesApi(request);
  const settings = miscApi(request);
  return Object.assign(api, {
    setStoreSettings: (patch) => settings.setStoreSettings(patch),
    raw: (method, path, data) => rawCall(request, api.token, method, path, data, api.storeId),

    /** POST /v1/non-vat-sales the way the form sends it. lines: [{ product, qty, price, service }]. */
    async createNonVatSale({ customer, lines, paid = true }) {
      const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
      const body = await this.post('/v1/non-vat-sales', {
        date_str: now(),
        customer_id: customer.id,
        customer_name: customer.name,
        vat_percent: 15,
        exclude_product_tax: true,
        exclude_service_tax: true,
        discount: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        products: lines.map((l) => ({
          product_id: l.product.id, name: l.product.name, part_number: l.product.part_number, unit: l.product.unit || 'PC',
          quantity: l.qty, unit_price: l.price, unit_price_with_vat: l.price, purchase_unit_price: 60, purchase_unit_price_with_vat: 69,
          is_service: !!l.service,
        })),
        payments_input: paid ? [{ date_str: now(), amount: total, method: 'cash', deleted: false }] : [],
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async nonVatReturnsOf(saleId) {
      const body = await this.get(`/v1/non-vat-sales-return?search[non_vat_sales_id]=${saleId}&limit=50`);
      return (body.result || []).filter((r) => !r.deleted && r.non_vat_sales_id === saleId);
    },

    /** A service (a product with is_service) at a retail price, through the API. */
    async createService(name, price = 50) {
      return this.createProduct({ name, partNumber: `SV-${uniq('S')}`, price, purchasePrice: 0, unit: 'C62', extra: { is_service: true } });
    },
  });
}

/** Turns on the Non VAT Sales module for one test; returns the restore function. */
async function withNonVat(api) {
  return api.setStoreSettings({ non_vat_sales: true });
}

/** Opens Non VAT Sales > Create and returns the form dialog. */
async function openNonVatCreate(page) {
  await page.goto('/dashboard/non-vat-sales');
  await page.locator('main').getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Create Non VAT Sale' });
  await expect(dialog.getByPlaceholder('Search product by name / code')).toBeVisible();
  return dialog;
}

/** Replaces the value of a number input like a person (select all, type, Tab). */
async function retype(page, input, value) {
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(String(value), { delay: 30 });
  await page.keyboard.press('Tab');
}

test.describe('non-VAT sales', () => {
  test('a non-VAT sale typed into the form is stored without VAT, takes the stock and is listed', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withNonVat(api);
    try {
      const { customer, products } = await api.arrangeSale(1, { stock: 10 });
      const product = products[0];
      const dialog = await openNonVatCreate(page);

      await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name);
      await page.getByRole('option').filter({ hasText: customer.name }).first().click();
      await typeInto(page, dialog.getByPlaceholder('Search product by name / code'), product.part_number);
      await page.getByRole('option').filter({ hasText: product.name }).first().click();
      await page.getByRole('button', { name: 'Done' }).click();
      const qty = dialog.locator('table input[type=number]').first();
      await expect(qty).toHaveValue('1');
      await retype(page, qty, 3);

      // A non-VAT sale: VAT is taken off the products, so the bill is 3 x 100.
      await dialog.getByLabel('Exclude Products Tax').click();
      await expect(dialog.getByText(/^VAT \(15%\)/).locator('xpath=..')).toContainText('0.00');
      await expect(dialog.getByText('300.00').first()).toBeVisible();
      await expect(dialog.getByPlaceholder('Amount')).toHaveValue('300');

      // Saving without a payment method is refused in the form.
      const writes = recordWrites(page, /\/v1\/non-vat-sales(\?|$)/);
      await dialog.getByRole('button', { name: 'Create Invoice' }).click();
      await expect(page.getByText('Method is required').first()).toBeVisible();
      expect(writes).toHaveLength(0);

      await dialog.locator('select').last().selectOption('cash');
      const saved = page.waitForResponse(isPost('non-vat-sales'));
      await dialog.getByRole('button', { name: 'Create Invoice' }).dblclick();
      const res = await saved;
      const body = await res.json();
      expect(res.status(), JSON.stringify(body.errors)).toBe(200);
      const sale = body.result;
      expect(sale).toMatchObject({ customer_id: customer.id, net_total: 300, vat_price: 0, payment_status: 'paid' });
      expect(sale.products).toHaveLength(1);
      expect(sale.products[0]).toMatchObject({ product_id: product.id, quantity: 3, unit_price: 100 });
      await expect.poll(() => api.stockOf(product.id)).toBe(7);

      // Saved once despite the double click, and listed for the customer.
      await expect.poll(() => writes.length).toBeGreaterThan(0);
      const list = await api.get(`/v1/non-vat-sales?search[customer_id]=${customer.id}&limit=20`);
      expect((list.result || []).filter((s) => s.customer_id === customer.id)).toHaveLength(1);
      await page.goto('/dashboard/non-vat-sales');
      const row = page.locator('tbody tr').filter({ hasText: customer.name.toUpperCase() });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('300.00');
      await expect(row).toContainText(/paid/i);
    } finally {
      await restore();
    }
  });

  test('a non-VAT sale is returned from the list: more than sold is refused, the rest restocks', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withNonVat(api);
    try {
      const { customer, products } = await api.arrangeSale(1, { stock: 10 });
      const product = products[0];
      const sale = await api.createNonVatSale({ customer, lines: [{ product, qty: 3, price: 100 }] });
      await expect.poll(() => api.stockOf(product.id)).toBe(7);

      await page.goto('/dashboard/non-vat-sales');
      const row = page.locator('tbody tr').filter({ hasText: customer.name.toUpperCase() });
      await expect(row).toHaveCount(1);
      await row.locator('button[title="Create Return"]').click();
      const form = page.getByRole('dialog').filter({ hasText: 'Non VAT Sales Return' });
      const qty = form.locator('table input[type=number]').first();
      await expect(qty).toHaveValue('3');
      await form.locator('select').last().selectOption('cash');

      await retype(page, qty, 5);
      const over = page.waitForResponse(isPost('non-vat-sales-return'));
      await form.getByRole('button', { name: 'Create Invoice' }).click();
      const refused = await over;
      expect(refused.status()).toBe(400);
      expect(JSON.stringify((await refused.json()).errors)).toMatch(/greater than sold quantity: 3/);
      await expect(form.getByText(/greater than sold quantity/).first()).toBeVisible();
      expect(await api.nonVatReturnsOf(sale.id)).toHaveLength(0);

      await retype(page, qty, 2);
      const ok = page.waitForResponse(isPost('non-vat-sales-return'));
      await form.getByRole('button', { name: 'Create Invoice' }).click();
      expect((await ok).status()).toBe(200);
      const returns = await api.nonVatReturnsOf(sale.id);
      expect(returns).toHaveLength(1);
      expect(returns[0].products[0]).toMatchObject({ product_id: product.id, quantity: 2 });
      await expect.poll(() => api.stockOf(product.id)).toBe(9);
    } finally {
      await restore();
    }
  });

  test('ticking "Exclude Products Tax" keeps the box ticked once the totals are recalculated', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withNonVat(api);
    try {
      const { customer, products } = await api.arrangeSale(1);
      const dialog = await openNonVatCreate(page);
      await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name);
      await page.getByRole('option').filter({ hasText: customer.name }).first().click();
      await typeInto(page, dialog.getByPlaceholder('Search product by name / code'), products[0].part_number);
      await page.getByRole('option').filter({ hasText: products[0].name }).first().click();
      await page.getByRole('button', { name: 'Done' }).click();
      await retype(page, dialog.locator('table input[type=number]').first(), 3);
      await expect(dialog.getByText('345.00').first()).toBeVisible();
      await dialog.getByLabel('Exclude Products Tax').click();
      await expect(dialog.getByText('300.00').first()).toBeVisible();
      await page.waitForTimeout(1000); // let the recalculation that follows the click land
      await expect(dialog.getByLabel('Exclude Products Tax')).toBeChecked({ timeout: 3000 });
    } finally {
      await restore();
    }
  });

  test('the API caps non-VAT returns at the quantity sold, and the return is listed', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withNonVat(api);
    try {
      const { customer, products } = await api.arrangeSale(1, { stock: 10 });
      const product = products[0];
      const sale = await api.createNonVatSale({ customer, lines: [{ product, qty: 3, price: 100 }] });
      await expect.poll(() => api.stockOf(product.id)).toBe(7);
      const ret = (qty) => api.raw('POST', '/v1/non-vat-sales-return', {
        store_id: api.storeId,
        non_vat_sales_id: sale.id,
        date_str: now(),
        customer_id: customer.id,
        customer_name: customer.name,
        vat_percent: 15,
        exclude_product_tax: true,
        products: [{
          product_id: product.id, name: product.name, part_number: product.part_number, unit: 'PC', quantity: qty,
          unit_price: 100, unit_price_with_vat: 100, selected: true,
        }],
        payments_input: [{ date_str: now(), amount: qty * 100, method: 'cash', deleted: false }],
      });

      for (const qty of [4, 1000000, -1, 0]) {
        const refused = await ret(qty);
        expect(refused.status, `qty ${qty}`).toBe(400);
      }
      expect((await ret(4)).body.errors.quantity_0).toBe('Quantity should not be greater than sold quantity: 3.00');
      expect(await api.nonVatReturnsOf(sale.id)).toHaveLength(0);

      const first = await ret(2);
      expect(first.status, JSON.stringify(first.body.errors)).toBe(200);
      await expect.poll(() => api.stockOf(product.id)).toBe(9);
      expect((await ret(2)).body.errors.quantity_0).toBe('Quantity should not be greater than sold quantity: 1.00');
      expect((await ret(1)).status).toBe(200);
      expect((await ret(1)).body.errors.quantity_0).toBe('Already returned all sold quantities');
      expect(await api.nonVatReturnsOf(sale.id)).toHaveLength(2);
      await expect.poll(() => api.stockOf(product.id)).toBe(10);

      await page.goto('/dashboard/non-vat-sales-returns');
      await expect(page.locator('tbody tr').filter({ hasText: customer.name.toUpperCase() })).toHaveCount(2);
    } finally {
      await restore();
    }
  });

  test('a non-VAT sale with a service takes stock only for the product and is posted to the customer\'s account', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withNonVat(api);
    try {
      const { customer, products } = await api.arrangeSale(1, { stock: 5 });
      const product = products[0];
      const service = await api.createService(`E2E Wash ${uniq()}`, 40);
      const serviceStock = await api.stockOf(service.id);
      const sale = await api.createNonVatSale({
        customer, lines: [{ product, qty: 2, price: 100 }, { product: service, qty: 3, price: 40, service: true }],
      });
      expect(sale.net_total).toBe(320);
      await expect.poll(() => api.stockOf(product.id)).toBe(3);
      expect(await api.stockOf(service.id)).toBe(serviceStock);

      // Accounts: the customer's balance sheet shows the sale and its cash receipt.
      const accountName = customer.name.toUpperCase();
      await page.goto('/dashboard/accounts');
      await typeInto(page, page.locator('input#name'), customer.name, 30);
      await page.getByRole('button', { name: new RegExp(`^${escapeRe(accountName)}(?:\\s+Copy)?$`, 'i') }).first().click();
      const sheet = page.getByRole('dialog').last();
      await expect(sheet.getByText(new RegExp(`Balance sheet of ${escapeRe(accountName)} A/c`, 'i'))).toBeVisible();
      await expect(sheet.getByText('Showing 1-2 of 2').first()).toBeVisible();
      await expect(sheet.getByRole('cell', { name: sale.code, exact: true })).toHaveCount(2);
      await expect(sheet.getByText(/Total Amount\s*320\.00\s*320\.00/)).toBeVisible();
      await expect(sheet.getByText(/NON VAT SALES/).first()).toBeVisible();
    } finally {
      await restore();
    }
  });
});

test.describe('services', () => {
  /** Turns on the Services module for one test; returns the restore function. */
  const withServices = (api) => api.setStoreSettings({ enable_services: true });

  test('a service category with an Arabic name is created once, even on a double click @devices', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withServices(api);
    try {
      const name = `E2E Detailing ${uniq()} تلميع`;
      await page.goto('/dashboard/service_category');
      await page.locator('main').getByRole('button', { name: 'Create' }).first().click();
      const dialog = page.getByRole('dialog');
      await typeInto(page, dialog.getByPlaceholder('Service category name'), name, 10);
      const saved = page.waitForResponse(isPost('service-category'));
      await dialog.locator('button', { hasText: /^\s*Create\s*$/ }).dblclick();
      const res = await saved;
      expect(res.status(), await res.text()).toBe(200);
      await expect(dialog).toBeHidden();
      const found = await api.get(`/v1/service-category?search[name]=${encodeURIComponent(name)}&limit=20`);
      expect((found.result || []).filter((c) => c.name === name)).toHaveLength(1);
    } finally {
      await restore();
    }
  });

  test('a service category without a name is refused with a visible error', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withServices(api);
    try {
      await page.goto('/dashboard/service_category');
      await page.locator('main').getByRole('button', { name: 'Create' }).first().click();
      const dialog = page.getByRole('dialog');
      const sent = page.waitForResponse(isPost('service-category'));
      await dialog.locator('button', { hasText: /^\s*Create\s*$/ }).click();
      const res = await sent;
      expect(res.status()).toBe(400);
      await expect(dialog.getByText('Name is required').first()).toBeVisible();
      await expect(dialog).toBeVisible();

      // A name of spaces only is no name either.
      const blank = await api.raw('POST', '/v1/service-category', { store_id: api.storeId, name: '   ' });
      if (blank.body.result?.id) await api.raw('DELETE', `/v1/service-category/${blank.body.result.id}`);
      expect(blank.status, 'a name of spaces is refused').toBeGreaterThanOrEqual(400);
      expect(blank.body.result?.id, 'and nothing is stored').toBeFalsy();
      await knownApiBug('POST /v1/service-category answers a name of only spaces with 409 "Name is Already in use" '
        + 'instead of 400 "Name is required" when a category with that exact (untrimmed) name exists, even a '
        + 'deleted one: models/service_category.go Validate runs IsNameExists on the untrimmed name, counts '
        + 'deleted rows, and lets that 409 override the "Name is required" error', async () => {
        expect(blank.status).toBe(400);
        expect(blank.body.errors?.name).toBe('Name is required');
      });
    } finally {
      await restore();
    }
  });

  test('a service created on the Services screen is stored as a service, and selling it moves no stock', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const restore = await withServices(api);
    try {
      const name = `E2E Oil Change ${uniq()}`;
      await page.goto('/dashboard/services');
      await page.locator('main').getByRole('button', { name: 'Create' }).first().click();
      const dialog = page.getByRole('dialog').filter({ hasText: 'New Service' });

      // Without a name the form refuses to save.
      const writes = recordWrites(page, /\/v1\/product(\?|$)/);
      await dialog.getByRole('button', { name: 'Create Service' }).click();
      await expect(dialog.getByText('Name is required').first()).toBeVisible();
      expect(writes).toHaveLength(0);

      await typeInto(page, dialog.getByPlaceholder('Service name'), name, 10);
      await dialog.getByPlaceholder('الاسم بالعربية').fill('تغيير الزيت');
      await dialog.getByPlaceholder('e.g. 2').fill('45');
      // Retail price without VAT is the third "0.00" field (after purchase and wholesale).
      await typeInto(page, dialog.getByPlaceholder('0.00').nth(2), '200', 20);
      await expect(dialog.getByPlaceholder('Calculated automatically').nth(2)).toHaveValue('230');
      const saved = page.waitForResponse(isPost('product'));
      await dialog.getByRole('button', { name: 'Create Service' }).click();
      const res = await saved;
      const body = await res.json();
      expect(res.status(), JSON.stringify(body.errors)).toBe(200);
      const service = await api.getProduct(body.result.id);
      expect(service).toMatchObject({ name, name_in_arabic: 'تغيير الزيت', is_service: true });
      expect(service.product_stores[api.storeId]).toMatchObject({ retail_unit_price: 200, retail_unit_price_with_vat: 230 });

      // A sale of the service and a product: only the product's stock moves.
      const { customer, products } = await api.arrangeSale(1, { stock: 4 });
      const before = await api.stockOf(service.id);
      const sale = await api.createSale({
        customer, lines: [{ product: products[0], qty: 1, price: 100 }, { product: service, qty: 2, price: 200 }],
      });
      expect(sale.net_total).toBe(575);
      await expect.poll(() => api.stockOf(products[0].id)).toBe(3);
      expect(await api.stockOf(service.id)).toBe(before);

      // Listed on the Services screen with its price.
      await page.goto('/dashboard/services');
      await typeInto(page, page.getByPlaceholder(/Search/).first(), name, 10);
      await expect(page.locator('tbody tr').filter({ hasText: name })).toContainText('200');
    } finally {
      await restore();
    }
  });
});

test.describe('customer packages', () => {
  test('a package with an HTML name and two screens is stored as given and shown as text', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const name = `<i>E2E Package</i> ${uniq()} باقة`;
    let id;
    try {
      await page.goto('/dashboard/customer-packages');
      await page.getByRole('button', { name: /New Package/ }).click();
      const dialog = page.getByRole('dialog');
      await typeInto(page, dialog.getByPlaceholder('Package name'), name, 5);
      await dialog.locator('label').filter({ hasText: /^\s*Sales\s*$/ }).locator('input[type=checkbox]').check();
      await dialog.locator('label').filter({ hasText: /^\s*Customers\s*$/ }).locator('input[type=checkbox]').check();
      const saved = page.waitForResponse(isPost('customer-package'));
      await dialog.locator('button', { hasText: /^\s*create\s*$/i }).click();
      const res = await saved;
      const body = await res.json();
      expect(res.status(), JSON.stringify(body.errors)).toBe(200);
      id = body.result.id;
      const stored = (await api.get(`/v1/customer-package/${id}`)).result;
      expect(stored.name).toBe(name);
      expect([...stored.tab_ids].sort()).toEqual(['customers', 'sales']);
      await expect(dialog).toBeHidden();
      await expect(page.locator('i', { hasText: 'E2E Package' })).toHaveCount(0);
    } finally {
      if (id) await api.raw('DELETE', `/v1/customer-package/${id}`);
    }
  });

  test('a package without a name is refused with a visible error', async ({ page, request }) => {
    await page.goto('/dashboard/customer-packages');
    await page.getByRole('button', { name: /New Package/ }).click();
    const dialog = page.getByRole('dialog');
    const sent = page.waitForResponse(isPost('customer-package'));
    await dialog.locator('button', { hasText: /^\s*create\s*$/i }).click();
    const res = await sent;
    await expect(dialog.getByText('Name is required').first()).toBeVisible();
    await expect(dialog).toBeVisible();
    expect((await res.json()).status).toBe(false);

    const api = miscSalesApi(request);
    const blank = await api.raw('POST', '/v1/customer-package', { name: '   ' });
    if (blank.body.result?.id) await api.raw('DELETE', `/v1/customer-package/${blank.body.result.id}`);
    expect(res.status(), 'a missing name is a client error').toBe(400);
    expect(blank.status, 'a name of spaces is no name').toBe(400);
  });
});

test.describe('signatures', () => {
  test('a signature typed and uploaded on the Signatures screen is saved', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const name = `E2E Signature ${uniq()} توقيع`;
    await page.goto('/dashboard/signatures');
    await page.locator('main').getByRole('button', { name: /create/i }).first().click();
    const dialog = page.getByRole('dialog');
    await typeInto(page, dialog.locator('#name'), name, 5);
    await dialog.locator('#signature').setInputFiles({ name: 'sign.png', mimeType: 'image/png', buffer: PNG });
    await expect(dialog.getByText('Looks good!')).toHaveCount(2);
    const saved = page.waitForResponse(isPost('signature'));
    await dialog.getByRole('button', { name: /^create$/i }).first().click();
    const body = await (await saved).json();
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const all = await api.get(`/v1/signature?search[name]=${encodeURIComponent(name)}&limit=20`);
    expect((all.result || []).filter((x) => x.name === name)).toHaveLength(1);
  });

  test('the API refuses a signature without an image or name, and a saved one is listed with its name as text', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const name = `<b>E2E Sig</b> ${uniq()} توقيع`;
    const content = `data:image/png;base64,${PNG.toString('base64')}`;
    const noImage = await api.raw('POST', '/v1/signature', { store_id: api.storeId, name });
    expect(noImage.status).toBe(400);
    expect(noImage.body.errors.signature_content).toBe('Signature is required');
    const noName = await api.raw('POST', '/v1/signature', { store_id: api.storeId, name: '', signature_content: content });
    expect(noName.status).toBe(400);
    expect(noName.body.errors.name).toBe('Name is required');
    const notImage = await api.raw('POST', '/v1/signature', { store_id: api.storeId, name: `${name} x`, signature_content: 'not base64 !!' });
    expect(notImage.status).toBe(400);

    const ok = await api.raw('POST', '/v1/signature', { store_id: api.storeId, name, signature_content: content });
    expect(ok.status, JSON.stringify(ok.body.errors)).toBe(200);
    const again = await api.raw('POST', '/v1/signature', { store_id: api.storeId, name, signature_content: content });
    expect(again.status).toBe(409);

    await page.goto('/dashboard/signatures');
    await typeInto(page, page.locator('thead input').first(), name, 5);
    const row = page.locator('tbody tr').filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await expect(page.locator('tbody b', { hasText: 'E2E Sig' })).toHaveCount(0);
  });
});

test.describe('analytics and statistics', () => {
  test('Analytics loads today\'s sales and every series it charts', async ({ page, request }) => {
    const api = miscSalesApi(request);
    const { customer, products } = await api.arrangeSale(1);
    const sale = await api.createSale({ customer, lines: [{ product: products[0], qty: 1, price: 100 }] });
    const responses = [];
    page.on('response', (r) => {
      if (/\/v1\/(order|expense|purchase|sales-return|purchase-return)\?select=/.test(r.url())) responses.push(r);
    });
    await page.goto('/dashboard/analytics');
    for (const h of ['Hourly', 'Daily', 'Monthly', 'Yearly']) {
      await expect(page.locator('h2', { hasText: new RegExp(`^${h}`) })).toBeVisible();
    }
    const models = ['order', 'expense', 'purchase', 'sales-return', 'purchase-return'];
    await expect.poll(() => models.filter((m) => responses.some((r) => new RegExp(`/v1/${m}\\?`).test(r.url()))).length,
      { timeout: 20000 }).toBe(models.length);
    for (const r of responses) expect(r.status(), r.url()).toBe(200);
    const orders = (await Promise.all(responses.filter((r) => r.url().includes('/v1/order?')).map((r) => r.json())))
      .flatMap((b) => b.result || []);
    expect(orders.some((o) => o.net_total === sale.net_total && o.date && o.date.slice(0, 10) === sale.date.slice(0, 10))).toBe(true);
    // The charts themselves are drawn by Google Charts (www.gstatic.com), an external
    // provider these tests do not reach, so only the data behind them is checked.
  });

  test('Statistics renders the sales summary with the API\'s figures', async ({ page }) => {
    const stats = [];
    page.on('response', (r) => { if (/\/v1\/order\?.*search\[stats\]=1/.test(r.url())) stats.push(r); });
    await page.goto('/dashboard/stats');
    await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
    await expect.poll(() => stats.length).toBeGreaterThan(0);
    expect(stats[0].status()).toBe(200);
    await expect(page.getByText('Sales Summary', { exact: true }).first()).toBeVisible();
  });
});
