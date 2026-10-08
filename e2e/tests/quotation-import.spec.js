// E2E: Quotation form > Import > From Quotations, in a real browser against the
// production build. The REST API is mocked per test with page.route(), so the
// test needs no backend or database.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SOURCE = {
  id: "q-src-1",
  code: "QT-SRC-001",
  date: "2026-09-30T10:00:00Z",
  customer_name: "ACME Trading",
  net_total: 57.5,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15, unit_discount_percent: 10 },
    { product_id: "p-air", part_number: "AF-2", name: "Air Filter", quantity: 1, unit: "pcs", unit_price: 20, unit_price_with_vat: 23 },
    { product_id: "p-fuel", part_number: "FF-3", name: "Fuel Filter", quantity: 4, unit: "pcs", unit_price: 5, unit_price_with_vat: 5.75 },
  ],
};

async function setup(page, context, { quotations = [SOURCE] } = {}) {
  const api = { calcBodies: [], pickerUrls: [] };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/v1/quotation/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      api.calcBodies.push(body);
      return json({ status: true, result: body });
    }
    if (/\/v1\/quotation\?/.test(url) && decodeURIComponent(url).includes("products")) {
      api.pickerUrls.push(decodeURIComponent(url));
      return json({ status: true, result: quotations, total_count: quotations.length });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", vat_percent: 15, country_code: "SA", settings: { enable_products: true, quotation_create_form_design: "type1" } } });
    }
    return json({ status: true, result: [], total_count: 0 });
  });
  await page.addInitScript((storeId) => {
    localStorage.setItem("access_token", "e2e-token");
    localStorage.setItem("store_id", storeId);
    localStorage.setItem("user_id", "64abc123456789001234ffff");
    localStorage.setItem("user_role", "Admin");
    localStorage.setItem("quotation_form_type", "type1");
  }, STORE_ID);
  await page.goto("/dashboard/quotations");
  await page.getByRole("button", { name: "Create" }).click();
  return api;
}

async function openProductPicker(page) {
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-quotation-btn").click();
  await page.getByText("QT-SRC-001").click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

test("Import dropdown offers From Quotations", async ({ page, context }) => {
  await setup(page, context);
  const toggle = page.getByTestId("import-dropdown-btn");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText(/Import/);
  await toggle.click();
  await expect(page.getByTestId("import-from-quotation-btn")).toBeVisible();
});

test("quotation search lists newest first for this store", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-quotation-btn").click();
  await expect(page.getByText("QT-SRC-001")).toBeVisible();
  expect(api.pickerUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
  expect(api.pickerUrls[0]).toContain("sort=-created_at");
});

test("select-all and row checkboxes are checkbox-sized", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  for (const id of ["qip-select-all", "qip-row-0"]) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box.width, `${id} width`).toBeLessThanOrEqual(20);
    expect(box.height, `${id} height`).toBeLessThanOrEqual(20);
  }
  await page.screenshot({ path: "test-results/product-picker.png" });
});

test("imports only ticked products with edited quantities", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-row-1").uncheck();
  const dialog = page.locator(".modal-content", { hasText: "Select Products to Import" });
  await dialog.getByRole("spinbutton").first().fill("5");
  await expect(page.getByTestId("qip-import")).toHaveText(/Import 2 Products/);
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();

  await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id).sort()).toEqual(["p-fuel", "p-oil"]);
  const products = lastCalcProducts(api);
  const oil = products.find((p) => p.product_id === "p-oil");
  expect(oil.quantity).toBe(5);
  expect(oil.unit_price).toBe(10);
  expect(products.find((p) => p.product_id === "p-fuel").quantity).toBe(4);
  await page.screenshot({ path: "test-results/after-import.png" });
});

test("select-all unticks everything and disables import", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-select-all").uncheck();
  await expect(page.getByTestId("qip-import")).toBeDisabled();
  await page.getByTestId("qip-select-all").check();
  await expect(page.getByTestId("qip-import")).toHaveText(/Import 3 Products/);
});

test("filter narrows the product list", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-filter").fill("fuel");
  const dialog = page.locator(".modal-content", { hasText: "Select Products to Import" });
  await expect(dialog.getByText("Fuel Filter")).toBeVisible();
  await expect(dialog.getByText("Oil Filter")).toHaveCount(0);
  await page.getByTestId("qip-filter").fill("zzz");
  await expect(dialog.getByText("No products found.")).toBeVisible();
});

test("back button returns to the quotation search", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  await page.getByText("Choose another quotation").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect(page.getByText("QT-SRC-001")).toBeVisible();
});

test("empty search result shows a message", async ({ page, context }) => {
  await setup(page, context, { quotations: [] });
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-quotation-btn").click();
  await expect(page.getByText("No documents found.")).toBeVisible();
});
