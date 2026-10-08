/**
 * Tests for ProcurementEmailWidget multi-account support.
 *
 * Covers:
 *  1.  Renders without crashing (no accounts)
 *  2.  Fetches /v1/rfq-email/accounts on mount
 *  3.  Shows "Not Connected" badge when accounts list is empty
 *  4.  Shows account count badge when accounts are loaded
 *  5.  Shows "Add Account" button
 *  6.  Clicking "Add Account" shows the form
 *  7.  Clicking "Cancel" in form hides the form
 *  8.  Form shows provider dropdown
 *  9.  Selecting a provider (mailgun) shows credential fields
 * 10.  Connect button disabled when required creds are empty
 * 11.  Connect button enabled when required creds are filled
 * 12.  Successful connect (mailgun/webhook) adds account to list without OAuth popup
 * 13.  Disconnect button calls DELETE /v1/rfq-email/account/{id}
 * 14.  Removing last account emits onSettingsChange({ rfq_email_connected: false })
 * 15.  Adding first account emits onSettingsChange({ rfq_email_connected: true })
 * 16.  Does not crash when storeId is empty
 * 17.  Falls back to settings.rfq_email_accounts on fetch error
 * 18.  OAuth provider (gmail) returns oauth_url and enters oauth_wait phase
 * 19.  Shows error alert when connect request fails
 * 20.  Multiple accounts are all shown as cards
 */

import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProcurementEmailWidget from '../ProcurementEmailWidget';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('react-bootstrap', () => {
    const Spinner = () => <span data-testid="rb-spinner" />;
    const Badge = ({ children, bg }) => (
        <span data-testid={`badge-${bg}`}>{children}</span>
    );
    const Alert = ({ children }) => (
        <div data-testid="rb-alert">{children}</div>
    );
    return { Spinner, Badge, Alert };
});

jest.useFakeTimers();

// ── fetch helpers ─────────────────────────────────────────────────────────────

const makeAccountsFetch = (accounts = []) =>
    jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accounts }),
    });

