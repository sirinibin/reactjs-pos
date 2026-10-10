// Helpers for the ZATCA Phase 2 specs (device onboarding and invoice
// reporting). Every test gets a brand-new store set up for ZATCA's
// non-production (developer portal) environment with the test taxpayer the
// owner gave us: VAT 399999999900003, CRN 4030360927. No existing store is
// ever touched.
//
// The real sandbox (https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal)
// is only used when E2E_ZATCA=1; the API then needs pos-rest's ZatcaPython
// venv and the ZATCA Fatoora SDK (see the CI notes in ../zatca.spec.js).
const { expect } = require('@playwright/test');
const fixtures = require('../fixtures');
const { savedSession, uniq, round2 } = require('../api');
const { typeInto, escapeRe } = require('./purchase');

const ZATCA_VAT = '399999999900003';
const ZATCA_CRN = '4030360927';
const ZATCA_ENV = 'NonProduction'; // developer-portal in pos-rest's ZatcaPython
const SANDBOX = process.env.E2E_ZATCA === '1';
// ZATCA's developer portal does not check the OTP; 123345 is the value its
// documentation gives. pos-rest's csr_and_onboarding_cmd.py used 123456.
const SANDBOX_OTP = process.env.E2E_ZATCA_OTP || '123345';
// Onboarding runs the Fatoora CLI and 1 + 6 + 1 sandbox calls; reporting one
// invoice signs it with the CLI and makes one call. Be generous.
const ZATCA_TIMEOUT = Number(process.env.E2E_ZATCA_TIMEOUT || 180_000);

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => ARABIC_DIGITS[d]);

/** A phone number no other test uses (customers' phones must be unique). */
const uniquePhone = () => `05${String(Date.now()).slice(-7)}${Math.floor(Math.random() * 10)}`;

// The invoice titles the Stores > Create screen sends for a new store
// (src/store/create.js); the API leaves them empty otherwise.
const SALES_TITLES = {
  phase2: {
    sales_titles: {
      paid: 'SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة',
      credit: 'SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة',
      cash: 'SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة',
    },
    sales_return_titles: {
      paid: 'SIMPLIFIED CREDIT NOTE TAX INVOICE | فاتورة ضريبية مبسطة لملاحظة الائتمان',
      credit: 'SIMPLIFIED CREDIT NOTE CREDIT TAX INVOICE | مذكرة ائتمان مبسطة فاتورة ضريبة الائتمان',
      cash: 'SIMPLIFIED CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة',
    },
  },
  phase2_b2b: {
    sales_titles: {
      paid: 'STANDARD TAX INVOICE | فاتورة ضريبية قياسية',
      credit: 'STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية',
      cash: 'STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية',
    },
    sales_return_titles: {
      paid: 'STANDARD CREDIT NOTE TAX INVOICE | فاتورة ضريبية لسند ائتمان قياسي',
      credit: 'STANDARD CREDIT NOTE CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية',
      cash: 'STANDARD CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية بسند ائتمان قياسي',
    },
  },
};

/**
 * The POST /v1/store body for a fresh phase-2, non-production store with the
 * ZATCA test taxpayer. Name and code are unique per call.
 */
