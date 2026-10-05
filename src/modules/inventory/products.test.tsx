import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { ProductListPage, ProductViewPage } from './products';
import { ProductEditorPage } from './productEditor';

const ps = (o: Record<string, any> = {}) => ({ [STORE_ID]: { store_id: STORE_ID, purchase_unit_price: 22.1, purchase_unit_price_with_vat: 25.415, wholesale_unit_price: 34.65, wholesale_unit_price_with_vat: 39.8475, retail_unit_price: 38.5, retail_unit_price_with_vat: 44.275, stock: 7, warehouse_stocks: { main_store: 5, WH1: 2 }, warehouse_racks: { main_store: 'A-6' }, sales_count: 4, sales_quantity: 8, ...o } });
const PRODUCTS = [
  { id: 'p1', name: 'Air Filter – Hyundai Elantra', name_in_arabic: 'فلتر هواء', part_number: 'AF-HY-ELN', ean_12: '100000000003(Old:X1)', brand_name: 'Bosch', category_name: ['Filters'], created_at: '2026-10-01T10:00:00Z', product_stores: ps() },
  { id: 'p2', name: 'Brake Kit', part_number: 'BK-1', set: { products: [{ product_id: 'p1' }] }, product_stores: ps({ stock: 0 }), deleted: true },
];
const META = { stock: 1905, retail_stock_value: 207921.5, wholesale_stock_value: 189726.85, purchase_stock_value: 128793.9, sales: 20334.3, sales_profit: 6455.2, sales_return: 0 };
const WAREHOUSES = { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [{ id: 'w1', code: 'WH1', name: 'Dammam' }] } };
const listMock = (extra: any[] = []) => mockApi([...extra, WAREHOUSES, { method: 'GET', path: '/v1/product', reply: { status: true, total_count: 2, result: PRODUCTS, meta: META } }]);

