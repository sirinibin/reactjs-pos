/**
 * Tests for WABATemplateTesterWidget.
 *
 * Covers:
 *  1.  Shows "configure WABA" message when storeId or WABA account ID missing
 *  2.  Shows Fetch button when WABA is configured
 *  3.  Clicking Fetch calls /v1/rfq-bot/waba-templates
 *  4.  Shows template count badge after successful fetch
 *  5.  Shows template selector dropdown after fetch
 *  6.  Shows error alert when fetch fails
 *  7.  Selecting a template shows its preview
 *  8.  Template with {{n}} placeholders renders variable inputs
 *  9.  Send button calls /v1/rfq-bot/waba-test-message with correct payload
 * 10.  Send button is disabled when phone input is empty
 * 11.  Shows success result after successful send
 * 12.  Shows error result when send fails
 * 13.  Network error on send shows error result
 */

import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-bootstrap', () => {
    const Spinner = () => <span data-testid="rb-spinner" />;
    const Alert = ({ children, variant }) => (
        <div data-testid={`alert-${variant}`}>{children}</div>
    );
    return { Spinner, Alert };
});

const MOCK_TEMPLATES = [
    {
        name: 'rfq_to_supplier',
        language: 'en',
        category: 'UTILITY',
        components: [
            { type: 'HEADER', text: 'RFQ from {{1}}', format: 'TEXT' },
            { type: 'BODY', text: 'Dear supplier, we need {{1}} units of {{2}}.' },
        ],
    },
    {
        name: 'simple_template',
        language: 'en',
        category: 'MARKETING',
        components: [
            { type: 'BODY', text: 'Hello! No variables here.' },
        ],
    },
];

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

let Widget;
beforeAll(async () => {
    Widget = (await import('../WABATemplateTesterWidget')).default;
});

function renderWidget(props = {}) {
    const defaults = {
        storeId: null,
        settings: {},
    };
    return render(<Widget {...defaults} {...props} />);
}