function zatcaStorePayload(word = uniq('ZT')) {
  const store = {
    name: `E2E ZATCA ${word}`,
    name_in_arabic: `متجر زاتكا ${word}`,
    code: word,
    branch_name: 'Riyadh Branch',
    branch_name_in_arabic: 'فرع الرياض',
    country_code: 'SA',
    business_category: 'Supply activities',
    registration_number: ZATCA_CRN,
    registration_number_in_arabic: toArabicDigits(ZATCA_CRN),
    email: `${word.toLowerCase()}@startpos.test`,
    phone: '0500000003',
    phone_in_arabic: toArabicDigits('0500000003'),
    vat_no: ZATCA_VAT,
    vat_no_in_arabic: toArabicDigits(ZATCA_VAT),
    vat_percent: 15,
    national_address: {
      building_no: '1234', building_no_arabic: toArabicDigits('1234'),
      street_name: 'King Fahd Road', street_name_arabic: 'طريق الملك فهد',
      district_name: 'Olaya', district_name_arabic: 'العليا',
      city_name: 'Riyadh', city_name_arabic: 'الرياض',
      zipcode: '12345', zipcode_arabic: toArabicDigits('12345'),
      additional_no: '5678', additional_no_arabic: toArabicDigits('5678'),
      unit_no: '1', unit_no_arabic: toArabicDigits('1'),
    },
    zatca: { phase: '2', env: ZATCA_ENV },
    settings: { invoice: SALES_TITLES },
  };
  // Invoice numbers like INV-0001: the connect call turns the sales prefix
  // into the CSR serial number ("1-INV|2-0001|3-<uuid>").
  const prefixes = {
    sales: 'INV', sales_return: 'CRN', purchase: 'PUR', purchase_return: 'PRT',
    purchase_order: 'PO', quotation: 'QTN', customer: 'CUS', vendor: 'VEN',
  };
  for (const [k, prefix] of Object.entries(prefixes)) {
    store[`${k}_serial_number`] = { prefix, start_from_count: 1, padding_count: 4 };
  }
  return store;
}

/** Creates a fresh ZATCA test store through the API and returns it. */
async function createZatcaStore(request) {
  const { token } = savedSession();
  const payload = zatcaStorePayload();
  const res = await request.post('/v1/store', { headers: { Authorization: token }, data: payload });
  const text = await res.text();
  expect(res.status(), `POST /v1/store -> ${text.slice(0, 500)}`).toBe(200);
  const body = JSON.parse(text);
  expect(body.status, JSON.stringify(body.errors)).toBe(true);
  expect(body.result?.id).toMatch(/^[0-9a-f]{24}$/);
  return body.result;
}

/**
 * API client bound to one store (the shared apiClient is bound to the e2e
 * admin's default store). Every call asserts HTTP 200 unless `raw` is used.
 */
