import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { AccountsPage } from './accounts';
import { AccountStatementPage, PostingsPage } from './statement';

// These flows type into several fields; give them room on a busy CI box.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const ACCOUNTS = [
  { id: 'a1', number: '1000', name: 'CASH', type: 'asset', balance: 500, debit_or_credit_balance: 'debit_balance', open: true },
  { id: 'a2', number: '1007', name: 'SALES', type: 'revenue', balance: 400, debit_or_credit_balance: 'credit_balance', open: true },
  { id: 'a3', number: '1010', name: 'AL NOOR', type: 'liability', reference_model: 'customer', balance: 100, debit_or_credit_balance: 'credit_balance', open: true, phone: '0554' },
  { id: 'a4', number: '1011', name: 'OLD VENDOR', type: 'liability', reference_model: 'vendor', balance: 0, debit_or_credit_balance: '', open: false, deleted: true },
];
const accountsMock = (meta = { debit_balance_total: 500, credit_balance_total: 500 }, extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/account', reply: { status: true, total_count: ACCOUNTS.length, result: ACCOUNTS, meta } },
]);

describe('Accounts list', () => {
  it('always sends stats=1 (total_count/meta depend on it) and shows the debit/credit split', async () => {
    const f = accountsMock();
    renderApp(<AccountsPage />, { at: '/finance/accounts' });
    const table = await screen.findByRole('table', { name: 'Accounts & trial balance' });
    expect(await within(table).findByText('CASH')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/account');
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('sort')).toBe('-updated_at');
    const cash = within(table).getByText('CASH').closest('tr')!;
    expect(within(cash).getByText('500.00')).toBeInTheDocument();
    expect(screen.getByText('Debit balance total')).toBeInTheDocument();
    expect(screen.getAllByText('500.00').length).toBeGreaterThan(1);
  });

  it('views filter by open / reference / deleted', async () => {
    const f = accountsMock();
    renderApp(<AccountsPage />, { at: '/finance/accounts' });
    await screen.findAllByText('CASH');
    await userEvent.click(screen.getByRole('tab', { name: /^Customers/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/account').some((c) => c.url.searchParams.get('search[reference_model]') === 'customer')).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/account').some((c) => c.url.searchParams.get('search[deleted]') === '1')).toBe(true));
  });

  it('confirms before deleting, and restores deleted accounts', async () => {
    const f = accountsMock(undefined, [
      { method: 'DELETE', path: '/v1/account/a1', reply: { status: true, result: 'ok' } },
      { method: 'POST', path: '/v1/account/restore/a4', reply: { status: true, result: 'ok' } },
    ]);
    renderApp(<AccountsPage />, { at: '/finance/accounts' });
    const table = await screen.findByRole('table', { name: 'Accounts & trial balance' });
    const row = (await within(table).findByText('CASH')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/Restore it from the Deleted view/i)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/account/a1')).toHaveLength(1));
    const old = within(table).getByText('OLD VENDOR').closest('tr')!;
    await userEvent.click(within(old).getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/account/restore/a4')).toHaveLength(1));
  });
});

describe('Trial balance', () => {
  it('builds the account tree and shows the balanced badge from server totals', async () => {
    const f = accountsMock();
    renderApp(<AccountsPage />, { at: '/finance/accounts?tab=tb' });
    const table = await screen.findByRole('table', { name: 'Trial balance' });
    expect(within(table).getByText('Assets')).toBeInTheDocument();
    expect(within(table).getByText('Customers')).toBeInTheDocument();
    expect(within(table).queryByText('OLD VENDOR')).not.toBeInTheDocument();
    expect(screen.getByText('Debits equal credits')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/account');
    expect(c.url.searchParams.get('limit')).toBe('500');
    expect(c.url.searchParams.get('search[stats]')).toBe('1');
  });

  it('flags an out-of-balance ledger and collapses groups', async () => {
    accountsMock({ debit_balance_total: 500, credit_balance_total: 596.6 });
    renderApp(<AccountsPage />, { at: '/finance/accounts?tab=tb' });
    const table = await screen.findByRole('table', { name: 'Trial balance' });
    expect(screen.getByText('Out of balance by 96.60')).toBeInTheDocument();
    expect(within(table).getByText('AL NOOR')).toBeInTheDocument();
    await userEvent.click(within(table).getByRole('button', { name: 'Collapse Liabilities' }));
    expect(within(table).queryByText('AL NOOR')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(within(table).queryByText('CASH')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(within(table).getByText('CASH')).toBeInTheDocument();
  });

  it('shows an empty state for a new store', async () => {
    mockApi([{ method: 'GET', path: '/v1/account', reply: { status: true, total_count: 0, result: [], meta: { debit_balance_total: 0, credit_balance_total: 0 } } }]);
    renderApp(<AccountsPage />, { at: '/finance/accounts?tab=tb' });
    expect(await screen.findByText('No balances yet')).toBeInTheDocument();
  });
});

const POSTINGS = [
  { id: 'p1', reference_model: 'sales', reference_id: 's1', reference_code: 'S-INV-000001', posts: [{ id: 'x1', date: '2026-10-01T10:00:00Z', account_name: 'SALES', account_number: '1007', debit_or_credit: 'debit', debit: 100, balance: 150 }] },
  { id: 'p2', reference_model: 'expense', reference_id: 'e1', reference_code: 'EXP-000001', posts: [{ id: 'x2', date: '2026-10-02T10:00:00Z', account_name: 'UTILITIES EXPENSE', account_number: '1030', debit_or_credit: 'credit', credit: 40, balance: 110 }] },
];
const postingMock = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/account/a1', reply: { status: true, result: ACCOUNTS[0] } },
  { method: 'GET', path: '/v1/posting', reply: (u: URL) => ({ status: true, total_count: u.searchParams.get('limit') === '1' ? 45 : 45, result: u.searchParams.get('limit') === '1' ? [{ id: 'p1' }] : POSTINGS, meta: { debit_total: 150, credit_total: 40, credit_balance: 110, debit_balance_bought_down: 50, account: { ...ACCOUNTS[0], type: 'asset' } } }) },
]);

describe('Account statement', () => {
  it('queries the account oldest→newest with stats and opens on the last page', async () => {
    const f = postingMock();
    renderApp(<AccountStatementPage />, { at: '/finance/accounts/a1', path: '/finance/accounts/:id' });
    const table = await screen.findByRole('table', { name: 'Account statement' });
    expect(await within(table).findByText('S-INV-000001')).toBeInTheDocument();
    const list = calls(f, 'GET', '/v1/posting');
    const main = list.find((c) => c.url.searchParams.get('limit') === '20')!;
    expect(main.url.searchParams.get('search[account_id]')).toBe('a1');
    expect(main.url.searchParams.get('search[stats]')).toBe('1');
    expect(main.url.searchParams.get('sort')).toBe('posts.date');
    expect(main.url.searchParams.get('page')).toBe('3'); // ceil(45 / 20)
    expect(main.url.searchParams.get('select')).toContain('posts');
  });

  it('renders contra labels, closing balance, footer rows and document links', async () => {
    postingMock();
    renderApp(<AccountStatementPage />, { at: '/finance/accounts/a1?page=1', path: '/finance/accounts/:id' });
    const table = await screen.findByRole('table', { name: 'Account statement' });
    expect(await within(table).findByText('To SALES A/c #1007 Dr.')).toBeInTheDocument();
    expect(within(table).getByText('By UTILITIES EXPENSE A/c #1030 Cr.')).toBeInTheDocument();
    expect(within(table).getByText('To opening balance')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'EXP-000001' })).toHaveAttribute('href', '/finance/expenses/e1');
    expect(screen.getByText('Closing balance')).toBeInTheDocument();
    expect(screen.getAllByText('110.00').length).toBeGreaterThan(0);
  });

  it('"Ignore opening balance" recomputes totals client-side', async () => {
    postingMock();
    renderApp(<AccountStatementPage />, { at: '/finance/accounts/a1?page=1', path: '/finance/accounts/:id' });
    const table = await screen.findByRole('table', { name: 'Account statement' });
    await within(table).findByText('S-INV-000001');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ignore opening balance' }));
    expect(within(table).queryByText('To opening balance')).not.toBeInTheDocument();
    expect(within(table).getAllByText('100.00').length).toBeGreaterThan(1); // debit total = 150 − 50
  });

  it('type and date filters go to the API', async () => {
    const f = postingMock();
    renderApp(<AccountStatementPage />, { at: '/finance/accounts/a1?page=1&f.type=expense&f.date=2026-10-01~2026-10-05', path: '/finance/accounts/:id' });
    await screen.findByRole('table', { name: 'Account statement' });
    const c = calls(f, 'GET', '/v1/posting')[0];
    expect(c.url.searchParams.get('search[reference_model]')).toBe('expense');
    expect(c.url.searchParams.get('search[from_date]')).toBe('Oct 01 2026');
    expect(c.url.searchParams.get('search[to_date]')).toBe('Oct 05 2026');
  });

  it('postings page asks for an account first', async () => {
    const f = mockApi([]);
    renderApp(<PostingsPage />, { at: '/finance/postings' });
    expect(await screen.findByText('Choose an account')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/posting')).toHaveLength(0);
  });
});
