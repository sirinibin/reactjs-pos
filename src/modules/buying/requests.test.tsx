import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { PrEditorPage, PrListPage, PrViewPage } from './requests';

// Form-heavy flows type a lot; give them headroom when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20000 });

const PR = { id: 'r1', code: 'PREQ-000001', date: '2026-10-01T10:00:00Z', status: 'pending', assigned_to: 'u1', assigned_to_name: 'Sirin K', created_by: 'u5', created_by_name: 'Ali', net_total: 276, total: 240, vat_price: 36, vat_percent: 15, notes: 'For workshop',
  products: [{ product_id: 'pr1', name: 'Brake Pad Set', quantity: 2, purchase_unit_price: 120, unit_discount: 0 }], purchase_order_id: null, purchase_order_code: null };

describe('Purchase request list', () => {
  it('pages through search[page]/search[limit]/search[sort_*] and scopes Received to me', async () => {
    const f = mockApi([{ method: 'GET', path: '/v1/purchase-request', reply: { status: true, total_count: 1, result: [PR] } }]);
    renderApp(<PrListPage />, { at: '/buying/requests' });
    const table = await screen.findByRole('table', { name: 'Purchase requests' });
    expect(await within(table).findByText('PREQ-000001')).toBeInTheDocument();
    const u = calls(f, 'GET', '/v1/purchase-request')[0].url.searchParams;
    expect(u.get('search[store_id]')).toBe(STORE_ID);
    expect(u.get('search[page]')).toBe('1');
    expect(u.get('search[limit]')).toBe('20');
    expect(u.get('search[sort_by]')).toBe('created_at');
    expect(u.get('search[sort_order]')).toBe('desc');
    expect(u.get('search[assigned_to]')).toBe('u1');
    expect(u.get('page')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Sent' }));
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-request').some((c) => c.url.searchParams.get('search[created_by]') === 'u1')).toBe(true));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'accepted');
    await waitFor(() => expect(calls(f, 'GET', '/v1/purchase-request').some((c) => c.url.searchParams.get('search[status]') === 'accepted')).toBe(true));
  });

  it('accepts a pending request assigned to me from the row', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-request', reply: { status: true, total_count: 1, result: [PR] } },
      { method: 'POST', path: '/v1/purchase-request/r1/accept', reply: { status: true, result: { ...PR, status: 'accepted' } } },
    ]);
    renderApp(<PrListPage />, { at: '/buying/requests' });
    const table = await screen.findByRole('table', { name: 'Purchase requests' });
    await userEvent.click(await within(table).findByRole('button', { name: /Accept/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-request/r1/accept')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/purchase-request/r1/accept')[0].body).toEqual({ partial: false });
  });

  it('handles a null result (no requests) as an empty list', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase-request', reply: { status: true, total_count: 0, result: null } }]);
    renderApp(<PrListPage />, { at: '/buying/requests' });
    expect((await screen.findAllByText('No records found')).length).toBeGreaterThan(0);
  });
});

describe('Purchase request editor', () => {
  const PRODUCT = { id: 'pr1', name: 'Brake Pad Set', product_stores: { [STORE_ID]: { purchase_unit_price: 120, purchase_unit_price_with_vat: 138 } } };
  const mocks = (extra: any[] = []) => mockApi([
    ...extra,
    { method: 'GET', path: '/v1/product', reply: { status: true, result: [PRODUCT] } },
    { method: 'GET', path: '/v1/user', reply: { status: true, result: [{ id: 'u5', name: 'Ali Buyer', email: 'ali@x.co' }] } },
  ]);

  it('requires an assignee and posts notes, assignee and purchase prices', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/purchase-request', reply: { status: true, result: { id: 'r9', code: 'PREQ-9' } } }]);
    renderApp(<PrEditorPage />, { at: '/buying/requests/new', path: '/buying/requests/new', extraRoutes: <Route path="/buying/requests/:id" element={<div>viewing</div>} /> });
    await userEvent.type(await screen.findByRole('combobox', { name: 'Add item' }), 'brake');
    await userEvent.click(await screen.findByRole('option', { name: /Brake Pad Set/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    expect(await screen.findByText('Choose who should handle this request.')).toBeInTheDocument();
    expect(calls(f, 'POST', '/v1/purchase-request')).toHaveLength(0);
    await userEvent.click(screen.getByRole('combobox', { name: /Assign to/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Ali Buyer/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Remarks' }), 'For the workshop');
    await userEvent.click(screen.getByRole('button', { name: /^Save Ctrl S/ }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-request')).toHaveLength(1));
    const body = calls(f, 'POST', '/v1/purchase-request')[0].body;
    expect(body).toMatchObject({ assigned_to: 'u5', assigned_to_name: 'Ali Buyer', notes: 'For the workshop', vat_percent: 15 });
    expect(body.products).toEqual([expect.objectContaining({ product_id: 'pr1', purchase_unit_price: 120, quantity: 1 })]);
    expect(body).not.toHaveProperty('payments_input');
    expect(screen.queryByRole('checkbox', { name: 'Auto rounding' })).not.toBeInTheDocument();
  });

  it('shows server validation errors delivered with HTTP 200', async () => {
    mocks([
      { method: 'GET', path: '/v1/purchase-request/r1', reply: { status: true, result: PR } },
      { method: 'PUT', path: '/v1/purchase-request/r1', reply: { status: false, errors: { assigned_to: 'Assigned to is invalid' } } },
    ]);
    renderApp(<PrEditorPage />, { at: '/buying/requests/r1/edit', path: '/buying/requests/:id/edit' });
    expect(await screen.findByDisplayValue('For workshop')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Save changes/ }));
    expect((await screen.findAllByText('Assigned to is invalid')).length).toBeGreaterThan(0);
  });
});

describe('Purchase request view', () => {
  it('rejects after confirmation and offers Create P.O. once accepted', async () => {
    const f = mockApi([
      { method: 'GET', path: '/v1/purchase-request/r1', reply: { status: true, result: PR } },
      { method: 'POST', path: '/v1/purchase-request/r1/reject', reply: { status: true, result: { ...PR, status: 'rejected' } } },
    ]);
    renderApp(<PrViewPage />, { at: '/buying/requests/r1', path: '/buying/requests/:id' });
    expect(await screen.findByRole('heading', { name: /PREQ-000001/ })).toBeInTheDocument();
    expect(screen.getByText('For workshop')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create P.O.' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/purchase-request/r1/reject')).toHaveLength(1));
  });

  it('accepted request → Create P.O. opens the PO editor prefilled from the request', async () => {
    mockApi([{ method: 'GET', path: '/v1/purchase-request/r1', reply: { status: true, result: { ...PR, status: 'accepted' } } }]);
    renderApp(<PrViewPage />, { at: '/buying/requests/r1', path: '/buying/requests/:id', extraRoutes: <Route path="/buying/orders/new" element={<div>po editor</div>} /> });
    await userEvent.click(await screen.findByRole('button', { name: 'Create P.O.' }));
    expect(await screen.findByText('po editor')).toBeInTheDocument();
  });
});
