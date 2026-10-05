import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { RFQ_STORE } from './testData';
import { SuppliersPage } from './suppliers';

const SUP = { id: 's1', name: 'Alpha Parts', phone: '966511111111', phone2: '966511111112', categories: ['Brakes', 'Filters', 'Oils', 'Tyres', 'Batteries'], rating: 4.5, purchase_market: 'Riyadh', is_active: true, added_at: '2026-09-01T10:00:00Z', email: 'alpha@parts.sa' };
const mocks = (extra: any[] = []) => mockApi([...extra, { method: 'GET', path: '/v1/rfq-suppliers', reply: { status: true, result: [SUP], total_count: 1 } }], { store: RFQ_STORE });

describe('RFQ suppliers', () => {
  it('lists suppliers from the standard `result` envelope with plain store_id', async () => {
    const f = mocks();
    renderApp(<SuppliersPage />, { at: '/procurement/suppliers' });
    const table = await screen.findByRole('table', { name: 'RFQ suppliers' });
    expect(await within(table).findByText('Alpha Parts')).toBeInTheDocument();
    expect(within(table).getByText('+1')).toBeInTheDocument();
    expect(within(table).getByText('Active')).toBeInTheDocument();
    expect(calls(f, 'GET', '/v1/rfq-suppliers')[0].url.searchParams.get('store_id')).toBe(STORE_ID);
  });

  it('validates and creates a supplier with the exact body', async () => {
    const f = mocks([{ method: 'POST', path: '/v1/rfq-suppliers', reply: { ...SUP, id: 's2', name: 'Beta' } }]);
    renderApp(<SuppliersPage />, { at: '/procurement/suppliers' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add supplier' }));
    const dlg = await screen.findByRole('dialog', { name: 'Add supplier' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add supplier' }));
    expect(await within(dlg).findByText('Name is required')).toBeInTheDocument();
    expect(within(dlg).getByText('WhatsApp number is required')).toBeInTheDocument();
    expect(within(dlg).getByText(/Market is required/)).toBeInTheDocument();
    await userEvent.type(within(dlg).getByLabelText(/^Name/), 'Beta Spares');
    await userEvent.type(within(dlg).getByLabelText(/^WhatsApp number\*?$/), '+966 52 222 2222');
    await userEvent.selectOptions(within(dlg).getByLabelText(/Purchase market/), 'Jeddah');
    await userEvent.type(within(dlg).getByLabelText('Rating'), '4');
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'Categories' }), 'Brakes{Enter}brakes{Enter}Filters{Enter}');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add supplier' }));
    await waitFor(() => expect(calls(f, 'POST', '/v1/rfq-suppliers')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/rfq-suppliers')[0].body).toEqual({ name: 'Beta Spares', phone: '966522222222', phone2: '', address: '', website: '', email: '', purchase_market: 'Jeddah', rating: 4, is_active: true, categories: ['Brakes', 'Filters'], store_id: STORE_ID });
  }, 20000);

  it('shows a duplicate-phone 409 on the phone field', async () => {
    mocks([{ method: 'POST', path: '/v1/rfq-suppliers', status: 409, reply: { error: 'a supplier with this phone number already exists' } }]);
    renderApp(<SuppliersPage />, { at: '/procurement/suppliers?new=1' });
    const dlg = await screen.findByRole('dialog', { name: 'Add supplier' });
    await userEvent.type(within(dlg).getByLabelText(/^Name/), 'Dup');
    await userEvent.type(within(dlg).getByLabelText(/^WhatsApp number\*?$/), '966511111111');
    await userEvent.selectOptions(within(dlg).getByLabelText(/Purchase market/), 'Riyadh');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add supplier' }));
    expect(await within(dlg).findByText('a supplier with this phone number already exists')).toBeInTheDocument();
  });

  it('edits with PUT, refetches from Maps and deletes after confirmation', async () => {
    const f = mocks([
      { method: 'PUT', path: '/v1/rfq-suppliers/s1', reply: SUP },
      { method: 'POST', path: '/v1/rfq-suppliers/s1/refetch-maps', status: 400, reply: { error: 'Google Maps API key not configured in Store Settings' } },
      { method: 'DELETE', path: '/v1/rfq-suppliers/s1', reply: { success: true } },
    ]);
    renderApp(<SuppliersPage />, { at: '/procurement/suppliers' });
    const table = await screen.findByRole('table', { name: 'RFQ suppliers' });
    await userEvent.click(await within(table).findByRole('button', { name: 'Edit Alpha Parts' }));
    const dlg = await screen.findByRole('dialog', { name: 'Edit supplier' });
    await userEvent.click(within(dlg).getByRole('checkbox', { name: /Active/ }));
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/rfq-suppliers/s1')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/rfq-suppliers/s1')[0].body).toMatchObject({ is_active: false, phone: '966511111111', categories: SUP.categories });
    await userEvent.click(within(table).getByRole('button', { name: 'Refetch from Google Maps Alpha Parts' }));
    expect(await screen.findByText('Google Maps API key not configured in Store Settings')).toBeInTheDocument();
    await userEvent.click(within(table).getByRole('button', { name: 'Delete Alpha Parts' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Delete Alpha Parts?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls(f, 'DELETE', '/v1/rfq-suppliers/s1')).toHaveLength(1));
  });

  it('runs bulk tools and reports the outcome', async () => {
    mocks([{ method: 'POST', path: '/v1/rfq-suppliers/backfill-emails', reply: { queued: 3 } }]);
    renderApp(<SuppliersPage />, { at: '/procurement/suppliers' });
    await userEvent.click(await screen.findByRole('button', { name: 'Backfill emails' }));
    expect(await screen.findByText('Email crawl started for 3 supplier(s)…')).toBeInTheDocument();
  });
});
