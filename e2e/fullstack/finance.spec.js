// Money, full stack: expenses, customer receipts / payments, capital,
// drawings, dividends, the ledger and the dashboards, driven through the real
// UI the way a person does and checked against the real API / MongoDB.
// Every test arranges its own uniquely named data and only looks at that data,
// so other specs running on the same server cannot disturb it.
const { test, expect, AUTH_STATE } = require('./fixtures');
const {
  invApi, uniq, typeInto, topDialog, openCreate, pickSuggestion, submitAndCapture,
  recordResponses, pickToday,
} = require('./helpers/inventory-finance');

test.use({ storageState: AUTH_STATE });

const EXPENSE_POST = /\/v1\/expense\?/;
const minutesAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 60000;

/** Creates an expense category on its screen and returns its id. */
async function createExpenseCategory(page, name) {
  const dialog = await openCreate(page, 'expense_category', 'Create New Expense Category');
  await typeInto(page, dialog.getByPlaceholder('Category name'), name);
  const res = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/expense-category\?/);
  expect(res.status, JSON.stringify(res.body.errors)).toBe(200);
  await expect(topDialog(page).getByText(name).first()).toBeVisible();
  return res.body.result.id;
}

/** Fills the Expense form except the amount. */
async function fillExpense(page, dialog, { description, method, categoryName }) {
  await typeInto(page, dialog.locator('#description'), description);
  await dialog.locator('select').filter({ hasText: 'Bank Transfer' }).first().selectOption(method);
  await pickSuggestion(page, dialog.getByPlaceholder('Select Categories'), categoryName, categoryName);
}

test.describe('expenses', () => {
  test('an expense with a category created on its screen is stored with amount, method and date @devices', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('EX');
    const categoryName = `Fuel ${w}`;
    const categoryId = await createExpenseCategory(page, categoryName);
    const posts = recordResponses(page, 'POST', EXPENSE_POST);

    const dialog = await openCreate(page, 'expenses', 'Create New Expense');
    const createButton = dialog.getByRole('button', { name: 'Create', exact: true }).first();
    await expect(dialog.locator('#date_str')).not.toHaveValue(''); // today, pre-filled

    // Nothing filled in: every required field is reported.
    const empty = await submitAndCapture(page, createButton, 'POST', EXPENSE_POST);
    expect(empty.status).toBe(400);
    for (const msg of ['Amount is required', 'Description is required', 'Payment method is required', 'Atleast 1 category is required']) {
      await expect(dialog.getByText(msg).first()).toBeVisible();
    }

    // A zero amount is refused too.
    await fillExpense(page, dialog, { description: `Diesel ${w}`, method: 'bank_transfer', categoryName });
    await typeInto(page, dialog.locator('#amount'), '0');
    const zero = await submitAndCapture(page, createButton, 'POST', EXPENSE_POST);
    expect(zero.status).toBe(400);
    await expect(dialog.getByText(/Amount is required|Amount should be greater than zero/).first()).toBeVisible();

    await typeInto(page, dialog.locator('#amount'), '125.5');
    const saved = await submitAndCapture(page, createButton, 'POST', EXPENSE_POST);
    expect(saved.status, JSON.stringify(saved.body.errors)).toBe(200);

    const expense = (await api.get(`/v1/expense/${saved.body.result.id}`)).result;
    expect(expense.amount).toBe(125.5);
    expect(expense.payment_method).toBe('bank_transfer');
    expect(expense.description).toBe(`Diesel ${w}`);
    expect(expense.category_id).toEqual([categoryId]);
    expect(Math.abs(minutesAgo(expense.date))).toBeLessThan(15);
    expect(posts.filter((r) => r.status() === 200)).toHaveLength(1);

    // The view shows it.
    const view = topDialog(page);
    await expect(view.getByText('125.50').first()).toBeVisible();
    await expect(view.getByText(categoryName).first()).toBeVisible();
  });

  test('a negative expense amount is refused and nothing is stored', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('NX');
    const categoryName = `Neg ${w}`;
    await createExpenseCategory(page, categoryName);

    const dialog = await openCreate(page, 'expenses', 'Create New Expense');
    await fillExpense(page, dialog, { description: `Refund trick ${w}`, method: 'cash', categoryName });
    await typeInto(page, dialog.locator('#amount'), '-50');
    const res = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', EXPENSE_POST);
    if (res.status === 200) await api.del(`/v1/expense/${res.body.result.id}`); // never leave it behind

    expect(res.status).toBe(400);
    await expect(dialog.getByText('Amount should be greater than zero').first()).toBeVisible();
    const stored = (await api.list('/v1/expense', { description: `Refund trick ${w}` })).filter((e) => e.description === `Refund trick ${w}`);
    expect(stored).toHaveLength(0);
  });
});

