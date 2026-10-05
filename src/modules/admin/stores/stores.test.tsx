import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID, TEST_STORE, TEST_USER } from '@/test/utils';
import { StoreProfilePage, StoresListPage } from './StorePages';
import { StoreEditorPage } from './StoreEditor';

const FULL = {
  ...TEST_STORE,
  registration_number: '1010233344', email: 'info@guo.sa', phone: '0114567890', business_category: 'Retail', country_code: 'SA',
  national_address: { building_no: '7788', street_name: 'Imam Saud', street_name_arabic: 'الإمام سعود', district_name: 'Nakheel', district_name_arabic: 'النخيل', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '13244' },
  zatca: { phase: '1' },
  settings: { ...TEST_STORE.settings, invoice: {} },
  created_at: '2026-10-01T10:00:00Z',
};
const STORES = [
  { id: STORE_ID, name: 'Gulf Union Ozone Co.', code: 'GUO', branch_name: 'Riyadh HQ', vat_no: '300455120900003', zatca: { phase: '2', connected: true } },
  { id: 's2', name: 'Jeddah Branch', code: 'JED', branch_name: 'Jeddah', zatca: { phase: '2', zatca_reconnect_required: true } },
];

describe('Stores list', () => {
  it('lists stores without store scoping and shows ZATCA states', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/store', reply: { status: true, total_count: 2, result: STORES } }]);
    renderApp(<StoresListPage />, { at: '/admin/stores' });
    const table = await screen.findByRole('table', { name: 'Stores' });
    expect(await within(table).findByText('JED')).toBeInTheDocument();
    expect(within(table).getByText('Reconnect required')).toBeInTheDocument();
    expect(within(table).getByText('Phase 2 · Connected')).toBeInTheDocument();
    const listCall = calls(f, 'GET', '/v1/store').find((c) => c.url.searchParams.get('sort') === '-created_at')!;
    expect(listCall.url.searchParams.get('search[store_id]')).toBeNull();
    expect(screen.getByRole('button', { name: 'New store' })).toBeInTheDocument();
  });

  it('the Deleted view sends search[deleted]=yes', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/store', reply: { status: true, total_count: 2, result: STORES } }]);
    renderApp(<StoresListPage />, { at: '/admin/stores' });
    await screen.findAllByText('JED');
    await userEvent.click(screen.getByRole('tab', { name: /^Deleted/ }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/store').some((c) => c.url.searchParams.get('search[deleted]') === 'yes')).toBe(true));
  });

  it('non-admins do not get the New store action', async () => {
    mockApi([{ method: 'GET', path: '/v1/store', reply: { status: true, total_count: 2, result: STORES } }], { user: { ...TEST_USER, admin: false, role: 'Manager', store_ids: [STORE_ID] } });
    renderApp(<StoresListPage />, { at: '/admin/stores' });
    await screen.findAllByText('GUO');
    expect(screen.queryByRole('button', { name: 'New store' })).not.toBeInTheDocument();
  });
});

