// Talks to the real API with the signed-in e2e admin's token, for arranging
// data before a UI step and for checking what the UI saved afterwards.
const fs = require('fs');
const { expect } = require('@playwright/test');
const { AUTH_STATE } = require('./fixtures');

/** The access token and store id saved by global-setup's real sign-in. */
function savedSession() {
  const state = JSON.parse(fs.readFileSync(AUTH_STATE, 'utf8'));
  const ls = Object.fromEntries(state.origins.flatMap((o) => o.localStorage).map((e) => [e.name, e.value]));
  return { token: ls.access_token, storeId: ls.store_id, userId: ls.user_id };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** A unique, searchable word for one test's data. */
function uniq(prefix = 'E2E') {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
}

/**
 * API client bound to Playwright's `request` (or `page.request`) fixture.
 * Every call asserts HTTP 200; `body.status` is returned to the caller
 * because some endpoints report false on success.
 */
function apiClient(request) {
  const { token, storeId, userId } = savedSession();
  const headers = { Authorization: token };
  const withStore = (path) => `${path}${path.includes('?') ? '&' : '?'}search[store_id]=${storeId}`;

  async function call(method, path, data) {
    const res = await request.fetch(withStore(path), { method, headers, data });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
    expect(res.status(), `${method} ${path} -> ${text.slice(0, 500)}`).toBe(200);
    return body;
  }

  return {
    token, storeId, userId,
    get: (path) => call('GET', path),
    post: (path, data) => call('POST', path, { store_id: storeId, ...data }),
    put: (path, data) => call('PUT', path, { store_id: storeId, ...data }),
    del: (path) => call('DELETE', path),

    /** A product with a selling price and a purchase price in this store. */
    async createProduct({ name, partNumber, price = 100, purchasePrice = 60, unit = 'PC', extra = {} } = {}) {
      const w = uniq('P');
      const body = await this.post('/v1/product', {
        name: name || `E2E Product ${w}`,
        part_number: partNumber || `E2E-${w}`,
        unit,
        product_stores: { [storeId]: {
          store_id: storeId,
          retail_unit_price: price, retail_unit_price_with_vat: round2(price * 1.15),
          purchase_unit_price: purchasePrice, purchase_unit_price_with_vat: round2(purchasePrice * 1.15),
        } },
        ...extra,
      });
      expect(body.result?.id, JSON.stringify(body.errors)).toMatch(/^[0-9a-f]{24}$/);
      return body.result;
    },

    async getProduct(id) {
      return (await this.get(`/v1/product/${id}`)).result;
    },

    /** Stock of a product in this store, as the API reports it. */
    async stockOf(id) {
      const p = await this.getProduct(id);
      return Number(p.product_stores?.[storeId]?.stock || 0);
    },

    async createCustomer({ name, phone = '0501234567', extra = {} } = {}) {
      const body = await this.post('/v1/customer', { name: name || `E2E Customer ${uniq()}`, phone, ...extra });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },

    async createVendor({ name, phone = '0507654321', extra = {} } = {}) {
      const body = await this.post('/v1/vendor', { name: name || `E2E Vendor ${uniq()}`, phone, ...extra });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },
  };
}

module.exports = { apiClient, savedSession, uniq, round2 };