test.describe('customer receipts and payments', () => {
  /** Opens the Receipt (receivables) or Payment (payables) form and picks the customer. */
  async function openFor(page, route, title, customer) {
    const dialog = await openCreate(page, route, title);
    await pickSuggestion(page, dialog.getByPlaceholder('Customer Name / Mob / VAT # / ID').first(), customer.name, customer.name);
    return dialog;
  }

  test('a receipt from a customer and a payment back to them move the customer\'s balance as the API reports', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('CB');
    const customer = await api.createCustomer({ name: `E2E Depositor ${w}` });
    expect((await api.getCustomer(customer.id)).credit_balance).toBe(0);

    // Receipt (customer deposit) of 300 in cash.
    let dialog = await openFor(page, 'receivables', 'Create New Receipt', customer);
    await typeInto(page, dialog.locator('#customer_receivable_payment_amount_0'), '300');
    await dialog.locator('#customer_receivable_payment_method_0').selectOption('cash');
    await typeInto(page, dialog.locator('#remarks'), `advance ${w}`);
    const deposit = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/customer-deposit\?/);
    expect(deposit.status, JSON.stringify(deposit.body.errors)).toBe(200);
    await expect(topDialog(page).getByText('300.00').first()).toBeVisible();

    const storedDeposit = (await api.get(`/v1/customer-deposit/${deposit.body.result.id}`)).result;
    expect(storedDeposit.customer_id).toBe(customer.id);
    expect(storedDeposit.net_total).toBe(300);
    expect(storedDeposit.remarks).toBe(`advance ${w}`);
    expect(storedDeposit.payments.map((p) => [p.amount, p.method])).toEqual([[300, 'cash']]);
    // The store now owes the customer 300.
    await expect.poll(async () => (await api.getCustomer(customer.id)).credit_balance).toBe(-300);

    // Payment (customer withdrawal) of 120 back to the customer by bank transfer.
    dialog = await openFor(page, 'payables', 'Create New Payment', customer);
    await expect(dialog.getByText('-300.00').first()).toBeVisible(); // the customer card shows the balance
    await typeInto(page, dialog.locator('#customer_payable_payment_amount_0'), '120');
    await dialog.locator('#customer_payable_payment_method_0').selectOption('bank_transfer');
    const withdrawal = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/customer-withdrawal\?/);
    expect(withdrawal.status, JSON.stringify(withdrawal.body.errors)).toBe(200);

    const storedWithdrawal = (await api.get(`/v1/customer-withdrawal/${withdrawal.body.result.id}`)).result;
    expect(storedWithdrawal.customer_id).toBe(customer.id);
    expect(storedWithdrawal.net_total).toBe(120);
    expect(storedWithdrawal.payments.map((p) => [p.amount, p.method])).toEqual([[120, 'bank_transfer']]);
    await expect.poll(async () => (await api.getCustomer(customer.id)).credit_balance).toBe(-180);
  });

  test('a receipt refused for a negative amount can be corrected and saved', async ({ page, request }) => {
    test.setTimeout(45_000);
    const api = invApi(request);
    const w = uniq('RF');
    const customer = await api.createCustomer({ name: `E2E Payer ${w}` });
    const posts = recordResponses(page, 'POST', /\/v1\/customer-deposit\?/);

    const dialog = await openFor(page, 'receivables', 'Create New Receipt', customer);
    await dialog.locator('#customer_receivable_payment_method_0').selectOption('cash');
    await typeInto(page, dialog.locator('#customer_receivable_payment_amount_0'), '-20');
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    await expect(dialog.getByText('Amount should be greater than zero').first()).toBeVisible();
    expect(posts).toHaveLength(0);

    // The person fixes the amount and saves again.
    await typeInto(page, dialog.locator('#customer_receivable_payment_amount_0'), '50');
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/customer-deposit\?/.test(r.url()), { timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    expect((await saved).status()).toBe(200);
    await expect.poll(async () => (await api.getCustomer(customer.id)).credit_balance).toBe(-50);
  });
});

