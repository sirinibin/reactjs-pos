// Data typed into the UI reaches the database, and data in the database shows
// up in the UI: the browser, the React build, the Go API and MongoDB together.
const { test, expect, AUTH_STATE } = require('./fixtures');

test.use({ storageState: AUTH_STATE });

const session = (page) => page.evaluate(() => ({
  token: localStorage.getItem('access_token'),
  storeId: localStorage.getItem('store_id'),
}));

async function apiGet(page, path) {
  const { token } = await session(page);
  const res = await page.request.get(path, { headers: { Authorization: token } });
  expect(res.status(), `GET ${path}`).toBe(200);
  return res.json();
}

async function openCreateCustomer(page) {
  await page.goto('/dashboard/customers');
  await page.getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Create New Customer')).toBeVisible();
  return dialog;
}

test.describe('customers', () => {
  test('a customer created in the form is saved and listed', async ({ page }) => {
    const name = `E2E UI Customer ${Date.now()}`;
    const dialog = await openCreateCustomer(page);
    await dialog.getByPlaceholder('Name', { exact: true }).fill(name);
    await dialog.getByPlaceholder('Phone', { exact: true }).fill('0501234567');

    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/customer(\?|$)/.test(r.url()));
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    const res = await saved;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe(true);
    const id = body.result.id;
    expect(id).toMatch(/^[0-9a-f]{24}$/);

    // Stored server-side, for this store, with the normalised name.
    const { storeId } = await session(page);
    const stored = await apiGet(page, `/v1/customer/${id}?search[store_id]=${storeId}`);
    expect(stored.result.name.toUpperCase()).toBe(name.toUpperCase());
    expect(stored.result.store_id).toBe(storeId);

    // And visible in the list once searched for.
    await page.goto('/dashboard/customers');
    await page.getByPlaceholder('Customer Name / Mob / VAT # / ID').fill(name);
    await expect(page.getByText(name, { exact: false }).or(page.getByText(name.toUpperCase())).first()).toBeVisible();
  });

  test('a customer without a name is refused and nothing is saved', async ({ page }) => {
    const dialog = await openCreateCustomer(page);
    let posted = null;
    page.on('response', (r) => {
      if (r.request().method() === 'POST' && /\/v1\/customer(\?|$)/.test(r.url())) posted = r;
    });
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(dialog.getByText(/name is required/i).first()).toBeVisible();
    await expect(dialog).toBeVisible(); // stays open for correction
    if (posted) {
      const body = await posted.json();
      expect(body.status).toBe(false);
    }
  });
});

test.describe('products', () => {
  test('a product added through the API is found by the products screen search', async ({ page }) => {
    await page.goto('/dashboard/products');
    const { token, storeId } = await session(page);
    const word = `Sprocket${Date.now().toString().slice(-6)}`;
    const create = await page.request.post(`/v1/product?search[store_id]=${storeId}`, {
      headers: { Authorization: token },
      data: { store_id: storeId, name: `E2E ${word}`, part_number: `E2E-${word}`, unit: 'PC' },
    });
    expect(create.status()).toBe(200);
    const created = await create.json();
    expect(created.result.id).toMatch(/^[0-9a-f]{24}$/);

    // A second product proves the filter narrows the list rather than showing everything.
    const other = await page.request.post(`/v1/product?search[store_id]=${storeId}`, {
      headers: { Authorization: token },
      data: { store_id: storeId, name: `E2E Other ${word}`, part_number: `OTHER-${word}`, unit: 'PC' },
    });
    expect(other.status()).toBe(200);

    await page.reload();
    await expect(page.getByText(`OTHER-${word}`)).toBeVisible();
    // The part-number filter is a type-ahead: type, then pick the suggestion.
    await page.getByPlaceholder('Search By Part #').fill(`E2E-${word}`);
    await page.getByRole('option', { name: new RegExp(`E2E-${word}`) }).first().click();
    await expect(page.getByRole('cell', { name: `E2E-${word}`, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: `OTHER-${word}`, exact: true })).toHaveCount(0);
  });
});
