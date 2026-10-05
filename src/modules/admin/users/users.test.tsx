import { describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_USER } from '@/test/utils';
import { UserEditorPage, UsersListPage, UserViewPage } from './UserPages';
import { RoleEditorPage, RolesListPage } from '../roles/RolePages';
import { SignaturesPage } from '../signatures/Signatures';
import { MenuSettingsPage } from '../menu/MenuSettings';

const USERS = [
  { id: 'u1', name: 'Sirin K', email: 'sirinibin2006@gmail.com', role: 'Admin', online: true, last_offline_at: new Date().toISOString(), created_at: '2026-10-01T10:00:00Z' },
  { id: 'u2', name: 'Ali Salesman', email: 'ali@x.sa', mob: '0551', role: 'SalesMan', store_names: ['GUO', 'JED', 'DMM'], online: false, created_at: '2026-10-02T10:00:00Z' },
];
const STORES = { method: 'GET', path: '/v1/store', reply: { status: true, result: [{ id: STORE_ID, name: 'Gulf Union Ozone Co.', branch_name: 'Riyadh HQ', code: 'GUO' }, { id: 's2', name: 'Jeddah', code: 'JED' }] } };

describe('Users list', () => {
  it('renders presence, roles and store chips without store scoping', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/user', reply: { status: true, total_count: 2, result: USERS } }]);
    renderApp(<UsersListPage />, { at: '/admin/users' });
    const table = await screen.findByRole('table', { name: 'Users' });
    expect(await within(table).findByText('Ali Salesman')).toBeInTheDocument();
    expect(within(table).getByText('Salesman')).toBeInTheDocument();
    expect(within(table).getByText('+1')).toBeInTheDocument();
    expect(within(table).getAllByText('Online').length).toBeGreaterThan(0);
    const c = calls(f, 'GET', '/v1/user')[0];
    expect(c.url.searchParams.get('search[store_id]')).toBeNull();
    expect(c.url.searchParams.get('sort')).toBe('-created_at');
  });

  it('"Online now" view and email search send the right filters', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/user', reply: { status: true, total_count: 2, result: USERS } }]);
    renderApp(<UsersListPage />, { at: '/admin/users' });
    await screen.findAllByText('Ali Salesman');
    await userEvent.click(screen.getByRole('tab', { name: /^Online now/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/user').some((c) => c.url.searchParams.get('search[online]') === '1')).toBe(true));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'ali@x');
    await waitFor(() => expect(calls(f, 'GET', '/v1/user').some((c) => c.url.searchParams.get('search[email]') === 'ali@x')).toBe(true), { timeout: 2000 });
  });
});

describe('User editor', () => {
  it('validates, then POSTs the exact body with full store_ids', async () => {
    const f = mockApi([STORES, { method: 'POST', path: '/v1/user', reply: { status: true, result: { id: 'n1' } } }]);
    renderApp(<UserEditorPage />, { at: '/admin/users/new', path: '/admin/users/new' });
    await screen.findByRole('heading', { name: 'New user' });
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /^Name/ }), 'New Guy');
    await userEvent.type(screen.getByRole('textbox', { name: /^Email/ }), 'new@x.sa');
    await userEvent.type(screen.getByRole('textbox', { name: /^Mobile/ }), '0550');
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Salesman' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Jeddah/ }));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/user')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/user')[0].body).toEqual({ name: 'New Guy', email: 'new@x.sa', mob: '0550', password: 'secret1', role: 'SalesMan', admin: false, store_ids: ['s2'], role_ids: [], store_id: STORE_ID, opening_balance: 0, opening_balance_type: 'payable' });
  });

  it('maps a 409 email conflict onto the email field', async () => {
    mockApi([STORES, { method: 'POST', path: '/v1/user', status: 409, reply: { status: false, errors: { email: 'E-mail is Already in use' } } }]);
    renderApp(<UserEditorPage />, { at: '/admin/users/new', path: '/admin/users/new' });
    await userEvent.type(await screen.findByRole('textbox', { name: /^Name/ }), 'X');
    await userEvent.type(screen.getByRole('textbox', { name: /^Email/ }), 'dup@x.sa');
    await userEvent.type(screen.getByRole('textbox', { name: /^Mobile/ }), '1');
    await userEvent.type(screen.getByLabelText(/^Password/), 'secret1');
    await userEvent.keyboard('{Control>}s{/Control}');
    expect((await screen.findAllByText('E-mail is Already in use')).length).toBeGreaterThan(0);
  });

  it('managers are not offered the Admin role', async () => {
    const existing = { id: 'u2', name: 'Ali', email: 'ali@x.sa', mob: '1', role: 'SalesMan', store_ids: [STORE_ID], store_names: ['GUO'] };
    const f = mockApi([STORES, { method: 'GET', path: '/v1/user/u2', reply: { status: true, result: existing } }, { method: 'PUT', path: '/v1/user/u2', reply: { status: true, result: existing } }],
      { user: { ...TEST_USER, id: 'm1', admin: false, role: 'Manager', store_ids: [STORE_ID] } });
    renderApp(<UserEditorPage />, { at: '/admin/users/u2/edit', path: '/admin/users/:id/edit' });
    await screen.findByRole('textbox', { name: /^Name/ });
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(calls(f, 'PUT', '/v1/user/u2')).toHaveLength(0);
  });

  it('admin edit sends PUT without password and keeps store ids', async () => {
    const existing = { id: 'u2', name: 'Ali', email: 'ali@x.sa', mob: '1', role: 'SalesMan', store_ids: [STORE_ID], store_names: ['GUO'] };
    const f = mockApi([STORES, { method: 'GET', path: '/v1/user/u2', reply: { status: true, result: existing } }, { method: 'PUT', path: '/v1/user/u2', reply: { status: true, result: existing } }]);
    renderApp(<UserEditorPage />, { at: '/admin/users/u2/edit', path: '/admin/users/:id/edit' });
    const mob = await screen.findByRole('textbox', { name: /^Mobile/ });
    await userEvent.clear(mob);
    await userEvent.type(mob, '0559');
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'PUT', '/v1/user/u2')).toHaveLength(1));
    const b = calls(f, 'PUT', '/v1/user/u2')[0].body;
    expect(b).toMatchObject({ mob: '0559', role: 'SalesMan', store_ids: [STORE_ID] });
    expect(b).not.toHaveProperty('password');
  });
});

