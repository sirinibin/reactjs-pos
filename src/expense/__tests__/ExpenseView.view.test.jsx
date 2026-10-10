/**
 * Details modal (expense/view.js): renders the record from GET /v1/expense/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ExpenseView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../utils/AttachmentsViewer.js', () => () => null);
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('ExpenseView', () => {
    setupViewEnv();

    describeViewModal({
        Component: ExpenseView,
        endpoint: '/v1/expense',
        model: { ...BASE, amount: 99.9, category_name: ['Rent', 'Office'], payment_method: 'cash' },
        expectTexts: ['Expense #C-001', '99.90', 'Rent', 'Office', 'Cash', 'Desc text', 'Sara Ali'],
        emptyTexts: ['Expense #', '—'],
    });

    test('amount is shown with 2 decimals and thousands separators', async () => {
        await openView(ExpenseView, { result: { ...BASE, amount: 12345.5, payment_method: 'bank_transfer' } });
        expect(modalText()).toContain('12,345.50');
        expect(modalText()).toContain('Bank Transfer');
    });
});
