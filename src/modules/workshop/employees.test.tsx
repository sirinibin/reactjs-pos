import { describe, expect, it, vi } from 'vitest';
import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE } from '@/test/utils';
import { EmployeeEditorPage, EmployeeListPage, EmployeeViewPage } from './employees';
import { SalaryListPage } from './salaries';

// Heavy user-event flows; keep headroom when the suite runs on a busy machine.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const EMPS = [
  { id: 'e1', name: 'Ramesh Kumar', position: 'Senior Technician', mob1: '0502222201', mob2: '0509', salary: 3500, salary_day: 5, joining_date: '2025-07-05T00:00:00Z', account: { id: 'a1', name: 'EMP: RAMESH KUMAR', type: 'liability', balance: 7000 }, created_at: '2026-10-05T18:00:00Z' },
  { id: 'e2', name: 'Arun Nair', position: 'Technician', mob1: '0502222202', salary: 2800, salary_day: 5, account: { type: 'asset', balance: 300 } },
];
const META = { total_employees: 2, total_salary: 6300, total_salary_paid: 1000, total_owed_to_employees: 7000, total_employees_owe: 300 };
const SA_STORE = { ...TEST_STORE, country_code: 'SA' };

describe('Employee list', () => {
  it('shows balances with direction, summary tiles from meta (stats=1) and the net balance', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/employee', reply: { status: true, total_count: 2, result: EMPS, meta: META } }]);
    renderApp(<EmployeeListPage />, { at: '/workshop/employees' });
    const table = await screen.findByRole('table', { name: 'Employees' });
    expect(await within(table).findByText('-7,000.00')).toBeInTheDocument();
    expect(within(table).getByText('Owed to Employee')).toBeInTheDocument();
    expect(within(table).getByText('Employee Owes')).toBeInTheDocument();
    expect(screen.getByText('6,300.00')).toBeInTheDocument();
    expect(screen.getByText('-6,700.00')).toBeInTheDocument(); // 300 − 7000
    const c = calls(f, 'GET', '/v1/employee')[0].url.searchParams;
    expect(c.get('search[stats]')).toBe('1');
    expect(c.get('select')).toContain('account');
  });

  it('PAY SALARY opens the payment dialog prefilled with the outstanding balance and posts the ledger payment', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/employee', reply: { status: true, total_count: 2, result: EMPS, meta: META } },
      { method: 'POST', path: '/v1/employee-salary-payment', reply: { status: true, result: { id: 'sp1' } } },
    ], { store: SA_STORE });
    renderApp(<EmployeeListPage />, { at: '/workshop/employees' });
    const table = await screen.findByRole('table', { name: 'Employees' });
    await userEvent.click((await within(table).findAllByRole('button', { name: 'PAY SALARY' }))[0]);
    const dlg = await screen.findByRole('dialog', { name: 'Pay Salary' });
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('7000');
    await userEvent.click(within(dlg).getByRole('radio', { name: /Bank Transfer/ }));
    await userEvent.click(within(dlg).getByRole('button', { name: /^Pay 7,000.00/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/employee-salary-payment')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/employee-salary-payment')[0].body;
    expect(body).toMatchObject({ store_id: STORE_ID, employee_id: 'e1', amount: 7000, payment_method: 'bank_transfer', description: '' });
    // month/year derived from the store-local (SA) date
    const local = new Date(new Date(body.date).getTime() + 3 * 3600000);
    expect(body.month).toBe(local.getUTCMonth() + 1);
    expect(body.year).toBe(local.getUTCFullYear());
  });

  it('delete permanently confirms with the legacy text and calls the permanent endpoint', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/employee', reply: { status: true, total_count: 2, result: EMPS, meta: META } },
      { method: 'DELETE', path: '/v1/employee/permanent/e2', reply: { status: true, result: 'Deleted permanently' } },
    ]);
    renderApp(<EmployeeListPage />, { at: '/workshop/employees' });
    const table = await screen.findByRole('table', { name: 'Employees' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Delete Permanently Arun Nair' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete Permanently' });
    expect(within(dlg).getByText(/Permanently delete "Arun Nair"\?/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete Permanently' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/employee/permanent/e2')).toHaveLength(1));
    expect(await screen.findByText('Employee deleted permanently')).toBeInTheDocument();
  });
});

