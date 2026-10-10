/**
 * Details modal (signature/view.js): renders the record from GET /v1/signature/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SignatureView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('SignatureView', () => {
    setupViewEnv();

    describeViewModal({
        Component: SignatureView,
        endpoint: '/v1/signature',
        model: { ...BASE, name: 'GM Sign', signature: '/images/sig.png' },
        expectTexts: ['details_of_signature #GM Sign', 'created_by: Sara Ali', 'updated_by: Omar Z'],
        emptyTexts: ['details_of_signature'],
    });
});
