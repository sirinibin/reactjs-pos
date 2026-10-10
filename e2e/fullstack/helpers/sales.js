// Helpers for the quotation, sales return and sales payment specs: arranging
// sales and quotations through the real API, and driving the Quotation,
// Sales, Sales Return and Sales Payment forms like a person would.
const { expect } = require('@playwright/test');
const { uniq } = require('../api');
const { r2, purchaseApi, typeInto, escapeRe } = require('./purchase');

const PRODUCT_SEARCH = 'Part No. | Name | Name in Arabic | Brand | Country';
const CUSTOMER_SEARCH = 'Customer Name / Mob / VAT # / ID';

/** Line in the API's shape for a product at a unit price (without VAT). */
function line(product, qty, price, extra = {}) {
  return {
    product_id: product.id,
    name: product.name,
    part_number: product.part_number,
    unit: product.unit || 'PC',
    quantity: qty,
    unit_price: price,
    unit_price_with_vat: r2(price * 1.15),
    purchase_unit_price: 60,
    purchase_unit_price_with_vat: 69,
    ...extra,
  };
}

/** The purchase API helpers plus sales / quotation / return / payment calls. */
function salesApi(request) {
  const api = purchaseApi(request);
  const now = () => new Date().toISOString();

  return Object.assign(api, {
    /** A customer and `n` products (retail 100, purchase 60) with unique names. */
    async arrangeSale(n = 1, { stock = 0 } = {}) {
      const word = uniq('SL');
      const customer = await this.createCustomer({ name: `E2E Customer ${word}` });
      const products = [];
      for (let i = 0; i < n; i++) {
        products.push(await this.createProduct({
          name: `E2E Item ${String.fromCharCode(65 + i)} ${word}`,
          partNumber: `${String.fromCharCode(65 + i)}-${word}`,
        }));
      }
      if (stock > 0) {
        const vendor = await this.createVendor({ name: `E2E Vendor ${word}` });
        await this.createPurchase({ vendor, lines: products.map((product) => ({ product, qty: stock, price: 60 })) });
      }
      return { word, customer, products };
    },

    /** POST /v1/order. lines: [{ product, qty, price }]; payments: [{ amount, method }]. */
    async createSale({ customer, lines, payments = [] }) {
      const body = await this.post('/v1/order', {
        date_str: now(),
        status: 'delivered',
        vat_percent: 15,
        discount: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        customer_id: customer.id,
        customer_name: customer.name,
        products: lines.map((l) => line(l.product, l.qty, l.price)),
        payments_input: payments.map((p) => ({ date_str: now(), amount: p.amount, method: p.method || 'cash', deleted: false })),
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async getSale(id) {
      return (await this.get(`/v1/order/${id}`)).result;
    },

    /** POST /v1/quotation. lines: [{ product, qty, price }]. */
    async createQuotation({ customer, lines }) {
      const body = await this.post('/v1/quotation', {
        date_str: now(),
        type: 'quotation',
        status: 'delivered',
        vat_percent: 15,
        discount: 0,
        discount_percent: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        validity_days: 2,
        delivery_days: 7,
        customer_id: customer.id,
        customer_name: customer.name,
        products: lines.map((l) => line(l.product, l.qty, l.price)),
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async getQuotation(id) {
      return (await this.get(`/v1/quotation/${id}`)).result;
    },

    /** POST /v1/sales-return for `qty` of the first line of a sale. */
    async createSalesReturn({ sale, product, qty, price = 100 }) {
      const body = await this.post('/v1/sales-return', {
        order_id: sale.id,
        order_code: sale.code,
        date_str: now(),
        status: 'received',
        vat_percent: 15,
        discount: 0,
        shipping_handling_fees: 0,
        rounding_amount: 0,
        auto_rounding_amount: true,
        customer_id: sale.customer_id,
        payments_input: [],
        products: [line(product, qty, price, { selected: true })],
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    /** Sales returns recorded against a sale. */
    async returnsOf(saleId) {
      const body = await this.get(`/v1/sales-return?search[order_id]=${saleId}&limit=50`);
      return (body.result || []).filter((r) => !r.deleted && r.order_id === saleId);
    },

    /** Sales payments recorded against a sale. */
    async salePaymentsOf(saleId) {
      const body = await this.get(`/v1/sales-payment?search[order_id]=${saleId}&limit=50`);
      return (body.result || []).filter((p) => !p.deleted && p.order_id === saleId);
    },
  });
}

/** Picks a customer through the form's customer type-ahead. */
async function chooseCustomer(page, scope, customer) {
  const input = scope.getByPlaceholder(CUSTOMER_SEARCH);
  await typeInto(page, input, customer.name);
  await scope.locator('.rbt-menu [role=option]').filter({ hasText: new RegExp(escapeRe(customer.name), 'i') }).first().click();
  await expect(input).toHaveValue(new RegExp(escapeRe(customer.name), 'i'));
}

/**
 * Adds a product by part number through the product type-ahead: types the
 * part number, waits for its suggestion, picks it with Enter, and waits for
 * the form to move the cursor to the new line's quantity (as it does for a
 * person). Returns the new line's index. `prefix` is "quotation" or "sales".
 */
async function addProduct(page, scope, product, prefix) {
  const rows = scope.locator(`input[id^="${prefix}_product_part_number"]`);
  const before = await rows.count();
  const search = scope.getByPlaceholder(PRODUCT_SEARCH);
  await typeInto(page, search, product.part_number);
  await expect(scope.locator('.rbt-menu [role=option]').filter({ hasText: product.part_number }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(before + 1);
  const ids = await rows.evaluateAll((els, pn) => els.filter((e) => e.value === pn).map((e) => e.id), product.part_number);
  expect(ids, `row for ${product.part_number}`).toHaveLength(1);
  const index = Number(ids[0].replace(`${prefix}_product_part_number`, ''));
  await expect(scope.locator(`#${prefix}_product_quantity_${index}`)).toBeFocused();
  return index;
}

/** Types a new value into a numeric field of the form and checks it took. */
async function setNumber(page, locator, value) {
  await typeInto(page, locator, value, 50);
  await expect(locator).toHaveValue(String(value));
}

/**
 * The Quotation form's "Net Total(with VAT)" amount (not the "Before
 * Rounding" one), as shown to the user.
 */
function quotationNetTotal(dialog) {
  return dialog.locator('tr').filter({ hasText: /Net Total\(with VAT\)(?! Before)/ }).last();
}

/** Opens Quotations > Create and returns the dialog. */
async function openQuotationCreate(page) {
  await page.goto('/dashboard/quotations');
  await page.getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Create New Quotation' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Filters a list screen by its code column and returns the row for `code`. */
async function findRow(page, searchId, code) {
  const search = page.locator(`#${searchId}`);
  await typeInto(page, search, code);
  const row = page.locator('table tbody tr').filter({ hasText: code });
  await expect(row).toHaveCount(1);
  return row;
}

module.exports = {
  r2, typeInto, escapeRe, salesApi, chooseCustomer, addProduct, setNumber, quotationNetTotal, openQuotationCreate, findRow,
  PRODUCT_SEARCH, CUSTOMER_SEARCH,
};
