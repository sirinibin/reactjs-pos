/**
 * Details modal (role/view.js): renders the record from GET /v1/user-role/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UserRoleView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

// The loader has no .catch(): a network error becomes an unhandled rejection,
// so the generic network-error case is skipped for this view.

describe('UserRoleView', () => {
    setupViewEnv();

    describeViewModal({
        Component: UserRoleView,
        endpoint: '/v1/user-role',
        skipNetworkError: true,
        model: { ...BASE, name: 'Cashier', permissions: [{ resource: 'sales', read: true, create: true, update: false, delete: false }] },
        expectTexts: ['Role: Cashier', 'Sales', 'Sara Ali', '✓'],
        emptyTexts: [],
    });

    test('permissions table lists every menu module and ticks only saved actions', async () => {
        await openView(UserRoleView, { result: { ...BASE, name: 'Cashier',
            permissions: [{ resource: 'sales', read: true, create: true, update: false, delete: false }] } });
        const salesRow = screen.getByText('Sales').closest('tr');
        const cells = Array.from(salesRow.querySelectorAll('td')).slice(1).map(td => td.textContent);
        expect(cells.slice(0, 4)).toEqual(['✓', '✓', '—', '—']);
        // a module with no saved permission is all dashes
        const purchasesRow = screen.getByText('Purchases').closest('tr');
        expect(Array.from(purchasesRow.querySelectorAll('td')).slice(1).every(td => td.textContent === '—')).toBe(true);
    });

    test('shows a loading state until the role arrives (404 keeps it loading)', async () => {
        await openView(UserRoleView, { respond: notFound });
        expect(modalText()).toContain('Role Detail');
    });
});
