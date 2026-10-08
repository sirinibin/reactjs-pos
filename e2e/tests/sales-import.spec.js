// E2E: Quotation form > Import > From Sales, in a real browser against the
// production build with a mocked API.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SALE = {
  id: "so-src-1",
  code: "SI-SRC-001",
  date: "2026-09-28T10:00:00Z",
  customer_name: "ACME Trading",
  net_total: 80,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 5, unit: "pcs", unit_price: 9, unit_price_with_vat: 10.35, unit_discount: 0.5, unit_discount_with_vat: 0.58 },
    { product_id: "p-plug", part_number: "SP-4", name: "Spark Plug", quantity: 8, unit: "pcs", unit_price: 3, unit_price_with_vat: 3.45 },
    { name: "Labour (no product)", quantity: 1, unit_price: 50 },
  ],
};

async function setup(page, context, { sales = [SALE] } = {}) {
  const api = { calcBodies: [], salesUrls: [], priceUrls: [] };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = decodeURIComponent(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/v1/quotation/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      api.calcBodies.push(body);
      return json({ status: true, result: body });
    }
    if (/\/v1\/order\?/.test(url)) {
      api.salesUrls.push(url);
      return json({ status: true, result: sales, total_count: sales.length });
    }
    if (/\/v1\/product\?/.test(url) && url.includes("retail_unit_price")) {
      api.priceUrls.push(url);
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

async function openSalesPicker(page) {
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expect(page.getByText("Import from Sales")).toBeVisible();
  await page.getByText("SI-SRC-001").click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

test("Import dropdown offers From Sales with the other sources", async ({ page, context }) => {
  await setup(page, context);
  await page.getByTestId("import-dropdown-btn").click();
  await expect(page.getByTestId("import-from-sales-btn")).toBeVisible();
  await expect(page.getByTestId("import-from-quotation-btn")).toBeVisible();
  await expect(page.getByTestId("import-from-purchase-btn")).toBeVisible();
});

test("sales search requests newest sales for this store", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expect(page.getByText("SI-SRC-001")).toBeVisible();
  expect(api.salesUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
  expect(api.salesUrls[0]).toContain("sort=-created_at");
});

test("product list shows the sale lines with product ids only", async ({ page, context }) => {
  const api = await setup(page, context);
  await openSalesPicker(page);
  const dialog = page.locator(".modal-content", { hasText: "Select Products to Import" });
  await expect(dialog.getByText("ACME Trading", { exact: false })).toBeVisible();
  await expect(dialog.getByText("Spark Plug")).toBeVisible();
  await expect(dialog.getByText("Labour (no product)")).toHaveCount(0);
  await expect(dialog.getByText("Purchase Price")).toHaveCount(0);
  await expect(dialog.locator("tr", { hasText: "Oil Filter" })).toContainText("10.35");
  await expect(dialog.getByText("Choose another sale", { exact: false })).toBeVisible();
  const box = await page.getByTestId("qip-select-all").boundingBox();
  expect(box.width).toBeLessThanOrEqual(20);
  expect(api.priceUrls).toHaveLength(0);
  await page.screenshot({ path: "test-results/sales-picker.png" });
});

test("imports chosen sale lines with their prices, discounts and edited quantities", async ({ page, context }) => {
  const api = await setup(page, context);
  await openSalesPicker(page);
  await page.getByTestId("qip-row-1").uncheck();
  const dialog = page.locator(".modal-content", { hasText: "Select Products to Import" });
  await dialog.locator("tr", { hasText: "Oil Filter" }).locator('input[type="number"]').fill("2");
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id)).toEqual(["p-oil"]);
  const oil = lastCalcProducts(api)[0];
  expect(oil.quantity).toBe(2);
  expect(oil.unit_price).toBe(9);
  expect(oil.unit_discount).toBe(0.5);
});

test("back button returns to the sales search", async ({ page, context }) => {
  await setup(page, context);
  await openSalesPicker(page);
  await page.getByText("Choose another sale", { exact: false }).click();
  await expect(page.getByText("Import from Sales")).toBeVisible();
  await expect(page.getByText("SI-SRC-001")).toBeVisible();
});

test("empty sales search shows a message", async ({ page, context }) => {
  await setup(page, context, { sales: [] });
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expect(page.getByText("No documents found.")).toBeVisible();
});
