/**
 * Integration test: Quotation form -> Import -> From Quotations / From Purchases.
 *
 * Renders the real quotation form with the real SourceDocumentPicker and
 * QuotationImportPicker; only the network (fetch) and unrelated heavy child
 * forms are faked. Walks the whole flow: open the Import dropdown, pick a
 * quotation from the search modal, untick a product, change a quantity,
 * import, and checks what the form sends to /v1/quotation/calculate-net-total.
 */
import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('bootstrap', () => {
  function Tooltip() { return { dispose() {} }; }
  Tooltip.getInstance = () => null;
  function Popover() { return { dispose() {} }; }
  Popover.getInstance = () => null;
  return { Modal: function Modal() {}, Tooltip, Popover };
});
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../product/view.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../service/view.js', () => ({ __esModule: true, default: () => null }));
jest.mock('react-debounce-input', () => ({ DebounceInput: () => null }));

import QuotationCreate from '../create.js';

const STORE_ID = '64abc123456789001234abcd';
const SOURCE_QUOTATION = {
  id: 'q-src-1',
  code: 'QT-SRC-001',
  date: '2026-09-30T10:00:00Z',
  customer_name: 'ACME Trading',
  net_total: 57.5,
  products: [
    { product_id: 'p-oil', part_number: 'OF-1', name: 'Oil Filter', quantity: 2, unit: 'pcs', unit_price: 10, unit_price_with_vat: 11.5, unit_discount: 1, unit_discount_with_vat: 1.15, unit_discount_percent: 10 },
    { product_id: 'p-air', part_number: 'AF-2', name: 'Air Filter', quantity: 1, unit: 'pcs', unit_price: 20, unit_price_with_vat: 23 },
    { product_id: 'p-fuel', part_number: 'FF-3', name: 'Fuel Filter', quantity: 4, unit: 'pcs', unit_price: 5, unit_price_with_vat: 5.75 },
  ],
};

const SOURCE_PURCHASE = {
  id: 'pu-src-1',
  code: 'PI-SRC-001',
  date: '2026-09-29T10:00:00Z',
  vendor_name: 'Filter Supplies Co',
  net_total: 40,
  products: [
    { product_id: 'p-oil', part_number: 'OF-1', name: 'Oil Filter', quantity: 6, unit: 'pcs', purchase_unit_price: 4, purchase_unit_price_with_vat: 4.6, unit_discount: 0.5 },
    { product_id: 'p-belt', part_number: 'BT-9', name: 'Fan Belt', quantity: 2, unit: 'pcs', purchase_unit_price: 7, purchase_unit_price_with_vat: 8.05 },
  ],
};
const RETAIL = { 'p-oil': [10, 11.5], 'p-belt': [15, 17.25] };

let calcBodies;
let priceUrls;
let failPrices;
let quotationListUrls;

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });
}

function mockFetch(url, options = {}) {
  const u = String(url);
  if (u.includes('/v1/quotation/calculate-net-total')) {
    const body = JSON.parse(options.body || '{}');
    calcBodies.push(body);
    return jsonResponse({ status: true, result: body });
  }
  if (/\/v1\/quotation\?/.test(u)) {
    quotationListUrls.push(u);
    return jsonResponse({ status: true, result: [SOURCE_QUOTATION], total_count: 1 });
  }
  if (/\/v1\/purchase\?/.test(u)) {
    return jsonResponse({ status: true, result: [SOURCE_PURCHASE], total_count: 1 });
  }
  if (u.startsWith('/v1/product?') && decodeURIComponent(u).includes('search[ids]=')) {
    priceUrls.push(u);
    if (failPrices) return Promise.resolve({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) });
    const ids = decodeURIComponent(u).match(/search\[ids\]=([^&]*)/)[1].split(',');
    const result = ids.filter(id => RETAIL[id]).map(id => ({ id, product_stores: { [STORE_ID]: { retail_unit_price: RETAIL[id][0], retail_unit_price_with_vat: RETAIL[id][1] } } }));
    return jsonResponse({ status: true, result });
  }
  if (u.includes('/v1/store/')) {
    return jsonResponse({ status: true, result: { id: STORE_ID, name: 'Test Store', vat_percent: 15, settings: { enable_products: true } } });
  }
  return jsonResponse({ status: true, result: [], total_count: 0 });
}

beforeEach(() => {
  calcBodies = [];
  priceUrls = [];
  failPrices = false;
  quotationListUrls = [];
  localStorage.setItem('store_id', STORE_ID);
  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('quotation_form_type', 'type1');
  global.fetch = jest.fn(mockFetch);
});

afterEach(() => {
  localStorage.clear();
});

async function openForm() {
  const ref = createRef();
  render(
    <MemoryRouter>
      <QuotationCreate ref={ref} showToastMessage={jest.fn()} />
    </MemoryRouter>
  );
  await act(async () => { ref.current.open(); });
  return ref;
}

async function importFromQuotationDropdown() {
  const toggle = await screen.findByTestId('import-dropdown-btn');
  fireEvent.click(toggle);
  fireEvent.click(await screen.findByTestId('import-from-quotation-btn'));
  // Step 1: the quotation search modal loads quotations from the API.
  const row = await screen.findByText('QT-SRC-001');
  fireEvent.click(row);
  // Step 2: the product selection modal lists the quotation's products.
  await screen.findByText('Select Products to Import');
}

