// E2E: Sales form type 1 > Import > From Purchase, in a real browser against the
// production build. The REST API is mocked per test with page.route(), so the
// test needs no backend or database.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const PURCHASE = {
  id: "pu-1",
  code: "PI-0001",
  date: "2026-10-01T10:00:00Z",
  vendor_id: "v-1",
  vendor_name: "Gulf Parts",
  net_total: 138,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 10, unit: "pcs", purchase_unit_price: 6, purchase_unit_price_with_vat: 6.9, unit_discount: 1, unit_discount_with_vat: 1.15 },
    { product_id: "p-air", part_number: "AF-2", name: "Air Filter", quantity: 4, unit: "pcs", purchase_unit_price: 12, purchase_unit_price_with_vat: 13.8, retail_unit_price: 30, retail_unit_price_with_vat: 34.5 },
    { product_id: "p-fuel", part_number: "FF-3", name: "Fuel Filter", quantity: 2, unit: "pcs", purchase_unit_price: 3, purchase_unit_price_with_vat: 3.45 },
  ],
};
// Store retail prices; p-air has none, so the purchase line's retail price is used.
const STORE_PRICES = {
  "p-oil": { retail_unit_price: 10, retail_unit_price_with_vat: 11.5, stock: 50 },
  "p-fuel": { retail_unit_price: 5, retail_unit_price_with_vat: 5.75, stock: 8 },
};

async function setup(page, context, { purchases = [PURCHASE] } = {}) {
  const api = { calcBodies: [], pickerUrls: [], priceUrls: [] };
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
    if (/\/v1\/purchase\?/.test(url) && decoded.includes("products")) {
      api.pickerUrls.push(decoded);
      return json({ status: true, result: purchases, total_count: purchases.length });
    }
    if (/\/v1\/product\?/.test(url) && decoded.includes("search[ids]=") && decoded.includes("retail_unit_price")) {
      api.priceUrls.push(decoded);
      const ids = new URL(url).searchParams.get("search[ids]").split(",");
      return json({ status: true, result: ids.map((id) => ({ id, product_stores: { [STORE_ID]: STORE_PRICES[id] || {} } })), total_count: ids.length });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: {} } });
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
  await page.getByTestId("import-from-purchase-btn").click();
  await page.getByText("PI-0001").click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

const dialog = (page) => page.locator(".modal-content", { hasText: "Select Products to Import" });

test("Import dropdown offers From Purchase next to the other sources", async ({ page, context }) => {
  await setup(page, context);
  await page.getByTestId("sales-import-dropdown-btn").click();
  await expect(page.getByText("From Quotations")).toBeVisible();
  await expect(page.getByText("From Delivery Notes")).toBeVisible();
  await expect(page.getByTestId("import-from-purchase-btn")).toHaveText(/From Purchase/);
});

test("purchase search queries purchases of this store with their products", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expect(page.getByText("Import from Purchase")).toBeVisible();
  await expect(page.getByText("PI-0001")).toBeVisible();
  expect(api.pickerUrls[0]).toContain(`search[store_id]=${STORE_ID}`);
  expect(api.pickerUrls[0]).toContain("products");
});

test("product picker shows the vendor, cost and selling prices", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  const d = dialog(page);
  await expect(d.getByText("Gulf Parts", { exact: false })).toBeVisible();
  await expect(d.getByText("Purchase Price")).toBeVisible();
  await expect(d.getByText("Unit Price(with VAT)")).toBeVisible();
  const oilRow = d.locator("tr", { hasText: "Oil Filter" });
  await expect(oilRow).toContainText("6.00");   // cost from the purchase
  await expect(oilRow).toContainText("11.50");  // store selling price with VAT
  const airRow = d.locator("tr", { hasText: "Air Filter" });
  await expect(airRow).toContainText("34.50");  // no store price: retail price saved on the purchase line
  expect(api.priceUrls).toHaveLength(1);
  expect(api.priceUrls[0]).toContain("search[ids]=p-oil,p-air,p-fuel");
  await expect(page.getByTestId("qip-import")).toHaveText(/Import 3 Products/);
  for (const id of ["qip-select-all", "qip-row-0"]) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box.width, `${id} width`).toBeLessThanOrEqual(20);
    expect(box.height, `${id} height`).toBeLessThanOrEqual(20);
  }
  await page.screenshot({ path: "test-results/sales-purchase-picker.png" });
});

