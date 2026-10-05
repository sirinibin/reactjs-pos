import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { BillImagesPage, resolveExtraction } from './billImages';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const MSGS = [
  { id: 'm1', purchase_bill_code: 'PB-0001', sender_name: 'Upload', attachments: [{ url: 'https://cdn/x.jpg', filename: 'x.jpg', content_type: 'image/jpeg' }], created_at: '2026-10-01T10:00:00Z' },
  { id: 'm2', purchase_bill_code: 'PB-0002', sender_name: 'Ali', attachments: [{ url: 'https://cdn/y.pdf', filename: 'y.pdf', content_type: 'application/pdf' }], linked_purchase_id: 'p1', linked_purchase_code: 'P-INV-000001', created_at: '2026-10-02T10:00:00Z' },
];
const listRoute = { method: 'GET', path: '/v1/procurement-messages', reply: { messages: MSGS, total: 2, page: 1, limit: 24, total_pages: 1 } };

describe('Bill images', () => {
  it('lists bills with plain store_id query and link badges', async () => {
    const f = mockApi([listRoute]);
    renderApp(<BillImagesPage />, { at: '/buying/bill-images' });
    const list = await screen.findByRole('list', { name: 'Bills' });
    expect(within(list).getByText('PB-0001')).toBeInTheDocument();
    expect(within(list).getByText('Not linked')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /P-INV-000001/ })).toBeInTheDocument();
    const u = calls(f, 'GET', '/v1/procurement-messages')[0].url.searchParams;
    expect(u.get('store_id')).toBe(STORE_ID);
    expect(u.get('purchase_bills')).toBe('true');
    expect(u.get('has_attachments')).toBe('true');
  });

  it('uploads each file as its own bill (multipart files)', async () => {
    const f = mockApi([listRoute, { method: 'POST', path: '/v1/procurement-messages/upload-purchase-bill', reply: { created: 1, count: 1 } }]);
    renderApp(<BillImagesPage />, { at: '/buying/bill-images' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'Upload bills' }))[0]);
    const dlg = await screen.findByRole('dialog');
    const input = dlg.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.pdf', { type: 'application/pdf' })]);
    expect(within(dlg).getByText('a.jpg')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/procurement-messages/upload-purchase-bill')).toHaveLength(2));
    expect(calls(f, 'POST', '/v1/procurement-messages/upload-purchase-bill')[0].url.searchParams.get('store_id')).toBe(STORE_ID);
  });

  it('links a bill to an existing purchase', async () => {
    const f = mockApi([
      listRoute,
      { method: 'GET', path: '/v1/purchase', reply: { status: true, result: [{ id: 'p7', code: 'P-INV-000007', vendor_name: 'X', net_total: 10 }] } },
      { method: 'POST', path: '/v1/procurement-messages/m1/link-purchase', reply: { status: true } },
    ]);
    renderApp(<BillImagesPage />, { at: '/buying/bill-images' });
    await userEvent.click(await screen.findByRole('button', { name: 'Link' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('combobox', { name: 'Purchase bill' }));
    await userEvent.click(await within(dlg).findByRole('option', { name: /P-INV-000007/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/procurement-messages/m1/link-purchase')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/procurement-messages/m1/link-purchase')[0].body).toEqual({ purchase_id: 'p7', purchase_code: 'P-INV-000007' });
  });

  it('extracts with the chosen provider and opens a prefilled purchase', async () => {
    const X = { vendor_company_name: 'AL JAZIRA AUTO PARTS', vendor_vat_no: '300112233400003', invoice_number: 'AJ-900', total_amount: 230, products: [{ part_no: 'BP-1', name: 'Brake Pad Set', quantity: 2, unit_price: 100 }] };
    const f = mockApi([
      listRoute,
      { method: 'POST', path: '/v1/procurement-messages/m1/extract-purchase-bill', reply: X },
      { method: 'GET', path: '/v1/vendor/vat_no/name', reply: { status: true, result: { id: 'v1', name: 'AL JAZIRA AUTO PARTS' } } },
      { method: 'GET', path: '/v1/product', reply: { status: true, result: [{ id: 'pr1' }] } },
    ]);
    renderApp(<BillImagesPage />, { at: '/buying/bill-images', extraRoutes: <Route path="/buying/purchases/new" element={<div>purchase editor</div>} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'Extract' }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dlg).getByRole('combobox', { name: 'AI provider' }), 'openai');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Extract' }));
    expect(await within(dlg).findByText('Extraction complete')).toBeInTheDocument();
    expect(within(dlg).getByText('AJ-900')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create purchase' }));
    expect(await screen.findByText('purchase editor')).toBeInTheDocument();
    const stash = JSON.parse(sessionStorage.getItem('buying.bill.m1') || '{}');
    expect(stash.party).toMatchObject({ id: 'v1' });
    expect(stash.extra).toEqual({ vendor_invoice_no: 'AJ-900' });
    expect(stash.lines[0]).toMatchObject({ product_id: 'pr1', quantity: 2, unit_price: 100 });
    expect(calls(f, 'POST', '/v1/procurement-messages/m1/extract-purchase-bill')).toHaveLength(1);
  });

  it('shows the empty state', async () => {
    mockApi([{ method: 'GET', path: '/v1/procurement-messages', reply: { messages: null, total: 0 } }]);
    renderApp(<BillImagesPage />, { at: '/buying/bill-images' });
    await waitFor(() => expect(screen.getByText('No bills yet')).toBeInTheDocument());
  });
});

describe('resolveExtraction', () => {
  it('creates a missing vendor and product', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/vendor', reply: { status: true, result: [] } },
      { method: 'POST', path: '/v1/vendor', reply: { status: true, result: { id: 'vn', name: 'NEW' } } },
      { method: 'GET', path: '/v1/product', reply: { status: true, result: [] } },
      { method: 'POST', path: '/v1/product', reply: { status: false, result: { id: 'pn' } } },
    ]);
    localStorage.setItem('access_token', 't');
    const r = await resolveExtraction({ vendor_company_name: 'New', vendor_vat_no: 'bad', products: [{ name: 'Gizmo', part_no: 'G-1' }] }, STORE_ID);
    expect(r).toEqual({ vendor: { id: 'vn', name: 'NEW' }, ids: ['pn'] });
    expect(calls(f, 'POST', '/v1/vendor')[0].body).toEqual({ store_id: STORE_ID, name: 'New' });
    expect(calls(f, 'POST', '/v1/product')[0].body).toMatchObject({ name: 'Gizmo', part_number: 'G-1' });
  });
});
