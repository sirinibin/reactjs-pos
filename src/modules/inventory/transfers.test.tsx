import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { TransferEditorPage, TransferListPage, TransferViewPage } from './transfers';

const WAREHOUSES = { method: 'GET', path: '/v1/warehouse', reply: { status: true, result: [{ id: 'w1', code: 'WH1', name: 'Dammam' }, { id: 'w2', code: 'WH2', name: 'Jeddah' }] } };
const TRANSFERS = [
  { id: 't1', code: 'ST-0001', date: '2026-10-02T09:00:00Z', from_warehouse_code: null, to_warehouse_code: 'WH1', total_quantity: 10, net_total: 254.15, created_by_name: 'Sirin' },
  { id: 't2', code: 'ST-0002', date: '2026-10-03T09:00:00Z', from_warehouse_code: 'WH1', to_warehouse_code: 'WH2', total_quantity: 3, net_total: 90 },
];
const PRODUCT = { id: 'p1', name: 'Air Filter', part_number: 'AF-1', unit: 'Pc', product_stores: { [STORE_ID]: { purchase_unit_price: 22.1, purchase_unit_price_with_vat: 25.415, retail_unit_price: 38.5, retail_unit_price_with_vat: 44.275, stock: 7, warehouse_stocks: { main_store: 5, WH1: 2 } } } };

describe('Stock transfer list', () => {
  it('shows Main Store for empty locations and totals from meta', async () => {
    const f = mockApi([WAREHOUSES, { method: 'GET', path: '/v1/stock-transfer', reply: { status: true, total_count: 2, result: TRANSFERS, meta: { total_stocktransfer: 344.15, total_quantity: 13 } } }]);
    renderApp(<TransferListPage />, { at: '/stock/transfers' });
    const table = await screen.findByRole('table', { name: 'Stock transfers' });
    const row = (await within(table).findByText('ST-0001')).closest('tr')!;
    expect(row).toHaveTextContent('Main Store');
    expect(await within(row).findByText('WH1 · Dammam')).toBeInTheDocument();
    expect(screen.getByText('344.15')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/stock-transfer');
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });

  it('filters by source location (Main Store uses the server’s "main store" keyword)', async () => {
    const f = mockApi([WAREHOUSES, { method: 'GET', path: '/v1/stock-transfer', reply: { status: true, total_count: 2, result: TRANSFERS, meta: {} } }]);
    renderApp(<TransferListPage />, { at: '/stock/transfers?f.from_warehouse_code=main%20store' });
    await screen.findAllByText('ST-0001');
    expect(calls(f, 'GET', '/v1/stock-transfer').some((c) => c.url.searchParams.get('search[from_warehouse_code]') === 'main store')).toBe(true);
  });
});

describe('Stock transfer editor', { timeout: 20000 }, () => {
  const editorMocks = (extra: any[] = []) => mockApi([
    ...extra, WAREHOUSES,
    { method: 'GET', path: '/v1/product', reply: (u: URL) => ({ status: true, result: [u.searchParams.get('search[ids]') ? { id: 'p1', product_stores: PRODUCT.product_stores } : PRODUCT] }) },
    { method: 'POST', path: '/v1/stock-transfer/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, total: 22.1, vat_price: 3.32, net_total: 25.42 } }) },
  ]);

  it('rejects Main Store → Main Store before calling the API', async () => {
    const f = editorMocks();
    renderApp(<TransferEditorPage />, { at: '/stock/transfers/new', path: '/stock/transfers/new' });
    const to = await screen.findByRole('combobox', { name: /^To/ });
    await userEvent.selectOptions(to, '');
    await userEvent.type(screen.getByRole('combobox', { name: 'Add item' }), 'air');
    await userEvent.click(await screen.findByRole('option', { name: /Air Filter/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Both From & To warehouse cannot be Main Store')).length).toBeGreaterThan(0);
    expect(calls(f, 'POST', '/v1/stock-transfer')).toHaveLength(0);
  });

  it('values lines at purchase price, warns about stock at the source and posts the ends', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/stock-transfer', reply: { status: true, result: { id: 't9', code: 'ST-0009' } } }]);
    renderApp(<TransferEditorPage />, { at: '/stock/transfers/new', path: '/stock/transfers/new' });
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: /^From/ }), 'w1');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^To/ }), 'w2');
    await userEvent.type(screen.getByRole('combobox', { name: 'Add item' }), 'air');
    await userEvent.click(await screen.findByRole('option', { name: /Air Filter/ }));
    const qty = await screen.findByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '3{Enter}');
    expect(await screen.findByText(/Air Filter: available stock in WH1 · Dammam is 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/stock-transfer')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/stock-transfer');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, vat_percent: 15, from_warehouse_id: 'w1', from_warehouse_code: 'WH1', to_warehouse_id: 'w2', to_warehouse_code: 'WH2' });
    expect(post.body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 3, unit_price: 22.1, unit_price_with_vat: 25.415, purchase_unit_price: 22.1 })]);
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('prefills a line from ?product_id (Transfer button on a product)', async () => {
    editorMocks([{ method: 'GET', path: '/v1/product/p1', reply: { status: true, result: PRODUCT } }]);
    renderApp(<TransferEditorPage />, { at: '/stock/transfers/new?product_id=p1', path: '/stock/transfers/new' });
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(await within(items).findByText('Air Filter')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^To/ })).toHaveValue('w1');
  });

  it('edit loads the existing ends and PUTs', async () => {
    const f = editorMocks([
      { method: 'GET', path: '/v1/stock-transfer/t2', reply: { status: true, result: { ...TRANSFERS[1], from_warehouse_id: 'w1', to_warehouse_id: 'w2', vat_percent: 15, products: [{ product_id: 'p1', name: 'Air Filter', quantity: 3, unit_price: 26.09, unit_price_with_vat: 30 }] } } },
      { method: 'PUT', path: '/v1/stock-transfer/t2', reply: { status: true, result: { id: 't2', code: 'ST-0002' } } },
    ]);
    renderApp(<TransferEditorPage />, { at: '/stock/transfers/t2/edit', path: '/stock/transfers/:id/edit' });
    expect(await screen.findByRole('combobox', { name: /^From/ })).toHaveValue('w1');
    await userEvent.click(screen.getByRole('button', { name: /^Save changes Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/stock-transfer/t2')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/stock-transfer/t2')[0].body).toMatchObject({ from_warehouse_code: 'WH1', to_warehouse_code: 'WH2' });
  });
});

describe('Stock transfer view', () => {
  it('shows direction, lines and totals', async () => {
    mockApi([WAREHOUSES, { method: 'GET', path: '/v1/stock-transfer/t1', reply: { status: true, result: { ...TRANSFERS[0], vat_percent: 15, total: 221, vat_price: 33.15, products: [{ product_id: 'p1', name: 'Air Filter', part_number: 'AF-1', quantity: 10, unit_price: 22.1, unit_price_with_vat: 25.415, unit_discount: 0, unit_discount_with_vat: 0 }] } } }]);
    renderApp(<TransferViewPage />, { at: '/stock/transfers/t1', path: '/stock/transfers/:id' });
    expect(await screen.findByRole('heading', { name: 'ST-0001' })).toBeInTheDocument();
    const items = screen.getByRole('table', { name: 'Items' });
    expect(within(items).getByText('Air Filter')).toBeInTheDocument();
    expect(screen.getAllByText('254.15').length).toBeGreaterThan(0);
    expect(await screen.findAllByText('WH1 · Dammam')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