describe('Product list', { timeout: 20000 }, () => {
  it('renders rows, kit tag, cleaned barcode and stock totals', async () => {
    listMock();
    renderApp(<ProductListPage />, { at: '/stock/products' });
    const table = await screen.findByRole('table', { name: 'Products' });
    expect(await within(table).findByText('Air Filter – Hyundai Elantra')).toBeInTheDocument();
    expect(within(table).getByText('100000000003')).toBeInTheDocument();
    expect(within(table).getByText('Kit')).toBeInTheDocument();
    expect(screen.getByText('207,921.50')).toBeInTheDocument();
    expect(screen.getByText('1,905')).toBeInTheDocument();
  });

  it('only asks for products (not services) of the active store, with stats', async () => {
    const f = listMock();
    renderApp(<ProductListPage />, { at: '/stock/products' });
    await screen.findAllByText('Air Filter – Hyundai Elantra');
    const [c] = calls(f, 'GET', '/v1/product');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[is_service]')).toBe('0');
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
    expect(c.url.searchParams.get('select')).toContain('product_stores');
  });

  it('normalises the search text like the legacy typeahead', async () => {
    const f = listMock();
    renderApp(<ProductListPage />, { at: '/stock/products' });
    await screen.findAllByText('Air Filter – Hyundai Elantra');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'toy116');
    await waitFor(() => expect(calls(f, 'GET', '/v1/product').some((c) => c.url.searchParams.get('search[search_text]') === 'toy 116')).toBe(true), { timeout: 2000 });
  });

  it('views filter out-of-stock and deleted products', async () => {
    const f = listMock();
    renderApp(<ProductListPage />, { at: '/stock/products' });
    await screen.findAllByText('Air Filter – Hyundai Elantra');
    await userEvent.click(screen.getByRole('tab', { name: /^Out of stock/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/product').some((c) => c.url.searchParams.get('search[stock]') === '<=0')).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: /^Kits/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/product').some((c) => c.url.searchParams.get('search[is_set]') === '0')).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/product').some((c) => c.url.searchParams.get('search[deleted]') === '1')).toBe(true));
  });

  it('the location filter switches stock to that warehouse and its sort key', async () => {
    const f = listMock();
    renderApp(<ProductListPage />, { at: '/stock/products?f.warehouse=WH1&sort=-stores.warehouse_stocks.WH1' });
    const table = await screen.findByRole('table', { name: 'Products' });
    await within(table).findByText('Air Filter – Hyundai Elantra');
    expect(within(table).getByText('Stock here')).toBeInTheDocument();
    const c = calls(f, 'GET', '/v1/product').at(-1)!;
    expect(c.url.searchParams.get('search[warehouse_code]')).toBe('WH1');
    expect(c.url.searchParams.get('sort')).toBe('-stores.warehouse_stocks.WH1');
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('2');
  });

  it('deletes after confirmation and restores deleted rows', async () => {
    const f = listMock([
      { method: 'DELETE', path: '/v1/product/p1', reply: { status: true, result: 'Deleted successfully' } },
      { method: 'POST', path: '/v1/product/restore/p2', reply: { status: true, result: {} } },
    ]);
    renderApp(<ProductListPage />, { at: '/stock/products' });
    const table = await screen.findByRole('table', { name: 'Products' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Delete Air Filter – Hyundai Elantra' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete product?' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/product/p1')).toHaveLength(1));
    expect(calls(f, 'DELETE', '/v1/product/p1')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    await userEvent.click(within(table).getByRole('button', { name: 'Restore Brake Kit' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/product/restore/p2')).toHaveLength(1));
  });

  it('hides create and delete without permission', async () => {
    mockApi([
      WAREHOUSES,
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'products', read: true, create: false, update: false, delete: false }] } },
      { method: 'GET', path: '/v1/product', reply: { status: true, total_count: 2, result: PRODUCTS, meta: META } },
    ], { user: { id: 'u2', name: 'Clerk', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<ProductListPage />, { at: '/stock/products' });
    const table = await screen.findByRole('table', { name: 'Products' });
    await within(table).findByText('Air Filter – Hyundai Elantra');
    expect(screen.queryByRole('button', { name: 'New product' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument();
  });

  it('shows empty and error states', async () => {
    mockApi([WAREHOUSES, { method: 'GET', path: '/v1/product', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    const r = renderApp(<ProductListPage />, { at: '/stock/products' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
    r.unmount();
    mockApi([WAREHOUSES, { method: 'GET', path: '/v1/product', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<ProductListPage />, { at: '/stock/products' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });

  it('Ctrl+Shift+3 on a focused row opens that product’s sales movements', async () => {
    listMock();
    renderApp(<ProductListPage />, { at: '/stock/products', path: '/stock/products' });
    const table = await screen.findByRole('table', { name: 'Products' });
    const row = (await within(table).findByText('Air Filter – Hyundai Elantra')).closest('tr')!;
    row.focus();
    fireEvent.keyDown(document, { key: '#', code: 'Digit3', ctrlKey: true, shiftKey: true });
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });
});

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const HISTORY_ROWS = [
  { id: 'h1', date: daysAgo(2), reference_type: 'sales', reference_id: 'o1', reference_code: 'S-INV-000023', customer_name: 'RIYADH AUTO CARE', quantity: 60, stock: 7 },
  { id: 'h2', date: daysAgo(20), reference_type: 'purchase', reference_id: 'pu1', reference_code: 'P-INV-000005', vendor_name: 'GULF LUBRICANTS CO.', quantity: 30, stock: 37 },
  { id: 'h3', date: daysAgo(40), reference_type: 'sales', reference_id: 'o2', reference_code: 'S-INV-000019', customer_name: 'NAJD FLEET', quantity: 15, stock: 7 },
];
const VIEW = { ...PRODUCTS[0], ean_12: '100000000003', unit: 'Pc', barcode_base64: 'data:image/png;base64,AAAA', linked_products: [], images: [], created_by_name: 'Sirin' };
const viewMocks = (extra: any[] = []) => mockApi([
  ...extra, WAREHOUSES,
  { method: 'GET', path: '/v1/product/p1', reply: { status: true, result: VIEW } },
  { method: 'GET', path: /^\/v1\/product\/history\/p1$/, reply: (u: URL) => ({ status: true, total_count: HISTORY_ROWS.length, result: HISTORY_ROWS, meta: u.searchParams.get('search[stats]') ? { total_sales: 1200, total_purchase: 663 } : undefined }) },
]);

describe('Product view', { timeout: 20000 }, () => {
  it('shows the low-stock banner with a suggested order, chart, stock by location and pricing', async () => {
    viewMocks();
    renderApp(<ProductViewPage />, { at: '/stock/products/p1', path: '/stock/products/:id' });
    expect(await screen.findByRole('heading', { name: /Air Filter – Hyundai Elantra/ })).toBeInTheDocument();
    expect(await screen.findByText(/7 left — about \d+ days of stock\./)).toBeInTheDocument();
    expect(screen.getByText(/Suggested order: \d+ Pc from GULF LUBRICANTS CO\./)).toBeInTheDocument();
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0);
    expect(screen.getByText('Units sold per month')).toBeInTheDocument();
    const wh = screen.getByRole('table', { name: 'Stock by location' });
    expect(within(wh).getByText('Main Store')).toBeInTheDocument();
    expect(within(wh).getByText('Dammam')).toBeInTheDocument();
    expect(within(wh).getByText('A-6')).toBeInTheDocument();
    expect(screen.getByText('S-INV-000023')).toHaveAttribute('href', '/sales/invoices/o1');
    expect(screen.getByRole('button', { name: 'Create purchase order' })).toBeInTheDocument();
  });

  it('stock movements tab queries history by product_id and filters by type', async () => {
    const f = viewMocks();
    renderApp(<ProductViewPage />, { at: '/stock/products/p1', path: '/stock/products/:id' });
    await userEvent.click(await screen.findByRole('tab', { name: 'Stock movements' }));
    const table = await screen.findByRole('table', { name: 'Stock movements' });
    expect(await within(table).findByText('S-INV-000019')).toBeInTheDocument();
    expect(within(table).getByText('−60')).toBeInTheDocument();
    expect(within(table).getByText('+30')).toBeInTheDocument();
    const c = calls(f, 'GET', '/v1/product/history/p1').find((x) => x.url.searchParams.get('search[stats]') === '1')!;
    expect(c.url.searchParams.get('search[product_id]')).toBe('p1');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(screen.getByText('1,200.00')).toBeInTheDocument();
  });

  it('opens directly on a filtered movement type from a shortcut link', async () => {
    const f = viewMocks();
    renderApp(<ProductViewPage />, { at: '/stock/products/p1?tab=movements&type=purchase', path: '/stock/products/:id' });
    await screen.findByRole('table', { name: 'Stock movements' });
    await waitFor(() => expect(calls(f, 'GET', '/v1/product/history/p1').some((c) => c.url.searchParams.get('search[reference_type]') === 'purchase')).toBe(true));
  });
});

describe('Product editor', { timeout: 20000 }, () => {
  const editorMocks = (extra: any[] = []) => mockApi([...extra, WAREHOUSES,
    { method: 'GET', path: '/v1/product-brand', reply: { status: true, result: [{ id: 'b1', name: 'Bosch', code: 'BOSC' }] } },
    { method: 'GET', path: '/v1/product-category', reply: { status: true, result: [{ id: 'c1', name: 'Filters' }] } },
  ]);

  it('refuses to save without a name', async () => {
    const f = editorMocks();
    renderApp(<ProductEditorPage />, { at: '/stock/products/new', path: '/stock/products/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Create Ctrl S/ }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/product')).toHaveLength(0);
  });

  it('cross-computes VAT prices and margins and posts the exact body', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/product', reply: { status: false, result: { id: 'new1', name: 'Cabin Filter' } } }]);
    renderApp(<ProductEditorPage />, { at: '/stock/products/new', path: '/stock/products/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'Cabin Filter');
    await userEvent.type(screen.getByRole('textbox', { name: 'Purchase Excl. VAT' }), '100');
    expect(screen.getByRole('textbox', { name: 'Purchase Incl. VAT' })).toHaveValue('115');
    await userEvent.type(screen.getByRole('textbox', { name: 'Retail Incl. VAT' }), '172.5');
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Retail Excl. VAT' })).toHaveValue('150');
    expect(screen.getByText('50.00%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Brand' }));
    await userEvent.click(await screen.findByRole('option', { name: /Bosch/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Adjustment quantity' }), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Add stock' }));
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    await waitFor(() => expect(calls(f, 'POST', '/v1/product')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/product');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, name: 'Cabin Filter', brand_id: 'b1', is_service: false, category_id: [] });
    expect(post.body.product_stores[STORE_ID]).toMatchObject({ store_id: STORE_ID, purchase_unit_price: 100, purchase_unit_price_with_vat: 115, retail_unit_price: 150, retail_unit_price_with_vat: 172.5, retail_margin_percent: 50 });
    expect(post.body.product_stores[STORE_ID].stock_adjustments).toEqual([expect.objectContaining({ type: 'adding', quantity: 5, warehouse_id: null })]);
    expect(post.body.product_stores[STORE_ID].stock_adjustments[0].date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(await screen.findByText('Cabin Filter created')).toBeInTheDocument();
  });

  it('update keeps server counters and maps a 200 + status:false error onto the field', async () => {
    const f = editorMocks([
      { method: 'GET', path: '/v1/product/p1', reply: { status: true, result: VIEW } },
      { method: 'PUT', path: '/v1/product/p1', reply: { status: false, errors: { part_number: 'Part Number Already Exists' } } },
    ]);
    renderApp(<ProductEditorPage />, { at: '/stock/products/p1/edit', path: '/stock/products/:id/edit' });
    const name = await screen.findByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Air Filter – Hyundai Elantra');
    await userEvent.click(screen.getByRole('button', { name: /^Save changes Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/product/p1')).toHaveLength(1));
    const [put] = calls(f, 'PUT', '/v1/product/p1');
    expect(put.body.product_stores[STORE_ID]).toMatchObject({ sales_count: 4, stock: 7, retail_unit_price_with_vat: 44.275, warehouse_racks: { main_store: 'A-6' } });
    expect((await screen.findAllByText('Part Number Already Exists')).length).toBeGreaterThan(0);
    expect(screen.getByRole('textbox', { name: 'Part #' })).toHaveAttribute('aria-invalid', 'true');
  });
});
