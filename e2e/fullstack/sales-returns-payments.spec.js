// Sales returns and sales payments through the real UI, checked against the
// real API and MongoDB: a partial return is stored and puts the goods back in
// stock, over-returns are refused, and payments move a sale from not paid to
// partially paid to paid while overpayments are refused.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { salesApi, findRow, setNumber } = require('./helpers/sales');

test.use({ storageState: AUTH_STATE });
test.describe.configure({ timeout: 120_000 });

const isReturnPost = (r) => r.request().method() === 'POST' && /\/v1\/sales-return\?/.test(r.url());
const FAILED_TOAST = /failed_to_process_payment|failed to process payment/i;
const isPaymentPost = (r) => r.request().method() === 'POST' && /\/v1\/sales-payment\?/.test(r.url());

/** A customer, one product with 10 in stock, and a credit sale of `qty` x 100 to them. */
async function arrangeCreditSale(api, qty = 4) {
  const { customer, products: [product] } = await api.arrangeSale(1, { stock: 10 });
  const sale = await api.createSale({ customer, lines: [{ product, qty, price: 100 }] });
  expect(sale.payment_status).toBe('not_paid');
  return { customer, product, sale };
}

/** Finds the sale in the Sales list and opens its "Return" form. */
async function openReturnForm(page, sale) {
  await page.goto('/dashboard/sales');
  const row = await findRow(page, 'sales_code', sale.code);
  await row.getByRole('button', { name: 'Return' }).first().click();
  const dialog = page.locator('.modal-content').filter({ hasText: 'Create Sales Return' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(sale.code);
  return dialog;
}

/** Finds the sale in the Sales list and opens its payment history. */
async function openPayments(page, sale) {
  await page.goto('/dashboard/sales');
  const row = await findRow(page, 'sales_code', sale.code);
  await row.locator('button.btn-link').first().click(); // the "amount paid" link
  const history = page.locator('.modal-content').filter({ hasText: `Payment history of Order #${sale.code}` });
  await expect(history).toBeVisible();
  return history;
}

const paymentForm = (page) => page.locator('.modal-content').filter({ has: page.locator('option[value="customer_account"]') });

/**
 * From the payment history, opens "create", types the amount and picks the
 * method. Retries opening the form (up to 3 times) if it is not there.
 */
async function fillPayment(page, history, amount, method = 'cash') {
  const form = paymentForm(page);
  for (let attempt = 1; ; attempt++) {
    try {
      if (!(await form.isVisible())) await history.getByRole('button', { name: /create/i }).click();
      await expect(form).toBeVisible();
      const input = form.locator('input[type="number"]').first();
      await input.click({ timeout: 5_000 });
      await page.keyboard.press('ControlOrMeta+A');
      await input.pressSequentially(String(amount), { delay: 50, timeout: 5_000 });
      await form.locator('select').selectOption(method, { timeout: 5_000 });
      await expect(input).toHaveValue(String(amount), { timeout: 2_000 });
      return form;
    } catch (e) {
      if (attempt >= 3 || await form.isVisible()) throw e;
    }
  }
}

/** fillPayment, then the form's Create; returns the POST response. */
async function submitPayment(page, history, amount, method = 'cash') {
  const form = await fillPayment(page, history, amount, method);
  const posted = page.waitForResponse(isPaymentPost);
  // The footer button: a toast from an earlier payment can sit over the header one.
  await form.getByRole('button', { name: /^\s*create\s*$/i }).last().click();
  return { form, res: await posted };
}

test.describe('sales returns', () => {
  test('@devices returning part of a sale is stored and puts the goods back in stock', async ({ page }) => {
    const api = salesApi(page.request);
    const { product, sale } = await arrangeCreditSale(api, 4);
    await expect.poll(() => api.stockOf(product.id)).toBe(6);

    const dialog = await openReturnForm(page, sale);
    const qty = dialog.locator('#sales_return_product_quantity_0');
    await expect(qty).toHaveValue('4'); // offers the whole line
    await dialog.locator('#select_sales_return_product_0').check();
    await setNumber(page, qty, 2);
    await expect(dialog.locator('#sales_product_line_total_with_vat0')).toHaveValue('230');

    const saved = page.waitForResponse(isReturnPost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);

    const [ret] = await api.returnsOf(sale.id);
    expect(ret.id).toBe(body.result.id);
    expect(ret.products).toHaveLength(1);
    expect(ret.products[0]).toMatchObject({ product_id: product.id, quantity: 2, unit_price: 100 });
    expect(ret.total).toBeCloseTo(200, 2);
    expect(ret.vat_price).toBeCloseTo(30, 2);
    expect(ret.net_total).toBeCloseTo(230, 2);

    await expect.poll(() => api.stockOf(product.id)).toBe(8);
    const after = await api.getSale(sale.id);
    expect(after.products[0].quantity_returned).toBe(2);
    expect(after.return_count).toBe(1);
  });

  test('returning more than was sold is refused and nothing changes', async ({ page }) => {
    const api = salesApi(page.request);
    const { product, sale } = await arrangeCreditSale(api, 4);
    await expect.poll(() => api.stockOf(product.id)).toBe(6);

    const dialog = await openReturnForm(page, sale);
    await dialog.locator('#select_sales_return_product_0').check();
    const qty = dialog.locator('#sales_return_product_quantity_0');
    await setNumber(page, qty, 5);

    const saved = page.waitForResponse(isReturnPost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.quantity_0).toMatch(/should not be greater than purchased quantity: 4/i);

    // The person is told, and the offending quantity is flagged.
    await expect(page.getByText('Failed to process sales return!')).toBeVisible();
    await expect(qty).toHaveClass(/is-invalid/);
    await expect(dialog).toBeVisible();

    expect(await api.returnsOf(sale.id)).toHaveLength(0);
    expect(await api.stockOf(product.id)).toBe(6);
    expect((await api.getSale(sale.id)).products[0].quantity_returned || 0).toBe(0);
  });

  test('after a partial return, returning more than what is left is refused', async ({ page }) => {
    const api = salesApi(page.request);
    const { product, sale } = await arrangeCreditSale(api, 4);
    await api.createSalesReturn({ sale, product, qty: 3 });
    await expect.poll(() => api.stockOf(product.id)).toBe(9);

    const dialog = await openReturnForm(page, sale);
    const qty = dialog.locator('#sales_return_product_quantity_0');
    await expect(qty).toHaveValue('1'); // only one left to return
    await dialog.locator('#select_sales_return_product_0').check();
    await setNumber(page, qty, 2);

    const saved = page.waitForResponse(isReturnPost);
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    expect(res.status()).toBe(400);
    await expect(qty).toHaveClass(/is-invalid/);

    expect(await api.returnsOf(sale.id)).toHaveLength(1);
    expect(await api.stockOf(product.id)).toBe(9);
    expect((await api.getSale(sale.id)).products[0].quantity_returned).toBe(3);
  });
});

test.describe('sales payments', () => {
  test('@devices partial then full payment moves the sale to paid; paying more than the balance is refused', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 4); // 460.00 owed

    let history = await openPayments(page, sale);
    let { res } = await submitPayment(page, history, 200);
    expect(res.status(), await res.text()).toBe(200);
    await expect.poll(async () => (await api.getSale(sale.id)).payment_status).toBe('paid_partially');
    let s = await api.getSale(sale.id);
    expect(s.total_payment_received).toBeCloseTo(200, 2);
    expect(s.balance_amount).toBeCloseTo(260, 2);

    // 300 would take the total to 500, over the 460 owed. (Reopened from the
    // list: the list's refresh after a save can close a just-opened form.)
    history = await openPayments(page, sale);
    await expect(history).toContainText('260.00');
    ({ res } = await submitPayment(page, history, 300));
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.amount).toMatch(/should not exceed: 460\.00/);
    await expect(page.getByText(FAILED_TOAST).last()).toBeVisible();
    expect(await api.salePaymentsOf(sale.id)).toHaveLength(1);
    expect((await api.getSale(sale.id)).balance_amount).toBeCloseTo(260, 2);

    // The exact balance settles it.
    history = await openPayments(page, sale);
    ({ res } = await submitPayment(page, history, 260));
    expect(res.status(), await res.text()).toBe(200);
    await expect.poll(async () => (await api.getSale(sale.id)).payment_status).toBe('paid');
    s = await api.getSale(sale.id);
    expect(s.total_payment_received).toBeCloseTo(460, 2);
    expect(s.balance_amount).toBeCloseTo(0, 2);
    const payments = await api.salePaymentsOf(sale.id);
    expect(payments.map((p) => p.amount).sort((x, y) => x - y)).toEqual([200, 260]);
    expect(payments.every((p) => p.method === 'cash')).toBe(true);
  });

  test('a single payment larger than the sale is refused', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 4); // 460.00

    const history = await openPayments(page, sale);
    const { res } = await submitPayment(page, history, 460.01);
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.amount).toMatch(/should not exceed: 460\.00/);
    await expect(page.getByText(FAILED_TOAST).last()).toBeVisible();

    expect(await api.salePaymentsOf(sale.id)).toHaveLength(0);
    const s = await api.getSale(sale.id);
    expect(s.payment_status).toBe('not_paid');
    expect(s.balance_amount).toBeCloseTo(460, 2);
  });

  test('a refused payment keeps the form open and tells the person why', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 4);
    const history = await openPayments(page, sale);
    const { form, res } = await submitPayment(page, history, 500);
    expect(res.status()).toBe(400);
    await expect(form).toBeVisible({ timeout: 5_000 });
    await expect(form.getByText(/should not exceed: 460\.00/)).toBeVisible({ timeout: 5_000 });
  });

  test('an open Add Payment form survives another sale being made in the store', async ({ page }) => {
    const api = salesApi(page.request);
    const { customer, product, sale } = await arrangeCreditSale(api, 1);
    const history = await openPayments(page, sale);
    await history.getByRole('button', { name: /create/i }).click();
    const form = page.locator('.modal-content').filter({ has: page.locator('option[value="customer_account"]') });
    const amount = form.locator('input[type="number"]').first();
    await setNumber(page, amount, 50);

    // Someone else rings up a sale; the open list refreshes.
    const refreshed = page.waitForResponse((r) => r.request().method() === 'GET' && /\/v1\/order\?/.test(r.url()), { timeout: 15_000 });
    await api.createSale({ customer, lines: [{ product, qty: 1, price: 100 }] });
    await refreshed.catch(() => {});
    await expect(form).toBeVisible({ timeout: 3_000 });
    await expect(amount).toHaveValue('50');
  });

  test('a zero payment is refused in the form', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 1);
    const posts = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/v1\/sales-payment\?/.test(r.url())) posts.push(r.url()); });

    const history = await openPayments(page, sale);
    const form = await fillPayment(page, history, 0);
    await form.getByRole('button', { name: /^\s*create\s*$/i }).last().click();
    await expect(form.locator('div[style*="red"]').first()).toBeVisible();
    expect(posts).toEqual([]);
    expect(await api.salePaymentsOf(sale.id)).toHaveLength(0);
  });

  // Success toasts are suppressed app-wide by design; a saved payment shows up
  // in the history instead, and must not be reported as a failure.
  test('a successful payment closes the form, is listed in the history and shows no failure', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 1);

    const history = await openPayments(page, sale);
    const { form, res } = await submitPayment(page, history, 50);
    expect(res.status()).toBe(200);
    expect(await api.salePaymentsOf(sale.id)).toHaveLength(1);
    await expect(form).toBeHidden({ timeout: 5_000 });
    await expect(history.locator('tbody tr').filter({ hasText: '50.00 SAR' })).toHaveCount(1, { timeout: 5_000 });
    await expect(page.getByText(FAILED_TOAST)).toHaveCount(0, { timeout: 5_000 });
  });

  test('the payment dialogs are shown in English, not as translation keys', async ({ page }) => {
    const api = salesApi(page.request);
    const { sale } = await arrangeCreditSale(api, 1);
    const history = await openPayments(page, sale);
    for (const key of ['total_paid_amount', 'sales_payments', 'no_sales_payments_to_display']) {
      await expect(history.getByText(key, { exact: true })).toHaveCount(0, { timeout: 2_000 });
    }
    await history.getByRole('button', { name: /create/i }).click();
    const form = page.locator('.modal-content').filter({ has: page.locator('option[value="customer_account"]') });
    await expect(form).not.toContainText('add_payment_for_sales_order', { timeout: 2_000 });
  });
});
