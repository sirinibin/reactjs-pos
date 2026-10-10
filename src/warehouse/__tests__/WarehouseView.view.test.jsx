/**
 * Details modal (warehouse/view.js): renders the record from GET /v1/warehouse/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WarehouseView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('WarehouseView', () => {
    setupViewEnv();

    describeViewModal({
        Component: WarehouseView,
        endpoint: '/v1/warehouse',
        model: { ...BASE, name: 'WH Main', name_in_arabic: 'المستودع', phone: '0500000000', email: 'wh@x.com', country_name: 'Saudi Arabia', national_address: { building_no: '1234', street_name: 'King Fahd', district_name: 'Olaya', city_name: 'Riyadh', zipcode: '12345', city_name_arabic: 'الرياض' } },
        expectTexts: ['WH Main / المستودع', '0500000000', 'wh@x.com', 'Saudi Arabia', '1234', 'King Fahd', 'Olaya', 'Riyadh', 'الرياض', '12345'],
        emptyTexts: [],
    });

    test('national address section is omitted when there is no address', async () => {
        await openView(WarehouseView, { result: { ...BASE, name: 'WH 2' } });
        expect(modalText()).toContain('WH 2');
        expect(modalText()).not.toContain('Building Number');
    });
});
