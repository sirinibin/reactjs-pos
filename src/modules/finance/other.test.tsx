import { describe, expect, it, vi } from 'vitest';
import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { CapitalPage, DrawingsPage, equityBody, EQUITY } from './equity';
import { ExpenseCategoriesPage } from './categories';
import { LedgerPage } from './ledger';
import { PostingPrintPage, ReportPrintPage } from './print';

// These flows type into several fields; give them room on a busy CI box.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const CAPITALS = [{ id: 'k1', code: 'CAP-000001', date: '2026-10-01T10:00:00Z', amount: 50000, payment_method: 'bank_transfer', description: 'Initial capital', invested_by_user_id: 'u1', invested_by_user_name: 'Sirin K', created_by_name: 'Sirin K' }];

describe('Capital / drawings', () => {
  it('lists entries with the always-computed total', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/capital', reply: { status: true, total_count: 1, result: CAPITALS, meta: { total: 50000 } } }]);
    renderApp(<CapitalPage />, { at: '/finance/capital' });
    expect(await within(await screen.findByRole('table', { name: 'Capital' })).findByText('CAP-000001')).toBeInTheDocument();
    expect(screen.getAllByText('50,000.00').length).toBeGreaterThan(1);
    expect(calls(f, 'GET', '/v1/capital')[0].url.searchParams.get('select')).toContain('invested_by_user_name');
  });

  it('creates a capital entry with the exact body', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/capital', reply: { status: true, total_count: 0, result: [], meta: { total: 0 } } },
      { method: 'GET', path: '/v1/user', reply: { status: true, result: [{ id: 'u1', name: 'Sirin K' }] } },
      { method: 'POST', path: '/v1/capital', reply: { status: true, result: { id: 'k9', code: 'CAP-000009' } } },
    ]);
    renderApp(<CapitalPage />, { at: '/finance/capital?new=1' });
    const dlg = await screen.findByRole('dialog', { name: 'New capital entry' });
    await userEvent.click(within(dlg).getByRole('combobox', { name: /Invested by/ }));
    await userEvent.click(await within(dlg).findByRole('option', { name: /Sirin K/ }));
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Amount/ }), '25000');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Description/ }), 'Top-up');
    await userEvent.selectOptions(within(dlg).getByRole('combobox', { name: /Payment method/ }), 'bank_transfer');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/capital')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/capital');
    expect(post.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ store_id: STORE_ID, invested_by_user_id: 'u1', amount: 25000, description: 'Top-up', payment_method: 'bank_transfer' });
    expect(post.body.date_str).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('client-side required checks block the request', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/divident', reply: { status: true, total_count: 0, result: [], meta: { total: 0 } } }]);
    renderApp(<DrawingsPage />, { at: '/finance/drawings?new=1' });
    const dlg = await screen.findByRole('dialog', { name: 'New drawing' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Withdrawn by is required')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/divident')).toHaveLength(0);
  });

  it('drawings offer no "withdrawn by" filter (the API ignores it)', async () => {
    mockApi([{ method: 'GET', path: '/v1/divident', reply: { status: true, total_count: 0, result: [], meta: { total: 0 } } }]);
    renderApp(<DrawingsPage />, { at: '/finance/drawings' });
    await screen.findByRole('heading', { name: 'Drawings' });
    expect(screen.queryAllByRole('button', { name: /Withdrawn by/ }).filter((b) => b.classList.contains('fchip'))).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Payment method/ }).some((b) => b.classList.contains('fchip'))).toBe(true);
  });

  it('opens a record from ?open= and maps an image upload to images_content', async () => {
    mockApi([
      { method: 'GET', path: '/v1/capital', reply: { status: true, total_count: 1, result: CAPITALS, meta: { total: 50000 } } },
      { method: 'GET', path: '/v1/capital/k1', reply: { status: true, result: CAPITALS[0] } },
    ]);
    renderApp(<CapitalPage />, { at: '/finance/capital?open=k1' });
    const dlg = await screen.findByRole('dialog', { name: /CAP-000001/ });
    expect(within(dlg).getByText('Initial capital')).toBeInTheDocument();
    expect(equityBody(EQUITY.drawing, { withdrawn_by_user_id: 'u', amount: 5, description: 'd', payment_method: 'cash', date_str: '2026-10-05T10:00', image: { dataUrl: 'data:image/jpeg;base64,QUJD', keep: [] } }))
      .toMatchObject({ withdrawn_by_user_id: 'u', images_content: ['QUJD'], images: [] });
  });
});

