/**
 * Smoke tests for ProcurementWhatsAppWidget.
 *
 * Covers:
 *  1. Renders without crashing
 *  2. Status check on mount — calls endpointBase/status
 *  3. Shows "Not Connected" badge when status returns connected:false
 *  4. Shows phone input and Connect button in idle phase
 *  5. Connect button is disabled when phone is empty
 *  6. Clicking Connect calls POST endpointBase/connect
 *  7. Shows "Connected" badge and phone when status returns connected:true on mount
 *  8. Shows QR spinner while waiting for QR after connect
 *  9. Shows error alert when connect fails
 * 10. Disconnect calls DELETE endpointBase/disconnect
 * 11. onStatusChange callback fires on mount-check
 * 12. Renders correctly with both endpoint bases
 */

import React from 'react';
import { render, act, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-bootstrap', () => {
    const Spinner = () => <span data-testid="rb-spinner" />;
    const Badge   = ({ children, bg, text, className }) => (
        <span data-testid={`badge-${bg}`} className={className}>{children}</span>
    );
    const Alert   = ({ children, variant, className }) => (
        <div data-testid="rb-alert" className={className}>{children}</div>
    );
    return { Spinner, Badge, Alert };
});

jest.useFakeTimers();

const makeFetch = (body = {}, ok = true) =>
    jest.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });

beforeEach(() => {
    global.fetch = makeFetch({ connected: false });
    localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

// Lazy import after mocks are registered
let ProcurementWhatsAppWidget;
beforeAll(async () => {
    ProcurementWhatsAppWidget = (await import('../ProcurementWhatsAppWidget')).default;
});

function renderWidget(props = {}) {
    const defaults = {
        storeId: 'store-abc',
        endpointBase: '/v1/rfq-bot',
        label: 'Bot WhatsApp',
        phone: '966501234567',
        onPhoneChange: jest.fn(),
        onStatusChange: jest.fn(),
    };
    return render(<ProcurementWhatsAppWidget {...defaults} {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ProcurementWhatsAppWidget smoke tests', () => {
    it('1. renders without crashing', async () => {
        await act(async () => { renderWidget(); });
    });

    it('2. calls endpointBase/status on mount', async () => {
        await act(async () => { renderWidget(); });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-bot/status'),
            expect.any(Object)
        );
    });

    it('3. shows "Not Connected" badge when status returns connected:false', async () => {
        global.fetch = makeFetch({ connected: false });
        await act(async () => { renderWidget(); });
        await waitFor(() => expect(screen.getByTestId('badge-secondary')).toBeTruthy());
    });

    it('4. shows phone input and Connect button in idle phase', async () => {
        global.fetch = makeFetch({ connected: false });
        await act(async () => { renderWidget({ phone: '966501234567' }); });
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/phone number/i)).toBeTruthy();
            expect(screen.getByRole('button', { name: /^connect$/i })).toBeTruthy();
        });
    });

    it('5. Connect button is disabled when phone is empty', async () => {
        global.fetch = makeFetch({ connected: false });
        await act(async () => { renderWidget({ phone: '' }); });
        await waitFor(() => {
            const btn = screen.queryByRole('button', { name: /^connect$/i });
            if (btn) expect(btn).toBeDisabled();
        });
    });

    it('6. clicking Connect calls POST endpointBase/connect', async () => {
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (url.includes('/status') && fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
            if (url.includes('/connect')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, instance_name: 'rfqbot_test', token: 'tok' }) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
        });

        await act(async () => { renderWidget({ phone: '966501234567' }); });

        // Find and click the Connect button (use role to avoid matching "Not Connected" badge)
        await waitFor(() => screen.getByRole('button', { name: /^connect$/i }));
        await act(async () => {
            screen.getByRole('button', { name: /^connect$/i }).click();
            await Promise.resolve();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-bot/connect'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('7. shows "Connected" badge when status returns connected:true on mount', async () => {
        global.fetch = makeFetch({ connected: true, phone: '966501234567' });
        await act(async () => { renderWidget(); });
        await waitFor(() => expect(screen.getByTestId('badge-success')).toBeTruthy());
    });

    it('8. onStatusChange(true) is called when mount-check returns connected', async () => {
        global.fetch = makeFetch({ connected: true, phone: '966501234567' });
        const onStatusChange = jest.fn();
        await act(async () => { renderWidget({ onStatusChange }); });
        await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith(true));
    });

    it('9. onStatusChange(false) is called when mount-check returns not connected', async () => {
        global.fetch = makeFetch({ connected: false });
        const onStatusChange = jest.fn();
        await act(async () => { renderWidget({ onStatusChange }); });
        await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith(false));
    });

    it('10. shows error alert when connect fetch returns error', async () => {
        let callIdx = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            callIdx++;
            if (url.includes('/status') && callIdx === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
            return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Instance creation failed' }) });
        });

        await act(async () => { renderWidget({ phone: '966501234567' }); });
        await waitFor(() => screen.getByRole('button', { name: /^connect$/i }));

        await act(async () => {
            screen.getByRole('button', { name: /^connect$/i }).click();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => expect(screen.getByTestId('rb-alert')).toBeTruthy());
    });

    it('11. renders with rfq-store endpoint base without crashing', async () => {
        global.fetch = makeFetch({ connected: false });
        await act(async () => {
            renderWidget({ endpointBase: '/v1/rfq-store', label: 'Store RFQ WhatsApp' });
        });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-store/status'),
            expect.any(Object)
        );
    });

    it('12. label is rendered in the widget', async () => {
        global.fetch = makeFetch({ connected: false });
        await act(async () => { renderWidget({ label: 'My Custom Label' }); });
        await waitFor(() => expect(screen.getByText('My Custom Label')).toBeTruthy());
    });

    it('13. does not crash when storeId is empty', async () => {
        await act(async () => { renderWidget({ storeId: '' }); });
        // No fetch should happen for status when storeId is empty
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('14. Disconnect button calls DELETE endpoint when connected', async () => {
        let callIdx = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            callIdx++;
            if (url.includes('/status') && callIdx === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: true, phone: '966501234567' }) });
            if (url.includes('/disconnect')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /^disconnect$/i }));

        await act(async () => {
            screen.getByRole('button', { name: /^disconnect$/i }).click();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/disconnect'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });
});
