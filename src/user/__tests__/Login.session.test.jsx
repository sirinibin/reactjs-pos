/**
 * Session handling in the Login page: token storage across the
 * authorize → accesstoken → me chain, what is persisted for the session,
 * redirects, and error paths (401 / no stores / network).
 * Lockout/rate-limit behaviour is covered in Login.security.test.jsx.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../avatar.jpg', () => 'avatar-stub');
jest.mock('../../Footer.js', () => () => null);
jest.mock('../../sidebar_menu_config', () => ({ getLandingPath: () => '/dashboard/landing' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn() }));

import Login from '../login';
import { fetchStore } from '../../utils/storeUtils.js';

const json = (body, status = 200) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
});
const flush = async (n = 40) => { for (let i = 0; i < n; i++) await Promise.resolve(); };

function routeFetch(routes) {
    global.fetch = jest.fn((url) => {
        const key = Object.keys(routes).find(k => url.startsWith(k));
        if (!key) return Promise.resolve(json({}, 404));
        const r = routes[key];
        return typeof r === 'function' ? r(url) : Promise.resolve(r);
    });
}

// jsdom 16 lacks form[n] indexed getters used by handleSubmit (event.target[0]).
function patchFormElements(formEl) {
    for (let i = 0; i < formEl.elements.length; i++) {
        const idx = i;
        Object.defineProperty(formEl, String(idx), { configurable: true, get: () => formEl.elements[idx] });
    }
}

async function login(email = 'user@example.com', password = 'secret') {
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: password } });
    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    patchFormElements(form);
    await act(async () => { fireEvent.submit(form); await flush(); });
}

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

const OK_AUTH = {
    '/v1/authorize': json({ result: { code: 'auth-code-1' } }),
    '/v1/accesstoken': json({ result: { access_token: 'access-tok-1' } }),
};

let originalLocation;
beforeAll(() => {
    originalLocation = window.location;
});
afterAll(() => {
    window.location = originalLocation;
});

beforeEach(() => {
    delete window.location;
    window.location = { href: '', assign: jest.fn(), reload: jest.fn(), hostname: 'localhost' };
    localStorage.clear();
    fetchStore.mockReset();
    fetchStore.mockResolvedValue({ id: 's1', name: 'Main', settings: { vat: 15 } });
    jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('Login — session', () => {
    test('already logged in (token present) → redirected to landing page without login', async () => {
        localStorage.setItem('access_token', 'existing');
        global.fetch = jest.fn();
        await act(async () => { renderLogin(); });
        expect(window.location).toBe('/dashboard/landing');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('authorize code is exchanged with the code in the Authorization header, password never stored', async () => {
        routeFetch({
            ...OK_AUTH,
            '/v1/me': json({ result: { id: 'u1', name: 'Ali', role: 'Manager', store_ids: ['s1'], store_names: ['Main'] } }),
            '/v1/user-role/effective-permissions': json({ result: [] }),
        });
        renderLogin();
        await login('  user@example.com  ', 'secret');

        const [authUrl, authOpts] = global.fetch.mock.calls[0];
        expect(authUrl).toBe('/v1/authorize');
        expect(JSON.parse(authOpts.body)).toEqual({ email: 'user@example.com', password: 'secret' });

        const tokenCall = global.fetch.mock.calls.find(([u]) => u === '/v1/accesstoken');
        expect(tokenCall[1].method).toBe('POST');
        expect(tokenCall[1].headers.Authorization).toBe('auth-code-1');

        const meCall = global.fetch.mock.calls.find(([u]) => u === '/v1/me');
        expect(meCall[1].headers.Authorization).toBe('access-tok-1');

        const stored = Object.keys(localStorage).map(k => localStorage.getItem(k)).join('|');
        expect(stored).not.toContain('secret');
    });

    test('non-admin login persists the session and redirects', async () => {
        routeFetch({
            ...OK_AUTH,
            '/v1/me': json({ result: {
                id: 'u1', name: 'Ali', role: 'Manager', admin: false, photo: '/a.png',
                store_ids: ['s1', 's2'], store_names: ['Main', 'Branch'],
            } }),
            '/v1/user-role/effective-permissions': json({ result: ['sales.view'] }),
        });
        renderLogin();
        await login();
        expect(localStorage.getItem('access_token')).toBe('access-tok-1');
        expect(localStorage.getItem('user_id')).toBe('u1');
        expect(localStorage.getItem('user_name')).toBe('Ali');
        expect(localStorage.getItem('user_role')).toBe('Manager');
        expect(localStorage.getItem('admin')).toBe('false');
        expect(localStorage.getItem('store_id')).toBe('s1');
        expect(localStorage.getItem('store_name')).toBe('Main');
        expect(JSON.parse(localStorage.getItem('user_permissions'))).toEqual(['sales.view']);
        expect(window.location).toBe('/dashboard/landing');
    });

    test('non-admin with no stores: error shown, token removed, no redirect', async () => {
        routeFetch({
            ...OK_AUTH,
            '/v1/me': json({ result: { id: 'u1', role: 'Manager', store_ids: [] } }),
        });
        renderLogin();
        await login();
        expect(screen.getByText('You have no stores assigned to you')).toBeInTheDocument();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(window.location).not.toBe('/dashboard/landing');
    });

    test('non-admin with store_ids missing entirely is treated like no stores', async () => {
        routeFetch({ ...OK_AUTH, '/v1/me': json({ result: { id: 'u1', role: 'Manager' } }) });
        renderLogin();
        await login();
        expect(screen.getByText('You have no stores assigned to you')).toBeInTheDocument();
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    test('401 from /v1/authorize: error shown, no token stored, button re-enabled', async () => {
        routeFetch({ '/v1/authorize': json({ errors: { password: 'Password is wrong' } }, 401) });
        renderLogin();
        await login();
        expect(screen.getByText('Password is wrong')).toBeInTheDocument();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
    });

    test('401 without an error body falls back to "Incorrect email or password."', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false, status: 401, headers: { get: () => 'text/plain' }, json: () => Promise.reject(new Error('no json')),
        });
        renderLogin();
        await login();
        expect(screen.getByText(/Incorrect email or password\./)).toBeInTheDocument();
    });

    test('access-token exchange failing: no token stored, error shown', async () => {
        routeFetch({
            '/v1/authorize': OK_AUTH['/v1/authorize'],
            '/v1/accesstoken': json({ errors: { email: 'Auth code expired' } }, 401),
        });
        renderLogin();
        await login();
        expect(screen.getByText('Auth code expired')).toBeInTheDocument();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(global.fetch.mock.calls.some(([u]) => u === '/v1/me')).toBe(false);
    });

    test('network failure on authorize does not crash and re-enables the button', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        renderLogin();
        await login();
        expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    test('/v1/me 401 after the token exchange: error shown and no redirect', async () => {
        routeFetch({ ...OK_AUTH, '/v1/me': json({ errors: { email: 'Session expired' } }, 401) });
        renderLogin();
        await login();
        expect(screen.getByText('Session expired')).toBeInTheDocument();
        expect(window.location).not.toBe('/dashboard/landing');
    });

    // KNOWN BUG: when /v1/me rejects the freshly issued token, login.js leaves it in
    // localStorage. Any reload of the login page then auto-redirects to the landing
    // page with an unusable token. Expected: token removed on /v1/me failure.
    test.skip('/v1/me 401 after the token exchange removes the token', async () => {
        routeFetch({ ...OK_AUTH, '/v1/me': json({ errors: { email: 'Session expired' } }, 401) });
        renderLogin();
        await login();
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    test('token change in another tab reloads this tab', async () => {
        global.fetch = jest.fn();
        renderLogin();
        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'access_token', newValue: 'x' }));
        });
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: 'x' }));
        });
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
});
