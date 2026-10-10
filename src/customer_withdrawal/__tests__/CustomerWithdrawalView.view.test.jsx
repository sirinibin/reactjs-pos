/**
 * Details modal (customer_withdrawal/view.js): renders the record from GET /v1/customer-withdrawal/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CustomerWithdrawalView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../utils/AttachmentsViewer.js', () => () => null);
jest.mock('../../customer_deposit/preview.js', () => require('react').forwardRef(() => null));
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('CustomerWithdrawalView', () => {
    setupViewEnv();

    describeViewModal({
        Component: CustomerWithdrawalView,
        endpoint: '/v1/customer-withdrawal',
        model: { ...BASE, customer_name: 'ACME Co', net_total: 250.5, total: 250.5, payment_methods: ['cash', 'bank_transfer'], payments: [{ amount: 250.5, method: 'cash', date: '2026-03-01T09:00:00Z' }], remarks: 'refund', bank_reference_no: 'BR-9' },
        expectTexts: ['Customer Payable #C-001', '250.50', 'ACME Co', 'Cash, Bank Transfer', 'BR-9', 'refund'],
        emptyTexts: ['Customer Payable #', '—'],
    });
});