beforeEach(() => {
    global.fetch = makeAccountsFetch([]);
    localStorage.setItem('access_token', 'test-token');
    global.open = jest.fn();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

function renderWidget(props = {}) {
    const defaults = {
        storeId: 'store-abc',
        settings: {},
        onSettingsChange: jest.fn(),
    };
    return render(<ProcurementEmailWidget {...defaults} {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ProcurementEmailWidget multi-account', () => {
    it('1. renders without crashing with no accounts', async () => {
        await act(async () => { renderWidget(); });
    });

    it('2. fetches /v1/rfq-email/accounts on mount', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/rfq-email/accounts'),
                expect.any(Object)
            )
        );
    });

    it('3. shows "Not Connected" badge when accounts list is empty', async () => {
        global.fetch = makeAccountsFetch([]);
        await act(async () => { renderWidget(); });
        await waitFor(() => expect(screen.getByTestId('badge-secondary')).toBeTruthy());
    });

    it('4. shows account count badge when accounts are loaded', async () => {
        global.fetch = makeAccountsFetch([
            { id: 'acc1', provider: 'gmail', email: 'a@g.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => expect(screen.queryAllByTestId('badge-success').length).toBeGreaterThan(0));
        // First badge in DOM order is the header count badge
        expect(screen.getAllByTestId('badge-success')[0].textContent).toMatch('1');
    });

    it('5. shows "Add Account" button', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Add Account/i })).toBeTruthy()
        );
    });

    it('6. clicking "Add Account" shows the form', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Add Account/i }));
        });
        expect(screen.getByText(/Email Service Provider/i)).toBeTruthy();
    });

    it('7. clicking "Cancel" in the form hides it', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Add Account/i }));
        });
        expect(screen.getByText(/Email Service Provider/i)).toBeTruthy();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
        });
        expect(screen.queryByText(/Email Service Provider/i)).toBeNull();
    });

    it('8. form shows provider dropdown', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Add Account/i }));
        });
        const select = screen.getByRole('combobox');
        expect(select).toBeTruthy();
        expect(select.innerHTML).toContain('Gmail');
    });

    it('9. selecting mailgun provider shows API Key and Domain fields', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Add Account/i }));
        });
        await act(async () => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } });
        });
        expect(screen.getByPlaceholderText(/key-xxx/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/mail\.yourdomain\.com/i)).toBeTruthy();
    });

    it('10. Connect button is disabled when required creds are empty', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        const connectBtn = screen.getByRole('button', { name: /^Connect$/i });
        expect(connectBtn).toBeDisabled();
    });

    it('11. Connect button enabled when required creds are filled (mailgun)', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'key-abc123' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'mail.example.com' } });
        });
        const connectBtn = screen.getByRole('button', { name: /^Connect$/i });
        expect(connectBtn).not.toBeDisabled();
    });

    it('12. successful connect (mailgun) adds account card without OAuth popup', async () => {
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            fetchCount++;
            if (url.includes('/accounts')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: [] }) });
            }
            if (url.includes('/account') && opts?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        account_id: 'new-acc-1',
                        connected: true,
                        email: 'webhook@mail.example.com',
                        webhook_url: 'https://api/v1/rfq-email/webhook?store_id=store-abc&account_id=new-acc-1',
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'key-abc' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'mail.ex.com' } });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
            await Promise.resolve();
            await Promise.resolve();
        });

        // No OAuth popup for webhook provider
        expect(global.open).not.toHaveBeenCalled();
        // Account should appear in list (success badge)
        await waitFor(() => expect(screen.queryAllByTestId('badge-success').length).toBeGreaterThan(0));
    });

    it('13. Disconnect calls DELETE /v1/rfq-email/account/{id}', async () => {
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        accounts: [{ id: 'acc-99', provider: 'mailgun', email: 'mg@ex.com' }],
                    }),
                });
            }
            if (url.includes('/account/acc-99') && opts?.method === 'DELETE') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /^Disconnect$/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Disconnect$/i }));
            await Promise.resolve();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/account/acc-99'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    it('14. removing last account calls onSettingsChange({ rfq_email_connected: false })', async () => {
        const onSettingsChange = jest.fn();
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        accounts: [{ id: 'acc-1', provider: 'mailgun', email: 'mg@ex.com' }],
                    }),
                });
            }
            if (opts?.method === 'DELETE') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget({ onSettingsChange }); });
        await waitFor(() => screen.getByRole('button', { name: /^Disconnect$/i }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Disconnect$/i }));
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(onSettingsChange).toHaveBeenCalledWith(
                expect.objectContaining({ rfq_email_connected: false })
            )
        );
    });

    it('15. adding first account calls onSettingsChange({ rfq_email_connected: true })', async () => {
        const onSettingsChange = jest.fn();
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts') && (!opts || opts.method !== 'POST')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: [] }) });
            }
            if (opts?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ account_id: 'a1', connected: true, email: 'mg@x.com' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget({ onSettingsChange }); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'k' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'd.com' } });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(onSettingsChange).toHaveBeenCalledWith(
                expect.objectContaining({ rfq_email_connected: true })
            )
        );
    });

    it('16. does not crash when storeId is empty', async () => {
        await act(async () => { renderWidget({ storeId: '' }); });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('17. falls back to settings.rfq_email_accounts on fetch error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
        const settings = {
            rfq_email_accounts: [{ id: 'fallback-1', provider: 'mailgun', email: 'mg@fb.com' }],
        };
        await act(async () => { renderWidget({ settings }); });
        await waitFor(() => expect(screen.queryAllByTestId('badge-success').length).toBeGreaterThan(0));
    });

    it('18. gmail provider returns oauth_url and opens popup', async () => {
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: [] }) });
            }
            if (opts?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        account_id: 'g-acc-1',
                        oauth_url: 'https://accounts.google.com/oauth?state=xyz',
                    }),
                });
            }
            // status poll — not yet connected
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ connected: false }) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gmail' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/apps\.googleusercontent\.com/i), { target: { value: 'my-client-id' } });
            fireEvent.change(screen.getByPlaceholderText(/GOCSPX/i), { target: { value: 'my-secret' } });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Save & Authorize/i }));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(global.open).toHaveBeenCalledWith(
            expect.stringContaining('accounts.google.com'),
            'rfq_email_oauth',
            expect.any(String)
        );
    });

    it('19. shows error alert when connect request fails', async () => {
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: [] }) });
            }
            if (opts?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Invalid API key' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'bad-key' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'd.com' } });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => expect(screen.queryByTestId('rb-alert')).toBeTruthy());
    });

    it('20. multiple accounts all show as cards', async () => {
        global.fetch = makeAccountsFetch([
            { id: 'a1', provider: 'gmail', email: 'g@g.com' },
            { id: 'a2', provider: 'zoho', email: 'z@z.com' },
            { id: 'a3', provider: 'mailgun', email: 'mg@x.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => {
            // 1 header count badge + 3 per-card email badges = 4 total
            expect(screen.queryAllByTestId('badge-success').length).toBeGreaterThanOrEqual(3);
        });
        // First badge in DOM order is the header count badge
        const allBadges = screen.getAllByTestId('badge-success');
        expect(allBadges[0].textContent).toContain('3');
    });
});

