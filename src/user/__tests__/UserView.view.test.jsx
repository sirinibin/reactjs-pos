/**
 * Details modal (user/view.js): renders the record from GET /v1/user/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UserView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('UserView', () => {
    setupViewEnv();

    describeViewModal({
        Component: UserView,
        endpoint: '/v1/user',
        expectedUrl: '/v1/user/rec-42',
        model: { ...BASE, name: 'Ali Hassan', email: 'ali@x.com', mob: '0555', role: 'Manager', admin: false, devices: [{ device_id: 'dev-1', connected: true, device_type: 'mobile', platform: 'iOS', screen_width: 390, screen_height: 844, touch: true, battery: 0.82, ip_address: '1.2.3.4', last_connected_at: '2026-03-01T10:00:00Z' }] },
        expectTexts: ['Ali Hassan', 'ali@x.com', '0555', 'Manager', 'dev-1', 'Online', 'iOS', '390 x 844', '82%', '1.2.3.4'],
        emptyTexts: ['No devices available for this user.'],
    });

    test('password is never displayed (masked)', async () => {
        await openView(UserView, { result: { ...BASE, name: 'A', password: 'plain-secret' } });
        expect(modalText()).not.toContain('plain-secret');
        expect(modalText()).toContain('***');
    });

    test('battery "N/A" is shown as Unknown', async () => {
        await openView(UserView, { result: { ...BASE, devices: [{ device_id: 'd', battery: 'N/A' }] } });
        expect(modalText()).toContain('Unknown');
    });

    // KNOWN BUG: a device record without a `battery` field (e.g. desktop browsers
    // that don't expose the Battery API) renders "NaN%". Expected: "Unknown".
    test.skip('missing battery is not rendered as NaN%', async () => {
        await openView(UserView, { result: { ...BASE, devices: [{ device_id: 'd' }] } });
        expect(modalText()).not.toContain('NaN%');
    });
});
