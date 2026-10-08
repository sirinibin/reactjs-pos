/**
 * Integration test: quotation form type 3 -> Import -> From Quotations / From Purchases /
 * From Sales / From Purchase Order.
 *
 * Renders the real QuotationType3Form with the real SourceDocumentPicker and
 * QuotationImportPicker; only fetch and unrelated heavy children are faked. Checks the
 * dropdown, the search requests, and what the form sends to calculate-net-total.
 */
import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('bootstrap', () => {
  function Tooltip() { return { dispose() {} }; }
  Tooltip.getInstance = () => null;
  function Popover() { return { dispose() {} }; }
  Popover.getInstance = () => null;
  return { Modal: function Modal() {}, Tooltip, Popover };
});
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-datepicker', () => ({ __esModule: true, default: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../vehicle/create.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../utils/products.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: require('react').forwardRef(() => null) }));
jest.mock('../../purchase_order/PurchaseOrderPicker.js', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({ open: (cb) => global.__poPickerOpen(cb) }));
      return null;
    }),
  };
});

import QuotationType3Form from '../QuotationType3Form.js';

const STORE_ID = '64abc123456789001234abcd';
const QUOTATION = {
  id: 'q-src-1', code: 'QT-SRC-001', date: '2026-09-30T10:00:00Z', customer_name: 'ACME Trading', net_total: 57.5,
  products: [
    { product_id: 'p-oil', part_number: 'OF-1', name: 'Oil Filter', quantity: 2, unit: 'pcs', unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15 },
    { product_id: 'p-air', part_number: 'AF-2', name: 'Air Filter', quantity: 1, unit: 'pcs', unit_price: 20, unit_price_with_vat: 23 },
  ],
};
const PURCHASE = {
  id: 'pu-src-1', code: 'PI-SRC-001', date: '2026-09-29T10:00:00Z', vendor_name: 'Filter Supplies Co', net_total: 40,
  products: [
    { product_id: 'p-oil', part_number: 'OF-1', name: 'Oil Filter', quantity: 6, unit: 'pcs', purchase_unit_price: 4, purchase_unit_price_with_vat: 4.6 },
    { product_id: 'p-belt', part_number: 'BT-9', name: 'Fan Belt', quantity: 2, unit: 'pcs', purchase_unit_price: 7, purchase_unit_price_with_vat: 8.05 },
  ],
};
const SALE = {
  id: 'so-src-1', code: 'SI-SRC-001', date: '2026-09-28T10:00:00Z', customer_name: 'ACME Trading', net_total: 80,
  products: [
    { product_id: 'p-plug', part_number: 'SP-4', name: 'Spark Plug', quantity: 8, unit: 'pcs', unit_price: 3, unit_price_with_vat: 3.45, unit_discount: 0.5, unit_discount_with_vat: 0.58 },
    { name: 'Labour (no product)', quantity: 1, unit_price: 50 },
  ],
};
const RETAIL = { 'p-oil': [10, 11.5], 'p-belt': [15, 17.25] };

let calcBodies, listUrls, failPrices, storeSettings;

function jsonResponse(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });
}

function mockFetch(url, options = {}) {
  const u = decodeURIComponent(String(url));
  if (u.includes('/calculate-net-total')) {
    const body = JSON.parse(options.body || '{}');
    calcBodies.push(body);
    return jsonResponse({ status: true, result: { net_total: 0 } });
  }
  if (/\/v1\/quotation\?/.test(u)) { listUrls.push(u); return jsonResponse({ status: true, result: [QUOTATION], total_count: 1 }); }
  if (/\/v1\/purchase\?/.test(u)) { listUrls.push(u); return jsonResponse({ status: true, result: [PURCHASE], total_count: 1 }); }
  if (/\/v1\/order\?/.test(u)) { listUrls.push(u); return jsonResponse({ status: true, result: [SALE], total_count: 1 }); }
  if (u.startsWith('/v1/product?') && u.includes('search[ids]=')) {
    if (failPrices) return jsonResponse({}, false);
    const ids = u.match(/search\[ids\]=([^&]*)/)[1].split(',');
    return jsonResponse({ status: true, result: ids.filter(id => RETAIL[id]).map(id => ({ id, product_stores: { [STORE_ID]: { retail_unit_price: RETAIL[id][0], retail_unit_price_with_vat: RETAIL[id][1] } } })) });
  }
  if (u.includes(`/v1/store/${STORE_ID}`)) {
    return jsonResponse({ status: true, result: { id: STORE_ID, name: 'Test Store', vat_percent: 15, settings: storeSettings } });
  }
  return jsonResponse({ status: true, result: [], total_count: 0 });
}

beforeEach(() => {
  calcBodies = [];
  listUrls = [];
  failPrices = false;
  storeSettings = { enable_products: true, enable_purchase_order_module: true, quotation_create_form_design: 'type3' };
  global.__poPickerOpen = jest.fn();
  localStorage.setItem('store_id', STORE_ID);
  localStorage.setItem('access_token', 'test-token');
  global.fetch = jest.fn(mockFetch);
});

afterEach(() => localStorage.clear());

