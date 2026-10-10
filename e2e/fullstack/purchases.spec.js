// Purchases domain, full stack: vendors, purchases, payments and purchase
// returns typed into the real UI and checked against the real API / MongoDB.
// Every test arranges its own uniquely named vendor and products, so it never
// depends on (or disturbs) data other specs create on the shared server.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { uniq } = require('./api');
const {
  expectedTotals, purchaseApi, typeInto, openPurchaseCreate, chooseVendor, addProduct, setLine,
  submitPurchase, purchaseRow,
} = require('./helpers/purchase');

test.use({ storageState: AUTH_STATE });

const isPurchasePost = (r) => r.request().method() === 'POST' && /\/v1\/purchase\?/.test(r.url());

/** Records every POST /v1/purchase the page makes, to prove a refusal stored nothing. */
function recordPurchasePosts(page) {
  const posts = [];
  page.on('response', (r) => { if (isPurchasePost(r)) posts.push(r); });
  return posts;
}

test.describe('vendors', () => {
  test('a vendor created in the Vendors form is saved', async ({ page, request }) => {
    const api = purchaseApi(request);
    const name = `E2E UI Vendor ${uniq()}`;
    const phone = `05${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

    await page.goto('/dashboard/vendors');
    await page.getByRole('button', { name: 'Create' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create New Vendor')).toBeVisible();
    await typeInto(page, dialog.getByPlaceholder('Name', { exact: true }), name);
    await typeInto(page, dialog.getByPlaceholder('Phone', { exact: true }), phone);

    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/vendor\?/.test(r.url()));
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    expect(body.status).toBe(true);

    const stored = (await api.get(`/v1/vendor/${body.result.id}`)).result;
    expect(stored.name.toUpperCase()).toBe(name.toUpperCase());
    expect(stored.phone).toBe(phone);
    expect(stored.store_id).toBe(api.storeId);
    expect(stored.code).toBeTruthy();
  });

  test('a vendor without a name is refused with a visible error', async ({ page }) => {
    await page.goto('/dashboard/vendors');
    await page.getByRole('button', { name: 'Create' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create New Vendor')).toBeVisible();
    await typeInto(page, dialog.getByPlaceholder('Phone', { exact: true }), '0551112223');

    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/vendor\?/.test(r.url()));
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    const res = await posted;
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.name).toBe('Name is required');
    await expect(dialog.getByText('Name is required').first()).toBeVisible();
    await expect(dialog.getByText('Create New Vendor')).toBeVisible(); // stays open for correction
  });
});

test.describe('purchase create', () => {
  test('a purchase typed into the form is saved with exact totals and adds stock @devices', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a, b] } = await api.arrange(2);
    const stockBefore = [await api.stockOf(a.id), await api.stockOf(b.id)];

    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);

    // 3 x 33.33 = 99.99 and 2 x 17.50 = 35.00 -> 134.99; VAT 15% = 20.2485 -> 20.25.
    const ia = await addProduct(page, dialog, a);
    await setLine(page, dialog, ia, { qty: 3, price: 33.33 });
    const ib = await addProduct(page, dialog, b);
    await setLine(page, dialog, ib, { qty: 2, price: 17.5 });

    const want = expectedTotals([{ qty: 3, price: 33.33 }, { qty: 2, price: 17.5 }]);
    expect(want).toEqual({ total: 134.99, vat: 20.25, net: 155.24, qty: 5 });

    // The form recalculates through the API and pre-fills the payment with the net total.
    await expect(dialog.locator('#purchase_payment_amount0')).toHaveValue('155.24');
    const method = dialog.locator('select').first();
    await method.scrollIntoViewIfNeeded();
    await method.selectOption('cash');

    const res = await submitPurchase(page, dialog);
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);

    // The details view opens for the new purchase.
    await expect(page.getByText(`Details of Purchase #${body.result.code}`)).toBeVisible();

    const saved = await api.getPurchase(body.result.id);
    expect(saved.vendor_id).toBe(vendor.id);
    expect(saved.store_id).toBe(api.storeId);
    expect(saved.status).toBe('delivered');
    const lines = Object.fromEntries(saved.products.map((p) => [p.product_id, p]));
    expect(saved.products).toHaveLength(2);
    expect(lines[a.id]).toMatchObject({ quantity: 3, purchase_unit_price: 33.33, part_number: a.part_number });
    expect(lines[b.id]).toMatchObject({ quantity: 2, purchase_unit_price: 17.5, part_number: b.part_number });
    expect(lines[a.id].purchase_unit_price_with_vat).toBeCloseTo(38.3295, 4);
    expect(lines[b.id].purchase_unit_price_with_vat).toBeCloseTo(20.125, 4);
    expect(saved.vat_percent).toBe(15);
    expect(saved.total).toBe(134.99);
    expect(saved.vat_price).toBe(20.25);
    expect(saved.net_total).toBe(155.24);
    expect(saved.total_quantity).toBe(5);
    expect(saved.payment_status).toBe('paid');
    expect(saved.total_payment_paid).toBe(155.24);
    expect(saved.balance_amount).toBe(0);

    // Stock in this store went up by exactly the purchased quantities.
    expect(await api.stockOf(a.id)).toBe(stockBefore[0] + 3);
    expect(await api.stockOf(b.id)).toBe(stockBefore[1] + 2);
  });

  test('saving with no products is refused with a visible error and nothing is stored', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor } = await api.arrange(0);
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);

    const res = await submitPurchase(page, dialog);
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.product_id).toBe('Atleast 1 product is required for purchase');
    await expect(dialog.getByText('Atleast 1 product is required for purchase').first()).toBeVisible();
    await expect(dialog.getByText('Create New Purchase')).toBeVisible();
    expect(await api.purchasesOfVendor(vendor.id)).toHaveLength(0);
  });

  test('a zero quantity is refused and nothing is stored', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const i = await addProduct(page, dialog, a);
    await setLine(page, dialog, i, { qty: 0 });

    const res = await submitPurchase(page, dialog);
    expect(res.status()).toBe(400);
    expect((await res.json()).errors[`quantity_${i}`]).toBe('Quantity is required');
    await expect(dialog.locator(`[title="Quantity is required"], [data-error="Quantity is required"]`).first()).toBeAttached();
    await expect(page.getByText('Failed to process purchase!')).toBeVisible();
    expect(await api.purchasesOfVendor(vendor.id)).toHaveLength(0);
    expect(await api.stockOf(a.id)).toBe(0);
  });

  test('a zero unit price is refused and nothing is stored', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const i = await addProduct(page, dialog, a);
    await setLine(page, dialog, i, { price: 0 });

    const res = await submitPurchase(page, dialog);
    expect(res.status()).toBe(400);
    expect((await res.json()).errors[`purchase_unit_price_${i}`]).toBe('Purchase Unit Price is required');
    await expect(page.getByText('Failed to process purchase!')).toBeVisible();
    expect(await api.purchasesOfVendor(vendor.id)).toHaveLength(0);
  });

  test('a negative unit price is blocked in the form before anything is sent', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const posts = recordPurchasePosts(page);
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const i = await addProduct(page, dialog, a);
    await setLine(page, dialog, i, { price: -5 });
    await expect(dialog.locator('#purchase_payment_amount0')).toHaveValue('-5.75');
    await dialog.locator('select').first().selectOption('cash');

    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    await expect(dialog.getByText('Unit Price(without VAT) should be > 0').first()).toBeVisible();
    expect(posts).toHaveLength(0);
    expect(await api.purchasesOfVendor(vendor.id)).toHaveLength(0);
  });

  test('a negative quantity on one line is refused', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a, b] } = await api.arrange(2);
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const ia = await addProduct(page, dialog, a);
    await setLine(page, dialog, ia, { qty: 5 });
    const ib = await addProduct(page, dialog, b);
    await setLine(page, dialog, ib, { qty: -1 });
    // (5 - 1) x 60 = 240 + 15% = 276
    await expect(dialog.locator('#purchase_payment_amount0')).toHaveValue('276');
    await dialog.locator('select').first().selectOption('cash');

    const res = await submitPurchase(page, dialog);
    expect(res.status(), 'a negative quantity must not be saved').toBe(400);
    expect(await api.purchasesOfVendor(vendor.id)).toHaveLength(0);
    expect(await api.stockOf(b.id)).toBe(0);
  });
});