test.describe('capital, drawings and dividends', () => {
  const FORMS = [
    { route: 'capitals', title: 'Create New Capital Investment', user: 'Select InvestedByUser', api: '/v1/capital', userField: 'invested_by_user_id', amount: 1000, method: 'bank_transfer' },
    { route: 'capital_withdrawals', title: 'Create New Drawing', user: 'Select WithdrawnByUser', api: '/v1/capital-withdrawal', userField: 'withdrawn_by_user_id', amount: 200, method: 'cash' },
    { route: 'dividents', title: 'Create New Drawing', user: 'Select WithdrawnByUser', api: '/v1/divident', userField: 'withdrawn_by_user_id', amount: 150, method: 'bank_cheque' },
  ];

  /** Fills one of the three forms; returns the POST outcome. */
  async function submitEntry(page, f, { amount, description }) {
    const dialog = await openCreate(page, f.route, f.title);
    await pickSuggestion(page, dialog.getByPlaceholder(f.user), 'E2E', 'E2E Admin');
    await typeInto(page, dialog.locator('#amount'), String(amount));
    await typeInto(page, dialog.locator('#description'), description);
    await pickToday(page, dialog.locator('#date_str'));
    await dialog.locator('select').filter({ hasText: 'Bank Cheque' }).first().selectOption(f.method);
    const createButton = dialog.getByRole('button', { name: 'Create', exact: true }).first();
    return { dialog, ...(await submitAndCapture(page, createButton, 'POST', new RegExp(`${f.api.replace(/\//g, '\\/')}\\?`))) };
  }

  // Every money form: capital, drawings and dividends.
  const USABLE = FORMS;

  test('a capital investment and a dividend typed into their forms are stored', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('CP');
    for (const f of USABLE) {
      // The date has no default: saving without one is refused.
      const dialog = await openCreate(page, f.route, f.title);
      const noDate = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', new RegExp(`${f.api.replace(/\//g, '\\/')}\\?`));
      expect(noDate.status).toBe(400);
      expect(noDate.body.errors).toMatchObject({ date_str: 'Date is required' });

      const description = `${f.route} ${w}`;
      const res = await submitEntry(page, f, { amount: f.amount, description });
      expect(res.status, `${f.route}: ${JSON.stringify(res.body.errors)}`).toBe(200);
      const stored = (await api.get(`${f.api}/${res.body.result.id}`)).result;
      expect(stored).toMatchObject({ amount: f.amount, description, payment_method: f.method, [f.userField]: api.userId });
      expect(Math.abs(minutesAgo(stored.date))).toBeLessThan(24 * 60 + 15); // today (picked at midnight)
      await expect(topDialog(page).getByText(description).first()).toBeVisible();
    }
  });

  for (const f of USABLE) {
    test(`a negative amount is refused on the ${f.route} form`, async ({ page, request }) => {
      const api = invApi(request);
      const description = `negative ${f.route} ${uniq()}`;
      const res = await submitEntry(page, f, { amount: -5, description });
      if (res.status === 200) await api.del(`${f.api}/${res.body.result.id}`); // never leave it behind
      expect(res.status).toBe(400);
    });
  }
});

