// Products and inventory, full stack: products, brands, categories,
// warehouses, stock transfers and delivery notes typed into the real UI the
// way a person does, then checked against the real API / MongoDB.
// Every test arranges its own uniquely named data, so it never depends on (or
// disturbs) what other specs create on the shared server.
const { test, expect, AUTH_STATE } = require('./fixtures');
const {
  invApi, uniq, r2, typeInto, topDialog, openCreate, pickSuggestion, submitAndCapture,
  recordResponses, answerConfirm,
} = require('./helpers/inventory-finance');

test.use({ storageState: AUTH_STATE });

const PRODUCT_POST = /\/v1\/product\?/;
const VAT = 1.15;

/** Finds a product on the Products screen through the part-number type-ahead and returns its row. */
async function productRow(page, partNumber) {
  await page.goto('/dashboard/products');
  await pickSuggestion(page, page.getByPlaceholder('Search By Part #'), partNumber, partNumber);
  const row = page.locator('tr').filter({ has: page.getByRole('cell', { name: partNumber, exact: true }) }).first();
  await expect(row).toBeVisible();
  return row;
}

/** Opens a product's Update form from its row in the list. */
async function openProductUpdate(page, product) {
  const row = await productRow(page, product.part_number);
  await row.locator('button:has(i.bi-pencil)').first().click();
  const dialog = topDialog(page);
  await expect(dialog.getByText(`Update Product#${product.part_number}`, { exact: false })).toBeVisible();
  return dialog;
}