test.describe('purchase payments', () => {
  test('a partial payment in the form leaves a balance that the Purchase Payments screen can settle', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);

    // 4 x 12.50 = 50.00 + 7.50 VAT = 57.50; pay 20.00 now.
    const dialog = await openPurchaseCreate(page);
    await chooseVendor(page, dialog, vendor);
    const i = await addProduct(page, dialog, a);
    await setLine(page, dialog, i, { qty: 4, price: 12.5 });
    const amount = dialog.locator('#purchase_payment_amount0');
    await expect(amount).toHaveValue('57.5');
    await typeInto(page, amount, '20');
    await expect(amount).toHaveValue('20');
    await dialog.locator('select').first().selectOption('bank_transfer');

    const res = await submitPurchase(page, dialog);
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    const id = body.result.id;
    const code = body.result.code;

    let saved = await api.getPurchase(id);
    expect(saved.net_total).toBe(57.5);
    expect(saved.payment_status).toBe('paid_partially');
    expect(saved.total_payment_paid).toBe(20);
    expect(saved.balance_amount).toBe(37.5);
    const payments = await api.paymentsOf(id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ amount: 20, method: 'bank_transfer' });

    // Purchase Payments screen: find the payment by purchase code and raise it to the full amount.
    await page.goto('/dashboard/purchase-payments');
    await typeInto(page, page.locator('#purchase_code'), code);
    const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: code, exact: true }) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('20.00');
    await row.locator('button:has(.bi-pencil)').click();
    const edit = page.getByRole('dialog');
    const amt = edit.locator('#name'); // the amount input's id in purchase_payment/create.js
    await expect(amt).toHaveValue('20');
    await typeInto(page, amt, '57.5');
    const put = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/v1\/purchase-payment\//.test(r.url()));
    await edit.getByRole('button', { name: /^update$/i }).first().click();
    const putRes = await put;
    expect(putRes.status(), await putRes.text()).toBe(200);

    await expect.poll(async () => (await api.getPurchase(id)).payment_status).toBe('paid');
    saved = await api.getPurchase(id);
    expect(saved.total_payment_paid).toBe(57.5);
    expect(saved.balance_amount).toBe(0);
  });

  test('the Purchase Payments screen shows readable labels, not raw translation keys', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const pur = await api.createPurchase({ vendor, lines: [{ product: a, qty: 1, price: 10 }], payments: [{ amount: 5 }] });

    await page.goto('/dashboard/purchase-payments');
    await typeInto(page, page.locator('#purchase_code'), pur.code);
    const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: pur.code, exact: true }) });
    await expect(row).toHaveCount(1);
    await row.locator('button:has(.bi-pencil)').click();
    const edit = page.getByRole('dialog');
    await expect(edit.locator('#name')).toHaveValue('5');

    const rawKey = /\b[a-z]+(_[a-z]+)+\b/;
    const visible = `${await page.locator('thead').first().innerText()}\n${await edit.innerText()}`;
    expect(visible.split('\n').filter((l) => rawKey.test(l)), 'untranslated keys on screen').toEqual([]);
  });

  test('paid, partially paid and unpaid purchases report status and balance', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a] } = await api.arrange(1);
    const line = [{ product: a, qty: 3, price: 10.01 }]; // 30.03 + 4.50 (4.5045) = 34.53
    const paid = await api.createPurchase({ vendor, lines: line, payments: [{ amount: 34.53 }] });
    const part = await api.createPurchase({ vendor, lines: line, payments: [{ amount: 10 }, { amount: 4.53, method: 'bank_card' }] });
    const unpaid = await api.createPurchase({ vendor, lines: line });

    for (const p of [paid, part, unpaid]) {
      expect(p.total).toBe(30.03);
      expect(p.vat_price).toBe(4.5);
      expect(p.net_total).toBe(34.53);
    }
    expect([paid.payment_status, paid.total_payment_paid, paid.balance_amount]).toEqual(['paid', 34.53, 0]);
    expect([part.payment_status, part.total_payment_paid, part.balance_amount]).toEqual(['paid_partially', 14.53, 20]);
    expect([unpaid.payment_status, unpaid.total_payment_paid, unpaid.balance_amount]).toEqual(['not_paid', 0, 34.53]);

    // Overpaying is refused.
    const over = await api.tryPost('/v1/purchase', {
      date_str: new Date().toISOString(), status: 'delivered', vat_percent: 15, order_placed_by: api.userId,
      vendor_id: vendor.id,
      products: [{ product_id: a.id, name: a.name, part_number: a.part_number, unit: 'PC', quantity: 3, purchase_unit_price: 10.01 }],
      payments_input: [{ date_str: new Date().toISOString(), amount: 34.54, method: 'cash' }],
    });
    expect(over.status).toBe(400);
    expect(over.body.errors.total_payment).toMatch(/should not exceed: 34\.53/);

    // The purchases list shows the balance of the partially paid one.
    const row = await purchaseRow(page, part.code);
    await expect(row).toContainText('34.53');
    await expect(row).toContainText('20.00');
  });
});