describe('Store profile', () => {
  it('shows key facts, ZATCA panel and admin data actions', async () => {
    mockApi([{ method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: FULL } }]);
    renderApp(<StoreProfilePage />, { at: `/admin/stores/${STORE_ID}`, path: '/admin/stores/:id' });
    expect(await screen.findByRole('heading', { name: /Gulf Union Ozone/ })).toBeInTheDocument();
    expect(screen.getAllByText('1010233344').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Backup data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete store' })).toBeInTheDocument();
  });

  it('backup dialog loads the size and polls the job until done', async () => {
    let n = 0;
    const f = mockApi([
      { method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: FULL } },
      { method: 'GET', path: `/v1/store/${STORE_ID}/backup/size`, reply: { status: true, result: { mongodb_store_db: 2048, mongodb_store_doc: 10, mongodb_users: 0, images_size: 0, zatca_size: 0, total_size: 2058 } } },
      { method: 'POST', path: `/v1/store/${STORE_ID}/backup/start`, reply: { status: true, result: { job_id: 'j1' } } },
      { method: 'GET', path: `/v1/store/${STORE_ID}/backup/progress`, reply: () => ({ status: true, result: ++n < 2 ? { steps: [{ id: 'zip', name: 'Zip', status: 'running', progress: 50 }], overall_progress: 50, done: false } : { steps: [{ id: 'zip', name: 'Zip', status: 'done', progress: 100 }], overall_progress: 100, done: true, file_token: 'tok' } }) },
    ]);
    renderApp(<StoreProfilePage />, { at: `/admin/stores/${STORE_ID}`, path: '/admin/stores/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Backup data' }));
    const dlg = await screen.findByRole('dialog');
    expect((await within(dlg).findAllByText('2 KB')).length).toBeGreaterThan(0);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Start backup' }));
    expect(await within(dlg).findByRole('button', { name: 'Backup again' }, { timeout: 3000 })).toBeInTheDocument();
    expect(calls(f, 'GET', `/v1/store/${STORE_ID}/backup/progress`)[0].url.searchParams.get('job_id')).toBe('j1');
  });

  it('duplicate requires a name and posts new_name', async () => {
    const f = mockApi([
      { method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: FULL } },
      { method: 'GET', path: `/v1/store/${STORE_ID}/duplicate-without-data/size`, reply: { status: true, result: { store_doc_size: 100, total_size: 100 } } },
      { method: 'POST', path: `/v1/store/${STORE_ID}/duplicate-without-data/start`, reply: { status: true, result: { job_id: 'j2', new_store_id: 'n1' } } },
      { method: 'GET', path: `/v1/store/${STORE_ID}/duplicate-without-data/progress`, reply: { status: true, result: { steps: [], overall_progress: 100, done: true, new_store_id: 'n1', new_store_name: 'Copy' } } },
    ]);
    renderApp(<StoreProfilePage />, { at: `/admin/stores/${STORE_ID}`, path: '/admin/stores/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Duplicate without data' }));
    const dlg = await screen.findByRole('dialog');
    const name = within(dlg).getByRole('textbox', { name: /^New store name\s*\*?$/ });
    await userEvent.clear(name);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Start duplicate' }));
    expect(await within(dlg).findByText('Store name is required')).toBeInTheDocument();
    await userEvent.type(name, 'Copy');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Start duplicate' }));
    expect(await within(dlg).findByText(/Store duplicated successfully/)).toBeInTheDocument();
    expect(calls(f, 'POST', `/v1/store/${STORE_ID}/duplicate-without-data/start`)[0].body).toMatchObject({ new_name: 'Copy' });
  });
});

const editorMocks = (extra: any[] = []) => [
  ...extra,
  { method: 'GET', path: `/v1/store/${STORE_ID}/serial-locks`, reply: { status: true, result: { sales_locked: true } } },
  { method: 'GET', path: '/v1/customer-package', reply: { status: true, result: [] } },
  { method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: FULL } },
];

