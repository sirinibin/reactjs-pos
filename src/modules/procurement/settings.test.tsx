import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { RFQ_STORE } from './testData';
import { ProcurementSettingsPage } from './settings';

const base = (extra: any[] = [], store: any = RFQ_STORE) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/rfq-bot/status', reply: { connected: false } },
  { method: 'GET', path: '/v1/rfq-bot/waba-templates', status: 400, reply: { error: 'Access Token not found. Please connect the Bot WhatsApp first.' } },
  { method: 'GET', path: '/v1/rfq-email/accounts', reply: { accounts: [] } },
  { method: 'PUT', path: `/v1/store/${STORE_ID}`, reply: { status: true, result: store } },
], { store });

describe('Procurement settings', () => {
  it('shows the bot as not connected, template errors with guidance, and validates the connect form', async () => {
    const f = base([{ method: 'POST', path: '/v1/rfq-bot/connect', status: 502, reply: { error: 'Meta API credentials invalid or phone number not found' } }]);
    renderApp(<ProcurementSettingsPage />, { at: '/procurement/settings' });
    expect(await screen.findByText('Not connected')).toBeInTheDocument();
    expect(await screen.findByText(/Access Token not found/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByText('Phone Number ID and Access Token are required.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Phone Number ID'), '123456');
    await userEvent.type(screen.getByLabelText('Access token'), 'EAAB');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByText('Meta API credentials invalid or phone number not found')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/rfq-bot/connect')[0].body).toEqual({ store_id: STORE_ID, phone_number_id: '123456', access_token: 'EAAB' });
    expect(screen.getByText(`${window.location.origin}/v1/rfq-bot/webhook?store_id=${STORE_ID}`)).toBeInTheDocument();
  });

  it('saves only the changed settings with Ctrl+S', async () => {
    const f = base();
    renderApp(<ProcurementSettingsPage />, { at: '/procurement/settings?tab=rfq' });
    const margin = await screen.findByLabelText('Default quotation margin %');
    await userEvent.clear(margin);
    await userEvent.type(margin, '40');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create RFQs automatically from incoming email' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Jeddah' }));
    expect(screen.getAllByText('3 unsaved changes').length).toBeGreaterThan(0);
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'PUT', `/v1/store/${STORE_ID}`)).toHaveLength(1));
    expect(calls(f, 'PUT', `/v1/store/${STORE_ID}`)[0].body).toEqual({ settings: { default_quotation_margin_percent: 40, disable_auto_rfq_from_email: true, rfq_forward_markets: ['Riyadh', 'Jeddah'] } });
    expect(await screen.findByText('Procurement settings saved')).toBeInTheDocument();
  });

  it('AI models tab: shows saved keys and edits a key', async () => {
    const f = base([], { ...RFQ_STORE, settings: { ...RFQ_STORE.settings, extraction_gemini_api_key: 'AIza-old' } });
    renderApp(<ProcurementSettingsPage />, { at: '/procurement/settings?tab=ai' });
    expect(await screen.findByText('Key saved')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('OpenAI API key'), 'sk-new');
    await userEvent.click(screen.getAllByRole('button', { name: /^Save/ })[0]);
    await waitFor(() => expect(calls(f, 'PUT', `/v1/store/${STORE_ID}`)[0].body).toEqual({ settings: { extraction_openai_api_key: 'sk-new' } }));
  });

  it('email tab: adding an IMAP account requires the fields and posts provider credentials', async () => {
    const f = base([{ method: 'POST', path: '/v1/rfq-email/account', status: 400, reply: { error: 'IMAP connection failed: dial tcp: lookup imap.bad' } }]);
    renderApp(<ProcurementSettingsPage />, { at: '/procurement/settings?tab=email' });
    expect(await screen.findByText('No email accounts connected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add account' }));
    const dlg = await screen.findByRole('dialog', { name: 'Add email account' });
    await userEvent.selectOptions(within(dlg).getByLabelText('Provider'), 'imap');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Connect' }));
    expect(await within(dlg).findByText(/Fill in: IMAP host, Username, Password/)).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText('IMAP host'), 'imap.bad');
    await userEvent.type(within(dlg).getByLabelText('Username'), 'rfq@guo.sa');
    await userEvent.type(within(dlg).getByLabelText('Password'), 'pw');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Connect' }));
    expect(await within(dlg).findByText(/IMAP connection failed/)).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/rfq-email/account')[0].body).toMatchObject({ store_id: STORE_ID, provider: 'imap', rfq_imap_host: 'imap.bad', rfq_imap_port: 993, rfq_imap_use_ssl: true, rfq_imap_username: 'rfq@guo.sa', rfq_imap_password: 'pw' });
  });

  it('is read-only for non-managers', async () => {
    base([], RFQ_STORE);
    mockApi([{ method: 'GET', path: '/v1/rfq-bot/status', reply: { connected: true, phone: '966500000000' } }, { method: 'GET', path: '/v1/rfq-bot/waba-templates', reply: { templates: [] } }], { store: RFQ_STORE, user: { id: 'u3', name: 'Sales', email: 's@x', role: 'SalesMan', admin: false } });
    renderApp(<ProcurementSettingsPage />, { at: '/procurement/settings' });
    expect(await screen.findByText('Only administrators and managers can change store settings.')).toBeInTheDocument();
    expect(await screen.findByText('966500000000')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Save/ })[0]).toBeDisabled();
  });
});