test.describe('purchase return', () => {
  /** Opens "Return" for a purchase from the purchases list. */
  async function openReturn(page, code) {
    const row = await purchaseRow(page, code);
    await row.getByRole('button', { name: 'Return' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Create Purchase Return for purchase #${code}`)).toBeVisible();
    return dialog;
  }

  /** Ticks one purchased line by part number and sets the quantity to return. */
  async function returnLine(page, dialog, product, qty) {
    const ids = await dialog.locator('input[id^="purchase_return_product_part_number"]')
      .evaluateAll((els, pn) => els.filter((e) => e.value === pn).map((e) => e.id), product.part_number);
    expect(ids).toHaveLength(1);
    const i = ids[0].replace('purchase_return_product_part_number', '');
    await dialog.locator(`#purchase_return_product_select${i}`).check();
    const q = dialog.locator(`#purchase_return_product_quantity_${i}`);
    await typeInto(page, q, qty);
    await expect(q).toHaveValue(String(qty));
  }

  const isReturnPost = (r) => r.request().method() === 'POST' && /\/v1\/purchase-return\?/.test(r.url());

  test('returning part of a purchase reduces stock and is stored', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a, b] } = await api.arrange(2);
    const pur = await api.createPurchase({
      vendor, lines: [{ product: a, qty: 5, price: 10 }, { product: b, qty: 4, price: 20 }], payments: [{ amount: 149.5 }],
    });
    expect(await api.stockOf(a.id)).toBe(5);

    const dialog = await openReturn(page, pur.code);
    await returnLine(page, dialog, a, 2);
    // 2 x 10 = 20 + 3 VAT = 23, pre-filled as the refund.
    await expect(dialog.locator('#purchase_return_payment_amount0')).toHaveValue('23');
    await dialog.locator('select').first().selectOption('cash');

    const saved = page.waitForResponse(isReturnPost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);

    const ret = (await api.get(`/v1/purchase-return/${body.result.id}`)).result;
    expect(ret.purchase_id).toBe(pur.id);
    expect(ret.vendor_id).toBe(vendor.id);
    const returned = ret.products.filter((p) => p.selected !== false);
    expect(returned).toHaveLength(1);
    expect(returned[0]).toMatchObject({ product_id: a.id, quantity: 2, purchasereturn_unit_price: 10 });
    expect(ret.total).toBe(20);
    expect(ret.vat_price).toBe(3);
    expect(ret.net_total).toBe(23);
    expect(ret.payment_status).toBe('paid');

    expect(await api.stockOf(a.id)).toBe(3);
    expect(await api.stockOf(b.id)).toBe(4);
    const after = await api.getPurchase(pur.id);
    const lines = Object.fromEntries(after.products.map((p) => [p.product_id, p]));
    expect(lines[a.id].quantity_returned).toBe(2);
    expect(lines[b.id].quantity_returned).toBe(0);
    expect(after.return_count).toBe(1);
    expect(after.return_amount).toBe(23);
  });

  test('returning more than was purchased is refused', async ({ page, request }) => {
    const api = purchaseApi(request);
    const { vendor, products: [a, b] } = await api.arrange(2);
    const pur = await api.createPurchase({
      vendor, lines: [{ product: a, qty: 5, price: 10 }, { product: b, qty: 4, price: 20 }], payments: [{ amount: 149.5 }],
    });

    const dialog = await openReturn(page, pur.code);
    await returnLine(page, dialog, a, 6);
    await expect(dialog.locator('#purchase_return_payment_amount0')).toHaveValue('69');
    await dialog.locator('select').first().selectOption('cash');
    const posted = page.waitForResponse(isReturnPost, { timeout: 5_000 }).catch(() => null);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await posted;
    if (res) expect(res.status(), 'API must refuse returning 6 of 5 purchased').toBe(400);

    const after = await api.getPurchase(pur.id);
    expect(after.products.find((p) => p.product_id === a.id).quantity_returned).toBe(0);
    expect(await api.stockOf(a.id)).toBe(5);
  });
});