describe('Employee editor', () => {
  it('shows all client validation errors at once', async () => {
    const f = mockApi([]);
    renderApp(<EmployeeEditorPage />, { at: '/workshop/employees/new', path: '/workshop/employees/new' });
    await userEvent.clear(await screen.findByRole('spinbutton', { name: /Salary Date/ }));
    await userEvent.type(screen.getByRole('spinbutton', { name: /Salary Date/ }), '31');
    await userEvent.clear(screen.getByRole('textbox', { name: /Opening Balance Amount/ }));
    await userEvent.type(screen.getByRole('textbox', { name: /Opening Balance Amount/ }), '500');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Salary day must be between 1 and 28')).toBeInTheDocument();
    expect(screen.getByText('As of date is required when an opening balance is set')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/employee')).toHaveLength(0);
  });

  it('creates an employee; dates converted from store-local (SA) to UTC; mob1 duplicate maps to the field', async () => {
    const f = mockApi([{ method: 'POST', path: '/v1/employee', status: 400, reply: { status: false, errors: { mob1: 'Mobile 1 already exists' } } }], { store: SA_STORE });
    renderApp(<EmployeeEditorPage />, { at: '/workshop/employees/new?position=Technician', path: '/workshop/employees/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'Omar Saleh');
    expect(screen.getByRole('combobox', { name: /Position/ })).toHaveValue('Technician');
    await userEvent.type(screen.getByRole('textbox', { name: /Mobile 1/ }), '0500000001');
    const joining = screen.getByLabelText(/Joining Date/);
    await userEvent.clear(joining);
    await userEvent.type(joining, '2026-01-15');
    const sal = screen.getByRole('textbox', { name: /^Salary/ });
    await userEvent.clear(sal);
    await userEvent.type(sal, '4000');
    await userEvent.click(screen.getByRole('radio', { name: 'Employee owes Store' }));
    await userEvent.clear(screen.getByRole('textbox', { name: /Opening Balance Amount/ }));
    await userEvent.type(screen.getByRole('textbox', { name: /Opening Balance Amount/ }), '250');
    await userEvent.type(screen.getByLabelText(/As Of Date/), '2026-01-01T09:00');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/employee')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/employee')[0].body).toMatchObject({
      store_id: STORE_ID, name: 'Omar Saleh', position: 'Technician', mob1: '0500000001', salary: 4000, salary_day: 1, is_active: true,
      joining_date: '2026-01-14T21:00:00.000Z', opening_balance: 250, opening_balance_type: 'receivable', opening_balance_date: '2026-01-01T06:00:00.000Z',
    });
    expect(await screen.findByText('Mobile 1 already exists')).toBeInTheDocument();
  });

  it('manages positions in localStorage', async () => {
    mockApi([]);
    renderApp(<EmployeeEditorPage />, { at: '/workshop/employees/new', path: '/workshop/employees/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'Manage Positions' }));
    const dlg = await screen.findByRole('dialog', { name: 'Manage Positions' });
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'New position name...' }), 'Tyre Specialist{Enter}');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Tyre Specialist' }));
    expect(screen.getByRole('combobox', { name: /Position/ })).toHaveValue('Tyre Specialist');
    expect(JSON.parse(localStorage.getItem('workshop_positions')!)).toContain('Tyre Specialist');
  });
});

