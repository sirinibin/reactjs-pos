// ZATCA Phase 2: device onboarding and invoice reporting, through the real UI
// and the real API, in brand-new stores set up for ZATCA's non-production
// (developer portal) environment with the test taxpayer VAT 399999999900003 /
// CRN 4030360927. No existing store is touched.
//
// Two groups:
//  - "onboarding without the sandbox" always runs: the store's ZATCA state,
//    the store switcher, the Connect dialog's validation, the error a person
//    sees when onboarding cannot complete, and selling in a phase-2 store
//    that is not connected yet.
//  - "with the ZATCA sandbox" runs only with E2E_ZATCA=1, on a runner that
//    can reach https://gw-fatoora.zatca.gov.sa and whose API has
//    ZatcaPython/venv (pyOpenSSL asn1crypto cryptography lxml pytz requests),
//    Java and the ZATCA Fatoora SDK in ZatcaPython/utilities/fatoora-cli-simulation.
//    It onboards a fresh store with the sandbox OTP, then reports a simplified
//    (B2C) invoice, clears a standard (B2B) one, reports one from the Sales
//    list's Report button, and reports a credit note for a return.
const { AUTH_STATE } = require('./fixtures');
const {
  test, expect, allowKnown5xx,
  SANDBOX, SANDBOX_OTP, ZATCA_TIMEOUT, ZATCA_VAT, ZATCA_CRN, ZATCA_ENV,
  createZatcaStore, storeApi, zatcaState, connectionState,
  switchToStore, storeRow, openConnectDialog, submitOtp, typeInto,
} = require('./helpers/zatca');
const { findRow } = require('./helpers/sales');

test.use({ storageState: AUTH_STATE });

const CONNECT_URL = /\/v1\/store\/zatca\/connect/;
const form = (page) => page.locator('#sales_create_form');
const reportCheckbox = (page) => form(page).locator('#sales_report_to_zatca:visible');

/** Opens Sales > Create in the current store, after the list has loaded the store's ZATCA state. */
async function openSalesCreate(page, store) {
  const storeLoaded = page.waitForResponse((r) => r.url().includes(`/v1/store/${store.id}`) && r.status() === 200);
  await page.goto('/dashboard/sales');
  await storeLoaded;
  await page.getByRole('button', { name: 'Create' }).first().click();
  await expect(form(page).getByText('Create New Sales Order')).toBeVisible();
}

async function pickCustomer(page, name) {
  const box = form(page).getByPlaceholder('Customer Name / Mob / VAT # / ID');
  await typeInto(page, box, name);
  await page.getByRole('option', { name: new RegExp(name, 'i') }).first().click();
  await expect(form(page).getByText(name.toUpperCase()).first()).toBeVisible();
  // The type-ahead can re-open on the picked value and cover the product
  // search below it; dismiss it like a person would.
  const menu = form(page).locator('.rbt-menu:visible');
  await page.waitForTimeout(300);
  if (await menu.count()) await box.press('Escape');
  await expect(menu).toHaveCount(0);
}

const waitForCalc = (page) => page.waitForResponse((r) => r.url().includes('/v1/order/calculate-net-total') && r.status() === 200);

async function addProduct(page, partNumber) {
  const box = form(page).getByPlaceholder('Part No. | Name | Name in Arabic | Brand | Country');
  const calc = waitForCalc(page);
  await typeInto(page, box, partNumber);
  await page.getByRole('option', { name: new RegExp(partNumber) }).first().click();
  await calc;
}

async function setQuantity(page, line, qty) {
  const calc = waitForCalc(page);
  await typeInto(page, form(page).locator(`#sales_product_quantity_${line}`), qty);
  await calc;
}

async function payCash(page) {
  await form(page).locator('select').filter({ hasText: 'Bank Cheque' }).first().selectOption({ label: 'Cash' });
}

/** Presses Create and returns the POST /v1/order status and body (ZATCA failures come back as 4xx). */
async function saveSale(page) {
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/v1\/order(\?|$)/.test(r.url()),
    { timeout: ZATCA_TIMEOUT },
  );
  const button = form(page).getByRole('button', { name: 'Create', exact: true }).last();
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const res = await saved;
  let body;
  try { body = await res.json(); } catch (_) { body = { raw: await res.text() }; }
  return { status: res.status(), body };
}

