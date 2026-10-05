import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { RFQ_STORE, RFQ1, RFQ2 } from '../testData';
import { RfqListPage } from './list';
import { RfqEditorPage } from './editor';
import { RfqDetailPage } from './detail';
import { RfqServerPrint } from './print';
import { PREFILL_KEY } from '../logic';

const opts = { store: RFQ_STORE };
const list = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/rfq-received', reply: { items: [RFQ1, RFQ2], total_count: 2 } },
  { method: 'GET', path: '/v1/procurement-message-threads', reply: { threads: [{ contact_phone: '966511111111', unread_count: 3 }], total: 1 } },
], opts);

describe('RFQ inbox list', () => {
  it('lists RFQs with plain store_id/page/limit params and shows unread badges', async () => {
    const f = list();
    renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    const table = await screen.findByRole('table', { name: 'RFQ inbox' });
    expect(await within(table).findByText('RFQ-000001')).toBeInTheDocument();
    expect(within(table).getByText('Ready to send')).toBeInTheDocument();
    expect(within(table).getByText('+1')).toBeInTheDocument(); // 4 categories → 3 + "+1"
    const [c] = calls(f, 'GET', '/v1/rfq-received');
    expect(c.url.searchParams.get('store_id')).toBe(STORE_ID);
    expect(c.url.searchParams.get('page')).toBe('1');
    expect(c.url.searchParams.get('limit')).toBe('10');
    expect(c.url.searchParams.has('search[store_id]')).toBe(false);
    expect(await within(table).findByTitle('Unread WhatsApp messages')).toHaveTextContent('3');
    expect(calls(f, 'GET', '/v1/procurement-message-threads')[0].url.searchParams.get('phones')).toContain('966511111111');
  });

  it('status tabs and search send status= and search=', async () => {
    const f = list();
    renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    await screen.findAllByText('RFQ-000001');
    await userEvent.click(screen.getByRole('tab', { name: 'Forwarded' }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/rfq-received').some((c) => c.url.searchParams.get('status') === 'forwarded')).toBe(true));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'noor');
    await waitFor(() => expect(calls(f, 'GET', '/v1/rfq-received').some((c) => c.url.searchParams.get('search') === 'noor')).toBe(true), { timeout: 2000 });
  });

  it('re-processes failed RFQs and deletes after confirmation', async () => {
    const f = list([
      { method: 'POST', path: '/v1/rfq-received/r2/process', reply: { success: true, message: 'Processing started' } },
      { method: 'DELETE', path: '/v1/rfq-received/r2', reply: { result: 'ok' } },
    ]);
    renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    const table = await screen.findByRole('table', { name: 'RFQ inbox' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Re-process RFQ-000002' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/rfq-received/r2/process')).toHaveLength(1));
    await userEvent.click(within(table).getByRole('button', { name: 'Delete RFQ-000002' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete RFQ-000002?' });
    expect(dlg).toHaveTextContent(/unlink it from any connected email/);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/rfq-received/r2')).toHaveLength(1));
  });

  it('shows an empty state and a retryable error', async () => {
    mockApi([{ method: 'GET', path: '/v1/rfq-received', reply: { items: null, total_count: 0 } }], opts);
    const { unmount } = renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    expect((await screen.findAllByText('No RFQs yet')).length).toBeGreaterThan(0);
    unmount();
    mockApi([{ method: 'GET', path: '/v1/rfq-received', status: 400, reply: { error: 'store_id required' } }], opts);
    renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    expect(await screen.findByText(/store_id required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides create/delete for users without permission', async () => {
    mockApi([
      { method: 'GET', path: '/v1/rfq-received', reply: { items: [RFQ2], total_count: 1 } },
      { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [{ resource: 'rfq_received', read: true, create: false, update: false, delete: false }] } },
    ], { store: { ...RFQ_STORE, settings: { ...RFQ_STORE.settings, enable_rbac_module: true } }, user: { id: 'u2', name: 'Clerk', email: 'c@x', role: 'User', admin: false } });
    renderApp(<RfqListPage />, { at: '/procurement/rfq' });
    const table = await screen.findByRole('table', { name: 'RFQ inbox' });
    await within(table).findByText('RFQ-000002');
    expect(screen.queryByRole('button', { name: 'New RFQ' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Delete RFQ-000002' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Edit RFQ-000002' })).not.toBeInTheDocument();
  });
});

describe('RFQ editor', () => {
  const editorMocks = (extra: any[] = []) => mockApi([...extra, { method: 'GET', path: '/v1/customer', reply: { status: true, result: [] } }, { method: 'GET', path: '/v1/product', reply: { status: true, result: [] } }], opts);

  it('refuses an empty RFQ', async () => {
    const f = editorMocks();
    renderApp(<RfqEditorPage />, { at: '/procurement/rfq/new', path: '/procurement/rfq/new' });
    await userEvent.click((await screen.findAllByRole('button', { name: /^Save/ }))[0]);
    expect(await screen.findByText('Add products, upload a file, or enter a description.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/rfq-received')).toHaveLength(0);
  });

  it('creates an RFQ with the exact body and opens the send tab', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/rfq-received', reply: { success: true, id: 'new1', code: 'RFQ-000009' } }]);
    renderApp(<RfqEditorPage />, { at: '/procurement/rfq/new', path: '/procurement/rfq/new', extraRoutes: <Route path="/procurement/rfq/:id" element={<div data-testid="detail" />} /> });
    await userEvent.type(await screen.findByLabelText('Customer name'), 'Walk-in Garage');
    await userEvent.type(screen.getByLabelText('Customer mobile'), '966500000099');
    await userEvent.type(screen.getByLabelText('Part No. 1'), 'BP-9');
    await userEvent.type(screen.getByLabelText('Product name 1'), 'Brake pad rear');
    const qty = screen.getByLabelText('Qty 1');
    await userEvent.clear(qty);
    await userEvent.type(qty, '4');
    await userEvent.click(screen.getByRole('checkbox', { name: /Link new items/ }));
    await userEvent.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/rfq-received')).toHaveLength(1));
    const [post] = calls(f, 'POST', '/v1/rfq-received');
    expect(post.url.searchParams.get('store_id')).toBe(STORE_ID);
    expect(post.body).toMatchObject({ customer_id: '', customer_name: 'Walk-in Garage', customer_phone: '966500000099', products: [{ name: 'Brake pad rear', part_no: 'BP-9', quantity: 4, unit: 'PCE' }] });
    expect(post.body).not.toHaveProperty('attachment_data_uris');
    expect(await screen.findByTestId('detail')).toBeInTheDocument();
    expect(await screen.findByText('RFQ created: RFQ-000009')).toBeInTheDocument();
  });

  it('shows extraction errors with guidance when no AI key is configured', async () => {
    editorMocks([{ method: 'POST', path: '/v1/rfq-received/extract', status: 400, reply: { error: 'No API key configured for the selected provider. Please add it under Store → AI Models.' } }]);
    renderApp(<RfqEditorPage />, { at: '/procurement/rfq/new', path: '/procurement/rfq/new' });
    await userEvent.type(await screen.findByLabelText('Additional description / enquiry text'), 'Need 4 brake pads for Camry');
    expect(screen.getAllByText(/No API key is saved for this provider/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Extract from text' }));
    expect(await screen.findByText(/No API key configured for the selected provider/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open AI models settings' })).toHaveAttribute('href', '/procurement/settings?tab=ai');
  });

  it('applies a successful extraction to customer and items', async () => {
    const f = editorMocks([{ method: 'POST', path: '/v1/rfq-received/extract', reply: { customer_name: 'Ali', customer_company: 'ACME Motors', customer_phone: '966577777777', products: [{ name: 'Air filter', part_no: 'AF-1', quantity: 3 }], product_categories: ['Filters'], llm_model: 'gpt-4o-mini' } }]);
    renderApp(<RfqEditorPage />, { at: '/procurement/rfq/new', path: '/procurement/rfq/new' });
    await userEvent.type(await screen.findByLabelText('Additional description / enquiry text'), '3 air filters');
    await userEvent.click(screen.getByRole('button', { name: 'Extract from text' }));
    expect(await screen.findByDisplayValue('Air filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toHaveValue('ACME Motors');
    expect(screen.getByText('Filters')).toBeInTheDocument();
    const [c] = f.mock.calls.filter(([u]) => String(u).includes('/v1/rfq-received/extract'));
    const fd = (c[1] as RequestInit).body as FormData;
    expect(fd.get('text_content')).toBe('3 air filters');
    expect(fd.get('llm_provider')).toBeTruthy();
  });

  it('edits an RFQ with PUT always sending the customer fields', async () => {
    const f = editorMocks([
      { method: 'GET', path: '/v1/rfq-received/r1', reply: RFQ1 },
      { method: 'PUT', path: '/v1/rfq-received/r1', reply: RFQ1 },
    ]);
    renderApp(<RfqEditorPage />, { at: '/procurement/rfq/r1/edit', path: '/procurement/rfq/:id/edit', extraRoutes: <Route path="/procurement/rfq/:id" element={<div data-testid="detail" />} /> });
    const notes = await screen.findByLabelText('Notes 2');
    await userEvent.type(notes, 'OEM only');
    await userEvent.click(screen.getAllByRole('button', { name: /^Save/ })[0]);
    await waitFor(() => expect(calls(f, 'PUT', '/v1/rfq-received/r1')).toHaveLength(1));
    const [put] = calls(f, 'PUT', '/v1/rfq-received/r1');
    expect(put.body).toMatchObject({ customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', customer_phone: '966500000001', customer_email: 'buyer@noor.sa', customer_rfq_id: 'PO-77', additional_attachment_data_uris: [] });
    expect(put.body.products[1]).toMatchObject({ name: 'Oil filter', notes: 'OEM only' });
    expect(put.body).not.toHaveProperty('attachment_data_uris');
  });
});

describe('RFQ detail', () => {
  const detail = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/rfq-received/r1', reply: RFQ1 },
    { method: 'GET', path: '/v1/rfq-suppliers', reply: { status: true, result: [{ id: 's1', name: 'Alpha Parts', phone: '966511111111', email: 'alpha@parts.sa' }], total_count: 1 } },
    { method: 'GET', path: '/v1/procurement-message-threads', reply: { threads: [], total: 0 } },
    { method: 'GET', path: /^\/v1\/product\//, reply: { status: true, result: { product_stores: { [STORE_ID]: { retail_margin_percent: 50 } } } } },
  ], opts);

  it('shows header, facets and the timeline', async () => {
    detail();
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/r1', path: '/procurement/rfq/:id' });
    expect(await screen.findByRole('heading', { name: /RFQ-000001/ })).toBeInTheDocument();
    expect(screen.getAllByText('AL NOOR TRADING EST.').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: /Timeline/ }));
    expect(await screen.findByText('RFQ created with code RFQ-000001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Items/ }));
    expect(await screen.findByRole('button', { name: 'Link 1 to catalog' })).toBeInTheDocument();
  });

  it('compares prices, applies product margins, updates prices and creates a quotation prefill', async () => {
    const f = detail([{ method: 'PATCH', path: '/v1/rfq-received/r1/update-product-prices', reply: { status: true, updated: 1, skipped: 0 } }]);
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/r1?tab=prices', path: '/procurement/rfq/:id', extraRoutes: <Route path="/sales/quotations/new" element={<div data-testid="qtn" />} /> });
    const table = await screen.findByRole('table', { name: 'Price comparison' });
    // lowest = Beta 90 for item 1; product margin 50% loaded for p1 → 135.00
    expect(within(table).getByRole('button', { name: 'Beta Spares 90.00' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(within(table).getByLabelText('Margin % 1')).toHaveValue('50'));
    expect(within(table).getByText('135.00')).toBeInTheDocument();
    await userEvent.click(within(table).getByRole('button', { name: 'Alpha Parts 100.00' }));
    expect(within(table).getByText('150.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update product prices' }));
    await waitFor(() => expect(calls(f, 'PATCH', '/v1/rfq-received/r1/update-product-prices')).toHaveLength(1));
    expect(calls(f, 'PATCH', '/v1/rfq-received/r1/update-product-prices')[0].body).toEqual({ items: [{ product_index: 0, purchase_unit_price: 100, retail_unit_price: 150, vat_included: false }] });
    expect(await screen.findByText('1 updated, 0 skipped')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create quotation' }));
    expect(await screen.findByTestId('qtn')).toBeInTheDocument();
    const pre = JSON.parse(sessionStorage.getItem(PREFILL_KEY)!);
    expect(pre).toMatchObject({ rfq_id: 'r1', rfq_code: 'RFQ-000001', customer_id: 'c1' });
    expect(pre.items[0]).toMatchObject({ product_id: 'p1', cost_price: 100, margin_percent: 50, unit_price: 150, supplier_name: 'Alpha Parts' });
    expect(pre.items[1]).toMatchObject({ cost_price: 30, margin_percent: 20, unit_price: 36 });
  });

  it('send tab: surfaces "not connected" guidance and posts the selected recipients', async () => {
    const preview = { rfq_id: 'r1', rfq_code: 'RFQ-000001', config_warning: 'Bot WhatsApp not connected', template_name: 'rfq_supplier', template_language: 'en', template_components: [{ type: 'HEADER', format: 'DOCUMENT' }, { type: 'BODY', text: 'Dear {{1}}' }], template_body: 'Dear Supplier', pre_filled_vars: { body_1: 'Supplier' },
      suppliers: [{ name: 'Gamma Riyadh', phone: '966533333333', purchase_market: 'Riyadh' }, { name: 'Delta Jeddah', phone: '966544444444', purchase_market: 'Jeddah' }, { name: 'Customer self', phone: '+966500000001' }] };
    const f = detail([
      { method: 'GET', path: '/v1/rfq-received/r1/send-preview', reply: preview },
      { method: 'POST', path: '/v1/rfq-received/r1/send', status: 400, reply: { error: 'Bot WhatsApp not connected' } },
    ]);
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/r1?tab=send', path: '/procurement/rfq/:id' });
    expect(await screen.findAllByText('Bot WhatsApp not connected')).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Procurement settings' })).toHaveAttribute('href', '/procurement/settings?tab=whatsapp');
    const rec = screen.getByRole('table', { name: 'Recipients' });
    expect(within(rec).queryByText('Customer self')).not.toBeInTheDocument();
    expect(within(rec).getByRole('checkbox', { name: 'Select Gamma Riyadh' })).toBeChecked();
    expect(within(rec).getByRole('checkbox', { name: 'Select Delta Jeddah' })).not.toBeChecked();
    expect(within(rec).getByRole('checkbox', { name: 'Select Alpha Parts' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Send to 1 supplier(s)' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/rfq-received/r1/send')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/rfq-received/r1/send')[0].body).toMatchObject({ recipients: [{ name: 'Gamma Riyadh', phone: '966533333333' }], generate_pdf: true, authorized_by: '', prepared_by: 'Sirin K' });
    expect((await screen.findAllByText('Bot WhatsApp not connected')).length).toBeGreaterThan(1);
  });

  it('replies tab deletes a reply after confirmation', async () => {
    const f = detail([{ method: 'DELETE', path: '/v1/rfq-received/r1/supplier-replies/rep2', reply: {} }]);
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/r1?tab=replies', path: '/procurement/rfq/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete reply Beta Spares' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Delete this reply?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/rfq-received/r1/supplier-replies/rep2')).toHaveLength(1));
  });

  it('add quotation wizard: parse file → review → POST supplier-replies with matched prices', async () => {
    const f = detail([
      { method: 'POST', path: '/v1/rfq-received/r1/supplier-replies/parse-file', reply: { prices: [{ product_index: -1, part_no: 'BP-1', product_name: 'Brake pad', unit_price: 77 }], supplier_name: 'Zeta', supplier_phone: '966566666666', is_quotation: true } },
      { method: 'POST', path: '/v1/rfq-received/r1/supplier-replies', reply: { success: true, reply_id: 'x' } },
    ]);
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/r1?tab=prices', path: '/procurement/rfq/:id' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add quotation' }));
    const dlg = await screen.findByRole('dialog', { name: 'Add quotation' });
    await userEvent.upload(within(dlg).getByTestId('file-Supplier quotation files'), new File(['%PDF'], 'zeta.pdf', { type: 'application/pdf' }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Extract prices' }));
    expect(await within(dlg).findByLabelText('Unit price 1')).toHaveValue('77');
    expect(within(dlg).getByLabelText('Supplier name')).toHaveValue('Zeta');
    await userEvent.type(within(dlg).getByLabelText('Unit price 2'), '12.5');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add prices to RFQ' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/rfq-received/r1/supplier-replies')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/rfq-received/r1/supplier-replies')[0].body).toEqual({
      supplier_name: 'Zeta', supplier_phone: '966566666666', raw_text: '', run_llm_extraction: false,
      prices: [expect.objectContaining({ product_index: 0, unit_price: 77, currency: 'SAR' }), expect.objectContaining({ product_index: 1, unit_price: 12.5, product_name: 'Oil filter' })],
    });
  });

  it('shows a not-found error', async () => {
    mockApi([{ method: 'GET', path: '/v1/rfq-received/zz', status: 404, reply: { error: 'not found' } }], opts);
    renderApp(<RfqDetailPage />, { at: '/procurement/rfq/zz', path: '/procurement/rfq/:id' });
    expect(await screen.findByText(/not found/)).toBeInTheDocument();
  });
});

describe('/rfq-print (headless Chrome contract)', () => {
  it('loads print data without auth, renders the paper and flags body[data-print-ready]', async () => {
    delete document.body.dataset.printReady;
    const f = mockApi([{ method: 'GET', path: '/v1/rfq/print-data/k1', reply: { model: { ...RFQ1, store: { name: 'Gulf Union Ozone Co.', vat_no: '300455120900003' } }, modelName: 'rfq_received' } }], opts);
    renderApp(<RfqServerPrint />, { at: '/rfq-print?key=k1' });
    expect(await screen.findByTestId('rfq-paper')).toHaveTextContent('RFQ-000001');
    expect(screen.getByText('Brake pad')).toBeInTheDocument();
    await waitFor(() => expect(document.body.dataset.printReady).toBe('true'), { timeout: 3000 });
    expect(document.title).toBe('RFQ-000001');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(calls(f, 'GET', '/v1/rfq/print-data/k1')).toHaveLength(1);
  });
  it('shows an error for an expired key', async () => {
    mockApi([{ method: 'GET', path: '/v1/rfq/print-data/old', status: 404, reply: { error: 'not found or expired' } }], opts);
    renderApp(<RfqServerPrint />, { at: '/rfq-print?key=old' });
    expect(await screen.findByText(/not found or expired/)).toBeInTheDocument();
  });
});