test("imports only ticked products, at the store retail price, with edited quantities", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-row-2").uncheck();
  await dialog(page).getByRole("spinbutton").first().fill("3");
  await expect(page.getByTestId("qip-import")).toHaveText(/Import 2 Products/);
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();

  await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id).sort()).toEqual(["p-air", "p-oil"]);
  const products = lastCalcProducts(api);
  const oil = products.find((p) => p.product_id === "p-oil");
  expect(oil.quantity).toBe(3);
  expect(oil.unit_price).toBe(10);
  expect(oil.unit_price_with_vat).toBe(11.5);
  expect(oil.unit_discount).toBe(0);
  expect(oil.purchase_unit_price).toBe(6);
  const air = products.find((p) => p.product_id === "p-air");
  expect(air.quantity).toBe(4);
  expect(air.unit_price).toBe(30);
  await expect(page.locator("#sales_create_form input[value='Oil Filter']")).toHaveCount(1);
  await page.screenshot({ path: "test-results/sales-after-purchase-import.png" });
});

test("importing the same purchase twice adds to the quantity instead of duplicating", async ({ page, context }) => {
  const api = await setup(page, context);
  await openProductPicker(page);
  await page.getByTestId("qip-select-all").uncheck();
  await page.getByTestId("qip-row-0").check();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).find((p) => p.product_id === "p-oil")?.quantity).toBe(10);

  await openProductPicker(page);
  await expect(dialog(page).getByText("Already added")).toHaveCount(1);
  await page.getByTestId("qip-select-all").uncheck();
  await page.getByTestId("qip-row-0").check();
  await dialog(page).getByRole("spinbutton").first().fill("2");
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).find((p) => p.product_id === "p-oil")?.quantity).toBe(12);
  expect(lastCalcProducts(api).filter((p) => p.product_id === "p-oil")).toHaveLength(1);
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
  await expect(dialog(page).getByText("Fuel Filter")).toBeVisible();
  await expect(dialog(page).getByText("Oil Filter")).toHaveCount(0);
  await page.getByTestId("qip-filter").fill("zzz");
  await expect(dialog(page).getByText("No products found.")).toBeVisible();
});

test("back button returns to the purchase search", async ({ page, context }) => {
  await setup(page, context);
  await openProductPicker(page);
  await page.getByText("Choose another purchase").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
  await expect(page.getByText("PI-0001")).toBeVisible();
});

test("price lookup failure warns and still lets the user import", async ({ page, context }) => {
  const api = await setup(page, context);
  await page.unroute("**/v1/**");
  await page.route("**/v1/**", async (route) => {
    const url = route.request().url();
    const decoded = decodeURIComponent(url);
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/v1/order/calculate-net-total")) {
      const body = JSON.parse(route.request().postData() || "{}");
      api.calcBodies.push(body);
      return json({ status: true, result: body });
    }
    if (/\/v1\/purchase\?/.test(url)) return json({ status: true, result: [PURCHASE], total_count: 1 });
    if (decoded.includes("retail_unit_price")) return json({ status: false, errors: { id: "boom" } }, 500);
    return json({ status: true, result: [], total_count: 0 });
  });
  await openProductPicker(page);
  await expect(page.getByText(/Could not load current selling prices/)).toBeVisible();
  await page.getByTestId("qip-select-all").uncheck();
  await page.getByTestId("qip-row-0").check();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => lastCalcProducts(api).find((p) => p.product_id === "p-oil")?.unit_price).toBe(0);
});

test("empty purchase search shows a message", async ({ page, context }) => {
  await setup(page, context, { purchases: [] });
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expect(page.getByText("No documents found.")).toBeVisible();
});
