// E2E: the column-settings modal opened from the customer/vendor search inside an
// import picker must appear on top of every modal already open (sales form,
// quotation form, the picker itself), not hidden behind them.
const { test, expect } = require("@playwright/test");

const STORE_ID = "64abc123456789001234abcd";

async function setup(page, context, { path, formTypeKey, formType, storeDesign = "type1", extraSettings = {} }) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 24.7, longitude: 46.7 });
  await page.route("**/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (/\/v1\/(customer|vendor)\?/.test(url)) {
      return json({ status: true, result: [{ id: "c-1", code: "C-001", name: "Acme Trading", search_label: "Acme Trading", phone: "0500000000", vat_no: "300000000000003" }] });
    }
    if (url.includes(`/v1/store/${STORE_ID}`)) {
      return json({ status: true, result: { id: STORE_ID, name: "E2E Store", code: "E2E", vat_percent: 15, country_code: "SA", zatca: { phase: "1" }, settings: { quotation_create_form_design: storeDesign, ...extraSettings } } });
    }
    return json({ status: true, result: [], total_count: 0 });
  });
  await page.addInitScript(([storeId, key, type]) => {
    localStorage.setItem("access_token", "e2e-token");
    localStorage.setItem("store_id", storeId);
    localStorage.setItem("store_name", "E2E Store");
    localStorage.setItem("user_id", "64abc123456789001234ffff");
    localStorage.setItem("user_role", "Admin");
    localStorage.setItem(key, type);
  }, [STORE_ID, formTypeKey, formType]);
  await page.goto(path);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("[data-testid$='import-dropdown-btn']:visible").first()).toBeVisible();
}

async function expectSettingsOnTop(page) {
  await page.locator(".rbt-input-main:visible").last().fill("acme");
  await page.getByTestId("party-search-settings-btn").click();
  const title = page.getByText("Party Search Settings");
  await expect(title).toBeVisible();
  const box = await title.boundingBox();
  // The element actually painted at the title's centre must belong to the settings modal.
  const onTop = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return !!(el && el.closest(".modal") && el.closest(".modal").textContent.includes("Party Search Settings"));
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.screenshot({ path: `test-results/settings-stacking-${Date.now()}.png` });
  expect(onTop, "settings modal is painted on top").toBe(true);
  // Closing it leaves the picker usable.
  await page.locator(".modal", { hasText: "Party Search Settings" }).locator(".btn-close").click();
  await expect(title).toBeHidden();
}

const SALES = { path: "/dashboard/sales", formTypeKey: "order_form_type", extraSettings: { enable_purchase_order_module: true, enable_sales_page_selection: true, enable_automobile_module: true } };

test("sales form type 1 > From Sales: customer search settings show on top", async ({ page, context }) => {
  await setup(page, context, { ...SALES, formType: "type1" });
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-sales-btn").click();
  await expectSettingsOnTop(page);
});

test("sales form type 1 > From Purchase: vendor search settings show on top", async ({ page, context }) => {
  await setup(page, context, { ...SALES, formType: "type1" });
  await page.getByTestId("sales-import-dropdown-btn").click();
  await page.getByTestId("import-from-purchase-btn").click();
  await expectSettingsOnTop(page);
});

for (const [type, prefix] of [["type2", "t2-"], ["type3", "t3-"], ["type4", "t4-"], ["type5", "t5-"]]) {
  test(`sales form ${type} > From Sales: customer search settings show on top`, async ({ page, context }) => {
    await setup(page, context, { ...SALES, formType: type });
    await page.getByTestId(`${prefix}import-dropdown-btn`).click();
    await page.getByTestId(`${prefix}import-from-sales-btn`).click();
    await expectSettingsOnTop(page);
  });
}

const QUOTATION = { path: "/dashboard/quotations", formTypeKey: "quotation_form_type" };

for (const design of ["type1", "type3"]) {
  for (const [item, party] of [["import-from-quotation-btn", "customer"], ["import-from-sales-btn", "customer"], ["import-from-purchase-btn", "vendor"]]) {
    test(`quotation form ${design} > ${item}: ${party} search settings show on top`, async ({ page, context }) => {
      await setup(page, context, { ...QUOTATION, formType: design, storeDesign: design });
      await page.getByTestId("import-dropdown-btn").click();
      await page.getByTestId(item).click();
      await expectSettingsOnTop(page);
    });
  }
}
