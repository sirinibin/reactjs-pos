// E2E: Sales form type 1 > Import > From Sales, in a real browser against the
// production build. The REST API is mocked per test with page.route(), so the
// test needs no backend or database.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SALE = {
  id: "so-1",
  code: "SI-0001",
  date: "2026-10-02T10:00:00Z",
  customer_id: "c-1",
  customer_name: "Walk-in Co",
  net_total: 80.5,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15, unit_discount_percent: 10, purchase_unit_price: 6 },
    { product_id: "p-air", part_number: "AF-2", name: "Air Filter", quantity: 1, unit: "pcs", unit_price: 20, unit_price_with_vat: 23 },
    { product_id: "p-fuel", part_number: "FF-3", name: "Fuel Filter", quantity: 3, unit: "pcs", unit_price: 5, unit_price_with_vat: 5.75 },
  ],
};

async function setup(page, context, { sales = [SALE], storeSettings = {} } = {}) {
  const api = { calcBodies: [], pickerUrls: [] };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const decoded = decodeURIComponent(url);
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/v1/order/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      api.calcBodies.push(body);
      return json({ status: true, result: body });
    }
    if (/\/v1\/order\?/.test(url) && decoded.includes("select=id,code,date,net_total") && decoded.includes("products")) {
      api.pickerUrls.push(decoded);
      return json({ status: true, result: sales, total_count: sales.length });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: storeSettings } });
    }
    return json({ status: true, result: [], total_count: 0 });
  });
  await page.addInitScript((storeId) => {
    localStorage.setItem("access_token", "e2e-token");
    localStorage.setItem("store_id", storeId);
    localStorage.setItem("store_name", "E2E Store");
    localStorage.setItem("user_id", "64abc123456789001234ffff");
    localStorage.setItem("user_role", "Admin");
    localStorage.setItem("order_form_type", "type1");
  }, STORE_ID);
  await page.goto("/dashboard/sales");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("#sales_create_form")).toBeVisible();
  return api;
}

async function openProductPicker(page) {
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await page.getByText("SI-0001").click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

const dialog = (page) => page.locator(".modal-content", { hasText: "Select Products to Import" });

test("Import dropdown offers From Sales alongside From Purchase", async ({ page, context }) => {
  await setup(page, context);
  await page.getByTestId("sales-import-dropdown-btn").click();
  await expect(page.getByTestId("import-from-sales-btn")).toHaveText(/From Sales/);
  await expect(page.getByTestId("import-from-purchase-btn")).toBeVisible();
  await expect(page.getByText("From Quotations")).toBeVisible();
});

test("sales search queries this store's sales with their products", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expect(page.getByText("Import from Sales")).toBeVisible();
  await expect(page.getByText("SI-0001")).toBeVisible();
  expect(api.pickerUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
});

test("product picker shows the customer and the sale's prices", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  const d = dialog(page);
  await expect(d.getByText("Walk-in Co", { exact: false })).toBeVisible();
  await expect(d.getByText("Purchase Price")).toHaveCount(0);
  await expect(d.locator("tr", { hasText: "Oil Filter" })).toContainText("11.50");
  await expect(page.getByTestId("qip-import")).toHaveText(/Import 3 Products/);
  await page.screenshot({ path: "test-results/sales-from-sales-picker.png" });
});

test("imports ticked lines with the sale's prices, discounts and edited quantities", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-row-1").uncheck();
  await dialog(page).getByRole("spinbutton").first().fill("5");
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id).sort()).toEqual(["p-fuel", "p-oil"]);
  const oil = lastCalcProducts(api).find((p) => p.product_id === "p-oil");
  expect(oil.quantity).toBe(5);
  expect(oil.unit_price).toBe(10);
  expect(oil.unit_discount).toBe(1);
  expect(lastCalcProducts(api).find((p) => p.product_id === "p-fuel").quantity).toBe(3);
});

test("importing the same sale twice adds to the quantity", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-select-all").uncheck();
  await page.getByTestId("qip-row-0").check();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).find((p) => p.product_id === "p-oil")?.quantity).toBe(2);
  await openProductPicker(page);
  await expect(dialog(page).getByText("Already added")).toHaveCount(1);
  await page.getByTestId("qip-select-all").uncheck();
  await page.getByTestId("qip-row-0").check();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).find((p) => p.product_id === "p-oil")?.quantity).toBe(4);
  expect(lastCalcProducts(api).filter((p) => p.product_id === "p-oil")).toHaveLength(1);
});

test("back button returns to the sales search", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  await page.getByText("Choose another sale").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect(page.getByText("SI-0001")).toBeVisible();
});

test("empty sales search shows a message", async ({ page, context }) => {
  await setup(page, context, { sales: [] });
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expect(page.getByText("No documents found.")).toBeVisible();
});

test("all import sources are grouped under the single Import dropdown", async ({ page, context }) => {
  await setup(page, context, { storeSettings: { enable_purchase_order_module: true } });
  const form = page.locator("#sales_create_form");
  await expect(form.getByTestId("sales-import-dropdown-btn")).toHaveCount(1);
  for (const label of ["From Quotations", "From Delivery Notes", "From Sales", "From Purchase", "From P.O."]) {
    await expect(form.getByText(label, { exact: true })).toBeHidden();
  }
  await form.getByTestId("sales-import-dropdown-btn").click();
  const menu = form.locator(".dropdown-menu.show");
  await expect(menu).toHaveCount(1);
  await expect(menu.locator(".dropdown-item")).toHaveText(["From Quotations", "From Delivery Notes", "From Sales", "From Purchase", "From P.O."].map((l) => new RegExp(l.replace(/\./g, "\\."))));
  await page.screenshot({ path: "test-results/sales-import-dropdown.png" });
});
