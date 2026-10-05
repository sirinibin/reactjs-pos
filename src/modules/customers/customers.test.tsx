import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { CustomerListPage } from './CustomerList';
import { CustomerEditorPage } from './CustomerForm';
import { Customer360Page } from './Customer360';

const stats = (o: Record<string, number>) => ({ [STORE_ID]: { sales_amount: 0, sales_count: 0, ...o } });
const CUSTOMERS = [
  { id: 'c1', code: 'C-000001', name: 'AL NOOR TRADING EST.', name_in_arabic: 'مؤسسة النور', phone: '0554128890', vat_no: '310122393500003', credit_balance: 16652.21, credit_limit: 50000, stores: stats({ sales_amount: 1840000, sales_count: 412 }), churn_risk_tier: 'Low' },
  { id: 'c2', code: 'C-000002', name: 'RIYADH AUTO CARE', phone: '0501112222', credit_balance: 0, credit_limit: 0, stores: stats({ sales_amount: 500, sales_count: 2 }) },
];
const META = { credit_balance: 16652.21, sales: 1840500, sales_paid: 1823847.79, sales_credit_balance: 16652.21, sales_profit: 400000, sales_return: 0 };
const listMock = (extra: any[] = [], opts = {}) => mockApi([...extra, { method: 'GET', path: '/v1/customer', reply: { status: true, total_count: 2, result: CUSTOMERS, meta: META } }], opts);
const table = () => screen.findByRole('table', { name: 'Customers' });

