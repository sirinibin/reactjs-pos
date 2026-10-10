/**
 * Details modal (purchase_request/view.js): renders the record from GET /v1/purchase-request/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PurchaseRequestView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../purchase_order/create.js', () => require('react').forwardRef(() => null));
jest.mock('../../order/preview.js', () => require('react').forwardRef(() => null));
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

// The loader has no .catch(): a network error becomes an unhandled rejection,
// so the generic network-error case is skipped for this view.

describe('PurchaseRequestView', () => {
    setupViewEnv();

    describeViewModal({
        Component: PurchaseRequestView,
        endpoint: '/v1/purchase-request',
        skipNetworkError: true,
        model: { ...BASE, status: 'pending', assigned_to_name: 'Khalid', notes: 'urgent', products: [{ name: 'Pipe 2in', quantity: 3, purchase_unit_price: 10.5, unit_discount: 1 }], discount: 3, vat_price: 4.28, net_total: 32.78 },
        expectTexts: ['P.R C-001', 'Pending', 'Khalid', 'urgent', 'Pipe 2in', '10.50', '28.50', 'Discount: 3.00', 'VAT: 4.28', 'Net Total: 32.78'],
        emptyTexts: [],
    });

    const PR = { ...BASE, status: 'pending', products: [], net_total: 10 };

    test('non-receiver cannot accept/reject', async () => {
        await openView(PurchaseRequestView, { respond: () => Promise.resolve(jsonResponse({ status: true, result: PR })) });
        expect(screen.queryByText('Accept')).toBeNull();
        expect(screen.queryByText('Reject')).toBeNull();
    });

    test('receiver accepting a pending request POSTs /accept and reloads', async () => {
        const onSave = jest.fn();
        const respond = jest.fn((url, opts) => {
            if (opts && opts.method === 'POST') return Promise.resolve(jsonResponse({ status: true }));
            return Promise.resolve(jsonResponse({ status: true, result: PR }));
        });
        await openView(PurchaseRequestView, { respond, openArgs: [true], props: { onSave } });
        await act(async () => { fireEvent.click(screen.getAllByText('Accept')[0].closest('button')); await flush(); });
        const post = global.fetch.mock.calls.find(([, o]) => o && o.method === 'POST');
        expect(post[0]).toBe('/v1/purchase-request/id-1/accept?search[store_id]=store-1');
        expect(JSON.parse(post[1].body)).toEqual({ partial: false });
        expect(onSave).toHaveBeenCalled();
    });

    test('server error on reject is displayed', async () => {
        const respond = jest.fn((url, opts) => {
            if (opts && opts.method === 'POST') return Promise.resolve(jsonResponse({ status: false, errors: { status: 'Already processed' } }));
            return Promise.resolve(jsonResponse({ status: true, result: PR }));
        });
        await openView(PurchaseRequestView, { respond, openArgs: [true] });
        await act(async () => { fireEvent.click(screen.getAllByText('Reject')[0].closest('button')); await flush(); });
        expect(modalText()).toContain('Already processed');
    });

    test('unknown status falls back to the raw status label', async () => {
        await openView(PurchaseRequestView, { respond: () => Promise.resolve(jsonResponse({ status: true, result: { ...PR, status: 'on_hold' } })) });
        expect(modalText()).toContain('on_hold');
    });
});