// ── type="button" guard — prevents buttons from submitting a parent <form> ───

describe('ProcurementEmailWidget button types', () => {
    it('21. "Add Account" button has type="button"', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        expect(screen.getByRole('button', { name: /Add Account/i })).toHaveAttribute('type', 'button');
    });

    it('22. Cancel button in AddAccountForm has type="button"', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        const cancelBtn = screen.getAllByRole('button', { name: /^Cancel$/i })[0];
        expect(cancelBtn).toHaveAttribute('type', 'button');
    });

    it('23. Show instructions toggle button has type="button"', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        const instructionsBtn = screen.getByRole('button', { name: /Show setup instructions/i });
        expect(instructionsBtn).toHaveAttribute('type', 'button');
    });

    it('24. Connect button has type="button"', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'key-abc' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'd.com' } });
        });
        expect(screen.getByRole('button', { name: /^Connect$/i })).toHaveAttribute('type', 'button');
    });

    it('25. Disconnect button has type="button"', async () => {
        global.fetch = makeAccountsFetch([
            { id: 'acc-x', provider: 'mailgun', email: 'mg@x.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /^Disconnect$/i }));
        expect(screen.getByRole('button', { name: /^Disconnect$/i })).toHaveAttribute('type', 'button');
    });

    it('26. no button inside the widget lacks type="button" (prevents form submit)', async () => {
        // Load with one connected account so all button types are rendered
        global.fetch = makeAccountsFetch([
            { id: 'acc-z', provider: 'mailgun', email: 'mg@z.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByRole('button', { name: /Add Account/i }));

        // Open the add-account form and pick a provider so all form buttons appear
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add Account/i })); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });

        const buttons = screen.getAllByRole('button');
        const bad = buttons.filter(b => b.getAttribute('type') !== 'button');
        if (bad.length > 0) {
            const names = bad.map(b => b.textContent.trim().slice(0, 40));
            throw new Error(`Buttons missing type="button": ${JSON.stringify(names)}`);
        }
    });
});

// ── Add Account button visibility — header placement regression tests ──────────

describe('ProcurementEmailWidget Add Account button visibility', () => {
    it('27. Add Account button is visible in header when no accounts exist', async () => {
        global.fetch = makeAccountsFetch([]);
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        expect(screen.getByTestId('add-account-btn')).toBeTruthy();
    });

    it('28. Add Account button is visible in header when 1 account is connected', async () => {
        global.fetch = makeAccountsFetch([
            { id: 'a1', provider: 'ses', email: 'x@aws.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        expect(screen.getByTestId('add-account-btn')).toBeTruthy();
    });

    it('29. Add Account button is visible in header when 2 accounts are connected', async () => {
        global.fetch = makeAccountsFetch([
            { id: 'a1', provider: 'ses', email: 'x@aws.com' },
            { id: 'a2', provider: 'mailgun', email: 'mg@x.com' },
        ]);
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        expect(screen.getByTestId('add-account-btn')).toBeTruthy();
    });

    it('30. Add Account button disappears while the add-form is open', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        await act(async () => {
            fireEvent.click(screen.getByTestId('add-account-btn'));
        });
        // Form is now open — button should not be in DOM
        expect(screen.queryByTestId('add-account-btn')).toBeNull();
    });

    it('31. Add Account button reappears after Cancel is clicked', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        await act(async () => { fireEvent.click(screen.getByTestId('add-account-btn')); });
        // Cancel the form
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
        });
        expect(screen.getByTestId('add-account-btn')).toBeTruthy();
    });

    it('32. Add Account button reappears after successful webhook connect', async () => {
        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/accounts') && !opts?.method) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ accounts: [] }) });
            }
            if (opts?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ account_id: 'new-1', connected: true, email: 'mg@x.com' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        await act(async () => { fireEvent.click(screen.getByTestId('add-account-btn')); });
        await act(async () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mailgun' } }); });
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText(/key-xxx/i), { target: { value: 'key-abc' } });
            fireEvent.change(screen.getByPlaceholderText(/mail\.yourdomain\.com/i), { target: { value: 'mail.x.com' } });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
            await Promise.resolve();
            await Promise.resolve();
        });

        // After connect, form closes and button returns to header
        await waitFor(() => expect(screen.getByTestId('add-account-btn')).toBeTruthy());
    });

    it('33. Add Account button has data-testid="add-account-btn"', async () => {
        await act(async () => { renderWidget(); });
        await waitFor(() => screen.getByTestId('add-account-btn'));
        const btn = screen.getByTestId('add-account-btn');
        expect(btn.getAttribute('data-testid')).toBe('add-account-btn');
        expect(btn).toHaveAttribute('type', 'button');
    });
});
