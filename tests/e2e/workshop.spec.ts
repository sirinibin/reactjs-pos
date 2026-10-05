import type { Page } from '@playwright/test';
import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures';

const uid = (p: Page) => `${Date.now().toString(36)}${(p.viewportSize()?.width || 0).toString(36)}`.toUpperCase();
const save = async (page: Page) => {
  if (isMobile(page)) await page.locator('.mbar').getByRole('button', { name: 'Save' }).click();
  else await page.keyboard.press('Control+s');
};
const col = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

test.describe('Workshop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('board: lists with counts, design layout per device, no overflow', async ({ page }) => {
    await page.goto('/workshop/board');
    await expect(page.getByRole('heading', { name: 'Repair Jobs Board' })).toBeVisible();
    const todo = col(page, 'TO DO');
    await expect(todo.locator('article.kc').first()).toBeVisible();
    await expect(todo.locator('.kcol-h .c')).toHaveText(/^\d+$/);
    if (isMobile(page)) {
      // columns become horizontally snapping panes ~82% of the board width
      const [colW, kbW, snap] = await page.evaluate(() => {
        const kb = document.querySelector('.kb') as HTMLElement;
        return [(kb.querySelector('.kcol') as HTMLElement).getBoundingClientRect().width, kb.clientWidth, getComputedStyle(kb).scrollSnapType];
      });
      expect(colW / kbW).toBeGreaterThan(0.75);
      expect(colW / kbW).toBeLessThan(0.86);
      expect(snap).toContain('x');
    } else {
      await expect(col(page, 'DONE')).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test('board: quick-add a card, move it to the last list (closes) and back (reopens)', async ({ page }) => {
    const title = `E2E card ${uid(page)}`;
    await page.goto('/workshop/board');
    const todo = col(page, 'TO DO');
    await todo.getByRole('button', { name: 'Add a card', exact: true }).click();
    await todo.getByRole('textbox', { name: 'Enter a title for this card...' }).fill(title);
    await todo.getByRole('textbox', { name: 'Enter a title for this card...' }).press('Enter');
    const card = page.locator('article.kc', { hasText: title });
    await expect(card).toBeVisible();
    const jn = (await card.locator('.jn').textContent())!.trim();
    await card.getByRole('button', { name: `Actions ${jn}` }).click();
    await page.getByRole('menuitem', { name: 'DONE' }).click();
    await expect(page.getByText(`${jn} → DONE · Closed`)).toBeVisible();
    await expect(col(page, 'DONE').locator('article.kc', { hasText: title })).toBeAttached();
    await page.reload();
    await expect(col(page, 'DONE').locator('article.kc', { hasText: title })).toBeAttached();
    const moved = page.locator('article.kc', { hasText: title });
    await moved.scrollIntoViewIfNeeded();
    await moved.getByRole('button', { name: `Actions ${jn}` }).click();
    await page.getByRole('menuitem', { name: 'TO DO' }).click();
    await expect(page.getByText(`${jn} → TO DO · Open`)).toBeVisible();
    // archive to keep the shared board tidy
    const back = col(page, 'TO DO').locator('article.kc', { hasText: title });
    await back.scrollIntoViewIfNeeded();
    await back.getByRole('button', { name: `Actions ${jn}` }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
    await expect(page.locator('article.kc', { hasText: title })).toHaveCount(0);
  });

  test('board: drag & drop (mouse on desktop, long-press on touch)', async ({ page }) => {
    const title = `E2E drag ${uid(page)}`;
    await page.goto('/workshop/board');
    const todo = col(page, 'TO DO');
    await todo.getByRole('button', { name: 'Add a card · TO DO' }).click();
    await todo.getByRole('textbox', { name: 'Enter a title for this card...' }).fill(title);
    await todo.getByRole('textbox', { name: 'Enter a title for this card...' }).press('Enter');
    const card = page.locator('article.kc', { hasText: title });
    await expect(card).toBeVisible();
    const target = col(page, 'IN PROGRESS').locator('[data-list-body]');
    if (isMobile(page)) {
      const box = (await card.boundingBox())!;
      const tb = (await target.boundingBox())!;
      const x0 = box.x + 40, y0 = box.y + 30, x1 = tb.x + 12, y1 = tb.y + 20;
      const fire = (type: string, x: number, y: number, sel?: string) => page.evaluate(([type, x, y, sel]) => {
        const el = sel ? document.querySelector(sel as string)! : document;
        el.dispatchEvent(new PointerEvent(type as string, { pointerType: 'touch', clientX: x as number, clientY: y as number, bubbles: true, isPrimary: true }));
      }, [type, x, y, sel] as const);
      const id = await card.getAttribute('data-card');
      await fire('pointerdown', x0, y0, `[data-card="${id}"]`);
      await page.waitForTimeout(300);
      await expect(page.locator('.ws-ghost')).toBeVisible();
      const vw = page.viewportSize()!.width;
      if (x1 > vw - 20) {
        // Target list is off-screen (small phones): hold the card at the right edge until it scrolls in.
        await fire('pointermove', vw - 10, y1);
        await expect.poll(async () => (await target.boundingBox())!.x, { timeout: 5000 }).toBeLessThan(vw - 80);
        const nb = (await target.boundingBox())!;
        await fire('pointermove', nb.x + 12, nb.y + 20);
        await fire('pointerup', nb.x + 12, nb.y + 20);
      } else {
        await fire('pointermove', (x0 + x1) / 2, (y0 + y1) / 2);
        await fire('pointermove', x1, y1);
        await fire('pointerup', x1, y1);
      }
    } else {
      await card.dragTo(target);
    }
    await expect(col(page, 'IN PROGRESS').locator('article.kc', { hasText: title })).toBeAttached();
    const map = await page.evaluate(() => JSON.parse(localStorage.getItem('repair_job_kanban_card_map') || '{}'));
    expect(Object.values(map)).toContain('in_progress');
    // cleanup
    const moved = col(page, 'IN PROGRESS').locator('article.kc', { hasText: title });
    const jn = (await moved.locator('.jn').textContent())!.trim();
    await moved.getByRole('button', { name: `Actions ${jn}` }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
    await expect(page.locator('article.kc', { hasText: title })).toHaveCount(0);
  });

  test('job card: create with parts & labour, view, then create a sales invoice prefill', async ({ page }) => {
    const title = `E2E job ${uid(page)}`;
    // The sales editor consumes (and clears) the hand-over key, so capture the write itself.
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === 'workshop_invoice_prefill') (window as any).__wsPrefill = v;
        return orig.call(this, k, v);
      };
    });
    await page.goto('/workshop/jobs/new');
    await page.getByRole('textbox', { name: 'Title' }).fill(title);
    await page.getByRole('combobox', { name: /^Customer/ }).fill('al noor');
    await page.getByRole('option', { name: /AL NOOR TRADING/ }).first().click();
    await page.getByRole('combobox', { name: 'Search products or services to add...' }).fill('oil');
    await page.getByRole('option', { name: /Engine Oil/ }).first().click();
    await expect(page.getByRole('table', { name: 'Parts' }).getByRole('textbox', { name: 'Part / Service Name' }).first()).toHaveValue(/Engine Oil/);
    const labour = page.getByRole('textbox', { name: 'Labour Charge' });
    await labour.fill('115');
    await labour.press('Enter');
    await expect(page.getByLabel('Cost Summary').getByText('100.00')).toBeVisible();
    await save(page);
    await expect(page).toHaveURL(/\/workshop\/jobs\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: new RegExp(title) })).toBeVisible();
    await expect(page.getByText('Document flow')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Create Sales Invoice' }).first().click();
    await expect(page).toHaveURL(/\/sales\/invoices\/new/);
    const pre = await page.evaluate(() => JSON.parse((window as any).__wsPrefill || 'null'));
    expect(pre.repair_job_ids).toHaveLength(1);
    expect(pre.customer_name).toMatch(/AL NOOR/);
    expect(pre.products.map((p: any) => p.name)).toEqual(expect.arrayContaining([expect.stringMatching(/Engine Oil/), 'Labour Charge']));
  });

  test('repair jobs list and Ctrl+K search', async ({ page }) => {
    await page.goto('/workshop/jobs');
    await expect(page.getByRole('heading', { name: 'Repair Jobs' })).toBeVisible();
    if (isMobile(page)) await expect(page.locator('.mlist .mi').first()).toBeVisible();
    else await expect(page.locator('table.dg tbody tr').first()).toBeVisible();
    await page.getByRole('tab', { name: /^Archived/ }).click();
    await expect(page).toHaveURL(/view=archived/);
    await expectNoHorizontalOverflow(page);
    if (!isMobile(page)) {
      await page.keyboard.press('Control+k');
      await page.keyboard.type('RJ-1');
      await expect(page.getByRole('option', { name: /RJ-1/ }).first()).toBeVisible();
    }
  });

  test('vehicles: create → view → edit', async ({ page }) => {
    const plate = `E2E ${uid(page)}`.slice(0, 14);
    await page.goto('/workshop/vehicles');
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('.ph .acts').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/\/workshop\/vehicles\/new$/);
    await page.getByRole('combobox', { name: /^Customer/ }).fill('al noor');
    await page.getByRole('option', { name: /AL NOOR TRADING/ }).first().click();
    await page.getByLabel('Brand').selectOption('Toyota');
    await page.getByLabel('Model').selectOption('Land Cruiser');
    await page.getByRole('textbox', { name: /Vehicle Number/ }).fill(plate);
    await page.getByRole('textbox', { name: /Current KM/ }).fill('12000');
    await save(page);
    await expect(page).toHaveURL(/\/workshop\/vehicles\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name: /Toyota Land Cruiser/ })).toBeVisible();
    await expect(page.locator('.facet', { hasText: 'Current KM' })).toContainText('12,000');
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('textbox', { name: /Current KM/ })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Color' }).fill('Pearl White');
    await save(page);
    await expect(page.getByText('Vehicle updated successfully!')).toBeVisible();
    await expect(page.getByText('Pearl White').filter({ visible: true }).first()).toBeVisible();
  });

  test('employees: create, pay salary, see history, delete permanently', async ({ page }) => {
    const name = `E2E Tech ${uid(page)}`;
    await page.goto('/workshop/employees');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
    await expect(page.getByText('Total Monthly Salary')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto('/workshop/employees/new');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page.getByLabel('Position / Designation').selectOption('Mechanic');
    await page.getByRole('textbox', { name: 'Mobile 1' }).fill(`05${String(Date.now()).slice(-8)}`);
    await page.getByRole('textbox', { name: /^Salary/ }).fill('2500');
    await save(page);
    await expect(page).toHaveURL(/\/workshop\/employees\/[0-9a-f]{24}$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.getByRole('button', { name: 'Pay Salary' }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Pay Salary' });
    await dlg.getByRole('textbox', { name: /Amount/ }).fill('500');
    await dlg.getByRole('button', { name: /^Pay 500.00/ }).click();
    await expect(page.getByText('Salary payment recorded successfully!')).toBeVisible();
    await page.getByRole('tab', { name: 'Salary History' }).click();
    await expect(page.getByRole('table', { name: 'Salary Payment History' }).getByText(/SAL-/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(`/workshop/salaries?q=${encodeURIComponent(name)}`);
    await expect(page.locator('#content').getByText(name).filter({ visible: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // cleanup: permanent delete (desktop from the list row, phones from the record page)
    await page.goto(`/workshop/employees?q=${encodeURIComponent(name)}`);
    if (isMobile(page)) {
      await page.locator('.mlist .mi', { hasText: name }).click();
      await expect(page.getByRole('heading', { name })).toBeVisible();
      await page.getByRole('button', { name: 'Delete Permanently' }).click();
    } else {
      await page.getByRole('button', { name: `Delete Permanently ${name}` }).click();
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Delete Permanently' }).click();
    await expect(page.getByText('Employee deleted permanently')).toBeVisible();
  });

  test('dashboard: KPIs, charts and period modes', async ({ page }) => {
    await page.goto('/workshop/dashboard');
    await expect(page.getByRole('heading', { name: 'Workshop dashboard' })).toBeVisible();
    await expect(page.getByText('Total Profit', { exact: true })).toBeVisible();
    await expect(page.getByText(/Monthly P&L Trend \(Last 12 Months\)/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await page.getByRole('button', { name: 'Single Month' }).click();
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/v1/automobile/dashboard') && r.url().includes(`from_month=${ym}`)),
      page.getByLabel('Month', { exact: true }).fill(ym),
    ]);
    expect(resp.ok()).toBe(true);
    await expect(page.getByText(/Monthly P&L Trend \(\w{3} \d{4}\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Year', exact: true }).click();
    await expect(page.getByLabel('Year', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