test.describe('products', () => {
  test('a product typed into the Product form is stored with its store prices and shown on its view @devices', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('PR');
    const name = `Oil Filter ${w}`;
    const part = `OF-${w}`;
    const posts = recordResponses(page, 'POST', PRODUCT_POST);

    const dialog = await openCreate(page, 'products', 'Create New Product');

    // Saving an empty form is refused with a visible message and stores nothing.
    const empty = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', PRODUCT_POST);
    expect(empty.status).toBe(400);
    expect(empty.body.errors?.name).toBe('Name is required');
    await expect(dialog.getByText('Name is required').first()).toBeVisible();

    // A two letter name is too short.
    await typeInto(page, dialog.locator('#product_name'), 'AB');
    const short = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', PRODUCT_POST);
    expect(short.status).toBe(400);
    await expect(dialog.getByText(/Name length should be min\. 3 chars/).first()).toBeVisible();

    // Now the real product.
    await typeInto(page, dialog.locator('#product_name'), name);
    await typeInto(page, dialog.locator('#product_name_arabic'), 'فلتر زيت');
    await typeInto(page, dialog.locator('#product_part_no'), part);
    await dialog.locator('select').filter({ hasText: 'Piece (PCE)' }).first().selectOption({ label: 'Set (SET)' });

    // VAT-inclusive prices are worked out as the person types (15% VAT).
    await typeInto(page, dialog.locator('#product_purchase_unit_price_0'), '40');
    await expect(dialog.locator('#product_purchase_unit_price_with_vat_0')).toHaveValue('46');
    await typeInto(page, dialog.locator('#product_retail_unit_price'), '75.5');
    await expect(dialog.locator('#product_retail_unit_price_with_vat')).toHaveValue('86.825');

    const saved = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', PRODUCT_POST);
    expect(saved.status, JSON.stringify(saved.body.errors)).toBe(200);
    const id = saved.body.result.id;

    // Stored with this store's prices.
    const stored = await api.getProduct(id);
    expect(stored.name).toBe(name);
    expect(stored.name_in_arabic).toBe('فلتر زيت');
    expect(stored.part_number).toBe(part);
    expect(stored.unit).toBe('set');
    expect(stored.deleted).toBe(false);
    const ps = stored.product_stores[api.storeId];
    expect(ps.purchase_unit_price).toBe(40);
    expect(ps.purchase_unit_price_with_vat).toBe(46);
    expect(ps.retail_unit_price).toBe(75.5);
    expect(r2(ps.retail_unit_price_with_vat)).toBe(86.83);
    expect(Number(ps.stock || 0)).toBe(0);
    // The refused attempts stored nothing: only one product has this part number.
    expect((await api.list('/v1/product', { part_number: part })).filter((p) => p.part_number === part)).toHaveLength(1);
    expect(posts.filter((r) => r.status() === 200)).toHaveLength(1);

    // The form closes and the product's view shows what was typed.
    const view = topDialog(page);
    await expect(view.getByText(`Part No: ${part}`)).toBeVisible();
    await expect(view.getByText(name).first()).toBeVisible();
    await expect(view.getByText('75.5').first()).toBeVisible();
    await expect(view.getByText('40', { exact: true }).first()).toBeVisible();
  });

  test('a second product with an existing part number is refused with a message', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('DP');
    const existing = await api.createProduct({ name: `Brake Disc ${w}`, partNumber: `BD-${w}` });

    const dialog = await openCreate(page, 'products', 'Create New Product');
    await typeInto(page, dialog.locator('#product_name'), `Another Disc ${w}`);
    await typeInto(page, dialog.locator('#product_part_no'), existing.part_number);
    const res = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', PRODUCT_POST);

    expect(res.status).toBe(400);
    expect(res.body.errors?.part_number).toBe('Part Number Already Exists');
    await expect(dialog.getByText('Part Number Already Exists').first()).toBeVisible();
    await expect(dialog).toBeVisible(); // kept open for correction

    const same = (await api.list('/v1/product', { part_number: existing.part_number })).filter((p) => p.part_number === existing.part_number);
    expect(same.map((p) => p.id)).toEqual([existing.id]);
  });

  test('a new selling price typed into the Update form persists and shows on the view', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('ED');
    const product = await api.createProduct({ name: `Radiator Hose ${w}`, partNumber: `RH-${w}`, price: 100, purchasePrice: 60 });

    const dialog = await openProductUpdate(page, product);
    await expect(dialog.locator('#product_retail_unit_price')).toHaveValue('100');
    await typeInto(page, dialog.locator('#product_retail_unit_price'), '125');
    // The person waits for the VAT-inclusive price to follow before moving on.
    await expect(dialog.locator('#product_retail_unit_price_with_vat')).toHaveValue('143.75');
    await page.keyboard.press('Tab');

    const res = await submitAndCapture(page, dialog.getByRole('button', { name: 'Update', exact: true }).first(), 'PUT', /\/v1\/product\/[0-9a-f]{24}\?/);
    expect(res.status, JSON.stringify(res.body.errors)).toBe(200);

    const ps = (await api.getProduct(product.id)).product_stores[api.storeId];
    expect(ps.retail_unit_price).toBe(125);
    expect(ps.retail_unit_price_with_vat).toBe(143.75);
    expect(ps.purchase_unit_price).toBe(60); // untouched

    const view = topDialog(page);
    await expect(view.getByText(`Part No: ${product.part_number}`)).toBeVisible();
    await expect(view.getByText('125', { exact: true }).first()).toBeVisible();
  });

  test('typing a new selling price and pressing Tab at once keeps the VAT-inclusive price in step', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('TB');
    const product = await api.createProduct({ name: `Fan Belt ${w}`, partNumber: `FB-${w}`, price: 100, purchasePrice: 60 });

    const dialog = await openProductUpdate(page, product);
    await typeInto(page, dialog.locator('#product_retail_unit_price'), '125');
    await page.keyboard.press('Tab'); // a fast typist tabs straight on
    const res = await submitAndCapture(page, dialog.getByRole('button', { name: 'Update', exact: true }).first(), 'PUT', /\/v1\/product\/[0-9a-f]{24}\?/);
    expect(res.status).toBe(200);

    const ps = (await api.getProduct(product.id)).product_stores[api.storeId];
    expect(ps.retail_unit_price).toBe(125);
    // Saved with the old VAT-inclusive price (115) instead of 143.75.
    expect(ps.retail_unit_price_with_vat).toBe(143.75);
  });

  test('deleting a product asks first: Cancel keeps it, OK marks it deleted', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('DL');
    const product = await api.createProduct({ name: `Wiper Blade ${w}`, partNumber: `WB-${w}` });

    let row = await productRow(page, product.part_number);
    await row.locator('button:has(i.bi-trash)').first().click();
    await answerConfirm(page, 'Are you sure, you want to delete this product?', 'Cancel');
    expect((await api.getProduct(product.id)).deleted).toBe(false);

    row = await productRow(page, product.part_number);
    await row.locator('button:has(i.bi-trash)').first().click();
    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes(`/v1/product/${product.id}`));
    await answerConfirm(page, 'Are you sure, you want to delete this product?', 'OK');
    expect((await deleted).status()).toBe(200);
    const stored = await api.getProduct(product.id);
    expect(stored.deleted).toBe(true);
    expect(stored.deleted_by).toBe(api.userId);
  });
});

