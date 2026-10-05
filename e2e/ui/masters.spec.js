const { test, expect } = require('@playwright/test');
const { uid } = require('../helpers');

/** Data rows only (the filter row also contains the typed text). */
const dataRow = (page, text) => page.locator('table.erp-grid tbody tr', { hasText: text });

async function openCreate(page) {
    await page.getByRole('button', { name: 'Create' }).first().click();
    return page.getByRole('dialog');
}

test.describe('Product Brands', () => {
    test('full lifecycle against the real API', async ({ page }) => {
        const name = uid('E2E Brand');
        const code = uid('E2E').slice(0, 14);
        await page.goto('/dashboard/product_brand');
        await expect(page.getByRole('heading', { name: 'Product Brands', level: 1 })).toBeVisible();

        // required-field validation
        let dialog = await openCreate(page);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(dialog.getByText('Name is required')).toBeVisible();
        await expect(dialog.getByText('Code is required')).toBeVisible();

        // create
        await dialog.getByLabel(/^Name/).fill(name);
        await dialog.getByLabel(/^Code/).fill(code);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('Created successfully!')).toBeVisible();
        const drawer = page.getByRole('dialog', { name });
        await expect(drawer.getByText(code)).toBeVisible();
        await drawer.getByRole('button', { name: 'Close' }).first().click();

        // duplicate code is rejected by the server and shown on the field
        dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(name + ' dup');
        await dialog.getByLabel(/^Code/).fill(code);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(dialog.locator('.erp-field__error, .erp-alert')).toBeVisible();
        await dialog.getByRole('button', { name: 'Cancel' }).click();

        // filter by name
        await page.getByRole('textbox', { name: 'Name' }).fill(name);
        const row = dataRow(page, name);
        await expect(row).toHaveCount(1);

        // edit
        await row.getByRole('button', { name: 'Row actions' }).click();
        await page.getByRole('menuitem', { name: 'Edit' }).click();
        dialog = page.getByRole('dialog', { name: /Edit Product Brand/ });
        await expect(dialog.getByLabel(/^Name/)).toHaveValue(name);
        await dialog.getByLabel(/^Name/).fill(name + ' v2');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(page.getByText('Updated successfully!')).toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByRole('textbox', { name: 'Name' }).fill(name + ' v2');
        const row2 = dataRow(page, name + ' v2');
        await expect(row2).toHaveCount(1);

        // delete → appears under Deleted = YES → restore
        await row2.getByRole('button', { name: 'Row actions' }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
        await page.getByRole('dialog', { name: /Delete/ }).getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByText('Deleted successfully!')).toBeVisible();
        await expect(row2).toHaveCount(0);

        await page.getByRole('combobox', { name: 'Deleted' }).selectOption('1');
        const deletedRow = dataRow(page, name + ' v2');
        await expect(deletedRow).toContainText('YES');
        await deletedRow.getByRole('button', { name: 'Row actions' }).click();
        await page.getByRole('menuitem', { name: 'Restore' }).click();
        await page.getByRole('dialog', { name: /Restore/ }).getByRole('button', { name: 'Restore' }).click();
        await expect(page.getByText('Restored successfully!')).toBeVisible();
        await expect(deletedRow).toHaveCount(0);
    });

    test('sorting and paging send the right requests', async ({ page }) => {
        await page.goto('/dashboard/product_brand');
        const reqPromise = page.waitForRequest(r => r.url().includes('/v1/product-brand?') && r.url().includes('sort=name'));
        await page.getByRole('columnheader', { name: /^Name/ }).click();
        await reqPromise;
        const sizePromise = page.waitForRequest(r => r.url().includes('/v1/product-brand?') && r.url().includes('limit=50'));
        await page.getByLabel('Rows per page').selectOption('50');
        await sizePromise;
        await page.reload();
        await expect(page.getByLabel('Rows per page')).toHaveValue('50');
    });

    test('column chooser hides a column and restores defaults', async ({ page }) => {
        await page.goto('/dashboard/product_brand');
        await page.getByRole('button', { name: 'Columns' }).click();
        await page.getByRole('dialog', { name: 'Columns' }).getByRole('checkbox', { name: 'Created At' }).uncheck();
        await page.getByRole('button', { name: 'Apply' }).click();
        await expect(page.getByRole('columnheader', { name: /Created At/ })).toHaveCount(0);
        await page.reload();
        await expect(page.getByRole('columnheader', { name: /Created At/ })).toHaveCount(0);
        await page.getByRole('button', { name: 'Columns' }).click();
        await page.getByRole('button', { name: 'Restore defaults' }).click();
        await expect(page.getByRole('columnheader', { name: /Created At/ })).toHaveCount(1);
    });
});

