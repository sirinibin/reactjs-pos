/**
 * Details modal (vendor_category/view.js): renders the record from GET /v1/vendor-category/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VendorCategoryView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('VendorCategoryView', () => {
    setupViewEnv();

    describeViewModal({
        Component: VendorCategoryView,
        endpoint: '/v1/vendor-category',
        model: { ...BASE, name: 'Steel Suppliers' },
        expectTexts: ['Steel Suppliers', 'Sara Ali', 'Mar 02, 2026, 11:00:00 AM (UTC)'],
        emptyTexts: ['Details of Vendor Category', '—'],
    });
});
