// Security tests for the Login component — brute-force lockout and rate limiting.
// Covers: failed-attempt counting, lockout triggering, countdown display,
// remaining-attempts hint, 429 handling, success-clears-lockout.

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../avatar.jpg', () => 'avatar-stub');
jest.mock('../../Footer.js', () => () => null);
jest.mock('../../sidebar_menu_config', () => ({ getLandingPath: () => '/dashboard' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn() }));

import Login from '../login';

jest.useFakeTimers();

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeOkResponse  = (body) => ({
    ok: true, status: 200,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
});
const makeErrResponse = (errors, status = 401) => ({
    ok: false, status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ errors }),
});
const make429Response = () => ({
    ok: false, status: 429,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ errors: { rate_limit: 'Too many requests.' } }),
});

const drainPromises = async (rounds = 15) => {
    for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const patchFormElements = (formEl) => {
    for (let i = 0; i < formEl.elements.length; i++) {
        const idx = i;
        Object.defineProperty(formEl, String(idx), {
            configurable: true,
            get: () => formEl.elements[idx],
        });
    }
};

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

// ── lockoutKey must match the implementation exactly ──────────────────────────
const lockoutKey = (email) => 'pos_login_lock_' + email.toLowerCase().trim();
const TEST_EMAIL = 'user@example.com';
const LOCKOUT_LIMIT   = 5;
const LOCKOUT_SECONDS = 15 * 60;

/** Pre-seed localStorage as if N login failures already happened. */
function seedFailures(email, failures, locked = false) {
    const lockedUntil = locked ? Date.now() + LOCKOUT_SECONDS * 1000 : 0;
    localStorage.setItem(lockoutKey(email), JSON.stringify({ failures, lockedUntil }));
}

/** Perform one login attempt through the rendered form. */
async function submitLogin(email = TEST_EMAIL, password = 'wrong') {
    fireEvent.change(screen.getByPlaceholderText('Enter your email'),    { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: password } });
    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    patchFormElements(form);
    await act(async () => {
        fireEvent.submit(form);
        await drainPromises();
    });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
    delete window.location;
    window.location = { href: '', assign: jest.fn(), reload: jest.fn() };
});

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
    global.fetch = jest.fn().mockResolvedValue(makeErrResponse({ email: 'Invalid credentials' }));
});

