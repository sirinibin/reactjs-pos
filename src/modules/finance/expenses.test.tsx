import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { ExpenseEditorPage, ExpensesListPage, ExpenseViewPage } from './expenses';

// These flows type into several fields; give them room on a busy CI box.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const EXPENSES = [
  { id: 'e1', code: 'EXP-000001', date: '2026-10-01T10:00:00Z', amount: 1840, vat_price: 0, description: 'Electricity bill', payment_method: 'bank_transfer', category_name: ['Utilities'], category_id: ['c1'], created_by_name: 'Sirin' },
  { id: 'e2', code: 'EXP-000002', date: '2026-10-02T10:00:00Z', amount: 115, vat_price: 15, description: 'Oil change', payment_method: 'cash', category_name: ['Vehicles'], vendor_id: 'v1', vendor_name: 'GULF LUBRICANTS', created_by_name: 'Sirin' },
];
const listMock = (extra: any[] = []) => mockApi([...extra, { method: 'GET', path: '/v1/expense', reply: { status: true, total_count: 2, result: EXPENSES, meta: { total: 1955, cash: 115, bank: 1840, purchase_fund: 0, vat: 15 } } }]);

describe('Expenses list', () => {
  it('renders rows and the cash / bank / VAT totals from meta', async () => {
    listMock();
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    const table = await screen.findByRole('table', { name: 'Expenses' });
    expect(await within(table).findByText('EXP-000001')).toBeInTheDocument();
    expect(within(table).getByText('Electricity bill')).toBeInTheDocument();
    expect(screen.getByText('1,955.00')).toBeInTheDocument();
    expect(screen.getByText('VAT paid')).toBeInTheDocument();
  });

  it('scopes to the store, asks for stats and sorts newest first', async () => {
    const f = listMock();
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    await screen.findAllByText('EXP-000001');
    const [c] = calls(f, 'GET', '/v1/expense');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
    expect(c.url.searchParams.get('select')).toContain('category_name');
  });

  it('the "Bank" view filters by every bank payment method', async () => {
    const f = listMock();
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    await screen.findAllByText('EXP-000001');
    await userEvent.click(screen.getByRole('tab', { name: /^Bank/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/expense').some((c) => c.url.searchParams.get('search[payment_method]') === 'debit_card,credit_card,bank_card,bank_transfer,bank_cheque')).toBe(true));
  });

  it('searching text uses description, codes use code', async () => {
    const f = listMock();
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    await screen.findAllByText('EXP-000001');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'rent');
    await waitFor(() => expect(calls(f, 'GET', '/v1/expense').some((c) => c.url.searchParams.get('search[description]') === 'rent')).toBe(true), { timeout: 2000 });
  });

  it('date filters use the API date format', async () => {
    const f = listMock();
    renderApp(<ExpensesListPage />, { at: '/finance/expenses?f.date=2026-10-01~2026-10-05' });
    await screen.findAllByText('EXP-000001');
    const [c] = calls(f, 'GET', '/v1/expense');
    expect(c.url.searchParams.get('search[from_date]')).toBe('Oct 01 2026');
    expect(c.url.searchParams.get('search[to_date]')).toBe('Oct 05 2026');
  });

  it('shows an empty state and a retryable error', async () => {
    mockApi([{ method: 'GET', path: '/v1/expense', reply: { status: true, total_count: 0, result: [], meta: {} } }]);
    const { unmount } = renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
    unmount();
    mockApi([{ method: 'GET', path: '/v1/expense', status: 500, reply: { status: false, errors: { server: 'boom' } } }]);
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });

  it('hides "New expense" when RBAC denies create', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'expenses', read: true, create: false }] } },
      { method: 'GET', path: '/v1/expense', reply: { status: true, total_count: 2, result: EXPENSES, meta: {} } },
    ], { user: { id: 'u2', name: 'Clerk', role: 'User', admin: false }, store: { ...TEST_STORE, settings: { ...TEST_STORE.settings, enable_rbac_module: true } } });
    renderApp(<ExpensesListPage />, { at: '/finance/expenses' });
    await screen.findAllByText('EXP-000001');
    expect(screen.queryByRole('button', { name: 'New expense' })).not.toBeInTheDocument();
  });
});