describe('Expense categories', () => {
  it('creates a category and shows the uniqueness error from the API', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/expense-category', reply: { status: true, total_count: 1, result: [{ id: 'c1', name: 'Utilities', created_by_name: 'Sirin' }] } },
      { method: 'POST', path: '/v1/expense-category', status: 400, reply: { status: false, errors: { name: 'Name is Already in use' } } },
    ]);
    renderApp(<ExpenseCategoriesPage />, { at: '/finance/expense-categories' });
    await screen.findAllByText('Utilities');
    await userEvent.click(screen.getByRole('button', { name: 'New category' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /Name/ }), 'Utilities');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Name is Already in use')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/expense-category')[0].body).toMatchObject({ store_id: STORE_ID, name: 'Utilities', parent_id: null });
  });

  it('edits on row click with PUT', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/expense-category', reply: { status: true, total_count: 1, result: [{ id: 'c1', name: 'Utilities' }] } },
      { method: 'PUT', path: '/v1/expense-category/c1', reply: { status: true, result: { id: 'c1', name: 'Utilities & power' } } },
    ]);
    renderApp(<ExpenseCategoriesPage />, { at: '/finance/expense-categories' });
    const table = await screen.findByRole('table', { name: 'Expense categories' });
    await userEvent.click(await within(table).findByText('Utilities'));
    const dlg = await screen.findByRole('dialog', { name: 'Edit category' });
    const name = within(dlg).getByRole('textbox', { name: /Name/ });
    await userEvent.clear(name);
    await userEvent.type(name, 'Utilities & power{Enter}');
    await waitFor(() => expect(calls(f, 'PUT', '/v1/expense-category/c1')).toHaveLength(1));
  });
});

describe('Ledger', () => {
  it('renders journals as Dr./Cr. lines and filters by account', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/ledger', reply: { status: true, total_count: 1, result: [{ id: 'l1', reference_model: 'sales', reference_id: 's1', reference_code: 'S-INV-000001', journals: [
      { date: '2026-10-01T10:00:00Z', account_id: 'a1', account_name: 'CASH', account_number: '1000', debit_or_credit: 'debit', debit: 115 },
      { date: '2026-10-01T10:00:00Z', account_id: 'a2', account_name: 'SALES', account_number: '1007', debit_or_credit: 'credit', credit: 115 },
    ] }] } }]);
    renderApp(<LedgerPage />, { at: '/finance/ledger?f.account=a1|CASH', path: '/finance/ledger' });
    const table = await screen.findByRole('table', { name: 'Ledger' });
    expect(await within(table).findByText('CASH A/c #1000 Dr.')).toBeInTheDocument();
    expect(within(table).getByText('To SALES A/c #1007 Cr.')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'S-INV-000001' })).toHaveAttribute('href', '/sales/invoices/s1');
    const [c] = calls(f, 'GET', '/v1/ledger');
    expect(c.url.searchParams.get('search[account_id]')).toBe('a1');
    expect(c.url.searchParams.get('sort')).toBe('-journals.date');
    await userEvent.click(within(table).getByRole('button', { name: 'To SALES A/c #1007 Cr.' }));
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  });
});

describe('Server PDF print pages', () => {
  const renderBare = (el: JSX.Element, at: string) => render(<MemoryRouter initialEntries={[at]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="*" element={el} /></Routes></MemoryRouter>);

  it('/posting-print loads the one-time payload without auth and flags print-ready', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/posting/print-data/k1', reply: { model: { name: 'CASH', number: '1000', store: { name: 'GUO' }, debitTotal: 10, creditTotal: 0, creditBalance: 10, posts: [{ reference_code: 'S-1', reference_model: 'sales', posts: [{ debit_or_credit: 'debit', debit: 10, balance: 10, account_name: 'SALES', account_number: '1007' }] }] }, modelName: 'balance_sheet', fontSizes: {} } }]);
    delete document.body.dataset.printReady;
    renderBare(<PostingPrintPage />, '/posting-print?key=k1');
    expect(await screen.findByText('To SALES A/c #1007 Dr.')).toBeInTheDocument();
    expect(screen.getByText(/By Closing Balance/)).toBeInTheDocument();
    await waitFor(() => expect(document.body.dataset.printReady).toBe('true'), { timeout: 3000 });
    expect(calls(f, 'GET', '/v1/posting/print-data/k1')).toHaveLength(1);
  });

  it('/report-print renders rows + totals and reports expired keys', async () => {
    mockApi([{ method: 'GET', path: '/v1/report/print-data/k2', reply: { model: { store: { name: 'GUO' }, models: [{ code: 'S-INV-1', net_total: 115, total_payment_received: 15, balance_amount: 100, customer_name: 'AL NOOR', payment_status: 'paid_partially' }] }, modelName: 'sales_report' } }]);
    const { unmount } = renderBare(<ReportPrintPage />, '/report-print?key=k2');
    expect(await screen.findByText('Sales report')).toBeInTheDocument();
    expect(screen.getByText('AL NOOR')).toBeInTheDocument();
    expect(screen.getByText('Paid Partially')).toBeInTheDocument();
    unmount();
    mockApi([]);
    renderBare(<ReportPrintPage />, '/report-print?key=gone');
    expect(await screen.findByText(/Couldn’t load this data/)).toBeInTheDocument();
  });
});
