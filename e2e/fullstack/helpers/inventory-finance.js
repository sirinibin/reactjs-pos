// Helpers for products-inventory.spec.js and finance.spec.js: arranging data
// through the real API and driving the StartPOS forms the way a person does
// (click, type with a small delay, pick the type-ahead suggestion).
const { expect } = require('@playwright/test');
const { apiClient, uniq } = require('../api');

/** Two decimal rounding, as the Go API rounds money. */
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The shared API client plus the calls these specs need. */
function invApi(request) {
  const api = apiClient(request);
  return Object.assign(api, {
    /** Raw call without the HTTP 200 assertion, to check refusals. */
    async tryPost(path, data) {
      const res = await request.post(`${path}?search[store_id]=${this.storeId}`, {
        headers: { Authorization: this.token },
        data: { store_id: this.storeId, ...data },
      });
      let body;
      try { body = await res.json(); } catch (_) { body = {}; }
      return { status: res.status(), body };
    },

    /** First non-deleted row of a list endpoint matching `search` params. */
    async list(path, search = {}, limit = 50) {
      const q = Object.entries(search).map(([k, v]) => `search[${k}]=${encodeURIComponent(v)}`).join('&');
      const body = await this.get(`${path}?${q}${q ? '&' : ''}limit=${limit}`);
      return body.result || [];
    },

    async createWarehouse(name) {
      const body = await this.post('/v1/warehouse', { name: name || `E2E Warehouse ${uniq()}` });
      expect(body.result?.id, JSON.stringify(body.errors)).toMatch(/^[0-9a-f]{24}$/);
      return body.result;
    },

    /** A purchase that brings `qty` of each product into the main store. */
    async stockUp(products, qty) {
      const vendor = await this.createVendor({ name: `E2E Vendor ${uniq()}` });
      const now = new Date().toISOString();
      const body = await this.post('/v1/purchase', {
        date_str: now, status: 'delivered', vat_percent: 15, discount: 0, shipping_handling_fees: 0,
        rounding_amount: 0, auto_rounding_amount: true, order_placed_by: this.userId,
        vendor_id: vendor.id, vendor_name: vendor.name,
        products: products.map((p) => ({
          product_id: p.id, name: p.name, part_number: p.part_number, unit: p.unit || 'PC',
          quantity: qty, purchase_unit_price: 60, purchase_unit_price_with_vat: 69,
        })),
        payments_input: [],
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    /** Stock of a product in this store, per warehouse code ('main_store' = the store itself). */
    async warehouseStocks(productId) {
      const p = await this.getProduct(productId);
      const ps = p.product_stores?.[this.storeId] || {};
      return { total: Number(ps.stock || 0), ...(ps.warehouse_stocks || {}) };
    },

    /** A sale (POST /v1/order) of `qty` × product at `price` (excl. VAT), paid in cash. */
    async createSale({ customer, product, qty = 1, price = 100, paid = true }) {
      const now = new Date().toISOString();
      const net = r2(qty * price * 1.15);
      const body = await this.post('/v1/order', {
        date_str: now, status: 'delivered', vat_percent: 15, discount: 0, shipping_handling_fees: 0,
        rounding_amount: 0, auto_rounding_amount: true,
        customer_id: customer.id, customer_name: customer.name,
        products: [{
          product_id: product.id, name: product.name, part_number: product.part_number, unit: product.unit || 'PC',
          quantity: qty, unit_price: price, unit_price_with_vat: r2(price * 1.15),
          purchase_unit_price: 60, purchase_unit_price_with_vat: 69,
        }],
        payments_input: paid ? [{ date_str: now, amount: net, method: 'cash', deleted: false }] : [],
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async getCustomer(id) {
      return (await this.get(`/v1/customer/${id}`)).result;
    },
  });
}

/** Types into a field like a person: click, select what is there, type with a small delay. */
async function typeInto(page, locator, text, delay = 30) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await page.keyboard.press('ControlOrMeta+A');
  await locator.pressSequentially(String(text), { delay });
}

/** The open (topmost visible) dialog. */
const topDialog = (page) => page.locator('[role=dialog]:visible').last();

/** Opens a list screen's Create form and waits for its title. */
async function openCreate(page, route, title) {
  await page.goto(`/dashboard/${route}`);
  const create = page.getByRole('button', { name: 'Create', exact: false }).first();
  await create.click();
  const dialog = topDialog(page);
  await expect(dialog.getByText(title, { exact: true }).first()).toBeVisible();
  return dialog;
}

/** A visible type-ahead suggestion (not a <select>'s <option>). */
function suggestion(page, match) {
  const name = match instanceof RegExp ? match : new RegExp(escapeRe(match), 'i');
  return page.getByRole('option', { name }).filter({ visible: true }).first();
}

/** Types into a type-ahead and clicks the suggestion matching `match`. */
async function pickSuggestion(page, input, text, match) {
  await typeInto(page, input, text, 40);
  const option = suggestion(page, match);
  await expect(option).toBeVisible();
  await option.click();
}

/** Waits for the save request a click triggers and returns the parsed body. */
async function submitAndCapture(page, button, method, urlRe) {
  const saved = page.waitForResponse((r) => r.request().method() === method && urlRe.test(r.url()));
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const res = await saved;
  let body = {};
  try { body = await res.json(); } catch (_) { /* not json */ }
  return { status: res.status(), body };
}

/** Records every response of `method` to a URL matching `urlRe`, to prove a refusal stored nothing. */
function recordResponses(page, method, urlRe) {
  const seen = [];
  page.on('response', (r) => { if (r.request().method() === method && urlRe.test(r.url())) seen.push(r); });
  return seen;
}

/** Opens a react-datepicker by clicking its input and picks today in the calendar. */
async function pickToday(page, input) {
  await input.click();
  const today = page.locator('.react-datepicker__day--today:not(.react-datepicker__day--outside-month)').filter({ visible: true }).first();
  await expect(today).toBeVisible();
  await today.click();
  await expect(input).not.toHaveValue('');
}

/** Clicks the visible OK / Cancel button of the app's confirm() dialog. */
async function answerConfirm(page, text, answer) {
  const dialog = topDialog(page);
  await expect(dialog.getByText(text)).toBeVisible();
  await dialog.getByRole('button', { name: answer, exact: true }).click();
}

module.exports = { recordResponses, pickToday, answerConfirm, invApi, suggestion, r2, escapeRe, typeInto, topDialog, openCreate, pickSuggestion, submitAndCapture, uniq };