describe('Expense editor', () => {
  const editorMocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/expense-category', reply: { status: true, result: [{ id: 'c1', name: 'Utilities' }, { id: 'c2', name: 'Rent' }] } },
    { method: 'GET', path: '/v1/vendor', reply: (u: URL) => ({ status: true, result: /corner/i.test(u.searchParams.get('search[query]') || '') ? [] : [{ id: 'v1', name: 'GULF LUBRICANTS', vat_no: '300' }] }) },
  ]);

  it('validates required fields locally and does not call the API', async () => {
    const f = editorMocks();
    renderApp(<ExpenseEditorPage />, { at: '/finance/expenses/new', path: '/finance/expenses/new' });
    await userEvent.click(await screen.findByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('At least 1 category is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/expense')).toHaveLength(0);
  });

  it('posts the exact API body with a linked vendor and previews VAT', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/expense', reply: { status: true, result: { id: 'new1', code: 'EXP-000009' } } }]);
    renderApp(<ExpenseEditorPage />, { at: '/finance/expenses/new', path: '/finance/expenses/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: /Description/ }), 'Engine oil');
    await userEvent.type(screen.getByRole('textbox', { name: /Amount/ }), '115');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Payment method/ }), 'purchase_fund');
    await userEvent.type(screen.getByRole('combobox', { name: /Vendor$/ }), 'gulf');
    await userEvent.click(await screen.findByRole('option', { name: /GULF LUBRICANTS/ }));
    expect(await screen.findByText('15.00')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: /Categories/ }), 'util');
    await userEvent.click(await screen.findByRole('option', { name: /Utilities/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/expense')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/expense');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, amount: 115, description: 'Engine oil', payment_method: 'purchase_fund', category_id: ['c1'], vendor_id: 'v1', vendor_name: 'GULF LUBRICANTS', images: [] });
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(post.body).not.toHaveProperty('images_content');
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });

  it('a typed vendor name is sent without vendor_id so the server creates it', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/expense', reply: { status: true, result: { id: 'n', code: 'EXP-1' } } }]);
    renderApp(<ExpenseEditorPage />, { at: '/finance/expenses/new', path: '/finance/expenses/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: /Description/ }), 'Tea');
    await userEvent.type(screen.getByRole('textbox', { name: /Amount/ }), '20');
    await userEvent.type(screen.getByRole('combobox', { name: /Vendor$/ }), 'Corner Shop');
    await userEvent.click(await screen.findByRole('button', { name: 'Use as a new vendor' }));
    await userEvent.type(screen.getByRole('combobox', { name: /Categories/ }), 'r');
    await userEvent.click(await screen.findByRole('option', { name: /Rent/ }));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/expense')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/expense')[0].body).toMatchObject({ vendor_id: '', vendor_name: 'Corner Shop', category_id: ['c2'] });
  });

  it('maps server validation errors onto fields', async () => {
    editorMocks([{ method: 'POST', path: '/v1/expense', status: 400, reply: { status: false, errors: { category_id_0: 'Invalid category', date_str: 'Invalid date format' } } }]);
    renderApp(<ExpenseEditorPage />, { at: '/finance/expenses/new', path: '/finance/expenses/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: /Description/ }), 'x');
    await userEvent.type(screen.getByRole('textbox', { name: /Amount/ }), '1');
    await userEvent.type(screen.getByRole('combobox', { name: /Categories/ }), 'u');
    await userEvent.click(await screen.findByRole('option', { name: /Utilities/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect((await screen.findAllByText('Invalid category')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invalid date format').length).toBeGreaterThan(0);
  });

  it('edits an existing expense with PUT and keeps its images', async () => {
    const f = editorMocks([
      { method: 'GET', path: '/v1/expense/e1', reply: { status: true, result: { ...EXPENSES[0], images: ['/cdn/images/s/expenses/a.jpg'] } } },
      { method: 'PUT', path: '/v1/expense/e1', reply: { status: true, result: { id: 'e1', code: 'EXP-000001' } } },
    ]);
    renderApp(<ExpenseEditorPage />, { at: '/finance/expenses/e1/edit', path: '/finance/expenses/:id/edit' });
    const desc = await screen.findByRole('textbox', { name: /Description/ });
    expect(desc).toHaveValue('Electricity bill');
    await userEvent.clear(desc);
    await userEvent.type(desc, 'Electricity – Sept');
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/expense/e1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/expense/e1')[0].body).toMatchObject({ description: 'Electricity – Sept', amount: 1840, category_id: ['c1'], images: ['/cdn/images/s/expenses/a.jpg'], payment_method: 'bank_transfer' });
  });
});

describe('Expense view', () => {
  it('shows the facts and an Edit action', async () => {
    mockApi([{ method: 'GET', path: '/v1/expense/e2', reply: { status: true, result: { ...EXPENSES[1], vat_percent: 15, category_id: ['c9'], category_name: ['Vehicles'] } } }]);
    renderApp(<ExpenseViewPage />, { at: '/finance/expenses/e2', path: '/finance/expenses/:id' });
    expect(await screen.findByRole('heading', { name: /EXP-000002/ })).toBeInTheDocument();
    expect(screen.getAllByText('GULF LUBRICANTS').length).toBeGreaterThan(0);
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('No attachments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
