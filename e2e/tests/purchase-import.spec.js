// E2E: Quotation form > Import > From Purchases, in a real browser against the
// production build with a mocked API.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const PURCHASE = {
  id: "pu-src-1",
  code: "PI-SRC-001",
  date: "2026-09-29T10:00:00Z",
  vendor_name: "Filter Supplies Co",
  net_total: 40,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 6, unit: "pcs", purchase_unit_price: 4, purchase_unit_price_with_vat: 4.6 },
    { product_id: "p-belt", part_number: "BT-9", name: "Fan Belt", quantity: 2, unit: "pcs", purchase_unit_price: 7, purchase_unit_price_with_vat: 8.05 },
  ],
};
const RETAIL = { "p-oil": [10, 11.5], "p-belt": [15, 17.25] };

async function setup(page, context, { failPrices = false, purchases = [PURCHASE] } = {}) {
  const api = { calcBodies: [], priceUrls: [], purchaseUrls: [] };
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
    if (/\/v1\/purchase\?/.test(url)) {
      api.purchaseUrls.push(url);
      return json({ status: true, result: purchases, total_count: purchases.length });
    }
    if (/\/v1\/product\?/.test(url) && url.includes("search[ids]=") && url.includes("retail_unit_price")) {
      api.priceUrls.push(url);
      if (failPrices) return json({ status: false, errors: { find: "boom" } }, 500);
      const ids = url.match(/search\[ids\]=([^&]*)/)[1].split(",");
      return json({ status: true, result: ids.filter((id) => RETAIL[id]).map((id) => ({ id, product_stores: { [STORE_ID]: { retail_unit_price: RETAIL[id][0], retail_unit_price_with_vat: RETAIL[id][1] } } })) });
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

async function openPurchasePicker(page) {
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expect(page.getByText("Import from Purchase")).toBeVisible();
  await page.getByText("PI-SRC-001").click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
  await expect(page.getByTestId("qip-loading")).toHaveCount(0);
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

test("Import dropdown offers From Purchases next to From Quotations", async ({ page, context }) => {
  await setup(page, context);
  await page.getByTestId("import-dropdown-btn").click();
  await expect(page.getByTestId("import-from-quotation-btn")).toBeVisible();
  await expect(page.getByTestId("import-from-purchase-btn")).toBeVisible();
});

test("purchase search requests newest purchases for this store", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expect(page.getByText("PI-SRC-001")).toBeVisible();
  expect(api.purchaseUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
  expect(api.purchaseUrls[0]).toContain("sort=-created_at");
});

test("product list shows cost and current selling prices", async ({ page, context }) => {
  const api = await setup(page, context);
  await openPurchasePicker(page);
  expect(api.priceUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
  const dialog = page.locator(".modal-content", { hasText: "Select Products to Import" });
  await expect(dialog.getByText("Purchase Price")).toBeVisible();
  await expect(dialog.getByText("Filter Supplies Co", { exact: false })).toBeVisible();
  const oilRow = dialog.locator("tr", { hasText: "Oil Filter" });
  await expect(oilRow).toContainText("4.00");
  await expect(oilRow).toContainText("11.50");
  await expect(dialog.getByText("Choose another purchase", { exact: false })).toBeVisible();
  const box = await page.getByTestId("qip-select-all").boundingBox();
  expect(box.width).toBeLessThanOrEqual(20);
  await page.screenshot({ path: "test-results/purchase-picker.png" });
});

test("imports chosen purchase lines at the selling price", async ({ page, context }) => {
  const api = await setup(page, context);
  await openPurchasePicker(page);
  await page.getByTestId("qip-row-1").uncheck();
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id)).toEqual(["p-oil"]);
  const oil = lastCalcProducts(api)[0];
  expect(oil.quantity).toBe(6);
  expect(oil.unit_price).toBe(10);
  expect(oil.purchase_unit_price).toBe(4);
  expect(oil.unit_discount).toBe(0);
});

test("still imports at price 0 when selling prices fail to load", async ({ page, context }) => {
  const api = await setup(page, context, { failPrices: true });
  await openPurchasePicker(page);
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).length).toBe(2);
  expect(lastCalcProducts(api).every((p) => p.unit_price === 0)).toBe(true);
});

test("empty purchase search shows a message", async ({ page, context }) => {
  await setup(page, context, { purchases: [] });
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expect(page.getByText("No documents found.")).toBeVisible();
});