describe('Store settings editor', () => {
  it('blocks invalid saves client-side and jumps to the tab with errors', async () => {
    const f = mockApi(editorMocks());
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings?tab=contact`, path: '/admin/stores/:id/settings' });
    const email = await screen.findByRole('textbox', { name: /^Email/ });
    await userEvent.clear(email);
    await userEvent.type(email, 'bad');
    await userEvent.click(screen.getByRole('tab', { name: /National address/ }));
    await userEvent.clear(screen.getByRole('textbox', { name: /^Zipcode/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Company/ }));
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(await screen.findByRole('tabpanel', { name: 'National address' })).toBeInTheDocument();
    expect(screen.getAllByText('Zipcode is required').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Contact/ })).toHaveTextContent('1');
    expect(calls(f, 'PUT', `/v1/store/${STORE_ID}`)).toHaveLength(0);
  });

  it('saves the whole store with Arabic digit mirrors and refreshes the active store', async () => {
    const f = mockApi(editorMocks([{ method: 'PUT', path: `/v1/store/${STORE_ID}`, reply: (_u: URL, i: any) => ({ status: true, result: { ...FULL, ...i.json } }) }]));
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings?tab=preferences`, path: '/admin/stores/:id/settings' });
    await userEvent.click(await screen.findByRole('switch', { name: 'Roles & permissions (RBAC)' }));
    const before = calls(f, 'GET', `/v1/store/${STORE_ID}`).length;
    await userEvent.click(screen.getAllByRole('button', { name: /^Save changes/ })[0]);
    await waitFor(() => expect(calls(f, 'PUT', `/v1/store/${STORE_ID}`)).toHaveLength(1));
    const body = calls(f, 'PUT', `/v1/store/${STORE_ID}`)[0].body;
    expect(body.settings.enable_rbac_module).toBe(true);
    expect(body.vat_no_in_arabic).toBe('۳۰۰٤۵۵۱۲۰۹۰۰۰۰۳');
    expect(body.national_address.zipcode_arabic).toBe('۱۳۲٤٤');
    expect(body.settings.invoice.quotation_title).toBe('QUOTATION | اقتباس');
    expect(body.sales_serial_number).toEqual({ prefix: 'S-INV', start_from_count: 1, padding_count: 3 });
    expect(await screen.findByText('Store updated successfully!')).toBeInTheDocument();
    await waitFor(() => expect(calls(f, 'GET', `/v1/store/${STORE_ID}`).length).toBeGreaterThan(before)); // refreshStore()
  });

  it('maps server validation errors (HTTP 500) onto fields and tabs', async () => {
    mockApi(editorMocks([{ method: 'PUT', path: `/v1/store/${STORE_ID}`, status: 500, reply: { status: false, errors: { email: 'E-mail is already in use', sales_serial_number_start_from_count: 'You cannot change this as you have already created 3 sales' } } }]));
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings`, path: '/admin/stores/:id/settings' });
    await screen.findByRole('textbox', { name: /^Registered company name\s*\*?$/ });
    await userEvent.keyboard('{Control>}s{/Control}');
    expect(await screen.findByRole('tabpanel', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getAllByText('E-mail is already in use').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Document numbering/ })).toHaveTextContent('1');
  });

  it('locks the sales start number when documents exist', async () => {
    mockApi(editorMocks());
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings?tab=serials`, path: '/admin/stores/:id/settings' });
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Sales Starts at' })).toBeDisabled());
    expect(screen.getByRole('textbox', { name: 'Purchases Starts at' })).toBeEnabled();
  });

  it('creates a store with POST and opens its profile', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/customer-package', reply: { status: true, result: [] } },
      { method: 'POST', path: '/v1/store', reply: { status: true, result: { id: 'new1' } } },
    ]);
    renderApp(<StoreEditorPage />, { at: '/admin/stores/new', path: '/admin/stores/new', extraRoutes: <></> });
    const fill = async (re: RegExp, v: string) => { const el = screen.getByRole('textbox', { name: re }); await userEvent.clear(el); await userEvent.type(el, v); };
    await screen.findByRole('heading', { name: 'New store' });
    await fill(/^Registered company name\s*\*?$/, 'Acme');
    await fill(/^Registered company name \(Arabic\)/, 'أكمي');
    await fill(/^Commercial registration/, 'CR1');
    await fill(/^VAT number/, '300000000000003');
    await fill(/^Branch code/, 'ACM');
    await fill(/^Branch name/, 'Main');
    await userEvent.click(screen.getByRole('tab', { name: /National address/ }));
    await fill(/^Building number/, '1234');
    await fill(/^Street name\s*\*?$/, 'S');
    await fill(/^Street name \(Arabic\)/, 'ش');
    await fill(/^District\s*\*?$/, 'D');
    await fill(/^District \(Arabic\)/, 'ح');
    await fill(/^City\s*\*?$/, 'R');
    await fill(/^City \(Arabic\)/, 'ر');
    await fill(/^Zipcode/, '12345');
    await userEvent.click(screen.getByRole('tab', { name: /Contact/ }));
    await fill(/^Phone/, '055');
    await fill(/^Email/, 'a@b.co');
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/store')).toHaveLength(1));
    const b = calls(f, 'POST', '/v1/store')[0].body;
    expect(b).toMatchObject({ name: 'Acme', code: 'ACM', vat_percent: 15, zatca: { phase: '1', env: 'NonProduction' }, customer_deposit_serial_number: { prefix: 'RCVBLE' } });
    expect(await screen.findByTestId('other-route')).toBeInTheDocument();
  }, 20000);

  it('connects to ZATCA with an OTP and shows server errors under the field', async () => {
    const phase2 = { ...FULL, zatca: { phase: '2', env: 'Simulation', connected: false } };
    const f = mockApi([
      { method: 'POST', path: '/v1/store/zatca/connect', status: 500, reply: { status: false, errors: { otp: 'Error connecting to zatac: invalid otp' } } },
      ...editorMocks().slice(0, 2),
      { method: 'GET', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: phase2 } },
    ]);
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings?tab=zatca`, path: '/admin/stores/:id/settings' });
    await userEvent.click(await screen.findByRole('button', { name: 'Connect to ZATCA' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Connect' }));
    expect(await within(dlg).findByText('OTP is required')).toBeInTheDocument();
    await userEvent.type(within(dlg).getByRole('textbox', { name: /OTP/ }), '123456');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Connect' }));
    expect(await within(dlg).findByText(/invalid otp/)).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/store/zatca/connect')[0].body).toEqual({ id: STORE_ID, otp: '123456' });
  });

  it('salesmen cannot open store settings', async () => {
    mockApi(editorMocks(), { user: { ...TEST_USER, admin: false, role: 'SalesMan', store_ids: [STORE_ID] } });
    renderApp(<StoreEditorPage />, { at: `/admin/stores/${STORE_ID}/settings`, path: '/admin/stores/:id/settings' });
    expect(await screen.findByText('Only administrators and managers can change store settings.')).toBeInTheDocument();
  });
});
