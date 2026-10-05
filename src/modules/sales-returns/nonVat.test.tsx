import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { NonVatEditorPage, NonVatListPage, NonVatViewPage } from './nonVat';
import { NonVatReturnEditorPage, NonVatReturnListPage } from './nonVatReturns';

// The shared machine is busy (parallel agents); give async queries more room than the 1s default.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20000 });

const SALES = [
  { id: 'n1', code: 'NV-000001', date: '2026-10-01T10:00:00Z', customer_name: 'Walk-in', net_total: 91.6, total_payment_received: 86.6, balance_amount: 0, payment_status: 'paid', return_count: 0 },
];

describe('Non-VAT sales list', () => {
  it('renders rows and net total; searches by customer name for words', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/non-vat-sales', reply: { status: true, total_count: 1, result: SALES, meta: { net_total: 91.6, discount: 0, net_profit: 7, net_loss: 0 } } }]);
    renderApp(<NonVatListPage />, { at: '/sales/non-vat' });
    const table = await screen.findByRole('table', { name: 'Non-VAT sales' });
    expect(await within(table).findByText('NV-000001')).toBeInTheDocument();
    expect(screen.getAllByText('91.60').length).toBeGreaterThan(0);
    expect(within(table).queryByText('VAT')).toBeNull();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'walk');
    await waitFor(() => expect(calls(f, 'GET', '/v1/non-vat-sales').some((c) => c.url.searchParams.get('search[customer_name]') === 'walk')).toBe(true), { timeout: 2000 });
  });
});

const PRODUCT = { id: 'p1', name: 'Spark Plug Iridium', part_number: 'SP-1', unit: 'pc', product_stores: { [STORE_ID]: { retail_unit_price: 42, retail_unit_price_with_vat: 48.3, purchase_unit_price: 24, stock: 10 } } };
const SERVICE = { id: 's1', name: 'Labour charge', is_service: true, product_stores: { [STORE_ID]: { retail_unit_price: 100, retail_unit_price_with_vat: 115 } } };

