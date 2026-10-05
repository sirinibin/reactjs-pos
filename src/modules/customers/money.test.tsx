import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { PayableListPage, ReceivableListPage } from './MoneyList';
import { PayableEditorPage, ReceivableEditorPage } from './MoneyEditor';
import { ReceivableViewPage } from './MoneyView';
import { ReceiptPaper } from './Receipt';
import { CustomerPackagesPage } from './Packages';

const DEPOSITS = [
  { id: 'd1', code: 'RCV-000001', date: '2026-10-01T10:00:00Z', type: 'customer', customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', net_total: 1500, total: 1500, payment_methods: ['cash'], description: 'Advance' },
  { id: 'd2', code: 'RCV-000002', date: '2026-10-02T10:00:00Z', type: 'vendor', vendor_id: 'v1', vendor_name: 'GULF PARTS', net_total: 200, total: 200, payment_methods: ['bank_transfer'] },
];
const META = { total: 1700, total_customer: 1500, total_vendor: 200, cash: 1500, bank: 200, purchase_fund: 0 };

describe('Receivables list', () => {
  it('loads deposits with summary and store scope', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/customer-deposit', reply: { status: true, total_count: 2, result: DEPOSITS, meta: META } }]);
    renderApp(<ReceivableListPage />, { at: '/sales/receivables' });
    const tb = await screen.findByRole('table', { name: 'Receivables' });
    expect(await within(tb).findByText('RCV-000001')).toBeInTheDocument();
    expect(within(tb).getByText('GULF PARTS')).toBeInTheDocument();
    expect(screen.getByText('Purchase fund')).toBeInTheDocument();
    expect(screen.getByText('1,700.00')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/customer-deposit');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-date');
    // No delete action — deleting a receivable does not undo accounting (masters.md §2.4).
    expect(within(tb).queryAllByRole('button', { name: 'Delete' })).toHaveLength(0);
  });

  it('type views filter by search[type]', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/customer-deposit', reply: { status: true, total_count: 2, result: DEPOSITS, meta: META } }]);
    renderApp(<ReceivableListPage />, { at: '/sales/receivables' });
    await screen.findAllByText('RCV-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Vendors/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer-deposit').some((c) => c.url.searchParams.get('search[type]') === 'vendor')).toBe(true));
  });

  it('payables list uses the withdrawal endpoint and no purchase fund', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/customer-withdrawal', reply: { status: true, total_count: 0, result: [], meta: { total: 0 } } }]);
    renderApp(<PayableListPage />, { at: '/buying/payables' });
    expect(await screen.findByRole('heading', { name: 'Payables' })).toBeInTheDocument();
    await waitFor(() => expect(calls(f, 'GET', '/v1/customer-withdrawal')).toHaveLength(1));
    expect(screen.queryByText('Purchase fund')).toBeNull();
  });
});

const CUSTOMER = { id: 'c1', code: 'C-000001', name: 'AL NOOR TRADING EST.', phone: '0554128890', credit_balance: 2302.4, remarks: 'Pays by transfer' };
const viewRoutes = (base: string) => <Route path={`${base}/:id`} element={<div data-testid="view" />} />;
const pickCustomer = async () => {
  const party = await screen.findByRole('combobox', { name: /Customer/ });
  await userEvent.type(party, 'noor');
  await userEvent.click(await screen.findByRole('option', { name: /AL NOOR TRADING/ }));
};

