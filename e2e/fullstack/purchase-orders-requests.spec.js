// Procurement, full stack: purchase orders (create, double click, convert and
// import into a purchase), purchase requests (send, accept, reject, P.O. from
// an accepted request) and the RFQ screens that work without an e-mail /
// WhatsApp / AI provider. Every test uses its own unique vendor and products.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { miscApi, recordWrites, typeInto, escapeRe, uniq, uniqEmail, freshClientHeaders } = require('./helpers/misc');
const { purchaseApi, openPurchaseCreate, chooseVendor, submitPurchase } = require('./helpers/purchase');

test.use({ storageState: AUTH_STATE });

const isPoPost = (r) => r.request().method() === 'POST' && /\/v1\/purchase-order(\?|$)/.test(r.url());
const isPrPost = (r) => r.request().method() === 'POST' && /\/v1\/purchase-request(\?|$)/.test(r.url());
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

function procurementApi(request) {
  const api = Object.assign(purchaseApi(request), {});
  const m = miscApi(request);
  return Object.assign(api, {
    raw: m.raw,
    setStoreSettings: m.setStoreSettings.bind(m),
    getStore: m.getStore.bind(m),
    async posOfVendor(vendorId) {
      return (await this.get(`/v1/purchase-order?search[vendor_id]=${vendorId}&limit=50`)).result || [];
    },
    async getPo(id) { return (await this.get(`/v1/purchase-order/${id}`)).result; },
    async getPr(id) { return (await this.get(`/v1/purchase-request/${id}`)).result; },
    async createPo({ vendor, lines, status = 'draft' }) {
      const body = await this.post('/v1/purchase-order', {
        date_str: new Date().toISOString(), status, vat_percent: 15, vendor_id: vendor.id, vendor_name: vendor.name,
        products: lines.map((l) => ({
          product_id: l.product.id, name: l.product.name, part_number: l.product.part_number, unit: 'PC',
          quantity: l.qty, purchase_unit_price: l.price, purchase_unit_price_with_vat: r2(l.price * 1.15),
        })),
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },
  });
}

/** Opens Purchase Orders > New Purchase Order and returns the dialog. */
async function openPoCreate(page) {
  await page.goto('/dashboard/purchase-orders');
  await page.getByRole('button', { name: 'New Purchase Order' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Create Purchase Order' });
  await expect(dialog.getByPlaceholder('Vendor Name / Mob / VAT # / ID')).toBeVisible();
  return dialog;
}

/** Adds a product to a PO / PR form through its type-ahead; returns its table row. */
async function addLine(page, dialog, product) {
  const search = dialog.getByPlaceholder('Part No. | Name | Name in Arabic | Brand | Country');
  await typeInto(page, search, product.part_number, 20);
  await page.getByRole('option', { name: new RegExp(escapeRe(product.part_number)) }).first().click();
  const row = dialog.locator('tbody tr').filter({ hasText: product.part_number });
  await expect(row).toHaveCount(1);
  return row;
}

/**
 * Sets quantity / unit price of a PO or PR line. These inputs select their text
 * on focus (in a timer) and only commit on blur, so each value is entered in one
 * go and committed with Tab, like a person tabbing through the row.
 */
async function setPoLine(page, row, { qty, price }) {
  const inputs = row.locator('input[type=text]');
  for (const [i, v] of [[0, qty], [1, price]]) {
    if (v === undefined) continue;
    await inputs.nth(i).click();
    await inputs.nth(i).fill(String(v));
    await inputs.nth(i).press('Tab');
    await expect.poll(async () => parseFloat(await inputs.nth(i).inputValue())).toBe(Number(v));
  }
}

const createButton = (dialog) => dialog.locator('button', { hasText: /^\s*Create\s*$/ }).first();

test.describe('purchase orders', () => {
  test('a purchase order typed into the form is stored with its vendor, lines and totals @devices', async ({ page, request }) => {
    const api = procurementApi(request);
    // Purchase prices 40 and 12.50 come from the products, so only the quantities are typed here.
    const w = uniq('PO');
    const vendor = await api.createVendor({ name: `E2E Vendor ${w}` });
    const a = await api.createProduct({ name: `E2E Part A ${w}`, partNumber: `A-${w}`, purchasePrice: 40 });
    const b = await api.createProduct({ name: `E2E Part B ${w}`, partNumber: `B-${w}`, purchasePrice: 12.5 });
    const dialog = await openPoCreate(page);
    await chooseVendor(page, dialog, vendor);
    const rowA = await addLine(page, dialog, a);
    const rowB = await addLine(page, dialog, b);
    await setPoLine(page, rowA, { qty: 3 });
    await setPoLine(page, rowB, { qty: 2 });
    // 3 x 40 + 2 x 12.5 = 145, + 15% VAT = 166.75
    await expect(dialog.getByText('166.75').first()).toBeVisible();

    const saved = page.waitForResponse(isPoPost);
    await createButton(dialog).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);

    const po = await api.getPo(body.result.id);
    expect(po).toMatchObject({ vendor_id: vendor.id, store_id: api.storeId, status: 'draft', total: 145, net_total: 166.75 });
    const lines = Object.fromEntries(po.products.map((p) => [p.product_id, p]));
    expect(lines[a.id]).toMatchObject({ quantity: 3, purchase_unit_price: 40 });
    expect(lines[b.id]).toMatchObject({ quantity: 2, purchase_unit_price: 12.5 });
    // A purchase order does not move stock.
    expect(await api.stockOf(a.id)).toBe(0);

    // It is listed under its code.
    await page.goto('/dashboard/purchase-orders');
    await typeInto(page, page.getByPlaceholder('PO-...'), po.code, 20);
    await expect(page.locator('tbody tr').filter({ hasText: po.code }).first()).toContainText(vendor.name, { ignoreCase: true });
  });

  test('a unit price edited on one line survives adding and editing the next line', async ({ page, request }) => {
    const api = procurementApi(request);
    const { vendor, products: [a, b] } = await api.arrange(2);
    const dialog = await openPoCreate(page);
    await chooseVendor(page, dialog, vendor);
    const rowA = await addLine(page, dialog, a);
    await setPoLine(page, rowA, { price: 40 });
    const rowB = await addLine(page, dialog, b);
    await setPoLine(page, rowB, { qty: 2 });
    await expect(rowA.locator('input[type=text]').nth(1)).toHaveValue('40.00', { timeout: 3000 });
  });

  test('double-clicking Create stores exactly one purchase order', async ({ page, request }) => {
    const api = procurementApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const posts = recordWrites(page, /\/v1\/purchase-order(\?|$)/);
    const dialog = await openPoCreate(page);
    await chooseVendor(page, dialog, vendor);
    await setPoLine(page, await addLine(page, dialog, a), { qty: 1, price: 10 });
    const saved = page.waitForResponse(isPoPost);
    await createButton(dialog).dblclick();
    expect((await saved).status()).toBe(200);
    await expect.poll(async () => (await api.posOfVendor(vendor.id)).length).toBeGreaterThan(0);
    expect(await api.posOfVendor(vendor.id), `POST requests sent: ${posts.length}`).toHaveLength(1);
  });

  test('a purchase order without products is refused with a visible error', async ({ page, request }) => {
    const api = procurementApi(request);
    const { vendor } = await api.arrange(0);
    const dialog = await openPoCreate(page);
    await chooseVendor(page, dialog, vendor);
    const saved = page.waitForResponse(isPoPost);
    await createButton(dialog).click();
    const res = await saved;
    expect((await res.json()).errors.product_id).toBe('At least 1 product is required');
    expect(await api.posOfVendor(vendor.id)).toHaveLength(0);
    expect(res.status(), 'a validation error is a client error').toBe(400);
    await expect(dialog.getByText('At least 1 product is required').first()).toBeVisible({ timeout: 5000 });
  });

  test('a confirmed purchase order is converted and imported into a purchase that adds stock', async ({ page, request }) => {
    const api = procurementApi(request);
    const restore = await api.setStoreSettings({ enable_purchase_order_module: true });
    try {
      const { vendor, products: [a, b] } = await api.arrange(2);
      const po = await api.createPo({ vendor, status: 'confirmed', lines: [{ product: a, qty: 4, price: 25 }, { product: b, qty: 1, price: 9.99 }] });

      // Convert to Purchase on the P.O. marks it received.
      await page.goto('/dashboard/purchase-orders');
      await typeInto(page, page.getByPlaceholder('PO-...'), po.code, 20);
      const row = page.locator('tbody tr').filter({ hasText: po.code }).first();
      await row.getByTitle('Edit').click();
      const edit = page.getByRole('dialog').filter({ hasText: po.code });
      page.once('dialog', (d) => d.accept());
      const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/purchase-order/${po.id}`));
      await edit.getByRole('button', { name: /Convert to Purchase/ }).click();
      expect((await put).status()).toBe(200);
      await expect(page.getByText('Status updated to Received. Please create a Purchase manually.')).toBeVisible();
      expect((await api.getPo(po.id)).status).toBe('received');

      // The purchase form imports the order's lines with "From P.O.".
      const dialog = await openPurchaseCreate(page);
      await chooseVendor(page, dialog, vendor);
      await dialog.getByRole('button', { name: /From P\.O\./ }).first().click();
      const picker = page.getByRole('dialog').filter({ hasText: 'Import from Purchase Order' });
      await picker.locator('tbody tr').filter({ hasText: po.code }).click();
      await expect(dialog.locator('input[id^="purchase_product_part_number"]')).toHaveCount(2);
      // 4 x 25 + 9.99 = 109.99 + 15% = 126.49 (16.4985 VAT -> 16.50)
      await expect(dialog.locator('#purchase_payment_amount0')).toHaveValue('126.49');
      await dialog.locator('select').first().selectOption('cash');
      const res = await submitPurchase(page, dialog);
      const body = await res.json();
      expect(res.status(), JSON.stringify(body.errors)).toBe(200);
      const purchase = await api.getPurchase(body.result.id);
      const lines = Object.fromEntries(purchase.products.map((p) => [p.product_id, p]));
      expect(lines[a.id]).toMatchObject({ quantity: 4, purchase_unit_price: 25 });
      expect(lines[b.id]).toMatchObject({ quantity: 1, purchase_unit_price: 9.99 });
      expect(purchase.net_total).toBe(126.49);
      expect(await api.stockOf(a.id)).toBe(4);
      expect(await api.stockOf(b.id)).toBe(1);
    } finally {
      await restore();
    }
  });
});

test.describe('purchase requests', () => {
  /** Creates a P.R. through the form, assigned to the signed-in admin; returns the stored request. */
  async function sendPr(page, product, qty = 2) {
    await page.goto('/dashboard/purchase-requests');
    await page.getByRole('button', { name: 'New P.R' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Create Purchase Request' });
    const assign = dialog.getByPlaceholder('Search user by name...');
    await typeInto(page, assign, 'E2E Admin', 20);
    await page.getByRole('option', { name: /E2E Admin/ }).first().click();
    if (product) {
      await setPoLine(page, await addLine(page, dialog, product), { qty });
    }
    const saved = page.waitForResponse(isPrPost);
    await dialog.locator('button', { hasText: /Send P\.R/ }).first().click();
    return { res: await saved, dialog };
  }

  /** The row of a request on the Received tab. */
  async function receivedRow(page, code) {
    await page.goto('/dashboard/purchase-requests');
    await page.getByRole('button', { name: 'Received' }).click();
    const row = page.locator('tr:visible').filter({ hasText: code });
    await expect(row).toHaveCount(1);
    return row;
  }

  test('a purchase request is sent, shows as pending and accepting it is stored', async ({ page, request }) => {
    const api = procurementApi(request);
    const { products: [a] } = await api.arrange(1);
    const { res } = await sendPr(page, a, 5);
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    const pr = await api.getPr(body.result.id);
    expect(pr).toMatchObject({ status: 'pending', assigned_to: api.userId });
    expect(pr.products[0]).toMatchObject({ product_id: a.id, quantity: 5 });

    const row = await receivedRow(page, pr.code);
    await expect(row).toContainText('Pending');
    const acted = page.waitForResponse((r) => r.url().includes(`/v1/purchase-request/${pr.id}/accept`));
    await row.getByTitle('Accept').click();
    expect((await acted).status()).toBe(200);
    await expect(page.locator('tr:visible').filter({ hasText: pr.code })).toContainText('Accepted');
    expect((await api.getPr(pr.id)).status).toBe('accepted');
  });

  test('rejecting a purchase request is stored and it cannot be accepted afterwards from the list', async ({ page, request }) => {
    const api = procurementApi(request);
    const { products: [a] } = await api.arrange(1);
    const { res } = await sendPr(page, a, 1);
    const pr = (await res.json()).result;
    const row = await receivedRow(page, pr.code);
    const acted = page.waitForResponse((r) => r.url().includes(`/v1/purchase-request/${pr.id}/reject`));
    await row.getByTitle('Reject').click();
    expect((await acted).status()).toBe(200);
    const after = page.locator('tr:visible').filter({ hasText: pr.code });
    await expect(after).toContainText('Rejected');
    await expect(after.getByTitle('Accept')).toHaveCount(0);
    expect((await api.getPr(pr.id)).status).toBe('rejected');
  });

  test('an accepted request becomes a purchase order with its products', async ({ page, request }) => {
    const api = procurementApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const { res } = await sendPr(page, a, 3);
    const pr = (await res.json()).result;
    expect((await api.raw('POST', `/v1/purchase-request/${pr.id}/accept`, { partial: false })).status).toBe(200);

    const row = await receivedRow(page, pr.code);
    await row.getByTitle('Create Purchase Order').click();
    const dialog = page.getByRole('dialog').filter({ hasText: /Purchase Order/ }).last();
    await expect(dialog.locator('tbody tr').filter({ hasText: a.part_number })).toHaveCount(1);
    await chooseVendor(page, dialog, vendor);
    const saved = page.waitForResponse(isPoPost);
    await createButton(dialog).click();
    const body = await (await saved).json();
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const po = await api.getPo(body.result.id);
    expect(po.vendor_id).toBe(vendor.id);
    expect(po.products).toHaveLength(1);
    expect(po.products[0]).toMatchObject({ product_id: a.id, quantity: 3 });
  });

  test('a purchase request with a zero quantity is refused with a visible error', async ({ page, request }) => {
    const api = procurementApi(request);
    const { products: [a] } = await api.arrange(1);
    const { res, dialog } = await sendPr(page, a, 0);
    const { errors } = await res.json();
    const message = Object.values(errors || {})[0];
    expect(message).toMatch(/quantity/i);
    const list = await api.get(`/v1/purchase-request?search[created_by]=${api.userId}&limit=50`);
    expect((list.result || []).filter((p) => p.products?.some((x) => x.product_id === a.id))).toHaveLength(0);
    expect(res.status(), 'a validation error is a client error').toBe(400);
    await expect(dialog.getByText(message).first()).toBeVisible({ timeout: 5000 });
  });

  test('a purchase request without an assignee or products is refused', async ({ page }) => {
    await page.goto('/dashboard/purchase-requests');
    await page.getByRole('button', { name: 'New P.R' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Create Purchase Request' });
    const saved = page.waitForResponse(isPrPost);
    await dialog.locator('button', { hasText: /Send P\.R/ }).first().click();
    const res = await saved;
    const { errors } = await res.json();
    expect(errors).toMatchObject({ assigned_to: 'Assigned to user is required', product_id: 'At least 1 product is required' });
    expect(res.status(), 'a validation error is a client error').toBe(400);
    await expect(dialog.getByText('Assigned to user is required').first()).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('At least 1 product is required').first()).toBeVisible();
  });

  test('only the assignee can accept a purchase request', async ({ page, request }) => {
    const api = procurementApi(request);
    const { products: [a] } = await api.arrange(1);
    const { res } = await sendPr(page, a, 1);
    const pr = (await res.json()).result;
    // Another user of the same store.
    const email = uniqEmail('outsider');
    const made = await api.post('/v1/user', { name: `E2E Outsider ${uniq()}`, email, password: 'Secret-123', mob: '0550000000', role: 'Manager', store_ids: [api.storeId] });
    try {
      const auth = await (await request.post('/v1/authorize', { headers: freshClientHeaders(), data: { email, password: 'Secret-123' } })).json();
      const tok = await (await request.post('/v1/accesstoken', { headers: { Authorization: auth.result.code } })).json();
      const accept = await request.post(`/v1/purchase-request/${pr.id}/accept?search[store_id]=${api.storeId}`, {
        headers: { Authorization: tok.result.access_token }, data: { partial: false },
      });
      expect((await api.getPr(pr.id)).status).toBe('pending');
      expect(accept.status()).toBe(403);
    } finally {
      await api.raw('DELETE', `/v1/user/${made.result.id}`);
    }
  });
});

test.describe('RFQ screens', () => {
  test('an RFQ typed in by hand for a customer is stored', async ({ page, request }) => {
    const api = procurementApi(request);
    const customer = await api.createCustomer({ name: `E2E RFQ Customer ${uniq()}` });
    const text = `Need 10 pcs of steel pipe ${uniq()} 2 inch`;
    await page.goto('/dashboard/rfq-received');
    await page.getByRole('button', { name: 'Create New' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'New RFQ' });
    await typeInto(page, dialog.getByPlaceholder('Customer Name / Mob / VAT # / ID'), customer.name, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(customer.name), 'i') }).first().click();
    await dialog.getByPlaceholder(/Paste the original enquiry text/).fill(text);
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/rfq-received(\?|$)/.test(r.url()));
    await dialog.getByRole('button', { name: 'Create RFQ' }).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body)).toBe(200);
    const id = body.id || body.result?.id;
    const got = await request.get(`/v1/rfq-received/${id}?store_id=${api.storeId}`, { headers: { Authorization: api.token } });
    expect(got.status()).toBe(200);
    const rfq = await got.json();
    const stored = rfq.result || rfq;
    expect(stored.text_content).toBe(text);
    expect(stored.customer_id).toBe(customer.id);
  });

  test('an empty RFQ is refused before anything is sent', async ({ page }) => {
    const posts = recordWrites(page, /\/v1\/rfq-received(\?|$)/);
    await page.goto('/dashboard/rfq-received');
    await page.getByRole('button', { name: 'Create New' }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'New RFQ' });
    await dialog.getByRole('button', { name: 'Create RFQ' }).click();
    await expect(dialog.getByText('Add products, upload a file, or enter a description.').first()).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test('an RFQ supplier added by hand is stored, and a supplier without a phone is refused', async ({ page, request }) => {
    const api = procurementApi(request);
    const market = `E2E Market ${uniq()}`;
    const store = await api.getStore();
    const restore = await api.setStoreSettings({ purchase_markets: [...(store.settings.purchase_markets || []), market] });
    let supplierId;
    try {
      const name = `E2E Supplier ${uniq()} مورد`;
      await page.goto('/dashboard/rfq-suppliers');
      await page.getByRole('button', { name: 'Add Supplier' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByPlaceholder('e.g. ABC Steel Company').fill(name);

      // No phone yet: refused with an alert, nothing sent.
      const posts = recordWrites(page, /\/v1\/rfq-suppliers(\?|$)/);
      let alertText = '';
      page.once('dialog', (d) => { alertText = d.message(); d.dismiss(); });
      await dialog.getByRole('button', { name: 'Add Supplier' }).click();
      await expect.poll(() => alertText).toMatch(/WhatsApp number are required/i);
      expect(posts).toHaveLength(0);

      await dialog.getByPlaceholder('e.g. 966501234567 (no + or spaces)').first().fill(`9665${String(Date.now()).slice(-8)}`);
      await dialog.locator('select').first().selectOption(market);
      const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/rfq-suppliers(\?|$)/.test(r.url()));
      await dialog.getByRole('button', { name: 'Add Supplier' }).click();
      const res = await saved;
      expect(res.status(), await res.text()).toBe(200);
      const made = await res.json();
      supplierId = made.id || made.result?.id;
      const list = await api.get(`/v1/rfq-suppliers?search=${encodeURIComponent(name)}&store_id=${api.storeId}`);
      const rows = list.result || list.suppliers || list;
      expect(JSON.stringify(rows)).toContain(name);
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 5000 });
    } finally {
      if (supplierId) await request.delete(`/v1/rfq-suppliers/${supplierId}?store_id=${api.storeId}`, { headers: { Authorization: api.token } });
      await restore();
    }
  });
});