function storeApi(request, storeId) {
  const { token } = savedSession();
  const headers = { Authorization: token };
  const withStore = (path) => `${path}${path.includes('?') ? '&' : '?'}search[store_id]=${storeId}`;
  const now = () => new Date().toISOString();

  async function raw(method, path, data, timeout) {
    const res = await request.fetch(withStore(path), { method, headers, data, timeout });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
    return { status: res.status(), body, text };
  }
  async function call(method, path, data, timeout) {
    const r = await raw(method, path, data, timeout);
    expect(r.status, `${method} ${path} -> ${r.text.slice(0, 800)}`).toBe(200);
    return r.body;
  }

  /** A sales line in the API's shape at a unit price without VAT. */
  const line = (product, qty, price, extra = {}) => ({
    product_id: product.id,
    name: product.name,
    part_number: product.part_number,
    unit: product.unit || 'PC',
    quantity: qty,
    unit_price: price,
    unit_price_with_vat: round2(price * 1.15),
    purchase_unit_price: 60,
    purchase_unit_price_with_vat: 69,
    ...extra,
  });

  return {
    storeId,
    raw,
    get: (path, timeout) => call('GET', path, undefined, timeout),
    post: (path, data, timeout) => call('POST', path, { store_id: storeId, ...data }, timeout),

    async getStore() {
      return (await call('GET', `/v1/store/${storeId}`)).result;
    },

    async createProduct({ partNumber, name, price = 100, purchasePrice = 60 } = {}) {
      const w = uniq('P');
      const body = await this.post('/v1/product', {
        name: name || `ZATCA Item ${w}`,
        name_in_arabic: 'منتج اختبار',
        part_number: partNumber || `ZT-${w}`,
        unit: 'PC',
        product_stores: { [storeId]: {
          store_id: storeId,
          retail_unit_price: price, retail_unit_price_with_vat: round2(price * 1.15),
          purchase_unit_price: purchasePrice, purchase_unit_price_with_vat: round2(purchasePrice * 1.15),
        } },
      });
      expect(body.result?.id, JSON.stringify(body.errors)).toMatch(/^[0-9a-f]{24}$/);
      return body.result;
    },

    /** A walk-in style customer with no VAT number: invoices to them are simplified (B2C). */
    async createB2CCustomer({ name } = {}) {
      const body = await this.post('/v1/customer', { name: name || `Walk-in ${uniq('C')}`, phone: uniquePhone() });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    /**
     * A business customer with a VAT number and full national address, which
     * makes pos-rest send a standard (B2B) invoice for clearance.
     */
    async createB2BCustomer({ name, vatNo = '399999999800003' } = {}) {
      const body = await this.post('/v1/customer', {
        name: name || `ZATCA Buyer ${uniq('B')} LLC`,
        name_in_arabic: 'شركة المشتري',
        phone: uniquePhone(),
        vat_no: vatNo,
        vat_no_in_arabic: toArabicDigits(vatNo),
        registration_number: '1010010000',
        national_address: {
          building_no: '4321', building_no_arabic: toArabicDigits('4321'),
          street_name: 'Prince Sultan Street', street_name_arabic: 'شارع الأمير سلطان',
          district_name: 'Al Rawdah', district_name_arabic: 'الروضة',
          city_name: 'Jeddah', city_name_arabic: 'جدة',
          zipcode: '23435', zipcode_arabic: toArabicDigits('23435'),
          additional_no: '1111', unit_no: '2',
        },
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    /** POST /v1/order; lines: [{ product, qty, price }]. */
    async createSale({ customer, lines, payments = [], reportToZatca = false }) {
      const r = await raw('POST', '/v1/order', {
        store_id: storeId,
        date_str: now(),
        status: 'delivered',
        vat_percent: 15,
        discount: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        customer_id: customer.id,
        customer_name: customer.name,
        enable_report_to_zatca: reportToZatca,
        products: lines.map((l) => line(l.product, l.qty, l.price)),
        payments_input: payments.map((p) => ({ date_str: now(), amount: p.amount, method: p.method || 'cash', deleted: false })),
      }, ZATCA_TIMEOUT);
      expect(r.status, `POST /v1/order -> ${r.text.slice(0, 800)}`).toBe(200);
      expect(r.body.status, JSON.stringify(r.body.errors)).toBe(true);
      return r.body.result;
    },

    async getSale(id) {
      return (await call('GET', `/v1/order/${id}`)).result;
    },

    async getSalesReturn(id) {
      return (await call('GET', `/v1/sales-return/${id}`)).result;
    },

    async returnsOf(saleId) {
      const body = await call('GET', `/v1/sales-return?search[order_id]=${saleId}&limit=50`);
      return (body.result || []).filter((r) => !r.deleted && r.order_id === saleId);
    },
  };
}

/** One line describing a document's ZATCA state, for assertion messages. */
function zatcaState(doc) {
  const z = doc?.zatca || {};
  return JSON.stringify({
    reporting_passed: z.reporting_passed,
    is_simplified: z.is_simplified,
    reporting_failed_count: z.reporting_failed_count,
    reporting_errors: z.reporting_errors,
    compliance_check_failed_count: z.compliance_check_failed_count,
    compliance_check_errors: z.compliance_check_errors,
  });
}

/** The store's onboarding state without its keys and secrets, for assertion messages. */
function connectionState(store) {
  const z = store?.zatca || {};
  return JSON.stringify({
    phase: z.phase,
    env: z.env,
    connected: z.connected,
    compliance_request_id: z.compliance_request_id,
    production_request_id: z.production_request_id,
    compliance_check: z.compliance_check,
    connection_failed_count: z.connection_failed_count,
    connection_errors: z.connection_errors,
  });
}

/**
 * Switches the signed-in admin to `store` with the store switcher in the top
 * bar, like a person does, and checks the app now works in that store.
 */
async function switchToStore(page, store, startAt = '/dashboard/stores') {
  await page.goto(startAt);
  const toggle = page.locator('#store-switcher-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  const item = page.locator('.dropdown-menu.show .dropdown-item').filter({ hasText: store.name });
  await expect(item).toHaveCount(1);
  await Promise.all([
    page.waitForEvent('load'),
    item.click(),
  ]);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('store_id'))).toBe(store.id);
  await expect(page.locator('#store-switcher-toggle')).toContainText(store.name);
}

/** Finds the store's row on the Stores screen (filtered by its name). */
async function storeRow(page, store) {
  if (!/\/dashboard\/stores/.test(page.url())) await page.goto('/dashboard/stores');
  // A hover tooltip (e.g. a long store name) can cover the filter: move away first.
  const vp = page.viewportSize() || { width: 1366, height: 800 };
  await page.mouse.move(vp.width - 2, vp.height - 2);
  await expect(page.locator('.tooltip.show')).toHaveCount(0);
  await typeInto(page, page.locator('input#name'), store.name);
  const row = page.locator('table tbody tr').filter({ hasText: store.code });
  await expect(row).toHaveCount(1);
  return row;
}

/** Opens the "Connect to Zatca" dialog from the store's row and returns it. */
async function openConnectDialog(page, store) {
  const row = await storeRow(page, store);
  await row.getByRole('button', { name: /Connect to Zatca/i }).click();
  const dialog = page.locator('.zatca-connect-modal .modal-content');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Connect to Zatca')).toBeVisible();
  return dialog;
}

/**
 * Types the OTP (may be empty), presses Connect and returns the connect call's
 * HTTP status and body.
 */
async function submitOtp(page, dialog, otp) {
  const input = dialog.locator('#otp');
  if (otp) {
    await typeInto(page, input, otp);
    await expect(input).toHaveValue(otp);
  } else {
    await input.fill('');
  }
  const responded = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes('/v1/store/zatca/connect'),
    { timeout: ZATCA_TIMEOUT },
  );
  await dialog.getByRole('button', { name: 'Connect', exact: true }).click();
  const res = await responded;
  let body;
  try { body = await res.json(); } catch (_) { body = { raw: await res.text() }; }
  return { status: res.status(), body };
}

/**
 * `test` with the shared guard, plus a way to accept one tracked API 5xx.
 *
 * The shared guard fails a test on any /v1 5xx. allowKnown5xx() records a
 * known-issue annotation (as fixtures.js describes) and lets a 5xx from URLs
 * matching `urlPattern` through; it is attached to the report, not hidden.
 * Every other 5xx still fails the test.
 */
const allowed5xx = new Map();
const test = fixtures.test.extend({
  guard: [async ({ guard }, use, testInfo) => {
    await use(guard);
    const patterns = allowed5xx.get(testInfo.testId) || [];
    allowed5xx.delete(testInfo.testId);
    if (!patterns.length) return;
    const tolerated = guard.problems.filter((p) => p.startsWith('API ') && patterns.some((re) => re.test(p)));
    if (!tolerated.length) return;
    for (const p of tolerated) guard.problems.splice(guard.problems.indexOf(p), 1);
    await testInfo.attach('known-issue-api-5xx', { body: tolerated.join('\n'), contentType: 'text/plain' });
  }, { auto: true }],
});

function allowKnown5xx(urlPattern, description) {
  const info = test.info();
  info.annotations.push({ type: 'known-issue', description });
  const list = allowed5xx.get(info.testId) || [];
  list.push(urlPattern);
  allowed5xx.set(info.testId, list);
}

module.exports = {
  test, expect, allowKnown5xx,
  ZATCA_VAT, ZATCA_CRN, ZATCA_ENV, SANDBOX, SANDBOX_OTP, ZATCA_TIMEOUT,
  toArabicDigits, zatcaStorePayload, createZatcaStore, storeApi, zatcaState, connectionState,
  switchToStore, storeRow, openConnectDialog, submitOtp, typeInto, escapeRe,
};
