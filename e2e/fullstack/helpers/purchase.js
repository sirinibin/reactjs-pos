// Helpers for the purchases specs: arranging purchases through the real API
// and driving the Purchase / Purchase Return forms like a person would.
const { expect } = require('@playwright/test');
const { apiClient, uniq } = require('../api');

/** Two decimal rounding, the way the Go API rounds money (math.Round(x*100)/100). */
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

/**
 * The totals the API must store for a purchase whose lines are
 * [{ qty, price }] at 15% VAT with no discount / shipping.
 */
function expectedTotals(lines, vatPercent = 15) {
  let total = 0;
  for (const l of lines) total = r2(total + l.qty * l.price);
  const vat = r2(total * (vatPercent / 100));
  return { total, vat, net: r2(total + vat), qty: lines.reduce((s, l) => s + l.qty, 0) };
}

/**
 * The API client from ../api plus purchase specific calls.
 */
function purchaseApi(request) {
  const api = apiClient(request);

  return Object.assign(api, {
    /**
     * Creates a purchase via POST /v1/purchase.
     * lines: [{ product, qty, price }], payments: [{ amount, method }]
     */
    async createPurchase({ vendor, lines, payments = [], extra = {} }) {
      const now = new Date().toISOString();
      const body = await this.post('/v1/purchase', {
        date_str: now,
        status: 'delivered',
        vat_percent: 15,
        discount: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        order_placed_by: this.userId,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        products: lines.map((l) => ({
          product_id: l.product.id,
          name: l.product.name,
          part_number: l.product.part_number,
          unit: l.product.unit || 'PC',
          quantity: l.qty,
          purchase_unit_price: l.price,
          purchase_unit_price_with_vat: r2(l.price * 1.15),
        })),
        payments_input: payments.map((p) => ({ date_str: now, amount: p.amount, method: p.method || 'cash', deleted: false })),
        ...extra,
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async getPurchase(id) {
      return (await this.get(`/v1/purchase/${id}`)).result;
    },

    /** Raw POST without the 200 assertion, to check refusals. */
    async tryPost(path, data) {
      const res = await request.post(`${path}?search[store_id]=${this.storeId}`, {
        headers: { Authorization: this.token },
        data: { store_id: this.storeId, ...data },
      });
      let body;
      try { body = await res.json(); } catch (_) { body = {}; }
      return { status: res.status(), body };
    },

    /** Payments recorded against a purchase, as the Purchase Payments screen lists them. */
    async paymentsOf(purchaseId) {
      const body = await this.get(`/v1/purchase-payment?search[purchase_id]=${purchaseId}&limit=50`);
      return (body.result || []).filter((p) => !p.deleted);
    },

    /** Non-draft purchases stored for a vendor. */
    async purchasesOfVendor(vendorId) {
      const body = await this.get(`/v1/purchase?search[vendor_id]=${vendorId}&limit=50`);
      return (body.result || []).filter((p) => p.status !== 'draft');
    },

    /** Arranges a vendor and `n` products (retail 100, purchase 60) with unique names. */
    async arrange(n = 1) {
      const word = uniq('PU');
      const vendor = await this.createVendor({ name: `E2E Vendor ${word}` });
      const products = [];
      for (let i = 0; i < n; i++) {
        products.push(await this.createProduct({
          name: `E2E Part ${String.fromCharCode(65 + i)} ${word}`,
          partNumber: `${String.fromCharCode(65 + i)}-${word}`,
        }));
      }
      return { word, vendor, products };
    },
  });
}

/** Types into a locator like a person: focus, clear, type with a small delay. */
async function typeInto(page, locator, text, delay = 35) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await page.keyboard.press('ControlOrMeta+A');
  await locator.pressSequentially(String(text), { delay });
}

/** Opens Purchases > Create and returns the dialog. */
async function openPurchaseCreate(page) {
  await page.goto('/dashboard/purchases');
  await page.getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Create New Purchase')).toBeVisible();
  return dialog;
}

/** Picks the vendor in the Purchase form through its type-ahead. */
async function chooseVendor(page, dialog, vendor) {
  const input = dialog.getByPlaceholder('Vendor Name / Mob / VAT # / ID');
  await typeInto(page, input, vendor.name);
  await dialog.getByRole('option', { name: new RegExp(escapeRe(vendor.name), 'i') }).click();
  await expect(input).toHaveValue(new RegExp(escapeRe(vendor.name), 'i'));
}

/**
 * Adds a product by part number through the product type-ahead: types the
 * part number, waits for its suggestion and picks it with the keyboard.
 * Returns the row index the form gave the new line.
 */
async function addProduct(page, dialog, product) {
  const before = await dialog.locator('input[id^="purchase_product_part_number"]').count();
  const search = dialog.getByPlaceholder('Part No. | Name | Name in Arabic | Brand | Country');
  await typeInto(page, search, product.part_number);
  await expect(dialog.getByRole('option', { name: new RegExp(escapeRe(product.part_number)) })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog.locator('input[id^="purchase_product_part_number"]')).toHaveCount(before + 1);
  const ids = await dialog.locator('input[id^="purchase_product_part_number"]').evaluateAll((els, pn) => els.filter((e) => e.value === pn).map((e) => e.id), product.part_number);
  expect(ids, `row for ${product.part_number}`).toHaveLength(1);
  return Number(ids[0].replace('purchase_product_part_number', ''));
}

/** Sets quantity and unit price (without VAT) of one product line. */
async function setLine(page, dialog, index, { qty, price }) {
  if (qty !== undefined) {
    const q = dialog.locator(`#purchase_product_quantity_${index}`);
    await typeInto(page, q, qty);
    await expect(q).toHaveValue(String(qty));
  }
  if (price !== undefined) {
    const p = dialog.locator(`#purchase_product_unit_price_${index}`);
    await typeInto(page, p, price);
    await expect(p).toHaveValue(String(price));
  }
}

/** Clicks the form's Create button and returns the POST /v1/purchase response. */
async function submitPurchase(page, dialog) {
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/v1\/purchase\?/.test(r.url()));
  const btn = dialog.getByRole('button', { name: 'Create', exact: true }).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  return saved;
}

/** The purchases list row for one purchase code (filtered by the code search box). */
async function purchaseRow(page, code) {
  await page.goto('/dashboard/purchases');
  await typeInto(page, page.locator('#purchase_code'), code);
  const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: code, exact: true }) });
  await expect(row).toHaveCount(1);
  return row;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  r2, expectedTotals, purchaseApi, typeInto, openPurchaseCreate, chooseVendor, addProduct, setLine, submitPurchase, purchaseRow, escapeRe,
};