afterEach(() => jest.clearAllTimers());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login — brute-force lockout', () => {

    it('1. first failed attempt records failure count in localStorage', async () => {
        renderLogin();
        await submitLogin();

        const stored = JSON.parse(localStorage.getItem(lockoutKey(TEST_EMAIL)));
        expect(stored.failures).toBe(1);
        expect(stored.lockedUntil).toBe(0);  // not locked yet
    });

    it('2. each failed attempt increments the failure counter', async () => {
        renderLogin();
        await submitLogin();
        await submitLogin();
        await submitLogin();

        const stored = JSON.parse(localStorage.getItem(lockoutKey(TEST_EMAIL)));
        expect(stored.failures).toBe(3);
    });

    it('3. remaining-attempts hint is shown before lockout', async () => {
        // Seed 3 failures so next failure = 4, leaving 1 remaining.
        seedFailures(TEST_EMAIL, 3);

        // Return null errors so the component builds its own fallback message
        // with the remaining-attempts hint. (An empty {} is truthy and would
        // suppress the fallback — use null so the || branch fires.)
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false, status: 401,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ errors: null }),
        });

        renderLogin();
        await submitLogin();

        // After 4th failure → "1 attempt left" hint in email error span.
        expect(screen.getByText(/1 attempt.*left/i)).toBeInTheDocument();
    });

    it('4. 5th consecutive failure triggers lockout', async () => {
        // Pre-seed 4 failures, submit one more.
        seedFailures(TEST_EMAIL, 4);
        renderLogin();
        await submitLogin();

        const stored = JSON.parse(localStorage.getItem(lockoutKey(TEST_EMAIL)));
        expect(stored.failures).toBe(5);
        expect(stored.lockedUntil).toBeGreaterThan(Date.now());
    });

    it('5. lockout shows countdown banner after threshold exceeded', async () => {
        seedFailures(TEST_EMAIL, 4);
        renderLogin();
        await submitLogin();

        expect(await screen.findByText(/too many failed attempts/i)).toBeInTheDocument();
        expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('6. inputs and submit button are disabled during lockout', async () => {
        seedFailures(TEST_EMAIL, 4);
        renderLogin();
        await submitLogin();

        await screen.findByText(/too many failed attempts/i);

        expect(screen.getByPlaceholderText('Enter your email')).toBeDisabled();
        expect(screen.getByPlaceholderText('Enter your password')).toBeDisabled();
        expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    });

    it('7. already-locked localStorage state shows lockout immediately on render', async () => {
        seedFailures(TEST_EMAIL, 5, true);   // full lockout pre-seeded
        renderLogin();

        // Simulate the email autofill so the component reads localStorage.
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
                target: { value: TEST_EMAIL },
            });
            await drainPromises();
        });

        // Attempting to submit should trigger setLockoutUntil from localStorage.
        const form = screen.getByRole('button', { name: /login/i }).closest('form');
        patchFormElements(form);
        await act(async () => {
            fireEvent.submit(form);
            await drainPromises();
        });

        // fetch should NOT have been called (blocked before network call).
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('8. lockout does not affect a different email address', async () => {
        seedFailures(TEST_EMAIL, 5, true);
        renderLogin();

        const other = 'other@example.com';
        await submitLogin(other);

        // The other email should have been attempted (fetch called).
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            '/v1/authorize',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('9. countdown timer shows MM:SS format on lockout', async () => {
        seedFailures(TEST_EMAIL, 4);
        renderLogin();
        await submitLogin();

        await screen.findByText(/too many failed attempts/i);

        // The countdown <strong> element should show a valid MM:SS value.
        const timerEl = screen.getByText(/\d{2}:\d{2}/);
        expect(timerEl).toBeInTheDocument();
        // Should be close to 15:00 (the full lockout window).
        expect(timerEl.textContent).toMatch(/^15:/);
    });

    it('10. successful login clears the lockout record', async () => {
        seedFailures(TEST_EMAIL, 3);   // 3 prior failures, not locked

        global.fetch = jest.fn()
            .mockResolvedValueOnce(makeOkResponse({ result: { code: 'authcode' } }))
            .mockResolvedValueOnce(makeOkResponse({ result: { access_token: 'tok' } }))
            .mockResolvedValueOnce(makeOkResponse({
                result: { role: 'Manager', id: 'u1', name: 'Test', admin: false, store_ids: ['s1'], store_names: ['Shop'] },
            }))
            .mockResolvedValue(makeOkResponse({ result: [] }));

        renderLogin();
        await submitLogin(TEST_EMAIL, 'correctpassword');

        // Lockout key should have been removed.
        expect(localStorage.getItem(lockoutKey(TEST_EMAIL))).toBeNull();
    });
});

describe('Login — HTTP 429 rate limit response', () => {

    it('11. 429 from /v1/authorize shows network rate-limit message', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce(make429Response());
        renderLogin();
        await submitLogin();

        expect(screen.getByText(/too many login attempts from your network/i)).toBeInTheDocument();
    });

    it('12. 429 response does not increment the local failure counter', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce(make429Response());
        renderLogin();
        await submitLogin();

        const stored = localStorage.getItem(lockoutKey(TEST_EMAIL));
        // No local lockout entry should exist (429 is a server-side limit, not counted locally).
        expect(stored).toBeNull();
    });

    it('13. submit button re-enabled after 429 so user can retry', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce(make429Response());
        renderLogin();
        await submitLogin();

        expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
    });
});

describe('Login — lockout key isolation', () => {

    it('14. lockout key is case-insensitive for email', async () => {
        // Seed lockout for lower-case email.
        seedFailures('user@example.com', 5, true);

        renderLogin();

        // Submit with UPPER-CASE — should hit the same lockout entry.
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
                target: { value: 'USER@EXAMPLE.COM' },
            });
            const form = screen.getByRole('button', { name: /login/i }).closest('form');
            patchFormElements(form);
            fireEvent.submit(form);
            await drainPromises();
        });

        // Blocked before fetch.
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