test.describe('brands and categories', () => {
  test('a brand and a category created on their screens can be chosen on a new product', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('BC');
    const brandName = `Bosch ${w}`;
    const brandCode = `B${w.slice(-7)}`;
    const categoryName = `Filters ${w}`;

    // Brand
    let dialog = await openCreate(page, 'product_brand', 'Create New Brand');
    await typeInto(page, dialog.locator('#product_brand_name'), brandName);
    await typeInto(page, dialog.locator('#product_brand_code'), brandCode);
    const brand = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/product-brand\?/);
    expect(brand.status, JSON.stringify(brand.body.errors)).toBe(200);
    const brandId = brand.body.result.id;
    await expect(topDialog(page).getByText(brandCode).first()).toBeVisible();

    // A second brand with the same code is refused.
    dialog = await openCreate(page, 'product_brand', 'Create New Brand');
    await typeInto(page, dialog.locator('#product_brand_name'), `Copycat ${w}`);
    await typeInto(page, dialog.locator('#product_brand_code'), brandCode);
    const dup = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/product-brand\?/);
    expect(dup.status).toBe(409);
    await expect(dialog.getByText('Code is already in use').first()).toBeVisible();

    // Category
    dialog = await openCreate(page, 'product_category', 'Create New Category');
    await typeInto(page, dialog.locator('#product_category_name'), categoryName);
    const category = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/product-category\?/);
    expect(category.status, JSON.stringify(category.body.errors)).toBe(200);
    const categoryId = category.body.result.id;

    // Both offered on the Product form; the brand code becomes the part number prefix.
    dialog = await openCreate(page, 'products', 'Create New Product');
    await typeInto(page, dialog.locator('#product_name'), `Spark Plug ${w}`);
    await pickSuggestion(page, dialog.getByPlaceholder('-- Select Brand --'), brandName, brandName);
    await pickSuggestion(page, dialog.getByPlaceholder('-- Select Category --'), categoryName, categoryName);
    await expect(dialog.locator('#product_prefix_part_no')).toHaveValue(brandCode.toUpperCase());
    await typeInto(page, dialog.locator('#product_part_no'), `SP-${w}`);
    const product = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', PRODUCT_POST);
    expect(product.status, JSON.stringify(product.body.errors)).toBe(200);

    const stored = await api.getProduct(product.body.result.id);
    expect(stored.brand_id).toBe(brandId);
    expect(stored.brand_name).toBe(brandName);
    expect(stored.prefix_part_number).toBe(brandCode.toUpperCase());
    expect(stored.category_id).toEqual([categoryId]);
    expect(stored.category_name).toEqual([categoryName]);

    // And the brand / category records hold what was typed.
    expect((await api.get(`/v1/product-brand/${brandId}`)).result).toMatchObject({ name: brandName, code: brandCode });
    expect((await api.get(`/v1/product-category/${categoryId}`)).result.name).toBe(categoryName);
  });
});