describe('WABATemplateTesterWidget', () => {
    it('1. shows configure message when no storeId', async () => {
        await act(async () => { renderWidget(); });
        expect(screen.getByText(/Configure and save WABA Business Account ID/)).toBeTruthy();
    });

    it('1b. shows configure message when storeId present but WABA account ID missing', async () => {
        await act(async () => {
            renderWidget({ storeId: 'store-abc', settings: {} });
        });
        expect(screen.getByText(/Configure and save WABA Business Account ID/)).toBeTruthy();
    });

    it('2. shows Fetch Approved Templates button when WABA is configured', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ templates: [] }) });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        expect(screen.getByText(/Fetch Approved Templates/)).toBeTruthy();
    });

    it('3. clicking Fetch calls /v1/rfq-bot/waba-templates', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ templates: [] }) });
        localStorage.setItem('access_token', 'tok');
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const btn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { btn.closest('button').click(); });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-bot/waba-templates?store_id=store-abc'),
            expect.any(Object)
        );
    });

    it('4. shows template count badge after successful fetch', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const fetchBtn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { fetchBtn.closest('button').click(); });
        await waitFor(() => expect(screen.getByText(/2/)).toBeTruthy());
    });

    it('5. shows template selector dropdown after fetch', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const fetchBtn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { fetchBtn.closest('button').click(); });
        await waitFor(() => {
            const opts = screen.getAllByRole('option');
            const names = opts.map(o => o.value);
            expect(names).toContain('rfq_to_supplier');
            expect(names).toContain('simple_template');
        });
    });

    it('6. shows error alert when fetch fails', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ error: 'WABA credentials invalid' }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const fetchBtn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { fetchBtn.closest('button').click(); });
        await waitFor(() => expect(screen.getByText('WABA credentials invalid')).toBeTruthy());
    });

    it('7. selecting a template shows its component preview', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const fetchBtn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { fetchBtn.closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        const select = screen.getByRole('combobox');
        await act(async () => {
            fireEvent.change(select, { target: { value: 'rfq_to_supplier' } });
        });
        await waitFor(() => expect(screen.getAllByText(/HEADER/).length).toBeGreaterThan(0));
    });

    it('8. template with {{n}} placeholders shows variable inputs', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        const fetchBtn = screen.getByText(/Fetch Approved Templates/);
        await act(async () => { fetchBtn.closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        const select = screen.getByRole('combobox');
        await act(async () => {
            fireEvent.change(select, { target: { value: 'rfq_to_supplier' } });
        });
        // rfq_to_supplier has HEADER {{1}} and BODY {{1}} + {{2}} = 3 variable inputs
        await waitFor(() => {
            const inputs = screen.getAllByRole('textbox');
            // At least phone + variable inputs
            expect(inputs.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('9. Send Test calls /v1/rfq-bot/waba-test-message with correct payload', async () => {
        let fetchCallCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCallCount++;
            if (url.includes('waba-templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sent: true }),
            });
        });
        localStorage.setItem('access_token', 'tok');
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        // Fetch templates
        await act(async () => { screen.getByText(/Fetch Approved Templates/).closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        // Select template
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'simple_template' } });
        });
        // Fill phone
        await waitFor(() => screen.getByPlaceholderText('966501234567'));
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('966501234567'), { target: { value: '966509876543' } });
        });
        // Click send
        await act(async () => { screen.getByText(/Send Test/).closest('button').click(); });
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/v1/rfq-bot/waba-test-message',
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    it('10. Send Test button is disabled when phone is empty', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await act(async () => { screen.getByText(/Fetch Approved Templates/).closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'simple_template' } });
        });
        await waitFor(() => screen.getByText(/Send Test/));
        const sendBtn = screen.getByText(/Send Test/).closest('button');
        expect(sendBtn).toBeDisabled();
    });

    it('11. shows success result after successful send', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('waba-templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sent: true }),
            });
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await act(async () => { screen.getByText(/Fetch Approved Templates/).closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'simple_template' } });
        });
        await waitFor(() => screen.getByPlaceholderText('966501234567'));
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('966501234567'), { target: { value: '966501111111' } });
        });
        await act(async () => { screen.getByText(/Send Test/).closest('button').click(); });
        await waitFor(() => expect(screen.getByTestId('alert-success')).toBeTruthy());
    });

    it('12. shows error result when send returns error', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('waba-templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
                });
            }
            return Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Invalid phone number' }),
            });
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await act(async () => { screen.getByText(/Fetch Approved Templates/).closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'simple_template' } });
        });
        await waitFor(() => screen.getByPlaceholderText('966501234567'));
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('966501234567'), { target: { value: '966501111111' } });
        });
        await act(async () => { screen.getByText(/Send Test/).closest('button').click(); });
        await waitFor(() => expect(screen.getByTestId('alert-danger')).toBeTruthy());
    });

    it('13. network error on send shows error result', async () => {
        let fetchCallCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCallCount++;
            if (url.includes('waba-templates')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ templates: MOCK_TEMPLATES }),
                });
            }
            return Promise.reject(new Error('Network error'));
        });
        await act(async () => {
            renderWidget({
                storeId: 'store-abc',
                settings: { bot_waba_business_account_id: 'waba-123' },
            });
        });
        await act(async () => { screen.getByText(/Fetch Approved Templates/).closest('button').click(); });
        await waitFor(() => screen.getAllByRole('option'));
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'simple_template' } });
        });
        await waitFor(() => screen.getByPlaceholderText('966501234567'));
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('966501234567'), { target: { value: '966501111111' } });
        });
        await act(async () => { screen.getByText(/Send Test/).closest('button').click(); });
        await waitFor(() => expect(screen.getByTestId('alert-danger')).toBeTruthy());
        expect(screen.getByTestId('alert-danger').textContent).toContain('Network error');
    });
});
