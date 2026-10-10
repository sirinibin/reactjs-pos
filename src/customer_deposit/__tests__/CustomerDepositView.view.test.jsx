/**
 * Details modal (customer_deposit/view.js): renders the record from GET /v1/customer-deposit/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CustomerDepositView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../utils/AttachmentsViewer.js', () => () => null);
jest.mock('../preview.js', () => require('react').forwardRef(() => null));
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('CustomerDepositView', () => {
    setupViewEnv();

    describeViewModal({
        Component: CustomerDepositView,
        endpoint: '/v1/customer-deposit',
        model: { ...BASE, customer_name: 'ACME Co', net_total: 1150, total: 1150, payment_methods: ['cash'], payments: [{ amount: 1150, method: 'cash', date: '2026-03-01T09:00:00Z' }], remarks: 'advance' },
        expectTexts: ['Customer Receivable #C-001', '1,150.00', 'ACME Co', 'Cash', 'advance'],
        emptyTexts: ['Customer Receivable #', '—'],
    });

    test('multiple payments are each listed with their method', async () => {
        await openView(CustomerDepositView, { result: { ...BASE, customer_name: 'X', net_total: 300,
            payment_methods: ['cash', 'bank_card'],
            payments: [{ amount: 100, method: 'cash' }, { amount: 200, method: 'bank_card' }] } });
        const text = modalText();
        expect(text).toContain('100.00');
        expect(text).toContain('200.00');
        expect(text).toContain('Cash, Bank Card');
    });
});
