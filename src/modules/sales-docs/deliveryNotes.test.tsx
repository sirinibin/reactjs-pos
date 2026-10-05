import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { DeliveryNoteEditorPage, DeliveryNoteListPage, DeliveryNoteViewPage } from './deliveryNotes';

const DNS = [
  { id: 'd1', code: 'DN-000001', date: '2026-10-01T10:00:00Z', customer_name: 'AL NOOR TRADING EST.', net_total: 230, order_id: 'o1', order_code: 'S-INV-000042' },
  { id: 'd2', code: 'DN-000002', date: '2026-10-02T11:00:00Z', customer_name: 'RIYADH AUTO CARE', net_total: 115, order_id: null, notify_at: '2026-01-01T00:00:00Z' },
];
const listMock = () => mockApi([{ method: 'GET', path: '/v1/delivery-note', reply: { status: true, total_count: 2, result: DNS, meta: { total_deliverynote: 345, vat_price: 45, discount: 0, shipping_handling_fees: 0, invoiced_count: 1 } } }]);

describe('Delivery note list', () => {
  it('renders rows with invoiced / reminder state and totals', async () => {
    const f = listMock();
    renderApp(<DeliveryNoteListPage />, { at: '/sales/delivery-notes' });
    const table = await screen.findByRole('table', { name: 'Delivery notes' });
    expect(await within(table).findByText('DN-000001')).toBeInTheDocument();
    expect(within(table).getByText('S-INV-000042')).toBeInTheDocument();
    expect(within(table).getByText('Reminder due')).toBeInTheDocument();
    expect(screen.getAllByText('345.00').length).toBeGreaterThan(0);
    const [c] = calls(f, 'GET', '/v1/delivery-note');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
  });

  it('"Not invoiced" view filters with invoiced=0', async () => {
    const f = listMock();
    renderApp(<DeliveryNoteListPage />, { at: '/sales/delivery-notes' });
    await screen.findAllByText('DN-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Not invoiced/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/delivery-note').some((c) => c.url.searchParams.get('search[invoiced]') === '0')).toBe(true));
  });

  it('shows an empty state', async () => {
    mockApi([{ method: 'GET', path: '/v1/delivery-note', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    renderApp(<DeliveryNoteListPage />, { at: '/sales/delivery-notes' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
  });
});

const PRODUCT = { id: 'p1', name: 'Brake Pad Set', part_number: 'BP-1', unit: 'Set', product_stores: { [STORE_ID]: { retail_unit_price: 100, retail_unit_price_with_vat: 115, stock: 3 } } };
const editorMocks = (extra: any[] = [], store?: any) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/customer', reply: { status: true, result: [{ id: 'c1', name: 'AL NOOR TRADING EST.' }] } },
  { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
  { method: 'POST', path: '/v1/delivery-note/calculate-net-total', reply: (_u: URL, i: any) => ({ status: true, result: { ...i.json } }) },
], store ? { store } : {});

describe('Delivery note editor', () => {
  it('creates a note with client totals, reminder and no contact fields', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/delivery-note', reply: { status: true, result: { id: 'nd', code: 'DN-000009' } } }]);
    renderApp(<DeliveryNoteEditorPage />, { at: '/sales/delivery-notes/new', path: '/sales/delivery-notes/new' });
    const reminder = await screen.findByLabelText(/Reminder \(notify at\)/);
    expect((reminder as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(screen.queryByRole('textbox', { name: 'Phone' })).toBeNull();
    // Without add_price_details_in_delivery_note the price columns are hidden.
    expect(within(screen.getByRole('table', { name: 'Items' })).queryByText('Unit price')).toBeNull();
    const customer = screen.getByRole('combobox', { name: /Customer/ });
    await userEvent.type(customer, 'al noor');
    await userEvent.click(await screen.findByRole('option', { name: /AL NOOR TRADING/ }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/delivery-note')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/delivery-note')[0].body;
    expect(body).toMatchObject({ store_id: STORE_ID, customer_id: 'c1', status: 'delivered', net_total: 115, total: 100, vat_price: 15, delivered_by: 'u1' });
    expect(body.notify_at).toMatch(/Z$/);
    expect(body).not.toHaveProperty('phone');
  });

  it('shows price columns when add_price_details_in_delivery_note is on', async () => {
    editorMocks([], { ...TEST_STORE, settings: { ...TEST_STORE.settings, add_price_details_in_delivery_note: true } });
    renderApp(<DeliveryNoteEditorPage />, { at: '/sales/delivery-notes/new', path: '/sales/delivery-notes/new' });
    expect(await within(await screen.findByRole('table', { name: 'Items' })).findAllByText('Unit price')).not.toHaveLength(0);
  });

  it('maps server validation errors', async () => {
    editorMocks([{ method: 'POST', path: '/v1/delivery-note', status: 400, reply: { status: false, errors: { name_0: 'Name requires min. 3 chars' } } }]);
    renderApp(<DeliveryNoteEditorPage />, { at: '/sales/delivery-notes/new', path: '/sales/delivery-notes/new' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Name requires min. 3 chars')).length).toBeGreaterThan(0);
  });
});

describe('Delivery note view', () => {
  it('not invoiced: offers "Create invoice"; invoiced: links the invoice', async () => {
    mockApi([
      { method: 'GET', path: '/v1/delivery-note/d2', reply: { status: true, result: { ...DNS[1], products: [{ name: 'Brake Pad Set', quantity: 2, unit_price: 0 }] } } },
      { method: 'GET', path: '/v1/delivery-note/d1', reply: { status: true, result: { ...DNS[0], products: [] } } },
    ]);
    const { unmount } = renderApp(<DeliveryNoteViewPage />, { at: '/sales/delivery-notes/d2', path: '/sales/delivery-notes/:id' });
    expect(await screen.findByRole('heading', { name: /DN-000002/ })).toBeInTheDocument();
    expect(screen.getAllByText('Reminder due').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Create invoice' }));
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
    unmount();
    renderApp(<DeliveryNoteViewPage />, { at: '/sales/delivery-notes/d1', path: '/sales/delivery-notes/:id' });
    expect(await screen.findByRole('heading', { name: /DN-000001/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create invoice' })).toBeNull();
    expect(screen.getAllByText('S-INV-000042').length).toBeGreaterThan(0);
  });
});