describe('Receivable editor', () => {
  const mocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/customer', reply: { status: true, result: [CUSTOMER] } },
    { method: 'GET', path: '/v1/customer/c1', reply: { status: true, result: CUSTOMER } },
    { method: 'GET', path: '/v1/order', reply: { status: true, result: [{ id: 'o9', code: 'S-INV-000009', date: '2026-10-01T10:00:00Z', net_total: 404.8, balance_amount: 202.4, payment_status: 'paid_partially', customer_id: 'c1' }] } },
  ]);

  it('validates party, amount and method with server keys before posting', async () => {
    const f = mocks();
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/new', path: '/sales/receivables/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Customer is required')).toBeInTheDocument();
    expect(screen.getByText('Payment amount is required')).toBeInTheDocument();
    expect(screen.getByText('Payment method is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/customer-deposit')).toHaveLength(0);
  });

  it('creates a receivable linked to an open invoice with the exact body', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/customer-deposit', reply: { status: true, result: { id: 'd9', code: 'RCV-000009' } } }]);
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/new', path: '/sales/receivables/new', extraRoutes: viewRoutes('/sales/receivables') });
    await pickCustomer();
    expect(await screen.findByText(/Current balance/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Link invoice' }));
    const dlg = await screen.findByRole('dialog', { name: 'Link an invoice' });
    await userEvent.click(await within(dlg).findByRole('option', { name: /S-INV-000009/ }));
    expect(screen.getByText('S-INV-000009')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Amount/)).toHaveValue('202.4');
    await userEvent.selectOptions(screen.getByLabelText(/^Method/), 'bank_transfer');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-deposit')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/customer-deposit');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, type: 'customer', customer_id: 'c1', vendor_id: null, employee_id: null, remarks: 'Pays by transfer', enable_report_to_zatca: false });
    expect(post.body.payments).toEqual([expect.objectContaining({ amount: 202.4, discount: 0, method: 'bank_transfer', invoice_id: 'o9', invoice_code: 'S-INV-000009', invoice_type: 'sales' })]);
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    const [inv] = calls(f, 'GET', '/v1/order');
    expect(inv.url.searchParams.get('search[customer_id]')).toBe('c1');
    expect(inv.url.searchParams.get('search[payment_status]')).toBe('not_paid,paid_partially');
    expect(await screen.findByTestId('view')).toBeInTheDocument();
  });

  it('blocks paying more than the linked invoice balance', async () => {
    const f = mocks();
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/new', path: '/sales/receivables/new' });
    await pickCustomer();
    await userEvent.click(screen.getByRole('button', { name: 'Link invoice' }));
    await userEvent.click(await within(await screen.findByRole('dialog')).findByRole('option', { name: /S-INV-000009/ }));
    const amt = screen.getByLabelText(/^Amount/);
    await userEvent.clear(amt);
    await userEvent.type(amt, '500');
    await userEvent.selectOptions(screen.getByLabelText(/^Method/), 'cash');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText(/should not be greater than 202\.40 \(Invoice Balance\)/)).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/customer-deposit')).toHaveLength(0);
  });

  it('prefills the customer from ?customer_id and maps server payment errors', async () => {
    mocks([{ method: 'POST', path: '/v1/customer-deposit', status: 400, reply: { status: false, errors: { customer_receivable_payment_amount_0: 'Payment is already closed for this invoice', duplicate: 'A duplicate receivable with the same amount was just created.' } } }]);
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/new?customer_id=c1', path: '/sales/receivables/new' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Customer/ })).toHaveValue('AL NOOR TRADING EST.'));
    await userEvent.type(screen.getByLabelText(/^Amount/), '100');
    await userEvent.selectOptions(screen.getByLabelText(/^Method/), 'cash');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Payment is already closed for this invoice')).length).toBeGreaterThan(0);
    expect(screen.getByText(/A duplicate receivable/)).toBeInTheDocument();
  });

  it('switches to vendor type and posts vendor_id', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor', reply: { status: true, result: [{ id: 'v1', name: 'GULF PARTS' }] } },
      { method: 'POST', path: '/v1/customer-deposit', reply: { status: true, result: { id: 'd10', code: 'RCV-10' } } },
    ]);
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/new', path: '/sales/receivables/new', extraRoutes: viewRoutes('/sales/receivables') });
    await userEvent.click(await screen.findByRole('button', { name: 'Vendor' }));
    await userEvent.type(screen.getByRole('combobox', { name: /Vendor/ }), 'gulf');
    await userEvent.click(await screen.findByRole('option', { name: /GULF PARTS/ }));
    await userEvent.type(screen.getByLabelText(/^Amount/), '50');
    await userEvent.selectOptions(screen.getByLabelText(/^Method/), 'purchase_fund');
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-deposit')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/customer-deposit')[0].body).toMatchObject({ type: 'vendor', vendor_id: 'v1', customer_id: null, payments: [expect.objectContaining({ amount: 50, method: 'purchase_fund' })] });
  });

  it('payable editor posts to customer-withdrawal and maps customer_payable_ keys', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer', reply: { status: true, result: [CUSTOMER] } },
      { method: 'POST', path: '/v1/customer-withdrawal', status: 400, reply: { status: false, errors: { customer_payable_payment_method_0: 'Payment method is required' } } },
    ]);
    renderApp(<PayableEditorPage />, { at: '/buying/payables/new', path: '/buying/payables/new' });
    await pickCustomer();
    await userEvent.type(screen.getByLabelText(/^Amount/), '25');
    expect(screen.queryByRole('option', { name: 'Purchase fund A/c' })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText(/^Method/), 'cash');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-withdrawal')).toHaveLength(1));
    expect((await screen.findAllByText('Payment method is required')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^Method/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits an existing receivable with PUT keeping payment ids', async () => {
    const existing = { ...DEPOSITS[0], payments: [{ id: 'p1', date: '2026-10-01T10:00:00Z', amount: 1500, discount: 0, method: 'cash' }] };
    const f = mockApi([
      { method: 'GET', path: '/v1/customer-deposit/d1', reply: { status: true, result: existing } },
      { method: 'PUT', path: '/v1/customer-deposit/d1', reply: { status: true, result: { id: 'd1', code: 'RCV-000001' } } },
    ]);
    renderApp(<ReceivableEditorPage />, { at: '/sales/receivables/d1/edit', path: '/sales/receivables/:id/edit', extraRoutes: viewRoutes('/sales/receivables') });
    expect(await screen.findByLabelText(/^Amount/)).toHaveValue('1500');
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/customer-deposit/d1')).toHaveLength(1));
    const body = calls(f, 'PUT', '/v1/customer-deposit/d1')[0].body;
    expect(body.payments[0]).toMatchObject({ id: 'p1', amount: 1500, date_str: expect.stringMatching(/^2026-10-01T/) });
    expect(body).not.toHaveProperty('enable_report_to_zatca');
  });
});