describe('User view', () => {
  it('changes another user’s password without the current one', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/user/u2', reply: { status: true, result: { ...USERS[1], devices: { d1: { device_id: 'd1', device_type: 'Mobile', connected: true, platform: 'iOS', battery: '0.5' } } } } },
      { method: 'PATCH', path: '/v1/user/u2/change-password', reply: { status: true, result: 'Password changed successfully' } },
    ]);
    renderApp(<UserViewPage />, { at: '/admin/users/u2', path: '/admin/users/:id' });
    expect(await screen.findByRole('heading', { name: /Ali Salesman/ })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByLabelText(/^New password/), 'abc');
    await userEvent.type(within(dlg).getByLabelText(/^Confirm new password/), 'abd');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Change password' }));
    expect(await within(dlg).findByText('Must be at least 6 characters')).toBeInTheDocument();
    expect(within(dlg).getByText('Passwords do not match')).toBeInTheDocument();
    await userEvent.clear(within(dlg).getByLabelText(/^New password/));
    await userEvent.type(within(dlg).getByLabelText(/^New password/), 'abcdef');
    await userEvent.clear(within(dlg).getByLabelText(/^Confirm new password/));
    await userEvent.type(within(dlg).getByLabelText(/^Confirm new password/), 'abcdef');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(calls(f, 'PATCH', '/v1/user/u2/change-password')).toHaveLength(1));
    expect(calls(f, 'PATCH', '/v1/user/u2/change-password')[0].body).toEqual({ new_password: 'abcdef' });
  });

  it('deactivates after confirmation via toggle-status', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/user/u2', reply: { status: true, result: USERS[1] } },
      { method: 'PATCH', path: '/v1/user/u2/toggle-status', reply: { status: true, result: 'User deactivated successfully' } },
    ]);
    renderApp(<UserViewPage />, { at: '/admin/users/u2', path: '/admin/users/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(calls(f, 'PATCH', '/v1/user/u2/toggle-status')).toHaveLength(1));
  });
});

const RBAC_STORE = { id: STORE_ID, name: 'GUO', settings: { enable_rbac_module: true } };