function lastCalcProducts() {
  const withProducts = calcBodies.filter(b => Array.isArray(b.products) && b.products.length > 0);
  return withProducts.length ? withProducts[withProducts.length - 1].products : [];
}

describe('Quotation form: Import > From Quotations (integration)', () => {
  test('searches quotations with the store id and newest-first sort', async () => {
    await openForm();
    await importFromQuotationDropdown();
    const url = quotationListUrls[0];
    expect(url).toContain(`search[store_id]=${STORE_ID}`);
    expect(url).toContain('sort=-created_at');
    expect(url).toContain('products');
  });

  test('imports only the ticked products, with edited quantities and source prices', async () => {
    await openForm();
    await importFromQuotationDropdown();

    // Untick Air Filter (row 2) and change Oil Filter quantity to 5.
    fireEvent.click(screen.getByTestId('qip-row-1'));
    const productModal = screen.getByText('Select Products to Import').closest('.modal-content');
    const qtyInputs = within(productModal).getAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '5' } });

    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(screen.queryByText('Select Products to Import')).toBeNull());

    await waitFor(() => {
      const products = lastCalcProducts();
      expect(products.map(p => p.product_id).sort()).toEqual(['p-fuel', 'p-oil']);
    }, { timeout: 3000 });

    const products = lastCalcProducts();
    const oil = products.find(p => p.product_id === 'p-oil');
    const fuel = products.find(p => p.product_id === 'p-fuel');
    expect(oil.quantity).toBe(5);
    expect(oil.unit_price).toBe(10);
    expect(oil.unit_discount).toBe(1);
    expect(fuel.quantity).toBe(4);
    expect(fuel.unit_price).toBe(5);
  });

  test('importing the same quotation twice adds quantities instead of duplicate lines', async () => {
    await openForm();
    await importFromQuotationDropdown();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(3), { timeout: 3000 });

    await importFromQuotationDropdown();
    // The second time, every product is flagged as already in the quotation.
    expect(screen.getAllByText('Already added')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('qip-import'));

    await waitFor(() => {
      const products = lastCalcProducts();
      expect(products).toHaveLength(3);
      expect(products.find(p => p.product_id === 'p-oil').quantity).toBe(4);
      expect(products.find(p => p.product_id === 'p-fuel').quantity).toBe(8);
    }, { timeout: 3000 });
  });

  test('closing the product modal imports nothing', async () => {
    await openForm();
    await importFromQuotationDropdown();
    const productModal = screen.getByText('Select Products to Import').closest('.modal-content');
    fireEvent.click(within(productModal).getByLabelText('Close'));
    await waitFor(() => expect(screen.queryByText('Select Products to Import')).toBeNull());
    await new Promise(r => setTimeout(r, 300));
    expect(lastCalcProducts()).toHaveLength(0);
  });

  async function importFromPurchaseDropdown() {
    fireEvent.click(await screen.findByTestId('import-dropdown-btn'));
    fireEvent.click(await screen.findByTestId('import-from-purchase-btn'));
    fireEvent.click(await screen.findByText('PI-SRC-001'));
    await screen.findByText('Select Products to Import');
    await waitFor(() => expect(screen.queryByTestId('qip-loading')).toBeNull());
  }

  test('From Purchases imports purchase lines with store selling prices and cost prices', async () => {
    await openForm();
    await importFromPurchaseDropdown();
    expect(decodeURIComponent(priceUrls[0])).toContain('search[ids]=p-oil,p-belt&');
    expect(decodeURIComponent(priceUrls[0])).toContain(`search[store_id]=${STORE_ID}`);
    // Selling price with VAT shown for the oil filter comes from the product master.
    expect(screen.getByText('11.50')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('qip-import'));

    await waitFor(() => expect(lastCalcProducts().map(p => p.product_id).sort()).toEqual(['p-belt', 'p-oil']), { timeout: 3000 });
    const oil = lastCalcProducts().find(p => p.product_id === 'p-oil');
    expect(oil.quantity).toBe(6);
    expect(oil.unit_price).toBe(10);
    expect(oil.purchase_unit_price).toBe(4);
    expect(oil.unit_discount).toBe(0);
  });

  test('From Purchases still imports (at price 0) when selling prices cannot be loaded', async () => {
    failPrices = true;
    await openForm();
    await importFromPurchaseDropdown();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(2), { timeout: 3000 });
    expect(lastCalcProducts().every(p => p.unit_price === 0)).toBe(true);
  });

  test('From Quotations then From Purchases adds the shared product quantity', async () => {
    await openForm();
    await importFromQuotationDropdown();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => expect(lastCalcProducts()).toHaveLength(3), { timeout: 3000 });
    await importFromPurchaseDropdown();
    fireEvent.click(screen.getByTestId('qip-import'));
    await waitFor(() => {
      const products = lastCalcProducts();
      expect(products).toHaveLength(4);
      // Oil Filter: 2 from the quotation + 6 from the purchase, keeping the quotation's price.
      const oil = products.find(p => p.product_id === 'p-oil');
      expect(oil.quantity).toBe(8);
      expect(oil.unit_price).toBe(10);
    }, { timeout: 3000 });
  });
});

