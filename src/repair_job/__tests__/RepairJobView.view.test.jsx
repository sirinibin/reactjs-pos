/**
 * Details modal (repair_job/view.js): renders the record from GET /v1/repair-job/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RepairJobView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('RepairJobView', () => {
    setupViewEnv();

    describeViewModal({
        Component: RepairJobView,
        endpoint: '/v1/repair-job',
        model: { ...BASE, job_number: 'RJ-77', status: 'in_progress', vehicle_number: 'ABC 123', brand: 'Toyota', model: 'Camry', km: 12000, complaint: 'noise', inspection: 'brakes', work_done: 'pads', technician_name: 'Tech T', labour_charge: 100, parts_total: 250.75, total: 350.75, parts: [{ name: 'Brake Pad', quantity: 2, unit_price: 125.375, total: 250.75 }] },
        expectTexts: ['RJ-77', 'In Progress', 'ABC 123', 'Toyota Camry', '12,000', 'Tech T', 'noise', 'brakes', 'pads', 'Brake Pad', '250.75', '100.00', '350.75'],
        emptyTexts: ['Repair Job', '-'],
    });

    test('parts table is hidden when there are no parts', async () => {
        await openView(RepairJobView, { result: { ...BASE, job_number: 'RJ-1', parts: [] } });
        expect(modalText()).not.toContain('Brake Pad');
    });

    test('linked sales invoice button opens the invoice', async () => {
        const onOpenSalesInvoice = jest.fn();
        await openView(RepairJobView, { result: { ...BASE, job_number: 'RJ-1', order_id: 'ord-5', order_code: 'S-5' }, props: { onOpenSalesInvoice } });
        fireEvent.click(screen.getByText('S-5').closest('button'));
        expect(onOpenSalesInvoice).toHaveBeenCalledWith('ord-5');
    });
});