describe('Roles', () => {
  it('lists roles with page_size paging and resource counts', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/user-role', reply: { status: true, total_count: 1, result: [{ id: 'r1', name: 'Cashier', permissions: [{ resource: 'sales', read: true }, { resource: 'customers', read: false }] }] } }], { store: RBAC_STORE });
    renderApp(<RolesListPage />, { at: '/admin/roles' });
    const table = await screen.findByRole('table', { name: 'Roles' });
    expect(await within(table).findByText('1 resources')).toBeInTheDocument();
    const c = calls(f, 'GET', '/v1/user-role')[0];
    expect(c.url.searchParams.get('page_size')).toBe('20');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
  });

  it('new role starts with everything granted; posts the edited matrix with the store query', async () => {
    const f = mockApi([{ method: 'POST', path: '/v1/user-role', reply: { status: true, result: { id: 'r9' } } }], { store: RBAC_STORE });
    renderApp(<RoleEditorPage />, { at: '/admin/roles/new', path: '/admin/roles/new' });
    expect(await screen.findByRole('checkbox', { name: 'Grant everything' })).toBeChecked();
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(await screen.findByText('Role name is required')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /^Role name/ }), 'Cashier');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Grant everything' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sales invoices · Delete' }));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/user-role')).toHaveLength(1));
    const c = calls(f, 'POST', '/v1/user-role')[0];
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.body.name).toBe('Cashier');
    expect(c.body.store_id).toBe(STORE_ID);
    expect(c.body.permissions.find((p: any) => p.resource === 'sales')).toEqual({ resource: 'sales', read: true, create: false, update: false, delete: true });
    expect(c.body.permissions.filter((p: any) => p.read)).toHaveLength(1);
  });

  it('shows the delete-refused message from the API', async () => {
    mockApi([
      { method: 'GET', path: '/v1/user-role', reply: { status: true, total_count: 1, result: [{ id: 'r1', name: 'Cashier', permissions: [] }] } },
      { method: 'DELETE', path: '/v1/user-role/r1', status: 400, reply: { status: false, errors: { delete: 'Cannot delete this role — it is currently assigned to one or more users' } } },
    ], { store: RBAC_STORE });
    renderApp(<RolesListPage />, { at: '/admin/roles' });
    const table = await screen.findByRole('table', { name: 'Roles' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Delete Cashier' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/currently assigned/)).toBeInTheDocument();
  });
});

describe('Signatures', () => {
  it('requires an image on create and posts name + base64 content', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/signature', reply: { status: true, total_count: 0, result: [] } },
      { method: 'POST', path: '/v1/signature', reply: { status: true, result: { id: 'g1' } } },
    ]);
    renderApp(<SignaturesPage />, { at: '/admin/signatures' });
    await userEvent.click(await screen.findByRole('button', { name: 'New signature' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByRole('textbox', { name: /^Name/ }), 'Boss');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    expect(await within(dlg).findByText('Signature is required')).toBeInTheDocument();
    const file = new File([new Uint8Array([137, 80, 78, 71])], 's.png', { type: 'image/png' });
    await userEvent.upload(within(dlg).getByLabelText('Signature image', { selector: 'input' }), file);
    expect(await within(dlg).findByText('Not saved yet', undefined, { timeout: 3000 })).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/signature')).toHaveLength(1));
    const c = calls(f, 'POST', '/v1/signature')[0];
    expect(c.body).toMatchObject({ name: 'Boss', store_id: STORE_ID });
    expect(c.body.signature_content).toMatch(/^data:image\/png;base64,/);
  });
});

describe('Menu settings', () => {
  it('hides an item, persists [{id, visible}] and syncs to the server when enabled', async () => {
    const f = mockApi([
      { method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: { id: STORE_ID, name: 'GUO', settings: { save_sidebar_config_to_server: true, sidebar_config: [{ id: 'customers', visible: false }] } } } },
      { method: 'PUT', path: `/v1/store/${STORE_ID}/sidebar-config`, reply: { status: true } },
    ], { store: { id: STORE_ID, name: 'GUO', settings: { save_sidebar_config_to_server: true } } });
    renderApp(<MenuSettingsPage />, { at: '/admin/menu' });
    // Server copy is merged into the local config when the page opens.
    await waitFor(() => expect(JSON.parse(localStorage.getItem('sidebar_config') || '[]').find((x: any) => x.id === 'customers')?.visible).toBe(false));
    await userEvent.click(await screen.findByRole('switch', { name: 'Show Quotations' }));
    const saved = JSON.parse(localStorage.getItem('sidebar_config')!);
    expect(saved.find((x: any) => x.id === 'quotations')).toEqual({ id: 'quotations', visible: false });
    await waitFor(() => expect(calls(f, 'PUT', `/v1/store/${STORE_ID}/sidebar-config`)).toHaveLength(1), { timeout: 2000 });
    expect(calls(f, 'PUT', `/v1/store/${STORE_ID}/sidebar-config`)[0].body.sidebar_config).toEqual(saved);
  });

  it('does not touch the server when sync is off, and Reset restores everything', async () => {
    localStorage.setItem('sidebar_config', JSON.stringify([{ id: 'sales', visible: false }]));
    const f = mockApi();
    renderApp(<MenuSettingsPage />, { at: '/admin/menu' });
    expect(await screen.findByRole('switch', { name: 'Show Sales invoices' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(JSON.parse(localStorage.getItem('sidebar_config')!).every((x: any) => x.visible)).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    expect(calls(f, 'PUT', /sidebar-config/)).toHaveLength(0);
  });
});
