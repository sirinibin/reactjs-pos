/**
 * Details modal (divident/view.js): renders the record from GET /v1/divident/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DividentView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';
jest.mock('../../utils/AttachmentsViewer.js', () => () => null);
const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('DividentView', () => {
    setupViewEnv();

    describeViewModal({
        Component: DividentView,
        endpoint: '/v1/divident',
        model: { ...BASE, amount: 750, payment_method: 'cash', withdrawn_by_user_name: 'Owner One' },
        expectTexts: ['Drawing #C-001', '750.00', 'Cash', 'Owner One'],
        emptyTexts: ['Drawing #', '—'],
    });
});