describe('Receivable view & receipt', () => {
  const doc = { ...DEPOSITS[0], customer: { name: 'AL NOOR TRADING EST.', vat_no: '310122393500003', credit_balance: 0 }, total: 1500, total_discount: 0, payments: [{ id: 'p1', date: '2026-10-01T10:00:00Z', amount: 1500, method: 'cash', invoice_id: 'o1', invoice_code: 'S-INV-000001', invoice_type: 'sales' }] };

  it('shows payments with invoice links and reports to ZATCA when enabled', async () => {
    const store = { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_zatca_reporting_for_receivables: true } };
    const f = mockApi([
      { method: 'GET', path: '/v1/customer-deposit/d1', reply: { status: true, result: doc } },
      { method: 'POST', path: '/v1/customer-deposit/zatca/report/d1', reply: { status: true, result: { ...doc, zatca: { reporting_passed: true } } } },
    ], { store });
    renderApp(<ReceivableViewPage />, { at: '/sales/receivables/d1', path: '/sales/receivables/:id' });
    expect(await screen.findByRole('heading', { name: /RCV-000001/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'S-INV-000001' })).toHaveAttribute('href', '/sales/invoices/o1');
    await userEvent.click(screen.getByRole('button', { name: 'Report to ZATCA' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-deposit/zatca/report/d1')).toHaveLength(1));
  });

  it('hides Edit once reported to ZATCA', async () => {
    mockApi([{ method: 'GET', path: '/v1/customer-deposit/d1', reply: { status: true, result: { ...doc, zatca: { reporting_passed: true } } } }]);
    renderApp(<ReceivableViewPage />, { at: '/sales/receivables/d1', path: '/sales/receivables/:id' });
    await screen.findByRole('heading', { name: /RCV-000001/ });
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.getByText(/this record is read-only/)).toBeInTheDocument();
  });

  it('renders the bilingual receipt with the store title and amount in words', () => {
    render(<ReceiptPaper kind="receivable" doc={doc} store={{ id: 's', name: 'Gulf Union Ozone Co.', settings: { invoice: { receivable_title: 'RECEIPT VOUCHER | سند قبض' } } }} />);
    expect(screen.getByText(/RECEIPT VOUCHER/)).toBeInTheDocument();
    expect(screen.getByText('سند قبض')).toBeInTheDocument();
    expect(screen.getByText(/One Thousand Five Hundred Riyals only/)).toBeInTheDocument();
    expect(screen.getAllByText('1,500.00').length).toBeGreaterThan(0);
  });
});

describe('Customer packages', () => {
  it('lists packages without store scoping and creates one with tab ids', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer-package', reply: { status: true, total_count: 1, result: [{ id: 'k1', name: 'Basic', tab_ids: ['sales', 'customers'] }] } },
      { method: 'POST', path: '/v1/customer-package', reply: { status: true, result: { id: 'k2', name: 'Workshop' } } },
    ]);
    renderApp(<CustomerPackagesPage />, { at: '/sales/customer-packages' });
    const tb = await screen.findByRole('table', { name: 'Customer packages' });
    expect(await within(tb).findByText('Basic')).toBeInTheDocument();
    expect(within(tb).getByText('2 tabs')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/customer-package')[0].url.searchParams.get('search[store_id]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'New package' }));
    const dlg = await screen.findByRole('dialog', { name: 'New customer package' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Name is required')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText(/^Name\s*\*?$/), 'Workshop');
    await userEvent.click(within(dlg).getByRole('checkbox', { name: 'Customers' }));
    await userEvent.click(within(dlg).getByRole('checkbox', { name: 'Repair jobs' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-package')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/customer-package')[0].body).toMatchObject({ name: 'Workshop', tab_ids: ['customers', 'repair_jobs'] });
  });

  it('select all picks every legacy menu tab', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer-package', reply: { status: true, total_count: 0, result: [] } },
      { method: 'POST', path: '/v1/customer-package', status: 400, reply: { status: false, errors: { name: 'Name is already in use' } } },
    ]);
    renderApp(<CustomerPackagesPage />, { at: '/sales/customer-packages' });
    await userEvent.click(await screen.findByRole('button', { name: 'New package' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByLabelText(/^Name\s*\*?$/), 'Full');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Select all' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/customer-package')).toHaveLength(1));
    const ids: string[] = calls(f, 'POST', '/v1/customer-package')[0].body.tab_ids;
    expect(ids).toContain('customer_packages');
    expect(ids).not.toContain('sales_payments'); // v2-only nav ids are not package tabs
    expect(await within(dlg).findByText('Name is already in use')).toBeInTheDocument();
  });
});