describe('Non-VAT sale editor', () => {
  const mocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [] } },
    { method: 'GET', path: '/v1/product', reply: (u: URL) => ({ status: true, result: /lab/i.test(u.searchParams.get('search[query]') || u.search) ? [SERVICE] : [PRODUCT] }) },
    // Mirror the server: net_total already subtracts the cash discount.
    { method: 'POST', path: '/v1/non-vat-sales/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, total: 84, total_with_vat: 96.6, vat_price: 12.6, net_total: 96.6 - (i.json.cash_discount || 0) } }) },
  ]);

  it('services are tax-free by default; posts flags, is_service and a payment of net − cash discount', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/non-vat-sales', reply: { status: true, result: { id: 'n9', code: 'NV-000009' } } }]);
    renderApp(<NonVatEditorPage />, { at: '/sales/non-vat/new', path: '/sales/non-vat/new' });
    expect(screen.queryByText('VAT %')).toBeNull();
    expect(await screen.findByRole('checkbox', { name: 'Exclude service tax' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Exclude product tax' })).not.toBeChecked();
    await userEvent.type(screen.getByRole('combobox', { name: 'Add item' }), 'spark');
    await userEvent.click(await screen.findByRole('option', { name: /Spark Plug/ }));
    const qty = await screen.findByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(qty);
    await userEvent.type(qty, '2{Enter}');
    const cash = screen.getByRole('textbox', { name: 'Cash discount' });
    await userEvent.clear(cash);
    await userEvent.type(cash, '5{Enter}');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('86.6'));
    expect(screen.getByText(/again from the balance/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/non-vat-sales')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/non-vat-sales')[0].body;
    expect(body).toMatchObject({ store_id: STORE_ID, exclude_service_tax: true, exclude_product_tax: false, cash_discount: 5, customer_id: null, vat_percent: 15 });
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 2, unit_price: 42, unit_price_with_vat: 48.3, is_service: false })]);
    expect(body.payments_input).toEqual([expect.objectContaining({ amount: 86.6, method: 'cash' })]);
  });

  it('ticking "Exclude product tax" drops tax from product lines', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/non-vat-sales', reply: { status: true, result: { id: 'n9', code: 'NV-000009' } } }]);
    renderApp(<NonVatEditorPage />, { at: '/sales/non-vat/new', path: '/sales/non-vat/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'spark');
    await userEvent.click(await screen.findByRole('option', { name: /Spark Plug/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Exclude product tax' }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/non-vat-sales')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/non-vat-sales')[0].body;
    expect(body.exclude_product_tax).toBe(true);
    expect(body.products[0]).toMatchObject({ unit_price: 42, unit_price_with_vat: 42 });
  });

  it('refuses an empty sale', async () => {
    const f = mocks();
    renderApp(<NonVatEditorPage />, { at: '/sales/non-vat/new', path: '/sales/non-vat/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Add at least one item.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/non-vat-sales')).toHaveLength(0);
  });

  it('maps a server total_payment error', async () => {
    mocks([{ method: 'POST', path: '/v1/non-vat-sales', status: 400, reply: { status: false, errors: { total_payment: 'Total payment should not exceed: 86.60' } } }]);
    renderApp(<NonVatEditorPage />, { at: '/sales/non-vat/new', path: '/sales/non-vat/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'spark');
    await userEvent.click(await screen.findByRole('option', { name: /Spark Plug/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Total payment should not exceed: 86.60')).length).toBeGreaterThan(0);
  });
});

describe('Non-VAT sale view', () => {
  it('hides VAT, shows charged prices and links to a return', async () => {
    mockApi([{ method: 'GET', path: '/v1/non-vat-sales/n1', reply: { status: true, result: { ...SALES[0], total: 84, total_with_vat: 96.6, vat_price: 12.6, vat_percent: 15, cash_discount: 5, payments: [{ id: 'x', amount: 86.6, method: 'cash', date: '2026-10-01T10:00:00Z' }], products: [{ product_id: 'p1', name: 'Spark Plug Iridium', quantity: 2, unit_price: 42, unit_price_with_vat: 48.3 }] } } }]);
    renderApp(<NonVatViewPage />, { at: '/sales/non-vat/n1', path: '/sales/non-vat/:id' });
    expect(await screen.findByRole('heading', { name: /NV-000001/ })).toBeInTheDocument();
    expect(screen.getAllByText('48.30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('96.60').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^VAT 15%/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });
});

describe('Non-VAT return', () => {
  const SALE = { id: 'n1', code: 'NV-000001', customer_name: 'Walk-in', vat_percent: 15, net_total: 196.6, total_payment_received: 196.6, exclude_service_tax: true, exclude_product_tax: false,
    products: [{ product_id: 'p1', name: 'Spark Plug Iridium', quantity: 2, unit_price: 42, unit_price_with_vat: 48.3 }, { product_id: 's1', name: 'Labour charge', quantity: 1, unit_price: 100, unit_price_with_vat: 100, is_service: true }] };

  it('lists returns filtered by sale', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/non-vat-sales-return', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<NonVatReturnListPage />, { at: '/sales/non-vat-returns?f.sale=n1' });
    await screen.findAllByText('No records found');
    expect(calls(f, 'GET', '/v1/non-vat-sales-return')[0].url.searchParams.get('search[non_vat_sales_id]')).toBe('n1');
  });

  it('caps by what earlier returns took and posts only the returned lines', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/non-vat-sales/n1', reply: { status: true, result: SALE } },
      { method: 'GET', path: '/v1/non-vat-sales-return', reply: { status: true, result: [{ id: 'old', products: [{ product_id: 'p1', quantity: 1 }] }] } },
      { method: 'POST', path: '/v1/non-vat-sales-return/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json, net_total: 48.3, total_with_vat: 48.3, total: 42 } }) },
      { method: 'POST', path: '/v1/non-vat-sales-return', reply: { status: true, result: { id: 'nr1', code: 'NVR-000001' } } },
    ]);
    renderApp(<NonVatReturnEditorPage />, { at: '/sales/non-vat-returns/new?non_vat_sales_id=n1', path: '/sales/non-vat-returns/new' });
    const items = await screen.findByRole('table', { name: 'Items' });
    expect(within(items).getByText(/Returned 1/)).toBeInTheDocument();
    expect(within(items).getAllByText(/max 1/)).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Exclude service tax' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /Return Spark Plug/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('48.3'));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/non-vat-sales-return')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/non-vat-sales-return')[0].body;
    expect(body).toMatchObject({ non_vat_sales_id: 'n1', non_vat_sales_code: 'NV-000001', exclude_service_tax: true, exclude_product_tax: false, total_payment_paid: 48.3 });
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'p1', quantity: 1 })]);
    expect(calls(f, 'GET', '/v1/non-vat-sales-return')[0].url.searchParams.get('search[non_vat_sales_id]')).toBe('n1');
  });
});
