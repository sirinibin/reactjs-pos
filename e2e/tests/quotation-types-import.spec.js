// E2E: the Import dropdown in quotation form type 2 and type 3, in a real browser against
// the production build with a mocked API. Type 2 shares type 1's dropdown; type 3 has its own.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const QUOTATION = {
  id: "q-src-1", code: "QT-SRC-001", date: "2026-09-30T10:00:00Z", customer_name: "ACME Trading", net_total: 57.5,
  products: [
    { product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15 },
    { product_id: "p-air", part_number: "AF-2", name: "Air Filter", quantity: 1, unit: "pcs", unit_price: 20, unit_price_with_vat: 23 },
  ],
};
const PURCHASE = {
  id: "pu-src-1", code: "PI-SRC-001", date: "2026-09-29T10:00:00Z", vendor_name: "Filter Supplies Co", net_total: 40,
  products: [{ product_id: "p-belt", part_number: "BT-9", name: "Fan Belt", quantity: 2, unit: "pcs", purchase_unit_price: 7, purchase_unit_price_with_vat: 8.05 }],
};
const SALE = {
  id: "so-src-1", code: "SI-SRC-001", date: "2026-09-28T10:00:00Z", customer_name: "ACME Trading", net_total: 80,
  products: [{ product_id: "p-plug", part_number: "SP-4", name: "Spark Plug", quantity: 8, unit: "pcs", unit_price: 3, unit_price_with_vat: 3.45, unit_discount: 0.5, unit_discount_with_vat: 0.58 }],
};
const RETAIL = { "p-belt": [15, 17.25] };

async function setup(page, context, design, { poModule = true } = {}) {
  const api = { calcBodies: [] };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = decodeURIComponent(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      api.calcBodies.push(body);
      return json({ status: true, result: design === "type3" ? { net_total: 0 } : body });
    }
    if (/\/v1\/quotation\?/.test(url)) return json({ status: true, result: [QUOTATION], total_count: 1 });
    if (/\/v1\/purchase\?/.test(url)) return json({ status: true, result: [PURCHASE], total_count: 1 });
    if (/\/v1\/order\?/.test(url)) return json({ status: true, result: [SALE], total_count: 1 });
    if (/\/v1\/product\?/.test(url) && url.includes("search[ids]=") && url.includes("retail_unit_price")) {
      const ids = url.match(/search\[ids\]=([^&]*)/)[1].split(",");
      return json({ status: true, result: ids.filter((id) => RETAIL[id]).map((id) => ({ id, product_stores: { [STORE_ID]: { retail_unit_price: RETAIL[id][0], retail_unit_price_with_vat: RETAIL[id][1] } } })) });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", vat_percent: 15, country_code: "SA", settings: { enable_products: true, enable_purchase_order_module: poModule, quotation_create_form_design: design } } });
    }
    return json({ status: true, result: [], total_count: 0 });
  });
  await page.addInitScript((storeId) => {
    localStorage.setItem("access_token", "e2e-token");
    localStorage.setItem("store_id", storeId);
    localStorage.setItem("user_id", "64abc123456789001234ffff");
    localStorage.setItem("user_role", "Admin");
  }, STORE_ID);
  await page.goto("/dashboard/quotations");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByTestId("import-dropdown-btn")).toBeVisible();
  return api;
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

async function importAll(page, itemTestId, code) {
  await page.getByTestId("import-dropdown-btn").click();
  await page.getByTestId(itemTestId).click();
  // Scoped to the search modal: the quotation list behind the form can show the same code.
  await page.locator(".modal-content", { hasText: "Import from" }).getByText(code).click();
  await expect(page.getByText("Select Products to Import")).toBeVisible();
  await expect(page.getByTestId("qip-loading")).toHaveCount(0);
  await page.getByTestId("qip-import").click();
  await expect(page.getByText("Select Products to Import")).toBeHidden();
}

const ALL_FOUR = ["import-from-quotation-btn", "import-from-purchase-btn", "import-from-sales-btn"];

for (const design of ["type2", "type3"]) {
  test.describe(`quotation form ${design}`, () => {
    test("Import dropdown has all 4 options", async ({ page, context }) => {
      await setup(page, context, design);
      await page.getByTestId("import-dropdown-btn").click();
      for (const id of ALL_FOUR) await expect(page.getByTestId(id)).toBeVisible();
      await expect(page.getByText(/^\s*From (P\.O\.|Purchase Order)\s*$/)).toBeVisible();
      await page.screenshot({ path: `test-results/${design}-import-dropdown.png` });
    });

    test("P.O. option is hidden when the purchase order module is off", async ({ page, context }) => {
      await setup(page, context, design, { poModule: false });
      await page.getByTestId("import-dropdown-btn").click();
      await expect(page.getByTestId("import-from-sales-btn")).toBeVisible();
      await expect(page.getByText(/^\s*From (P\.O\.|Purchase Order)\s*$/)).toHaveCount(0);
    });

    test("imports from a quotation, a purchase and a sale", async ({ page, context }) => {
      const api = await setup(page, context, design);
      await importAll(page, "import-from-quotation-btn", "QT-SRC-001");
      await expect.poll(() => lastCalcProducts(api).length).toBe(2);
      await importAll(page, "import-from-purchase-btn", "PI-SRC-001");
      await expect.poll(() => lastCalcProducts(api).length).toBe(3);
      await importAll(page, "import-from-sales-btn", "SI-SRC-001");
      await expect.poll(() => lastCalcProducts(api).length).toBe(4);
      const byId = Object.fromEntries(lastCalcProducts(api).map((p) => [p.product_id, p]));
      expect(byId["p-oil"]).toMatchObject({ quantity: 2, unit_price: 10, unit_discount: 1 });
      expect(byId["p-belt"]).toMatchObject({ quantity: 2, unit_price: 15 });
      expect(byId["p-plug"]).toMatchObject({ quantity: 8, unit_price: 3, unit_discount: 0.5 });
      await page.screenshot({ path: `test-results/${design}-after-imports.png` });
    });

    test("product picker stacks above the form and its back button returns to the search", async ({ page, context }) => {
      await setup(page, context, design);
      await page.getByTestId("import-dropdown-btn").click();
      await page.getByTestId("import-from-sales-btn").click();
      await page.getByText("SI-SRC-001").click();
      const box = await page.getByTestId("qip-select-all").boundingBox();
      expect(box.width).toBeLessThanOrEqual(20);
      await page.screenshot({ path: `test-results/${design}-product-picker.png` });
      await page.getByText("Choose another sale", { exact: false }).click();
      await expect(page.getByText("Import from Sales")).toBeVisible();
    });
  });
}
