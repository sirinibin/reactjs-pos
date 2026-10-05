import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { RFQ_STORE } from './testData';
import { WhatsAppInboxPage } from './whatsapp';
import { EmailInboxPage } from './emails';

const opts = { store: RFQ_STORE };
const WA_MSGS = [
  { id: 'w1', type: 'whatsapp', direction: 'in', from: '966511111111', body_text: 'Price for BP-1 is 90 SAR', wa_message_type: 'text', message_date: '2026-10-02T10:00:00Z', code: 'WA-000001' },
  { id: 'w2', type: 'whatsapp', direction: 'out', from: 'bot', body_text: 'Thanks', wa_message_type: 'text', message_date: '2026-10-02T10:05:00Z', code: 'WA-000002' },
];

describe('WhatsApp inbox', () => {
  const wa = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/procurement-message-threads', reply: { threads: [{ contact_phone: '966511111111', sender_name: 'Alpha Parts', sender_type: 'supplier', unread_count: 2, last_message_text: 'Price for BP-1', last_message_date: '2026-10-02T10:00:00Z' }], total: 1 } },
    { method: 'GET', path: '/v1/procurement-message-threads/966511111111', reply: { messages: WA_MSGS, total: 2 } },
    { method: 'GET', path: '/v1/procurement-messages/disk-usage', reply: { formatted: '1.2 MB', total_bytes: 1200000 } },
  ], opts);

  it('lists threads with unread badges and opens a conversation', async () => {
    const f = wa();
    renderApp(<WhatsAppInboxPage />, { at: '/procurement/whatsapp' });
    expect(await screen.findByLabelText('2 unread')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Conversations' });
    const t = calls(f, 'GET', '/v1/procurement-message-threads')[0];
    expect(t.url.searchParams.get('type')).toBe('whatsapp');
    expect(t.url.searchParams.get('store_id')).toBe(STORE_ID);
    await userEvent.click(within(list).getByRole('button', { name: /Alpha Parts/ }));
    expect(await screen.findByText('Price for BP-1 is 90 SAR')).toBeInTheDocument();
    expect(screen.getByText('1.2 MB used')).toBeInTheDocument();
  });

  it('surfaces the 24 h window error when a free-text send fails', async () => {
    const f = wa([{ method: 'POST', path: '/v1/procurement-message-threads/966511111111/send', status: 502, reply: { error: 'WhatsApp send error: outside 24h window' } }]);
    renderApp(<WhatsAppInboxPage />, { at: '/procurement/whatsapp?phone=966511111111' });
    await screen.findByText('Price for BP-1 is 90 SAR');
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Can you do 85?');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/procurement-message-threads/966511111111/send')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/procurement-message-threads/966511111111/send')[0].body).toEqual({ text: 'Can you do 85?', store_id: STORE_ID });
    expect(await screen.findByText(/outside 24h window/)).toHaveTextContent(/within 24 h/);
  });

  it('labels an inbound message as a quotation', async () => {
    const f = wa([{ method: 'POST', path: '/v1/procurement-messages/w1/link-as-quotation', reply: { success: true, is_quotation: true, matched_rfq_code: 'RFQ-000001' } }]);
    renderApp(<WhatsAppInboxPage />, { at: '/procurement/whatsapp?phone=966511111111' });
    await screen.findByText('Price for BP-1 is 90 SAR');
    await userEvent.click(screen.getAllByRole('button', { name: 'Label as quotation' })[0]);
    expect(await screen.findByText('Labelled as supplier quotation — matched to RFQ-000001')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/procurement-messages/w1/link-as-quotation')).toHaveLength(1);
  });

  it('all-messages view filters by direction and rfq_filter', async () => {
    const f = wa([{ method: 'GET', path: '/v1/procurement-messages', reply: { messages: WA_MSGS, total: 2, page: 1, limit: 20, total_pages: 1 } }]);
    renderApp(<WhatsAppInboxPage />, { at: '/procurement/whatsapp?view=all' });
    await screen.findAllByText('WA-000001');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Direction' }), 'in');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'RFQ filter' }), 'quotation');
    await waitFor(() => expect(calls(f, 'GET', '/v1/procurement-messages').some((c) => c.url.searchParams.get('direction') === 'in' && c.url.searchParams.get('rfq_filter') === 'quotation' && c.url.searchParams.get('type') === 'whatsapp')).toBe(true));
  });
});

const EMAIL = { id: 'e1', type: 'email', direction: 'in', provider: 'zoho', from: 'Ali Buyer <ali@noor.sa>', to: ['rfq@guo.sa'], subject: 'RFQ for brake pads', body_html: '<p>Please quote</p><script>bad()</script>', message_date: '2026-10-02T10:00:00Z', code: 'EM-000001', read: false, attachments: [{ filename: 'list.pdf', url: '/cdn/list.pdf', size: 2048 }] };