test.describe('Product Categories', () => {
    test('create a child category with a parent picked from search', async ({ page }) => {
        const parent = uid('E2E Parent');
        const child = uid('E2E Child');
        await page.goto('/dashboard/product_category');
        let dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(parent);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('Created successfully!')).toBeVisible();
        await page.keyboard.press('Escape');

        dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(child);
        await dialog.getByRole('combobox', { name: /Parent Category/ }).fill(parent);
        await page.getByRole('option', { name: parent }).click();
        await dialog.getByRole('button', { name: 'Create' }).click();
        const drawer = page.getByRole('dialog', { name: child });
        await expect(drawer.getByText(parent)).toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByRole('textbox', { name: 'Parent' }).fill(parent);
        await expect(dataRow(page, child)).toHaveCount(1);
    });

    test('Created By filter uses the user picker', async ({ page }) => {
        await page.goto('/dashboard/product_category');
        const picker = page.getByRole('combobox', { name: 'Created By' });
        await picker.click();
        const first = page.getByRole('option').first();
        await expect(first).toBeVisible();
        const reqPromise = page.waitForRequest(r => r.url().includes('/v1/product-category?') && decodeURIComponent(r.url()).includes('search[created_by]='));
        await first.click();
        await reqPromise;
    });

    test('date filter sends MMM dd yyyy', async ({ page }) => {
        await page.goto('/dashboard/product_category');
        const reqPromise = page.waitForRequest(r => decodeURIComponent(r.url()).includes('search[created_at]=Jan 15 2026'));
        await page.getByLabel('Created At', { exact: true }).fill('2026-01-15');
        await reqPromise;
        await expect(page.getByText('No matching records')).toBeVisible();
    });
});

test.describe('Expense Categories', () => {
    test('create and edit; no delete action (same as the classic screen)', async ({ page }) => {
        const name = uid('E2E Exp');
        await page.goto('/dashboard/expense_category');
        const dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(name);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('Created successfully!')).toBeVisible();
        await page.keyboard.press('Escape');
        await page.getByRole('textbox', { name: 'Name' }).fill(name);
        const row = dataRow(page, name);
        await row.getByRole('button', { name: 'Row actions' }).click();
        await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
    });
});

test.describe('Service Categories', () => {
    test('create with a parent, edit shows the parent name, clear it, delete and restore', async ({ page }) => {
        const parent = uid('E2E SvcParent');
        const child = uid('E2E SvcChild');
        await page.goto('/dashboard/service_category');
        let dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(parent);
        await dialog.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByText('Created successfully!')).toBeVisible();
        await page.keyboard.press('Escape');

        dialog = await openCreate(page);
        await dialog.getByLabel(/^Name/).fill(child);
        await dialog.getByRole('combobox', { name: /Parent Category/ }).fill(parent);
        await page.getByRole('option', { name: parent }).click();
        await dialog.getByRole('button', { name: 'Create' }).click();
        const drawer = page.getByRole('dialog', { name: child });
        await expect(drawer.getByText(parent)).toBeVisible();

        await drawer.getByRole('button', { name: 'Edit' }).click();
        dialog = page.getByRole('dialog', { name: new RegExp('Edit Service Category') });
        await expect(dialog.getByRole('button', { name: 'Remove ' + parent })).toBeVisible();
        await dialog.getByRole('button', { name: 'Remove ' + parent }).click();
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(page.getByText('Updated successfully!')).toBeVisible();
        await page.keyboard.press('Escape');

        await page.getByRole('textbox', { name: 'Name' }).fill(child);
        const row = dataRow(page, child);
        await expect(row).toHaveCount(1);
        await expect(row).not.toContainText(parent);
        await row.getByRole('button', { name: 'Row actions' }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
        await page.getByRole('dialog', { name: /Delete Service Category/ }).getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByText('Deleted successfully!')).toBeVisible();
        await expect(dataRow(page, child)).toHaveCount(0);
        await page.getByLabel('Deleted').selectOption('1');
        await expect(dataRow(page, child)).toHaveCount(1);
        await dataRow(page, child).getByRole('button', { name: 'Row actions' }).click();
        await page.getByRole('menuitem', { name: 'Restore' }).click();
        await page.getByRole('dialog', { name: /Restore/ }).getByRole('button', { name: 'Restore' }).click();
        await expect(page.getByText('Restored successfully!')).toBeVisible();
    });
});