test('the Drawings screen lists an existing drawing', async ({ page, request }) => {
  const api = invApi(request);
  const description = `drawing ${uniq('DW')}`;
  const body = await api.post('/v1/capital-withdrawal', {
    amount: 75, description, date_str: new Date().toISOString(), payment_method: 'cash', withdrawn_by_user_id: api.userId,
  });
  expect(body.status, JSON.stringify(body.errors)).toBe(true);
  await page.goto('/dashboard/capital_withdrawals');
  await expect(page.getByRole('button', { name: 'Create' }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(description).first()).toBeVisible({ timeout: 5_000 });
});

test.describe('ledger and dashboards', () => {
  test('a sale shows in the ledger and in the customer\'s account postings', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('LG');
    const product = await api.createProduct({ name: `Lamp ${w}`, partNumber: `LM-${w}` });
    const customer = await api.createCustomer({ name: `E2E Ledger ${w}` });
    const sale = await api.createSale({ customer, product, qty: 2, price: 100 }); // 230.00 with VAT, paid cash
    expect(sale.net_total).toBe(230);
    const accountName = customer.name.toUpperCase();

    // Ledger, filtered by the sale's code: the sale journal and its cash receipt.
    await page.goto('/dashboard/ledger');
    await typeInto(page, page.locator('#reference_code'), sale.code, 40);
    await expect(page.getByText('Showing 1-1 of 1').first()).toBeVisible();
    const table = page.locator('table').filter({ hasText: 'SALES A/c' }).first();
    await expect(table).toContainText(new RegExp(`${accountName}\\s*A/c #\\d+\\s*Dr\\.`, 'i'));
    await expect(table).toContainText(/To\s*SALES A\/c #\d+\s*Cr\./);
    await expect(table).toContainText(/CASH A\/c #\d+\s*Dr\./);
    await expect(table).toContainText(new RegExp(`To\\s*${accountName}\\s*A/c #\\d+\\s*Cr\\.`, 'i'));
    await expect(table.getByText('230', { exact: true })).toHaveCount(4);

    // Accounts: the customer's account opens a balance sheet with both postings.
    await page.goto('/dashboard/accounts');
    await typeInto(page, page.locator('input#name'), customer.name, 30);
    await page.getByRole('button', { name: new RegExp(`^${accountName}(?:\\s+Copy)?$`, 'i') }).first().click();
    const sheet = topDialog(page);
    await expect(sheet.getByText(new RegExp(`Balance sheet of ${accountName} A/c`, 'i'))).toBeVisible();
    await expect(sheet.getByText('Showing 1-2 of 2').first()).toBeVisible();
    await expect(sheet.getByRole('cell', { name: sale.code, exact: true })).toHaveCount(2);
    await expect(sheet.getByText(/Total Amount\s*230\.00\s*230\.00/)).toBeVisible();
  });

  test('the Statistics screen shows the sales total the API reports, and the Business Dashboard renders', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('ST');
    const product = await api.createProduct({ name: `Gauge ${w}`, partNumber: `GA-${w}` });
    const customer = await api.createCustomer({ name: `E2E Stats ${w}` });
    await api.createSale({ customer, product, qty: 1, price: 100 });

    const statsResponses = [];
    page.on('response', (r) => { if (/\/v1\/order\?.*search\[stats\]=1/.test(r.url())) statsResponses.push(r); });
    await page.goto('/dashboard/stats');
    await expect(page.getByRole('heading', { name: 'Statistics' }).or(page.getByText('Statistics', { exact: true })).first()).toBeVisible();
    await expect.poll(() => statsResponses.length).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle').catch(() => {});
    const meta = (await statsResponses[statsResponses.length - 1].json()).meta;
    expect(meta.total_sales).toBeGreaterThanOrEqual(115); // includes the sale just made
    const shown = Number(meta.total_sales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await expect(page.getByText('Sales Summary', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(shown, { exact: true }).first()).toBeVisible();

    await page.goto('/dashboard/business-dashboard');
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recompute/ })).toBeVisible();
  });

  test('the Statistics forecasts load (their API calls are accepted)', async ({ page }) => {
    const forecasts = [];
    page.on('response', (r) => { if (r.url().includes('/v1/bi/report-result/download')) forecasts.push(r); });
    await page.goto('/dashboard/stats');
    await expect.poll(() => forecasts.length).toBe(3);
    const statuses = forecasts.map((r) => r.status());
    // 200, or 404 when no forecast has been computed yet; never "bad request".
    expect(statuses.filter((s) => s === 400)).toEqual([]);
  });
});