test.describe('warehouses and stock transfers', () => {
  test('a warehouse created on its screen receives the stock a transfer moves out of the main store', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('WH');
    const product = await api.createProduct({ name: `Bearing ${w}`, partNumber: `BR-${w}` });
    await api.stockUp([product], 10);
    expect(await api.warehouseStocks(product.id)).toMatchObject({ total: 10, main_store: 10 });

    // Warehouse: a name is required (checked in the browser, nothing is sent).
    const warehousePosts = recordResponses(page, 'POST', /\/v1\/warehouse(\?|$)/);
    let dialog = await openCreate(page, 'warehouses', 'Create New Warehouse');
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    await expect(dialog.getByText('Name is required').first()).toBeVisible();
    expect(warehousePosts).toHaveLength(0);
    await typeInto(page, dialog.getByPlaceholder('Warehouse name'), `E2E Warehouse ${w}`);
    const wh = await submitAndCapture(page, dialog.getByRole('button', { name: 'Create', exact: true }).first(), 'POST', /\/v1\/warehouse(\?|$)/);
    expect(wh.status, JSON.stringify(wh.body.errors)).toBe(200);
    const warehouse = (await api.get(`/v1/warehouse/${wh.body.result.id}`)).result;
    expect(warehouse.name).toBe(`E2E Warehouse ${w}`);
    expect(warehouse.code).toMatch(/^WH\d+$/);

    // Stock transfer: Main Store -> Main Store is refused.
    dialog = await openCreate(page, 'stock-transfers', 'Create New Stock Transfer');
    await pickSuggestion(page, dialog.getByPlaceholder('Part No. | Name | Name in Arabic | Brand | Country').first(), product.part_number, product.part_number);
    await expect(dialog.locator('#stocktransfer_product_quantity_0')).toHaveValue('1');
    const createButton = dialog.getByRole('button', { name: 'Create', exact: true }).last();
    const same = await submitAndCapture(page, createButton, 'POST', /\/v1\/stock-transfer\?/);
    expect(same.status).toBe(400);
    await expect(dialog.getByText('Both From & To warehouse cannot be Main Store').first()).toBeVisible();

    // Main Store -> the new warehouse, 4 units.
    await dialog.locator('#to_warehouse_id').selectOption({ label: `E2E Warehouse ${w} (${warehouse.code})` });
    await typeInto(page, dialog.locator('#stocktransfer_product_quantity_0'), '4', 60);
    await expect(dialog.locator('#stocktransfer_product_quantity_0')).toHaveValue('4');
    const moved = await submitAndCapture(page, createButton, 'POST', /\/v1\/stock-transfer\?/);
    expect(moved.status, JSON.stringify(moved.body.errors)).toBe(200);

    const transfer = (await api.get(`/v1/stock-transfer/${moved.body.result.id}`)).result;
    expect(transfer.to_warehouse_id).toBe(warehouse.id);
    expect(transfer.products).toHaveLength(1);
    expect(transfer.products[0]).toMatchObject({ product_id: product.id, quantity: 4 });

    // Both sides moved; the store total is unchanged.
    await expect.poll(() => api.warehouseStocks(product.id)).toMatchObject({ total: 10, main_store: 6, [warehouse.code]: 4 });
  });
});

test.describe('delivery notes', () => {
  test('a delivery note for a customer is stored with its lines and leaves stock alone', async ({ page, request }) => {
    const api = invApi(request);
    const w = uniq('DN');
    const product = await api.createProduct({ name: `Wiper ${w}`, partNumber: `WP-${w}` });
    await api.stockUp([product], 5);
    const customer = await api.createCustomer({ name: `E2E Customer ${w}` });
    const DN_POST = /\/v1\/delivery-note\?/;

    const dialog = await openCreate(page, 'delivery-notes', 'Create New Delivery Note');
    const createButton = dialog.getByRole('button', { name: 'Create', exact: true }).first();

    // No products: refused.
    const empty = await submitAndCapture(page, createButton, 'POST', DN_POST);
    expect(empty.status).toBe(400);
    await expect(dialog.getByText('Atleast 1 product is required for deliverynote').first()).toBeVisible();

    await pickSuggestion(page, dialog.getByPlaceholder('Customer Name / Mob / VAT # / ID').first(), customer.name, w);
    await pickSuggestion(page, dialog.getByPlaceholder('Part No. | Name | Brand').first(), product.part_number, product.part_number);
    const qty = dialog.locator('#delivery_note_quantity_0');
    await expect(qty).toHaveValue('1');
    await typeInto(page, qty, '3', 60);
    await expect(qty).toHaveValue('3');

    const saved = await submitAndCapture(page, createButton, 'POST', DN_POST);
    expect(saved.status, JSON.stringify(saved.body.errors)).toBe(200);
    const note = (await api.get(`/v1/delivery-note/${saved.body.result.id}`)).result;
    expect(note.customer_id).toBe(customer.id);
    expect(note.products).toHaveLength(1);
    expect(note.products[0]).toMatchObject({ product_id: product.id, part_number: product.part_number, quantity: 3 });

    // The view opens on the new note.
    await expect(topDialog(page).getByText(`Details of Delivery Note #${note.code}`)).toBeVisible();
    await expect(topDialog(page).getByText(customer.name.toUpperCase()).first()).toBeVisible();

    // A delivery note is not a sale: stock stays at 5.
    expect(await api.stockOf(product.id)).toBe(5);
    // And the note is listed for this customer.
    const notes = await api.list('/v1/delivery-note', { customer_id: customer.id });
    expect(notes.map((n) => n.id)).toContain(note.id);
  });
});