describe('Email inbox', () => {
  const em = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/procurement-messages', reply: { messages: [EMAIL], total: 1, page: 1, limit: 20, total_pages: 1 } },
    { method: 'GET', path: '/v1/procurement-messages/e1', reply: EMAIL },
    { method: 'GET', path: '/v1/procurement-messages/disk-usage', reply: { formatted: '0 B' } },
    { method: 'GET', path: '/v1/procurement-rfq-history', reply: { customer_rfqs: [{ id: 'r1', code: 'RFQ-000001', customer_name: 'Noor' }], supplier_rfqs: [] } },
    { method: 'GET', path: '/v1/procurement-message-threads', reply: { threads: [], total: 0 } },
  ], opts);

  it('lists incoming emails by default and opens the detail with sanitised HTML', async () => {
    const f = em();
    renderApp(<EmailInboxPage />, { at: '/procurement/emails' });
    const table = await screen.findByRole('table', { name: 'Emails' });
    expect(await within(table).findByText('RFQ for brake pads')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/procurement-messages')[0].url.searchParams.get('direction')).toBe('in');
    await userEvent.click(within(table).getByText('RFQ for brake pads'));
    const drawer = await screen.findByRole('dialog', { name: 'RFQ for brake pads' });
    const frame = await within(drawer).findByTitle('Email body');
    expect(frame.getAttribute('srcdoc')).toContain('Please quote');
    expect(frame.getAttribute('srcdoc')).not.toContain('bad()');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(within(drawer).getByText('list.pdf')).toBeInTheDocument();
    expect(await within(drawer).findByRole('link', { name: 'RFQ-000001' })).toBeInTheDocument();
  });

  it('replies via multipart email-reply and shows the outgoing-email guidance on failure', async () => {
    const f = em([{ method: 'POST', path: '/v1/procurement-messages/e1/email-reply', status: 400, reply: { error: 'No outgoing email configured. Add IMAP credentials (or Zoho SMTP) in Store Settings → Procurement → Email' } }]);
    renderApp(<EmailInboxPage />, { at: '/procurement/emails?msg=e1' });
    const drawer = await screen.findByRole('dialog', { name: 'RFQ for brake pads' });
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Reply' }));
    const dlg = await screen.findByRole('dialog', { name: 'Reply' });
    expect(within(dlg).getByLabelText(/^To/)).toHaveValue('ali@noor.sa');
    expect(within(dlg).getByLabelText('Subject')).toHaveValue('Re: RFQ for brake pads');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Send' }));
    expect(await within(dlg).findByText('Write a message')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Use thank-you reply' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(f.mock.calls.some(([u]) => String(u).includes('/email-reply'))).toBe(true));
    const [, init] = f.mock.calls.find(([u]) => String(u).includes('/email-reply'))!;
    const fd = (init as RequestInit).body as FormData;
    expect(fd.get('to')).toBe('ali@noor.sa');
    expect(String(fd.get('body'))).toMatch(/Thank you for your email/);
    expect(await within(dlg).findByRole('link', { name: 'Open email settings' })).toBeInTheDocument();
  });

  it('sync now triggers the account sync', async () => {
    const f = em([{ method: 'POST', path: '/v1/email-accounts/sync', reply: { status: 'sync started' } }]);
    renderApp(<EmailInboxPage />, { at: '/procurement/emails' });
    await userEvent.click(await screen.findByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/email-accounts/sync')[0].url.searchParams.get('store_id')).toBe(STORE_ID));
    expect(await screen.findByText(/Sync started/)).toBeInTheDocument();
  });

  it('extract modal: RFQ mode posts multipart with provider and opens the RFQ form prefilled', async () => {
    const f = em([{ method: 'POST', path: '/v1/procurement-messages/e1/extract', reply: { customer_name: 'Ali', products: [{ name: 'Brake pad', quantity: 4 }], llm_model: 'gemini' } }]);
    renderApp(<EmailInboxPage />, { at: '/procurement/emails?msg=e1' });
    const drawer = await screen.findByRole('dialog', { name: 'RFQ for brake pads' });
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Extract' }));
    const dlg = await screen.findByRole('dialog', { name: 'Extract RFQ with AI' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Extract' }));
    expect(await within(dlg).findByRole('table', { name: 'Extracted products' })).toHaveTextContent('Brake pad');
    const [, init] = f.mock.calls.find(([u]) => String(u).includes('/e1/extract'))!;
    expect(((init as RequestInit).body as FormData).get('llm_provider')).toBeTruthy();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create RFQ' }));
    expect(JSON.parse(sessionStorage.getItem('procurement_rfq_extraction')!)).toMatchObject({ msgId: 'e1', msgCode: 'EM-000001', data: { customer_name: 'Ali' } });
  });
});
