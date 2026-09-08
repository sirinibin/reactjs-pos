/**
 * Tests for WABATemplatePurposeWidget.
 *
 * Covers:
 *  1.  Renders without storeId (no crash, no fetch)
 *  2.  Renders with storeId but no WABA account ID — "Load Templates" button disabled
 *  3.  Auto-fetches on mount when storeId + WABA account ID are set
 *  4.  Shows error alert when fetch fails with API error
 *  5.  Shows error alert on network error
 *  6.  Populates dropdowns after successful fetch
 *  7.  Falls back to text inputs when no templates loaded
 *  8.  Calls onSettingsChange with waba_template_rfq_supplier on select
 *  9.  Calls onSettingsChange with waba_template_invoice_share on select
 * 10.  "Load Templates" button manually triggers fetch when clicked
 * 11.  Pre-selected values are reflected in dropdowns
 * 12.  Pre-selected values are reflected in text inputs (fallback mode)
 */

import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-bootstrap', () => {
    const Spinner = () => <span data-testid="rb-spinner" />;
    return { Spinner };
});

const MOCK_TEMPLATES = [
    { name: 'rfq_to_supplier', language: 'en', category: 'UTILITY', components: [] },
    { name: 'invoice_share_v2', language: 'ar', category: 'UTILITY', components: [] },
];

const makeFetch = (body, ok = true) =>
    jest.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

let Widget;
beforeAll(async () => {
    Widget = (await import('../WABATemplatePurposeWidget')).default;
});

function renderWidget(props = {}) {
    const defaults = {
        storeId: null,
        settings: {},
        onSettingsChange: jest.fn(),
    };
    return render(<Widget {...defaults} {...props} />);
}

describe('WABATemplatePurposeWidget', () => {
    it('1. renders without storeId — no crash and no fetch', async () => {
        global.fetch = jest.fn();
        await act(async () => { renderWidget(); });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('2. Load Templates button is disabled when WABA account ID is missing', async () => {
        global.fetch = jest.fn();
        await act(async () => {
            renderWidget({ storeId: 'store-abc', settings: {} });
        });
        const btn = screen.getAllByText(/Load Templates/)[0];
        expect(btn.closest('button')).toBeDisabled();
    });

    it('3. auto-fetches on mount when storeId and WABA account ID are set', async () => {
        global.fetch = makeFetch({ templates: MOCK_TEMPLATES });
        localStorage.setItem('access_token', 'tok');
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-bot/waba-templates?store_id=store-abc'),
            expect.any(Object)
        ));
    });

    it('4. shows error alert when API returns error field', async () => {
        global.fetch = makeFetch({ error: 'WABA not configured' });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await waitFor(() => expect(screen.getByText('WABA not configured')).toBeTruthy());
    });

    it('5. shows error alert on network error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await waitFor(() => expect(screen.getByText('Network down')).toBeTruthy());
    });

    it('6. populates dropdowns after successful fetch', async () => {
        global.fetch = makeFetch({ templates: MOCK_TEMPLATES });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await waitFor(() => {
            const options = screen.getAllByRole('option');
            const names = options.map(o => o.value);
            expect(names).toContain('rfq_to_supplier');
            expect(names).toContain('invoice_share_v2');
        });
    });

    it('7. shows text inputs (fallback) when no templates loaded', async () => {
        global.fetch = jest.fn();
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: {},
            });
        });
        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('8. calls onSettingsChange with waba_template_rfq_supplier when select changes', async () => {
        const onChange = jest.fn();
        global.fetch = makeFetch({ templates: MOCK_TEMPLATES });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
                onSettingsChange: onChange,
            });
        });
        await waitFor(() => screen.getAllByRole('combobox'));
        const selects = screen.getAllByRole('combobox');
        await act(async () => {
            fireEvent.change(selects[0], { target: { value: 'rfq_to_supplier' } });
        });
        expect(onChange).toHaveBeenCalledWith({ waba_template_rfq_supplier: 'rfq_to_supplier' });
    });

    it('9. calls onSettingsChange with waba_template_invoice_share when second select changes', async () => {
        const onChange = jest.fn();
        global.fetch = makeFetch({ templates: MOCK_TEMPLATES });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
                onSettingsChange: onChange,
            });
        });
        await waitFor(() => screen.getAllByRole('combobox'));
        const selects = screen.getAllByRole('combobox');
        await act(async () => {
            fireEvent.change(selects[1], { target: { value: 'invoice_share_v2' } });
        });
        expect(onChange).toHaveBeenCalledWith({ waba_template_invoice_share: 'invoice_share_v2' });
    });

    it('10. Load Templates button manually triggers fetch', async () => {
        global.fetch = makeFetch({ templates: [] });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const callsBefore = global.fetch.mock.calls.length;
        const btn = screen.getByRole('button', { name: /Load Templates/i });
        await act(async () => { btn.click(); });
        expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('11. pre-selected value is reflected in dropdown when templates are loaded', async () => {
        global.fetch = makeFetch({ templates: MOCK_TEMPLATES });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: {
                    bot_waba_business_account_id: 'waba-123',
                    waba_template_rfq_supplier: 'rfq_to_supplier',
                },
            });
        });
        await waitFor(() => {
            const selects = screen.getAllByRole('combobox');
            expect(selects[0].value).toBe('rfq_to_supplier');
        });
    });

    it('12. pre-selected value is reflected in text input (fallback mode)', async () => {
        global.fetch = jest.fn();
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { waba_template_rfq_supplier: 'my_template' },
            });
        });
        const inputs = screen.getAllByRole('textbox');
        expect(inputs[0].value).toBe('my_template');
    });
});