async function openForm(props = {}) {
  const ref = createRef();
  const toast = jest.fn();
  render(<MemoryRouter><QuotationType3Form ref={ref} showToastMessage={toast} {...props} /></MemoryRouter>);
  await act(async () => { ref.current.open(); });
  await screen.findByTestId('import-dropdown-btn');
  return { ref, toast };
}

async function importFrom(testId, code) {
  fireEvent.click(screen.getByTestId('import-dropdown-btn'));
  fireEvent.click(await screen.findByTestId(testId));
  fireEvent.click(await screen.findByText(code));
  await screen.findByText('Select Products to Import');
  await waitFor(() => expect(screen.queryByTestId('qip-loading')).toBeNull());
}

function lastCalcProducts() {
  const withProducts = calcBodies.filter(b => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

describe('Quotation form type 3: Import dropdown (integration)', () => {
  test('offers From Quotations, From Purchases, From Sales and the P.O. option', async () => {
    await openForm();
    fireEvent.click(screen.getByTestId('import-dropdown-btn'));
    for (const id of ['import-from-quotation-btn', 'import-from-purchase-btn', 'import-from-sales-btn', 'import-from-po-btn']) {
      expect(await screen.findByTestId(id)).toBeInTheDocument();
    }
  });

  test('hides the P.O. option when the purchase order module is off', async () => {
    storeSettings = { enable_products: true, quotation_create_form_design: 'type3' };
    await openForm();
    fireEvent.click(screen.getByTestId('import-dropdown-btn'));
    expect(await screen.findByTestId('import-from-sales-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('import-from-po-btn')).toBeNull();
  });

  test('From Quotations searches newest quotations and imports the ticked lines with their prices', async () => {
    const { toast } = await openForm();
    await importFrom('import-from-quotation-btn', 'QT-SRC-001');
    const url = listUrls.find(u => u.startsWith('/v1/quotation?'));
    expect(url).toContain(`search[store_id]=${STORE_ID}`);
    expect(url).toContain('sort=-created_at');
    fireEvent.click(screen.getByTestId('qip-row-1'));
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts().map(p => p.product_id)).toEqual(['p-oil']), { timeout: 3000 });
    expect(lastCalcProducts()[0]).toMatchObject({ quantity: 2, unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1 });
    expect(toast).toHaveBeenCalledWith('Imported 1 product', 'success');
  });

  test('From Purchases prices lines at the store selling price', async () => {
    await openForm();
    await importFrom('import-from-purchase-btn', 'PI-SRC-001');
    expect(screen.getByText('Purchase Price')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(2), { timeout: 3000 });
    const oil = lastCalcProducts().find(p => p.product_id === 'p-oil');
    expect(oil).toMatchObject({ quantity: 6, unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 0 });
  });

  test('From Purchases warns and imports at price 0 when selling prices cannot be loaded', async () => {
    failPrices = true;
    const { toast } = await openForm();
    await importFrom('import-from-purchase-btn', 'PI-SRC-001');
    expect(toast).toHaveBeenCalledWith('Could not load current selling prices; they will be 0.', 'warning');
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(2), { timeout: 3000 });
    expect(lastCalcProducts().every(p => p.unit_price === 0)).toBe(true);
  });

  test('From Sales searches orders and imports with the sale price and discount, hiding lines without a product', async () => {
    await openForm();
    await importFrom('import-from-sales-btn', 'SI-SRC-001');
    expect(listUrls.some(u => u.startsWith('/v1/order?'))).toBe(true);
    expect(screen.queryByText('Labour (no product)')).toBeNull();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts().map(p => p.product_id)).toEqual(['p-plug']), { timeout: 3000 });
    expect(lastCalcProducts()[0]).toMatchObject({ quantity: 8, unit_price: 3, unit_price_with_vat: 3.45, unit_discount: 0.5 });
  });

  test('a second import puts new lines on top and adds to the quantity of a product already there', async () => {
    await openForm();
    await importFrom('import-from-quotation-btn', 'QT-SRC-001');
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(2), { timeout: 3000 });
    await importFrom('import-from-purchase-btn', 'PI-SRC-001');
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(3), { timeout: 3000 });
    const products = lastCalcProducts();
    expect(products.map(p => p.product_id)).toEqual(['p-belt', 'p-oil', 'p-air']);
    // Oil Filter: 2 from the quotation + 6 from the purchase, keeping the quotation's price.
    expect(products[1]).toMatchObject({ quantity: 8, unit_price: 10 });
  });

  test('From P.O. still opens the purchase order picker', async () => {
    await openForm();
    fireEvent.click(screen.getByTestId('import-dropdown-btn'));
    fireEvent.click(await screen.findByTestId('import-from-po-btn'));
    expect(global.__poPickerOpen).toHaveBeenCalledWith(expect.any(Function));
  });

  test('non-VAT sales form (same component) has no Import dropdown', async () => {
    const ref = createRef();
    render(<MemoryRouter><QuotationType3Form ref={ref} apiBase="/v1/non-vat-sales" showToastMessage={jest.fn()} /></MemoryRouter>);
    await act(async () => { ref.current.open(); });
    await screen.findByText('Services');
    expect(screen.queryByTestId('import-dropdown-btn')).toBeNull();
  });
});
