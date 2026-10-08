// E2E: "Switch to Quotation" on the Sales Create form and "Switch to Sales" on
// the Quotation Create form, in a real browser against the production build.
// The switch carries the products across, and it never shows on Update forms.
// The REST API is mocked per test with page.route().
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";
const SALE = {
  id: "so-1", code: "SI-0001", date: "2026-10-02T10:00:00Z", customer_name: "Walk-in Co", net_total: 23, store_id: STORE_ID,
  products: [{ product_id: "p-oil", part_number: "OF-1", name: "Oil Filter", quantity: 2, unit: "pcs", unit_price: 10, unit_price_with_vat: 11.5 }],
};
const QUOTATION = { ...SALE, id: "qt-1", code: "QT-0001" };

async function mockApi(page, context, { salesType = "type1", settings = {}, calcBodies = [] } = {}) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const decoded = decodeURIComponent(url);
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/calculate-net-total")) {
      const body = JSON.parse(req.postData() || "{}");
      calcBodies.push({ url, body });
      return json({ status: true, result: body });
    }
    if (/\/v1\/order\/so-1\?/.test(url)) return json({ status: true, result: SALE });
    if (/\/v1\/quotation\/qt-1\?/.test(url)) return json({ status: true, result: QUOTATION });
    if (/\/v1\/order\?/.test(url) && decoded.includes("select=id,code,date,net_total") && decoded.includes("products")) return json({ status: true, result: [SALE], total_count: 1 });
    if (/\/v1\/order\?/.test(url)) return json({ status: true, result: [SALE], total_count: 1 });
    if (/\/v1\/quotation\?/.test(url)) return json({ status: true, result: [QUOTATION], total_count: 1 });
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: { enable_sales_page_selection: true, ...settings } } });
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
    localStorage.setItem("quotation_form_type", "type1");
  }, [STORE_ID, salesType]);
}

async function openSalesCreate(page) {
  await page.goto("/dashboard/sales");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("#sales_create_form")).toBeVisible();
}

// Product names render as text or as editable inputs depending on the form type.
async function showsProduct(scope, name) {
  return scope.evaluateAll((els, n) => els.some((root) =>
    root.innerText.includes(n) || [...root.querySelectorAll("input")].some((i) => i.value === n)), name);
}

const salesSwitch = (page) => page.locator("#sales_create_form button", { hasText: /Switch to Quotation|^Quotation$/ });
const quotationSwitch = (page) => page.getByRole("button", { name: /Switch to Sales/ });

test("Sales Create -> Quotation Create -> Sales Create keeps the products", async ({ page, context }) => {
  await mockApi(page, context);
  await openSalesCreate(page);

  // Put a product on the sale with Import > From Sales.
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await page.locator(".modal-content", { hasText: "Import from Sales" }).getByText("SI-0001").click();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => showsProduct(page.locator("#sales_create_form"), "Oil Filter")).toBe(true);

  await salesSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/quotations$/);
  await expect(page.getByText("Create New Quotation").first()).toBeVisible();
  await expect.poll(() => showsProduct(page.locator(".modal-content", { hasText: "Create New Quotation" }), "Oil Filter")).toBe(true);

  await quotationSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/sales$/);
  await expect(page.locator("#sales_create_form")).toBeVisible();
  await expect.poll(() => showsProduct(page.locator("#sales_create_form"), "Oil Filter")).toBe(true);
});

for (const salesType of ["type1", "type2", "type3", "type4", "type5"]) {
  test(`sales form ${salesType}: switch shows on Create and opens the Quotation Create form`, async ({ page, context }) => {
    await mockApi(page, context, { salesType, settings: { enable_automobile_module: salesType === "type5" } });
    await openSalesCreate(page);
    await expect(salesSwitch(page)).toHaveCount(1);
    await salesSwitch(page).click();
    await expect(page).toHaveURL(/\/dashboard\/quotations$/);
    await expect(quotationSwitch(page)).toHaveCount(1);
  });
}

test("Quotation form type 3: Switch to Sales opens the Sales Create form", async ({ page, context }) => {
  await mockApi(page, context, { settings: { quotation_create_form_design: "type3" } });
  await page.goto("/dashboard/quotations");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(quotationSwitch(page)).toHaveCount(1);
  await quotationSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/sales$/);
  await expect(page.locator("#sales_create_form")).toBeVisible();
});

test("Sales Update form has no switch", async ({ page, context }) => {
  await mockApi(page, context);
  await page.goto("/dashboard/sales");
  await page.locator("table button:has(i.bi-pencil)").first().click();
  await expect(page.locator("#sales_create_form").getByText("Update Sales").first()).toBeVisible();
  await expect(salesSwitch(page)).toHaveCount(0);
});

for (const design of ["type1", "type3"]) {
  test(`Quotation Update form (${design}) has no switch`, async ({ page, context }) => {
    await mockApi(page, context, { settings: design === "type3" ? { quotation_create_form_design: "type3" } : {} });
    await page.goto("/dashboard/quotations");
    await page.locator("table button:has(i.bi-pencil)").first().click();
    await expect(page.getByRole("button", { name: /^\s*Update\s*$/ }).first()).toBeVisible();
    await expect(quotationSwitch(page)).toHaveCount(0);
  });
}