describe('Customer list', () => {
  it('renders customers with balances and store-scoped stats request', async () => {
    const f = listMock();
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    const tb = await table();
    expect(await within(tb).findByText('AL NOOR TRADING EST.')).toBeInTheDocument();
    expect(within(tb).getByText('16,652.21')).toBeInTheDocument();
    expect(within(tb).getByText('1,840,000.00')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/customer');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
    expect(c.url.searchParams.get('select')).toContain('credit_balance');
    expect(screen.getByText('1,840,500.00')).toBeInTheDocument(); // Sales total tile from meta
  });

  it('views map to the right search keys', async () => {
    const f = listMock();
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    await within(await table()).findByText('AL NOOR TRADING EST.');
    await userEvent.click(screen.getByRole('tab', { name: /^With balance/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer').some((c) => c.url.searchParams.get('search[ignore_zero_credit_balance]') === '1')).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer').some((c) => c.url.searchParams.get('search[deleted]') === '1')).toBe(true));
  });

  it('searches codes by search[code] and names by search[query]', async () => {
    const f = listMock();
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    await within(await table()).findByText('AL NOOR TRADING EST.');
    const box = screen.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(box, 'C-0001');
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer').some((c) => c.url.searchParams.get('search[code]') === 'C-0001')).toBe(true), { timeout: 2000 });
    await userEvent.clear(box);
    await userEvent.type(box, 'noor');
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer').some((c) => c.url.searchParams.get('search[query]') === 'noor')).toBe(true), { timeout: 2000 });
  });

  it('deletes after confirmation (soft delete with store_id)', async () => {
    const f = listMock([{ method: 'DELETE', path: '/v1/customer/c2', reply: { status: true, result: 'Deleted successfully' } }]);
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    const tb = await table();
    const row = (await within(tb).findByText('RIYADH AUTO CARE')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete customer?' });
    expect(calls(f, 'DELETE', '/v1/customer/c2')).toHaveLength(0);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/customer/c2')).toHaveLength(1));
    expect(calls(f, 'DELETE', '/v1/customer/c2')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(await screen.findByText('Customer deleted')).toBeInTheDocument();
  });

  it('restores a deleted customer', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer', reply: { status: true, total_count: 1, result: [{ ...CUSTOMERS[1], deleted: true }], meta: {} } },
      { method: 'POST', path: '/v1/customer/restore/c2', reply: { status: true, result: 'ok' } },
    ]);
    renderApp(<CustomerListPage />, { at: '/sales/customers?view=deleted' });
    const row = (await within(await table()).findByText('RIYADH AUTO CARE')).closest('tr')!;
    expect(within(row).queryByRole('button', { name: 'Delete' })).toBeNull();
    await userEvent.click(within(row).getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer/restore/c2')).toHaveLength(1));
  });

  it('hides create/edit/delete without permission', async () => {
    listMock([{ method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'customers', read: true, create: false, update: false, delete: false }] } }],
      { user: { id: 'u2', name: 'Clerk', email: 'c@x.sa', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    await within(await table()).findByText('AL NOOR TRADING EST.');
    expect(screen.queryByRole('button', { name: 'New customer' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'Delete' })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: 'Edit' })).toHaveLength(0);
  });

  it('shows empty and error states', async () => {
    mockApi([{ method: 'GET', path: '/v1/customer', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    const { unmount } = renderApp(<CustomerListPage />, { at: '/sales/customers' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
    unmount();
    mockApi([{ method: 'GET', path: '/v1/customer', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<CustomerListPage />, { at: '/sales/customers' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });
});

const editorRoutes = <Route path="/sales/customers/:id" element={<div data-testid="c360" />} />;

describe('Customer form', () => {
  it('validates locally and does not post', async () => {
    const f = mockApi([]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new' });
    await userEvent.type(await screen.findByLabelText(/^VAT no\./), '123');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('VAT No. should be 15 digits')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/customer')).toHaveLength(0);
  });

  it('creates a customer with the exact API body and opens Customer 360', async () => {
    const f = mockApi([{ method: 'POST', path: '/v1/customer', reply: { status: true, result: { id: 'new1', name: 'GULF STAR' } } }]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new', extraRoutes: editorRoutes });
    await userEvent.type(await screen.findByLabelText(/^Name\s*\*?$/), 'Gulf Star');
    await userEvent.type(screen.getByLabelText(/^VAT no\./), '310122393500003');
    await userEvent.type(screen.getByLabelText(/^Phone$/), '0551234567');
    await userEvent.type(screen.getByLabelText(/^Building no\./), '8779');
    await userEvent.type(screen.getByLabelText(/^Postal code/), '12241');
    await userEvent.type(screen.getByLabelText(/^Credit limit/), '10000');
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/customer');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({
      store_id: STORE_ID, name: 'Gulf Star', vat_no: '310122393500003', vat_no_in_arabic: '۳۱۰۱۲۲۳۹۳۵۰۰۰۰۳', phone: '0551234567', phone_in_arabic: '۰۵۵۱۲۳٤۵٦۷',
      credit_limit: 10000, country_code: 'SA', opening_balance: 0,
      national_address: expect.objectContaining({ building_no: '8779', building_no_arabic: '۸۷۷۹', zipcode: '12241', zipcode_arabic: '۱۲۲٤۱' }),
    });
    expect(await screen.findByTestId('c360')).toBeInTheDocument();
  });

  it('enforces ZATCA phase-2 national address rules for VAT customers', async () => {
    const f = mockApi([]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new' });
    await userEvent.type(await screen.findByLabelText(/^Name\s*\*?$/), 'X');
    await userEvent.type(screen.getByLabelText(/^VAT no\./), '310122393500003');
    await userEvent.type(screen.getByLabelText(/^Building no\./), '12');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Building number should be 4 digits')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/customer')).toHaveLength(0);
  });

  it('maps a 409 duplicate VAT error onto the field', async () => {
    mockApi([{ method: 'POST', path: '/v1/customer', status: 409, reply: { status: false, errors: { vat_no: 'VAT No. already exists with customer name: GULF STAR' } } }]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new' });
    await userEvent.type(await screen.findByLabelText(/^Name\s*\*?$/), 'Gulf Star');
    await userEvent.type(screen.getByLabelText(/^VAT no\./), '310122393500003');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('VAT No. already exists with customer name: GULF STAR')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^VAT no\./)).toHaveAttribute('aria-invalid', 'true');
  });

  it('auto-translates the name to Arabic on blur when the store enables it', async () => {
    const f = mockApi([{ method: 'POST', path: '/v1/translate', reply: { translatedText: 'نجمة الخليج' } }], { store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_auto_translation_to_arabic: true } } });
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new' });
    await userEvent.type(await screen.findByLabelText(/^Name\s*\*?$/), 'Gulf Star');
    await userEvent.tab();
    await waitFor(() => expect(screen.getByLabelText(/^Name \(Arabic\)/)).toHaveValue('نجمة الخليج'));
    expect(calls(f, 'POST', '/v1/translate')[0].body).toMatchObject({ text: 'Gulf Star' });
  });

  it('requires an opening balance date and sends the opening balance', async () => {
    const f = mockApi([{ method: 'POST', path: '/v1/customer', reply: { status: true, result: { id: 'n2', name: 'OB' } } }]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/new', path: '/sales/customers/new', extraRoutes: editorRoutes });
    await userEvent.type(await screen.findByLabelText(/^Name\s*\*?$/), 'OB');
    await userEvent.type(screen.getByLabelText(/^Opening balance$/), '750');
    await userEvent.click(screen.getByRole('button', { name: 'Store owes customer' }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Opening balance date is required when an opening balance is entered')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^As of/), { target: { value: '2026-01-01T09:00' } });
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/customer')[0].body).toMatchObject({ opening_balance: 750, opening_balance_type: 'payable', opening_balance_date: expect.stringMatching(/^2026-01-01T09:00:00/) });
  });

  it('edits an existing customer with PUT', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer/c1', reply: { status: true, result: CUSTOMERS[0] } },
      { method: 'PUT', path: '/v1/customer/c1', reply: { status: true, result: { ...CUSTOMERS[0], email: 'a@b.sa' } } },
    ]);
    renderApp(<CustomerEditorPage />, { at: '/sales/customers/c1/edit', path: '/sales/customers/:id/edit', extraRoutes: editorRoutes });
    expect(await screen.findByLabelText(/^Name\s*\*?$/)).toHaveValue('AL NOOR TRADING EST.');
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.sa');
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/customer/c1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/customer/c1')[0].body).toMatchObject({ email: 'a@b.sa', name: 'AL NOOR TRADING EST.', credit_limit: 50000 });
  });
});

const FULL = {
  ...CUSTOMERS[0], email: 'purchasing@alnoor.sa', contact_person: 'Khalid Al-Harbi', registration_number: '1010458821',
  national_address: { building_no: '7421', street_name: 'King Fahd Rd', district_name: 'Al Olaya', city_name: 'Riyadh', zipcode: '12241' },
  account: { id: 'acc1', number: '1010' }, created_at: '2021-03-02T10:00:00Z', last_purchase_at: new Date().toISOString(),
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const OPEN = [
  { id: 'o1', code: 'S-INV-000101', date: daysAgo(5), net_total: 9200, balance_amount: 9200, payment_status: 'not_paid' },
  { id: 'o2', code: 'S-INV-000090', date: daysAgo(45), net_total: 5000, balance_amount: 2100, payment_status: 'paid_partially' },
];
const c360Mocks = (customer: any = FULL, extra: any[] = [], opts = {}) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/customer/c1', reply: { status: true, result: customer } },
  { method: 'GET', path: '/v1/order', reply: { status: true, total_count: OPEN.length, result: OPEN, meta: { total_sales: 14200, paid_sales: 2900, unpaid_sales: 11300 } } },
  { method: 'GET', path: '/v1/posting', reply: { status: true, total_count: 1, result: [{ id: 'p1', date: daysAgo(5), reference_id: 'o1', reference_model: 'sales', reference_code: 'S-INV-000101', posts: [{ id: 'x', date: daysAgo(5), account_name: 'SALES', account_number: '1007', debit_or_credit: 'debit', debit: 9200, credit: 0, balance: 16652.21 }] }], meta: { debit_total: 20000, credit_total: 3347.79 } } },
  { method: 'GET', path: '/v1/vehicle', reply: { status: true, total_count: 1, result: [{ id: 'v1', vehicle_number: 'ABC 1234', brand: 'Toyota', model: 'Camry', year: 2020 }] } },
], opts);

describe('Customer 360', () => {
  it('shows header facets, aging, credit gauge, contact and open invoices', async () => {
    const f = c360Mocks();
    renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    expect(await screen.findByRole('heading', { name: /AL NOOR TRADING EST\./ })).toBeInTheDocument();
    expect(screen.getByText('B2B')).toBeInTheDocument();
    expect(screen.getByText('Lifetime sales')).toBeInTheDocument();
    expect(screen.getAllByText(/1,840,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Credit used 33%' })).toBeInTheDocument();
    expect(screen.getByText('Khalid Al-Harbi')).toBeInTheDocument();
    const open = await screen.findByRole('table', { name: 'Open invoices' });
    expect(within(open).getByText('S-INV-000101')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /0–30: 9,200.00, 31–60: 2,100.00/ })).toBeInTheDocument();
    const [o] = calls(f, 'GET', '/v1/order');
    expect(o.url.searchParams.get('search[customer_id]')).toBe('c1');
    expect(o.url.searchParams.get('search[payment_status]')).toBe('not_paid,paid_partially');
  });

  it('opens the ledger statement for the customer account', async () => {
    const f = c360Mocks();
    renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    await screen.findByRole('heading', { name: /AL NOOR/ });
    await userEvent.click(screen.getByRole('button', { name: 'Statement' }));
    const st = await screen.findByRole('table', { name: 'Account statement' });
    expect(within(st).getByText('To SALES A/c #1007 Dr.')).toBeInTheDocument();
    expect(screen.getByText('16,652.21 DR')).toBeInTheDocument();
    const [p] = calls(f, 'GET', '/v1/posting');
    expect(p.url.searchParams.get('search[account_id]')).toBe('acc1');
    expect(p.url.searchParams.get('search[stats]')).toBe('1');
  });

  it('invoices tab lists the customer’s invoices', async () => {
    const f = c360Mocks();
    renderApp(<Customer360Page />, { at: '/sales/customers/c1?tab=invoices', path: '/sales/customers/:id' });
    const tb = await screen.findByRole('table', { name: 'Sales invoices' });
    expect(await within(tb).findByText('S-INV-000090')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/order').some((c) => c.url.searchParams.get('search[customer_id]') === 'c1' && c.url.searchParams.get('search[stats]') === '1')).toBe(true);
  });

  it('vehicles tab only with the automobile module', async () => {
    c360Mocks();
    const { unmount } = renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    await userEvent.click(await screen.findByRole('tab', { name: 'Vehicles' }));
    expect(await within(await screen.findByRole('table', { name: 'Vehicles' })).findByText('ABC 1234')).toBeInTheDocument();
    unmount();
    c360Mocks(FULL, [], { store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_automobile_module: false } } });
    renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    await screen.findByRole('heading', { name: /AL NOOR/ });
    expect(screen.queryByRole('tab', { name: 'Vehicles' })).toBeNull();
  });

  it('deleted customers show a banner and only Restore', async () => {
    const f = c360Mocks({ ...FULL, deleted: true }, [{ method: 'POST', path: '/v1/customer/restore/c1', reply: { status: true, result: 'ok' } }]);
    renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    expect(await screen.findByText('This customer is deleted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New invoice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer/restore/c1')).toHaveLength(1));
  });

  it('shows a retryable error when the customer cannot be loaded', async () => {
    mockApi([{ method: 'GET', path: '/v1/customer/c1', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<Customer360Page />, { at: '/sales/customers/c1', path: '/sales/customers/:id' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });
});
