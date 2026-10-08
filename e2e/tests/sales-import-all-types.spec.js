// E2E: the Import dropdown of sales form types 2, 3, 4 and 5 holds every import
// source, and From Sales / From Purchase import through the two-step picker.
// Runs against the production build with the REST API mocked per test.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SALE = {
  id: "so-1", code: "SI-0001", date: "2026-10-02T10:00:00Z", customer_name: "Walk-in Co", net_total: 23,
  products: [{ product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5 }],
};
const PURCHASE = {
  id: "pu-1", code: "PI-0001", date: "2026-10-01T10:00:00Z", vendor_name: "Gulf Parts", net_total: 69,
  products: [{ product_id: "p-air", part_number: "AF-2", name: "Air Filter", quantity: 3, unit: "pcs", purchase_unit_price: 12, purchase_unit_price_with_vat: 13.8 }],
};

async function setup(page, context, formType) {
  const api = { calcBodies: [] };
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
    if (/\/v1\/order\?/.test(url) && decoded.includes("select=id,code,date,net_total")) return json({ status: true, result: [SALE], total_count: 1 });
    if (/\/v1\/purchase\?/.test(url) && decoded.includes("products")) return json({ status: true, result: [PURCHASE], total_count: 1 });
    if (/\/v1\/product\?/.test(url) && decoded.includes("retail_unit_price")) {
      return json({ status: true, result: [{ id: "p-air", product_stores: { [STORE_ID]: { retail_unit_price: 20, retail_unit_price_with_vat: 23 } } }] });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: { enable_purchase_order_module: true, enable_sales_page_selection: true, enable_automobile_module: true } } });
    }
    return json({ status: true, result: [], total_count: 0 });
  });
  await page.addInitScript(([storeId, type]) => {
    localStorage.setItem("access_token", "e2e-token");
    localStorage.setItem("store_id", storeId);
    localStorage.setItem("store_name", "E2E Store");
    localStorage.setItem("user_id", "64abc123456789001234ffff");
    localStorage.setItem("user_role", "Admin");
    localStorage.setItem("order_form_type", type);
  }, [STORE_ID, formType]);
  await page.goto("/dashboard/sales");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("#sales_create_form")).toBeVisible();
  return api;
}

function lastCalcProducts(api) {
  const withProducts = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

const TYPES = [
  { type: "type2", toggle: "t2-import-dropdown-btn", sales: "t2-import-from-sales-btn", purchase: "t2-import-from-purchase-btn", po: /From Purchase Order/ },
  { type: "type3", toggle: "t3-import-dropdown-btn", sales: "t3-import-from-sales-btn", purchase: "t3-import-from-purchase-btn", po: /From Purchase Order/ },
  { type: "type4", toggle: "t4-import-dropdown-btn", sales: "t4-import-from-sales-btn", purchase: "t4-import-from-purchase-btn", po: /From P\.O\./ },
  { type: "type5", toggle: "t5-import-dropdown-btn", sales: "t5-import-from-sales-btn", purchase: "t5-import-from-purchase-btn", po: /From P\.O\./ },
];

for (const cfg of TYPES) {
  test.describe(`sales form ${cfg.type}`, () => {
    test("one Import dropdown holds every import source", async ({ page, context }) => {
      await setup(page, context, cfg.type);
      const toggle = page.getByTestId(cfg.toggle);
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      const menu = page.locator(".dropdown-menu.show");
      await expect(menu).toHaveCount(1);
      for (const label of [/From Quotations/, /From Delivery Notes/, /From Sales/, /From Purchase$/, cfg.po]) {
        await expect(menu.locator(".dropdown-item", { hasText: label })).toHaveCount(1);
      }
      await page.screenshot({ path: `test-results/${cfg.type}-import-dropdown.png` });
    });

    test("From Sales and From Purchase add the picked products", async ({ page, context }) => {
      const api = await setup(page, context, cfg.type);
      await page.getByTestId(cfg.toggle).click();
      await page.getByTestId(cfg.sales).click();
      await page.getByText("SI-0001").click();
      await expect(page.getByText("Select Products to Import")).toBeVisible();
      await page.getByTestId("qip-import").click();
      await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id)).toEqual(["p-oil"]);

      await page.getByTestId(cfg.toggle).click();
      await page.getByTestId(cfg.purchase).click();
      await page.getByText("PI-0001").click();
      await expect(page.getByText("Select Products to Import")).toBeVisible();
      await page.getByTestId("qip-import").click();
      await expect.poll(() => lastCalcProducts(api).map((p) => p.product_id).sort()).toEqual(["p-air", "p-oil"]);
      const air = lastCalcProducts(api).find((p) => p.product_id === "p-air");
      expect(air.quantity).toBe(3);
      expect(air.unit_price).toBe(20);
      expect(lastCalcProducts(api).find((p) => p.product_id === "p-oil").unit_price).toBe(10);
    });
  });
}