for (const vp of [{ name: "phone", width: 390, height: 844 }, { name: "tablet", width: 820, height: 1180 }, { name: "laptop", width: 1280, height: 800 }]) {
  test(`switch buttons are reachable on ${vp.name} (${vp.width}x${vp.height})`, async ({ page, context }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await mockApi(page, context);
    await openSalesCreate(page);
    await salesSwitch(page).scrollIntoViewIfNeeded();
    await expect(salesSwitch(page)).toBeVisible();
    await salesSwitch(page).click();
    await expect(page).toHaveURL(/\/dashboard\/quotations$/);
    await quotationSwitch(page).scrollIntoViewIfNeeded();
    await expect(quotationSwitch(page)).toBeVisible();
    await page.screenshot({ path: `test-results/switch-${vp.name}.png` });
  });
}

async function fillHeader(scope, values) {
  for (const [placeholder, value] of Object.entries(values)) {
    const input = scope.getByPlaceholder(placeholder, { exact: true }).first();
    await input.fill(value);
  }
}

async function expectHeader(scope, values) {
  for (const [placeholder, value] of Object.entries(values)) {
    await expect(scope.getByPlaceholder(placeholder, { exact: true }).first()).toHaveValue(value);
  }
}

test("entered data carries over both ways: customer details, remarks, shipping, discount and products", async ({ page, context }) => {
  const calcBodies = [];
  await mockApi(page, context, { calcBodies });
  await openSalesCreate(page);
  const sales = page.locator("#sales_create_form");

  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await page.locator(".modal-content", { hasText: "Import from Sales" }).getByText("SI-0001").click();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => showsProduct(sales, "Oil Filter")).toBe(true);

  const header = { "Phone": "0501234567", "VAT NO.": "300000000000003", "Address": "King Fahd Rd, Riyadh", "Remarks": "Deliver before Sunday" };
  await fillHeader(sales, header);
  await sales.locator("#sales_shipping_fees").first().fill("12");
  await sales.locator("#sales_discount_with_vat").first().fill("2.3");
  await page.waitForTimeout(400);

  await salesSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/quotations$/);
  const quotation = page.locator(".modal-content", { hasText: "Create New Quotation" });
  await expect.poll(() => showsProduct(quotation, "Oil Filter")).toBe(true);
  await expectHeader(quotation, header);
  await expect(quotation.locator("#quotation_shipping_fees")).toHaveValue("12");
  await expect.poll(() => {
    const last = calcBodies.filter((c) => c.url.includes("/v1/quotation/")).pop();
    return last ? [last.body.shipping_handling_fees, last.body.discount_with_vat, (last.body.products || []).map((p) => [p.product_id, p.quantity])] : null;
  }).toEqual([12, 2.3, [["p-oil", 2]]]);

  // Change something on the quotation, then switch back: the sale gets the current values.
  await quotation.getByPlaceholder("Remarks", { exact: true }).first().fill("Customer asked for a quote first");
  await quotation.locator("#quotation_shipping_fees").fill("15");
  await page.waitForTimeout(400);
  await quotationSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/sales$/);
  await expect.poll(() => showsProduct(sales, "Oil Filter")).toBe(true);
  await expectHeader(sales, { ...header, "Remarks": "Customer asked for a quote first" });
  await expect(sales.locator("#sales_shipping_fees").first()).toHaveValue("15");
  await expect.poll(() => {
    const last = calcBodies.filter((c) => c.url.includes("/v1/order/")).pop();
    return last ? [last.body.shipping_handling_fees, last.body.discount_with_vat] : null;
  }).toEqual([15, 2.3]);
});

test("switching an empty Create form carries nothing stale", async ({ page, context }) => {
  await mockApi(page, context);
  await openSalesCreate(page);
  await salesSwitch(page).click();
  const quotation = page.locator(".modal-content", { hasText: "Create New Quotation" });
  await expectHeader(quotation, { "Phone": "", "VAT NO.": "", "Address": "", "Remarks": "" });
  expect(await page.evaluate(() => [sessionStorage.getItem("sales_to_quotation_switch"), sessionStorage.getItem("quotation_to_sales_switch")])).toEqual([null, null]);
});

test("quotation form type 3 receives the products, shipping and discount from the sale and sends them back", async ({ page, context }) => {
  const calcBodies = [];
  await mockApi(page, context, { calcBodies, settings: { quotation_create_form_design: "type3" } });
  await openSalesCreate(page);
  const sales = page.locator("#sales_create_form");
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await page.locator(".modal-content", { hasText: "Import from Sales" }).getByText("SI-0001").click();
  await page.getByTestId("qip-import").click();
  await expect.poll(() => showsProduct(sales, "Oil Filter")).toBe(true);
  await sales.getByPlaceholder("Remarks", { exact: true }).first().fill("Workshop job");
  await sales.locator("#sales_shipping_fees").first().fill("12");
  await sales.locator("#sales_discount_with_vat").first().fill("2.3");
  await page.waitForTimeout(400);

  await salesSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/quotations$/);
  await expect.poll(() => {
    const last = calcBodies.filter((c) => c.url.includes("/v1/quotation/")).pop();
    return last ? [last.body.shipping_handling_fees, last.body.discount_with_vat, last.body.remarks, (last.body.products || []).map((p) => p.product_id)] : null;
  }).toEqual([12, 2.3, "Workshop job", ["p-oil"]]);

  await quotationSwitch(page).click();
  await expect(page).toHaveURL(/\/dashboard\/sales$/);
  await expect.poll(() => showsProduct(sales, "Oil Filter")).toBe(true);
  await expect(sales.getByPlaceholder("Remarks", { exact: true }).first()).toHaveValue("Workshop job");
  await expect(sales.locator("#sales_shipping_fees").first()).toHaveValue("12");
});
