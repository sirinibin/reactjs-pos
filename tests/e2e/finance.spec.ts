import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';
import type { Page } from '@playwright/test';

const run = Date.now().toString(36);

async function save(page: Page) {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
}

test.describe('Finance — expenses', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('list shows totals and rows at this viewport', async ({ page }) => {
    await page.goto('/finance/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByText('VAT paid')).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').first()).toBeVisible();
    else await expect(page.locator('table.dg tbody tr td.code').first()).toBeVisible();
    await page.getByRole('tab', { name: /^Bank/ }).click();
    await expect(page).toHaveURL(/view=bank/);
    await expectNoHorizontalOverflow(page);
  });

  test('empty expense cannot be saved', async ({ page }) => {
    await page.goto('/finance/expenses/new');
    await expect(page.getByRole('heading', { name: 'New expense' })).toBeVisible();
    await save(page);
    await expect(page.getByText('Description is required')).toBeVisible();
    await expect(page.getByText('At least 1 category is required')).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
    await expectNoHorizontalOverflow(page);
  });

  test('create an expense end-to-end, then open it and edit', async ({ page }) => {
    await page.goto('/finance/expenses/new');
    await page.getByRole('textbox', { name: /Description/ }).fill(`E2E stationery ${run}`);
    await page.getByRole('textbox', { name: /Amount/ }).fill('57.50');
    const cat = page.getByRole('combobox', { name: /Categories/ });
    await cat.click();
    await page.locator('.ta-menu.on [role=option]').first().click();
    await expect(page.getByLabel('Selected categories')).toBeVisible();
    await save(page);
    await expect(page).toHaveURL(/\/finance\/expenses\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /EXP-?\d+/ })).toBeVisible();
    await expect(page.getByText(`E2E stationery ${run}`).first()).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByRole('textbox', { name: /Amount/ }).fill('60');
    if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
    else await page.getByRole('button', { name: /^Save changes/ }).click();
    await expect(page).toHaveURL(/\/finance\/expenses\/[0-9a-f]{24}$/);
    await expect(page.locator('.facets').getByText('60.00')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('expense categories page and create drawer', async ({ page }) => {
    await page.goto('/finance/expense-categories');
    await expect(page.getByRole('heading', { name: 'Expense categories' })).toBeVisible();
    await page.getByRole('button', { name: 'New category' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('textbox', { name: /Name/ }).fill(`E2E cat ${run}`);
    await dlg.getByRole('button', { name: 'Create' }).click();
    await expect(dlg).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Finance — accounts, trial balance, statement, ledger', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('accounts list → trial balance tree with balance badge', async ({ page }) => {
    await page.goto('/finance/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts & trial balance' })).toBeVisible();
    await expect(page.getByText('Debit balance total')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Trial balance', exact: true }).click();
    await expect(page).toHaveURL(/tab=tb/);
    const tb = page.getByRole('table', { name: 'Trial balance' });
    await expect(tb.getByText('Assets')).toBeVisible();
    await expect(page.locator('.pill').filter({ hasText: /Debits equal credits|Out of balance by/ })).toBeVisible();
    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect(tb.getByRole('link', { name: 'CASH', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expectNoHorizontalOverflow(page);
    await tb.getByRole('link', { name: 'CASH', exact: true }).click();
    await expect(page).toHaveURL(/\/finance\/accounts\/[0-9a-f]{24}/);
    await expect(page.getByRole('heading', { name: /CASH/ })).toBeVisible();
    await expect(page.getByText('Closing balance').first()).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.st-m .mi').first()).toBeVisible();
    else await expect(page.getByRole('table', { name: 'Account statement' }).locator('tbody tr').first()).toBeVisible();
    await page.getByRole('checkbox', { name: 'Ignore opening balance' }).check();
    await expectNoHorizontalOverflow(page);
  });

  test('postings page picks an account', async ({ page }) => {
    await page.goto('/finance/postings');
    await expect(page.getByText('Choose an account')).toBeVisible();
    await page.getByRole('combobox', { name: 'Account' }).fill('CASH');
    await page.getByRole('option', { name: /^CASH A\/c/ }).first().click();
    await expect(page).toHaveURL(/account=[0-9a-f]{24}/);
    await expect(page.getByRole('heading', { name: /CASH/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('ledger shows balanced journal lines', async ({ page }) => {
    await page.goto('/finance/ledger');
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible();
    const scope = isMobile(page) ? page.locator('.mlist') : page.getByRole('table', { name: 'Ledger' });
    await expect(scope.getByText(/ Dr\.$/).first()).toBeVisible();
    await expect(scope.getByText(/^To .* Cr\.$/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Finance — capital & drawings', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('record a capital entry from the Create action', async ({ page }) => {
    await page.goto('/finance/capital?new=1');
    const dlg = page.getByRole('dialog', { name: 'New capital entry' });
    await expect(dlg).toBeVisible();
    await dlg.getByRole('button', { name: 'Create' }).click();
    await expect(dlg.getByText('Invested by is required')).toBeVisible();
    await dlg.getByRole('combobox', { name: /Invested by/ }).click();
    await page.locator('.ta-menu.on [role=option]').first().click();
    await dlg.getByRole('textbox', { name: /Amount/ }).fill('750');
    await dlg.getByRole('textbox', { name: /Description/ }).fill(`E2E capital ${run}`);
    await dlg.getByRole('button', { name: 'Create' }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByText(`E2E capital ${run}`).first()).toBeAttached();
    await expectNoHorizontalOverflow(page);
  });

  test('drawings and capital withdrawals load', async ({ page }) => {
    await page.goto('/finance/drawings');
    await expect(page.getByRole('heading', { name: 'Drawings' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/finance/capital-withdrawals');
    await expect(page.getByRole('heading', { name: 'Capital withdrawals' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Server PDF render routes', () => {
  test('/posting-print and /report-print render bare and flag print-ready', async ({ page }) => {
    await page.route('**/v1/posting/print-data/**', (r) => r.fulfill({ json: { modelName: 'balance_sheet', fontSizes: {}, model: { name: 'CASH', number: '1000', store: { name: 'GUO' }, debitTotal: 10, creditTotal: 0, creditBalance: 10, posts: [{ reference_code: 'S-1', reference_model: 'sales', posts: [{ debit_or_credit: 'debit', debit: 10, balance: 10, account_name: 'SALES', account_number: '1007', date: new Date().toISOString() }] }] } } }));
    await page.route('**/v1/report/print-data/**', (r) => r.fulfill({ json: { modelName: 'purchase_report', model: { store: { name: 'GUO' }, models: [{ code: 'P-1', vendor_name: 'BOSCH', net_total: 100, total_payment_received: 0, balance_amount: 100, payment_status: 'not_paid' }] } } }));
    await page.goto('/posting-print?key=e2e');
    await expect(page.getByTestId('posting-paper')).toBeVisible();
    await expect(page.locator('.rail')).toHaveCount(0);
    await expect(page.locator('body')).toHaveAttribute('data-print-ready', 'true');
    await page.goto('/report-print?key=e2e');
    await expect(page.getByText('Purchase report')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-print-ready', 'true');
  });
});
