import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

test.describe('Home dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('greets the user with KPIs, chart, tasks and health cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening), / })).toBeVisible();
    const kpis = page.getByLabel('Key figures');
    await expect(kpis.locator('.kpi').first()).toBeVisible();
    await expect(kpis.getByText(/Total revenue|Net revenue/)).toBeVisible();
    await expect(page.getByText('Revenue vs purchases', { exact: true })).toBeVisible();
    await expect(page.getByText('My tasks')).toBeVisible();
    await expect(page.getByText('Compliance & health')).toBeVisible();
    await expect(page.getByText('Top products')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('period presets change the KPI window', async ({ page }) => {
    await page.getByRole('button', { name: 'MTD' }).click();
    await expect(page.getByRole('button', { name: 'MTD' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Key figures').getByText('MTD').first()).toBeVisible();
    await page.getByRole('button', { name: '12M' }).click();
    await expect(page.getByLabel('Key figures').getByText('12M').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('a task opens its list, and Create actions work', async ({ page }) => {
    const tasks = page.getByRole('list', { name: 'My tasks' });
    if (await tasks.count()) {
      await tasks.getByRole('listitem').first().getByRole('button').click();
      await expect(page).not.toHaveURL(/\/home$/);
      await page.goto('/home');
    }
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'New invoice' }).click();
      await expect(page).toHaveURL(/\/sales\/invoices\/new/);
    } else {
      await page.getByRole('button', { name: 'New expense' }).click();
      await expect(page).toHaveURL(/\/finance\/expenses\/new/);
    }
  });

  test('legacy business-dashboard URL lands on Home', async ({ page }) => {
    await page.goto('/dashboard/business-dashboard');
    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe('Insights', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('statistics shows the profit / loss statement and module sections', async ({ page }) => {
    await page.goto('/insights/stats');
    await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
    await expect(page.getByText('Profit / loss statement')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Date/ }).click();
    await page.getByRole('button', { name: 'This month' }).click();
    await expect(page.getByText('Showing all time')).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('analytics plots a series and shows a table view', async ({ page }) => {
    await page.goto('/insights/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await page.getByRole('button', { name: 'Yearly' }).click();
    await expect(page.locator('.chart svg[role=img]')).toBeVisible();
    await page.getByRole('button', { name: 'Expense' }).click();
    await expect(page.locator('.legend')).toBeVisible();
    await page.getByRole('button', { name: 'Table' }).click();
    await expect(page.getByRole('table', { name: 'Analytics table' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