describe('Employee view & salary history', () => {
  it('lists payments, edits one via PUT (full replace) and deletes with confirmation', async () => {
    const PAY = { id: 'sp1', code: 'SAL-ABC123', employee_id: 'e1', employee_name: 'Ramesh Kumar', date: '2026-10-05T07:00:00Z', amount: 3500, payment_method: 'cash', month: 10, year: 2026, description: 'Oct' };
    const f = mockApi([
      { method: 'GET', path: '/v1/employee/e1', reply: { status: true, result: EMPS[0] } },
      { method: 'GET', path: '/v1/employee-salary-payment', reply: { status: true, result: [PAY] } },
      { method: 'PUT', path: '/v1/employee-salary-payment/sp1', reply: { status: true, result: PAY } },
      { method: 'DELETE', path: '/v1/employee-salary-payment/sp1', reply: { status: true, result: 'ok' } },
    ], { store: SA_STORE });
    renderApp(<EmployeeViewPage />, { at: '/workshop/employees/e1?tab=salary', path: '/workshop/employees/:id' });
    expect(await screen.findByText('SAL-ABC123')).toBeInTheDocument();
    expect(screen.getByText('2026-10-05 10:00')).toBeInTheDocument(); // SA wall clock
    expect(calls(f, 'GET', '/v1/employee-salary-payment')[0].url.searchParams.get('search[employee_id]')).toBe('e1');
    await userEvent.click(screen.getByRole('button', { name: 'Edit SAL-ABC123' }));
    const dlg = await screen.findByRole('dialog', { name: 'Edit Salary Payment' });
    const amt = within(dlg).getByRole('textbox', { name: /Amount/ });
    await userEvent.clear(amt);
    await userEvent.type(amt, '3600');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Update Payment' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/employee-salary-payment/sp1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/employee-salary-payment/sp1')[0].body).toEqual({ store_id: STORE_ID, employee_id: 'e1', amount: 3600, payment_method: 'cash', date: '2026-10-05T07:00:00.000Z', month: 10, year: 2026, description: 'Oct' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete SAL-ABC123' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Delete' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/employee-salary-payment/sp1')).toHaveLength(1));
  });
});

describe('Salaries list', () => {
  it('summary from meta, method view filter, and validation in the create dialog', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/employee-salary-payment', reply: { status: true, total_count: 1, result: [{ id: 'sp1', code: 'SAL-1', employee_name: 'Ramesh Kumar', amount: 3500, payment_method: 'bank_transfer', month: 10, year: 2026, date: '2026-10-05T07:00:00Z' }], meta: { total_payments: 1, total_amount: 3500, total_cash: 0, total_bank_transfer: 3500 } } },
      { method: 'GET', path: '/v1/employee', reply: { status: true, result: EMPS } },
    ]);
    renderApp(<SalaryListPage />, { at: '/workshop/salaries' });
    const table = await screen.findByRole('table', { name: 'Salaries' });
    expect(await within(table).findByText('Ramesh Kumar')).toBeInTheDocument();
    expect(within(table).getByText('Bank Transfer')).toBeInTheDocument();
    expect(within(table).getByText('Oct 2026')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/employee-salary-payment')[0].url.searchParams.get('sort')).toBe('-date');
    await userEvent.click(screen.getByRole('tab', { name: /^Cash/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/employee-salary-payment').some((c) => c.url.searchParams.get('search[payment_method]') === 'cash')).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Pay Salary' }));
    const dlg = await screen.findByRole('dialog', { name: 'Pay Salary' });
    await userEvent.click(within(dlg).getByRole('button', { name: /^Pay 0.00/ }));
    expect(within(dlg).getByText('Please select an employee')).toBeInTheDocument();
    expect(within(dlg).getByText('Amount must be greater than 0')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByRole('combobox', { name: /Employee/ }), 'ram');
    await userEvent.click(await within(dlg).findByRole('option', { name: /Ramesh Kumar/ }));
    expect(within(dlg).getByRole('textbox', { name: /Amount/ })).toHaveValue('7000');
  });
});