/** Sells `qty` x 100 of `product` to `customer` for cash on the Sales screen, optionally reporting to ZATCA. */
async function sellOnSalesScreen(page, store, { customer, product, qty, report }) {
  await openSalesCreate(page, store);
  if (report) {
    await expect(reportCheckbox(page), 'the connected store offers "Report to Zatca"').toHaveCount(1);
    await reportCheckbox(page).check();
    await expect(reportCheckbox(page)).toBeChecked();
  }
  await pickCustomer(page, customer.name);
  await addProduct(page, product.part_number);
  if (qty !== 1) await setQuantity(page, 0, qty);
  await payCash(page);
  return saveSale(page);
}

test.describe('ZATCA phase 2: onboarding without the sandbox', () => {
  // One fresh store for this group (each store is its own MongoDB database,
  // so keep their number down). Created by whichever test runs first; a
  // worker restart after a failure simply makes another one.
  let shared;
  const freshStore = async (request) => (shared ||= await createZatcaStore(request));

  test('@devices a new non-production phase-2 store with the ZATCA test taxpayer waits to be connected', async ({ page }) => {
    const store = await freshStore(page.request);
    const api = storeApi(page.request, store.id);

    const saved = await api.getStore();
    expect(saved.vat_no).toBe(ZATCA_VAT);
    expect(saved.registration_number).toBe(ZATCA_CRN);
    expect(saved.zatca.phase).toBe('2');
    expect(saved.zatca.env).toBe(ZATCA_ENV);
    expect(saved.zatca.connected, connectionState(saved)).toBeFalsy();
    expect(saved.zatca.production_binary_security_token || '').toBe('');

    // The admin can work in it, and the top bar says which ZATCA environment it uses.
    await switchToStore(page, store);
    const vw = page.viewportSize()?.width || 1366;
    if (vw >= 576) await expect(page.locator('#store-switcher-toggle')).toContainText(ZATCA_ENV);

    // The Stores screen offers to connect it.
    const row = await storeRow(page, store);
    await expect(row.getByRole('button', { name: /Connect to Zatca/i })).toBeVisible();
    await expect(row).not.toContainText('Connected to Phase2');
  });

  test('connecting without an OTP is refused with "OTP is required" and nothing changes', async ({ page }) => {
    const store = await freshStore(page.request);
    const api = storeApi(page.request, store.id);
    const before = await api.getStore();
    await switchToStore(page, store);

    const dialog = await openConnectDialog(page, store);
    const { status, body } = await submitOtp(page, dialog, '');
    expect(status, JSON.stringify(body)).toBe(400);
    expect(body.status).toBe(false);
    expect(body.errors?.otp).toBe('OTP is required');
    await expect(dialog.getByText('OTP is required')).toBeVisible();
    await expect(dialog).toBeVisible(); // stays open for the OTP

    // The refusal is not recorded as a failed connection attempt.
    const after = await api.getStore();
    expect(after.zatca.connected, connectionState(after)).toBeFalsy();
    expect(after.zatca.connection_failed_count || 0, connectionState(after)).toBe(before.zatca.connection_failed_count || 0);
    expect(after.zatca.otp || '').toBe('');

    await dialog.locator('.modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('when onboarding cannot reach ZATCA the person sees why and the store stays not connected', async ({ page }) => {
    test.skip(SANDBOX, 'E2E_ZATCA=1: the sandbox is reachable here, so onboarding succeeds (covered below)');
    test.setTimeout(ZATCA_TIMEOUT + 60_000);
    // Known issue (pos-rest controller/zatca.go ConnectStoreToZatca): every
    // onboarding failure, including ZATCA being unreachable or refusing the
    // OTP, is answered with HTTP 500 instead of a 4xx/502 carrying the reason.
    allowKnown5xx(CONNECT_URL, 'POST /v1/store/zatca/connect answers HTTP 500 when ZATCA onboarding fails (sandbox unreachable, ZatcaPython/Fatoora SDK missing or OTP refused)');

    const store = await freshStore(page.request);
    const api = storeApi(page.request, store.id);
    await switchToStore(page, store);

    const dialog = await openConnectDialog(page, store);
    const { status, body } = await submitOtp(page, dialog, SANDBOX_OTP);
    const message = body.errors?.otp || '';
    test.info().annotations.push({ type: 'onboarding-failure', description: `HTTP ${status}: ${message.slice(0, 300)}` });

    // Without the sandbox (or without pos-rest's ZatcaPython venv / Fatoora SDK)
    // onboarding must fail, and say so.
    expect(status, JSON.stringify(body)).toBeGreaterThanOrEqual(400);
    expect(body.status).toBe(false);
    expect(message, JSON.stringify(body)).toMatch(/Error running zatca script|Error connecting to zatac|Zatca script failed|Error parsing zatca response/i);

    // The reason is shown under the OTP, the dialog stays open, and a toast says it failed.
    await expect(dialog.locator('div[style*="color: red"]')).toContainText(message.slice(0, 40));
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Error Connecting to Zatca!').first()).toBeVisible();

    const after = await api.getStore();
    expect(after.zatca.connected, connectionState(after)).toBeFalsy();
    expect(after.zatca.production_binary_security_token || '', connectionState(after)).toBe('');
    expect(after.zatca.production_secret || '').toBe('');
    if (/Error connecting to zatac/i.test(message)) {
      // The onboarding script ran and reported the failure: it is recorded on the store.
      expect(after.zatca.connection_failed_count, connectionState(after)).toBeGreaterThan(0);
      expect((after.zatca.connection_errors || []).join('\n')).toContain('Connection failure');
    }

    await dialog.locator('.modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    const row = await storeRow(page, store);
    await expect(row.getByRole('button', { name: /Connect to Zatca/i })).toBeVisible();
    await expect(row).not.toContainText('Connected to Phase2');
  });

  test('a phase-2 store that is not connected yet sells without reporting and prints a simplified invoice', async ({ page }) => {
    const store = await freshStore(page.request);
    const api = storeApi(page.request, store.id);
    const customer = await api.createB2CCustomer();
    const product = await api.createProduct();
    await switchToStore(page, store);

    await openSalesCreate(page, store);
    await pickCustomer(page, customer.name);
    await addProduct(page, product.part_number);
    await setQuantity(page, 0, 2);
    // Not connected: there is nothing to report to.
    await expect(form(page).locator('#sales_report_to_zatca')).toHaveCount(0);
    await payCash(page);
    const { status, body } = await saveSale(page);
    expect(status, JSON.stringify(body.errors)).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const order = body.result;

    // The printable invoice is the phase-2 simplified cash invoice, with the
    // QR the app draws itself (no ZATCA-signed QR yet).
    await expect(page.getByText('Sales Preview')).toBeVisible();
    await expect(page.getByText(order.code).first()).toBeVisible();
    await expect(page.getByText(/SIMPLIFIED CASH TAX INVOICE/).first()).toBeVisible();
    await expect(page.locator('img[alt="Invoice QR Code"]').first()).toBeVisible();
    await expect(page.locator('svg.qr-print')).toHaveCount(0);

    const stored = await api.getSale(order.id);
    expect(stored.store_id).toBe(store.id);
    expect(stored.net_total).toBe(230);
    expect(stored.payment_status).toBe('paid');
    expect(stored.zatca?.reporting_passed, zatcaState(stored)).toBeFalsy();
    expect(stored.zatca?.qr_code || '').toBe('');
  });
});

test.describe.serial('ZATCA phase 2: with the ZATCA sandbox (E2E_ZATCA=1)', () => {
  test.skip(!SANDBOX, 'Needs E2E_ZATCA=1, network access to gw-fatoora.zatca.gov.sa and the API\'s ZatcaPython venv + Fatoora SDK');
  test.describe.configure({ timeout: ZATCA_TIMEOUT * 2 + 60_000 });

  /** The store onboarded by the first test; the others report invoices from it. */
  let store;

  test('device onboarding through the Stores screen with the sandbox OTP connects the store', async ({ page }) => {
    store = await createZatcaStore(page.request);
    const api = storeApi(page.request, store.id);
    await switchToStore(page, store);

    const dialog = await openConnectDialog(page, store);
    const { status, body } = await submitOtp(page, dialog, SANDBOX_OTP);
    const after = await api.getStore();
    expect(status, `connect -> ${JSON.stringify(body.errors)}; store: ${connectionState(after)}`).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);

    // The dialog closes, and the Stores screen shows the store connected.
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Store Connected to Zatca Successfully!').first()).toBeVisible();
    const row = await storeRow(page, store);
    await expect(row).toContainText('Connected to Phase2');
    await expect(row.getByRole('button', { name: /Connect to Zatca/i })).toHaveCount(0);

    // The API stored the compliance and production CSIDs, and all six sample
    // documents passed ZATCA's compliance checks.
    const z = after.zatca;
    const state = connectionState(after);
    expect(z.connected, state).toBe(true);
    expect(z.env).toBe(ZATCA_ENV);
    expect(z.otp).toBe(SANDBOX_OTP);
    expect(z.private_key, state).toBeTruthy();
    expect(z.csr, state).toBeTruthy();
    expect(z.compliance_request_id, state).toBeGreaterThan(0);
    expect(z.binary_security_token, state).toBeTruthy();
    expect(z.secret, state).toBeTruthy();
    expect(z.production_request_id, state).toBeGreaterThan(0);
    expect(z.production_binary_security_token, state).toBeTruthy();
    expect(z.production_secret, state).toBeTruthy();
    expect(z.compliance_check, state).toEqual({
      standard_invoice: true, standard_credit_note: true, standard_debit_note: true,
      simplified_invoice: true, simplified_credit_note: true, simplified_debit_note: true,
    });
    expect(z.connection_errors || [], state).toEqual([]);
    expect(z.last_connected_at, state).toBeTruthy();
    expect(z.zatca_reconnect_required || false).toBe(false);
  });

  test('a simplified (B2C) cash sale on the Sales screen is reported to ZATCA and prints the ZATCA QR', async ({ page }) => {
    expect(store, 'onboarding test must run first').toBeTruthy();
    const api = storeApi(page.request, store.id);
    const customer = await api.createB2CCustomer();
    const product = await api.createProduct();
    await switchToStore(page, store);

    const { status, body } = await sellOnSalesScreen(page, store, { customer, product, qty: 2, report: true });
    expect(status, `POST /v1/order -> ${JSON.stringify(body.errors)}`).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const order = body.result;

    const stored = await api.getSale(order.id);
    const state = zatcaState(stored);
    expect(stored.net_total).toBe(230);
    expect(stored.zatca?.reporting_passed, state).toBe(true);
    expect(stored.zatca?.is_simplified, state).toBe(true);
    expect(stored.zatca?.reporting_passed_at, state).toBeTruthy();
    expect(stored.zatca?.reporting_invoice_hash, state).toBeTruthy();
    expect(stored.zatca?.qr_code, state).toBeTruthy();
    expect(stored.zatca?.reporting_failed_count || 0, state).toBe(0);

    // The invoice shows the ZATCA-signed QR and the simplified title.
    await expect(page.getByText('Sales Preview')).toBeVisible();
    await expect(page.getByText(order.code).first()).toBeVisible();
    await expect(page.getByText(/SIMPLIFIED CASH TAX INVOICE/).first()).toBeVisible();
    await expect(page.locator('svg.qr-print').first()).toBeVisible();

    // The Sales list marks it reported, with nothing left to report.
    await page.goto('/dashboard/sales');
    const row = await findRow(page, 'sales_code', order.code);
    await expect(row.locator('.badge.bg-success').filter({ hasText: 'Reported' })).toBeVisible();
    await expect(row.getByRole('button', { name: /^\s*Report\s*$/ })).toHaveCount(0);
  });

  test('a standard (B2B) sale to a VAT-registered customer is cleared by ZATCA', async ({ page }) => {
    expect(store, 'onboarding test must run first').toBeTruthy();
    const api = storeApi(page.request, store.id);
    const customer = await api.createB2BCustomer();
    const product = await api.createProduct({ price: 500 });
    await switchToStore(page, store);

    const { status, body } = await sellOnSalesScreen(page, store, { customer, product, qty: 1, report: true });
    expect(status, `POST /v1/order -> ${JSON.stringify(body.errors)}`).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);
    const order = body.result;

    const stored = await api.getSale(order.id);
    const state = zatcaState(stored);
    expect(stored.net_total).toBe(575);
    expect(stored.zatca?.reporting_passed, state).toBe(true);
    expect(stored.zatca?.is_simplified, `a standard invoice is cleared, not reported: ${state}`).toBe(false);
    expect(stored.zatca?.cleared_xml_url, state).toBeTruthy();
    expect(stored.zatca?.qr_code, state).toBeTruthy();

    await expect(page.getByText('Sales Preview')).toBeVisible();
    await expect(page.getByText(/STANDARD CASH TAX INVOICE/).first()).toBeVisible();
    await expect(page.locator('svg.qr-print').first()).toBeVisible();
  });

  test('an unreported invoice is reported from the Sales list\'s Report button', async ({ page }) => {
    expect(store, 'onboarding test must run first').toBeTruthy();
    const api = storeApi(page.request, store.id);
    const customer = await api.createB2CCustomer();
    const product = await api.createProduct();
    const sale = await api.createSale({ customer, lines: [{ product, qty: 1, price: 100 }], payments: [{ amount: 115 }] });
    expect(sale.zatca?.reporting_passed, zatcaState(sale)).toBeFalsy();
    await switchToStore(page, store);

    await page.goto('/dashboard/sales');
    const row = await findRow(page, 'sales_code', sale.code);
    await expect(row.locator('.badge').filter({ hasText: 'Not Reported' })).toBeVisible();
    const reported = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes(`/v1/order/zatca/report/${sale.id}`),
      { timeout: ZATCA_TIMEOUT },
    );
    await row.getByRole('button', { name: /^\s*Report\s*$/ }).click();
    const res = await reported;
    const body = await res.json();
    expect(res.status(), `report -> ${JSON.stringify(body.errors)}; sale: ${zatcaState(await api.getSale(sale.id))}`).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);

    await expect(page.getByText('Invoice reported successfully to Zatca!').first()).toBeVisible();
    await expect(row.locator('.badge.bg-success').filter({ hasText: 'Reported' })).toBeVisible();
    const stored = await api.getSale(sale.id);
    expect(stored.zatca?.reporting_passed, zatcaState(stored)).toBe(true);
    expect(stored.zatca?.is_simplified, zatcaState(stored)).toBe(true);
    expect(stored.zatca?.qr_code, zatcaState(stored)).toBeTruthy();
  });

  test('returning part of a reported sale reports a simplified credit note', async ({ page }) => {
    expect(store, 'onboarding test must run first').toBeTruthy();
    const api = storeApi(page.request, store.id);
    const customer = await api.createB2CCustomer();
    const product = await api.createProduct();
    const sale = await api.createSale({ customer, lines: [{ product, qty: 3, price: 100 }], reportToZatca: true });
    expect(sale.zatca?.reporting_passed, `the sale to return must be reported first: ${zatcaState(sale)}`).toBe(true);
    await switchToStore(page, store);

    await page.goto('/dashboard/sales');
    const row = await findRow(page, 'sales_code', sale.code);
    await row.getByRole('button', { name: 'Return' }).first().click();
    const dialog = page.locator('.modal-content').filter({ hasText: 'Create Sales Return' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(sale.code);

    const report = page.locator('#sales_return_report_to_zatca:visible');
    await expect(report, 'the connected store offers "Report to Zatca" on returns').toHaveCount(1);
    await report.check();
    await expect(report).toBeChecked();
    await dialog.locator('#select_sales_return_product_0').check();
    await typeInto(page, dialog.locator('#sales_return_product_quantity_0'), 1);
    await expect(dialog.locator('#sales_return_product_quantity_0')).toHaveValue('1');

    const saved = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/sales-return\?/.test(r.url()),
      { timeout: ZATCA_TIMEOUT },
    );
    await dialog.getByRole('button', { name: 'Create', exact: true }).first().click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), `POST /v1/sales-return -> ${JSON.stringify(body.errors)}`).toBe(200);
    expect(body.status, JSON.stringify(body.errors)).toBe(true);

    const ret = await api.getSalesReturn(body.result.id);
    const state = zatcaState(ret);
    expect(ret.order_id).toBe(sale.id);
    expect(ret.net_total).toBeCloseTo(115, 2);
    expect(ret.zatca?.reporting_passed, state).toBe(true);
    expect(ret.zatca?.is_simplified, state).toBe(true);
    expect(ret.zatca?.qr_code, state).toBeTruthy();
    expect((await api.returnsOf(sale.id)).map((r) => r.id)).toEqual([ret.id]);
  });
});
