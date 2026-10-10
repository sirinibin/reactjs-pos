/**
 * Details modal (capital/view.js): renders the record from GET /v1/capital/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CapitalView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../utils/AttachmentsViewer.js', () => () => null);
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('CapitalView', () => {
    setupViewEnv();

    describeViewModal({
        Component: CapitalView,
        endpoint: '/v1/capital',
        model: { ...BASE, amount: 100000, payment_method: 'bank_transfer', invested_by_user_name: 'Partner A' },
        expectTexts: ['Capital #C-001', '100,000', 'Bank Transfer', 'Partner A', 'Desc text'],
        emptyTexts: ['Capital #', '—'],
    });
});
