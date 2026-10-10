// E2E: editing Unit Price (without VAT) and Unit Price (with VAT) in the
// selected-products table, in a real browser against the production build.
// Both boxes are <PriceInput> (src/components/PriceInput.js). The REST API is
// mocked per test with page.route().
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SOURCE = {
  id: "src-1", code: "SRC-0001", date: "2026-10-02T10:00:00Z", customer_name: "Walk-in Co", net_total: 23, store_id: STORE_ID,
  products: [{ product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5 }],
};

const FORMS = {
  sales: {
    page: "/dashboard/sales",
    ex: "#sales_product_unit_price_0",
    inc: "#sales_product_unit_price_with_vat_0",
    calc: "/v1/order/calculate-net-total",
    async importProduct(page) {
      await page.getByTestId("sales-import-dropdown-btn").click();
      await page.getByTestId("import-from-sales-btn").click();
      await page.locator(".modal-content", { hasText: "Import from Sales" }).getByText("SRC-0001").click();
      await page.getByTestId("qip-import").click();
    },
  },
  quotation: {
    page: "/dashboard/quotations",
    ex: "#quotation_product_unit_price_0",
    inc: "#quotation_product_unit_price_with_vat_0",
    calc: "/v1/quotation/calculate-net-total",
    async importProduct(page) {
      await page.getByTestId("import-dropdown-btn").click();
      await page.getByTestId("import-from-quotation-btn").click();
      await page.locator(".modal-content").getByText("SRC-0001").click();
      await page.getByTestId("qip-import").click();
    },
  },
};

async function openForm(page, context, form) {
  const api = { calcBodies: [] };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      if (url.includes(form.calc)) api.calcBodies.push(body);
      return json({ status: true, result: body });
    }
    if (/\/v1\/(order|quotation)\/src-1\?/.test(url)) return json({ status: true, result: SOURCE });
    if (/\/v1\/(order|quotation)\?/.test(url)) return json({ status: true, result: [SOURCE], total_count: 1 });
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: { enable_products: true, quotation_create_form_design: "type1" } } });
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
    localStorage.setItem("quotation_form_type", "type1");
  }, STORE_ID);
  await page.goto(form.page);
  await page.getByRole("button", { name: "Create" }).click();
  await form.importProduct(page);
  const ex = page.locator(form.ex).first();
  const inc = page.locator(form.inc).first();
  await expect(inc).toHaveValue("11.50");
  return { api, ex, inc };
}

function lastCalcProduct(api) {
  const bodies = api.calcBodies.filter((b) => Array.isArray(b.products) && b.products.length > 0);
  return bodies.length ? bodies[bodies.length - 1].products[0] : null;
}

for (const [name, form] of Object.entries(FORMS)) {
  test.describe(`${name} form`, () => {
    test("prices read with 2 decimals and are text boxes with the decimal keypad", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await expect(ex).toHaveValue("10.00");
      for (const box of [ex, inc]) {
        await expect(box).toHaveAttribute("type", "text");
        await expect(box).toHaveAttribute("inputmode", "decimal");
      }
    });

    test("typing a with-VAT price replaces it and fills the without-VAT price while typing", async ({ page, context }) => {
      const { api, ex, inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.type("23");
      await expect(inc).toHaveValue("23");
      await expect(ex).toHaveValue("20.00"); // still focused on the with-VAT box
      await expect.poll(() => lastCalcProduct(api)?.unit_price).toBe(20);
      expect(lastCalcProduct(api).unit_price_with_vat).toBe(23);
      await inc.press("Tab");
      await expect(inc).toHaveValue("23.00");
    });

    test("a slow click (mouse held down) still selects the whole price, so typing replaces it", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await inc.click({ delay: 300 });
      await page.keyboard.type("46");
      await expect(inc).toHaveValue("46");
      await expect(ex).toHaveValue("40.00");
    });

    test("Tab into a price and type at once: the first digit is never lost", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await ex.click();
      await page.keyboard.press("Tab");
      await page.keyboard.type("57.5", { delay: 0 });
      await expect(inc).toHaveValue("57.5");
      await expect(ex).toHaveValue("50.00");
    });

    test("typing a without-VAT price fills the with-VAT price", async ({ page, context }) => {
      const { api, ex, inc } = await openForm(page, context, form);
      await ex.click();
      await page.keyboard.type("8.7");
      await expect(inc).toHaveValue("10.005");
      await expect.poll(() => lastCalcProduct(api)?.unit_price_with_vat).toBe(10.005);
    });

    test("Backspace removes one digit instead of wiping both prices", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.press("End");
      await page.keyboard.press("Backspace");
      await expect(inc).toHaveValue("11.");
      await expect(ex).toHaveValue("9.5652");
      await page.keyboard.press("Backspace");
      await expect(inc).toHaveValue("11");
      await expect(ex).toHaveValue("9.5652");
    });

    test("a trailing dot and zeros survive typing; letters and minus are ignored", async ({ page, context }) => {
      const { inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.type("-1a2.50e");
      await expect(inc).toHaveValue("12.50");
    });

    test("Arabic digits and a decimal comma are accepted", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.insertText("٢٣");
      await page.keyboard.type(",5");
      await expect(inc).toHaveValue("23.5");
      await expect(ex).toHaveValue("20.4348");
    });

    test("Escape restores the price from before the edit and keeps the form open", async ({ page, context }) => {
      const { api, ex, inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.type("999");
      await expect(ex).toHaveValue("868.6957");
      await page.keyboard.press("Escape");
      await expect(inc).toHaveValue("11.5");
      await expect(ex).toHaveValue("10.00");
      await expect(inc).toBeVisible();
      await inc.press("Tab");
      await expect.poll(() => lastCalcProduct(api)?.unit_price_with_vat).toBe(11.5);
    });

    test("arrow keys move the caret inside the price", async ({ page, context }) => {
      const { inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.press("End");
      await page.keyboard.press("ArrowLeft"); // "11.|5"
      await page.keyboard.type("9");
      await expect(inc).toBeFocused();
      await expect(inc).toHaveValue("11.95");
    });

    test("the mouse wheel neither changes the price nor drops the edit", async ({ page, context }) => {
      const { inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.type("42");
      await inc.hover();
      await page.mouse.wheel(0, 300);
      await expect(inc).toBeFocused();
      await expect(inc).toHaveValue("42");
    });

    test("clearing one price clears the other", async ({ page, context }) => {
      const { ex, inc } = await openForm(page, context, form);
      await inc.click();
      await page.keyboard.press("Backspace"); // whole price is selected on focus
      await expect(inc).toHaveValue("");
      await expect(ex).toHaveValue("");
    });
  });
}

for (const vp of [
  { name: "phone", width: 375, height: 667 },
  { name: "large phone", width: 430, height: 932 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1180, height: 820 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
]) {
  test(`unit prices are visible and editable on ${vp.name} (${vp.width}x${vp.height})`, async ({ page, context }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const { ex, inc } = await openForm(page, context, FORMS.sales);
    await inc.scrollIntoViewIfNeeded();
    await expect(inc).toBeVisible();
    const box = await inc.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(60); // "11.50" never clipped away
    await inc.click();
    await page.keyboard.type("46");
    await expect(ex).toHaveValue("40.00");
    await page.screenshot({ path: `test-results/unit-price-${vp.name.replace(/ /g, "-")}.png` });
  });
}
