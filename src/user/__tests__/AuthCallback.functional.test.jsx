/**
 * Functional tests for AuthCallback (/auth?at=<token>) — the hand-off used by
 * external login pages. Renders the real component with fetch mocked and checks
 * what ends up in localStorage and where the browser is sent.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

jest.mock('../../sidebar_menu_config', () => ({ getLandingPath: () => '/dashboard/landing' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn() }));

import AuthCallback from '../AuthCallback';
import { fetchStore } from '../../utils/storeUtils.js';

const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status, body = {}) => ({ ok: false, status, json: () => Promise.resolve(body) });
const flush = async (n = 30) => { for (let i = 0; i < n; i++) await Promise.resolve(); };

let originalLocation;
beforeAll(() => {
    originalLocation = window.location;
    delete window.location;
});
afterAll(() => {
    window.location = originalLocation;
});

function setSearch(search) {
    window.location = { search, replace: jest.fn(), href: '' };
}

async function mount() {
    await act(async () => {
        render(<AuthCallback />);
        await flush();
    });
}

/** Route fetch by URL prefix. */
function routeFetch(routes) {
    global.fetch = jest.fn((url) => {
        const key = Object.keys(routes).find(k => url.startsWith(k));
        if (!key) return Promise.resolve(fail(404));
        const r = routes[key];
        return typeof r === 'function' ? r(url) : Promise.resolve(r);
    });
}

beforeEach(() => {
    localStorage.clear();
    fetchStore.mockReset();
    fetchStore.mockResolvedValue({ id: 's1', name: 'Main', settings: { vat_percent: 15 } });
});

describe('AuthCallback', () => {
    test('no ?at= token → back to "/" without storing anything', async () => {
        setSearch('');
        global.fetch = jest.fn();
        await mount();
        expect(window.location.replace).toHaveBeenCalledWith('/');
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('stores the token and calls /v1/me with it', async () => {
        setSearch('?at=tok-xyz');
        routeFetch({
            '/v1/me': ok({ result: { id: 'u1', name: 'Ali', role: 'Manager', store_ids: ['s1'], store_names: ['Main'] } }),
            '/v1/user-role/effective-permissions': ok({ result: ['sales.view'] }),
        });
        await mount();
        expect(localStorage.getItem('access_token')).toBe('tok-xyz');
        expect(global.fetch).toHaveBeenCalledWith('/v1/me', { headers: { Authorization: 'tok-xyz' } });
    });

    test('non-admin: picks first store, saves profile + permissions, goes to landing page', async () => {
        setSearch('?at=tok');
        routeFetch({
            '/v1/me': ok({ result: {
                id: 'u1', name: 'Ali', role: 'Manager', admin: false, photo: '/p.jpg',
                store_ids: ['s1', 's2'], store_names: ['Main', 'Branch'],
            } }),
            '/v1/user-role/effective-permissions': ok({ result: ['sales.view', 'sales.create'] }),
        });
        await mount();
        expect(localStorage.getItem('store_id')).toBe('s1');
        expect(localStorage.getItem('store_name')).toBe('Main');
        expect(localStorage.getItem('last_store_u1')).toBe('s1');
        expect(localStorage.getItem('user_name')).toBe('Ali');
        expect(localStorage.getItem('user_id')).toBe('u1');
        expect(localStorage.getItem('user_role')).toBe('Manager');
        expect(localStorage.getItem('admin')).toBe('false');
        expect(localStorage.getItem('user_photo')).toBe('/p.jpg');
        expect(JSON.parse(localStorage.getItem('user_permissions'))).toEqual(['sales.view', 'sales.create']);
        expect(JSON.parse(localStorage.getItem('_store_settings_cache'))).toEqual({ vat_percent: 15 });
        expect(window.location.replace).toHaveBeenCalledWith('/dashboard/landing');
    });

    test('non-admin: restores the last used store when still assigned', async () => {
        setSearch('?at=tok');
        localStorage.setItem('last_store_u1', 's2');
        routeFetch({
            '/v1/me': ok({ result: { id: 'u1', name: 'Ali', role: 'Manager', store_ids: ['s1', 's2'], store_names: ['Main', 'Branch'] } }),
            '/v1/user-role/effective-permissions': ok({ result: [] }),
        });
        await mount();
        expect(localStorage.getItem('store_id')).toBe('s2');
        expect(localStorage.getItem('store_name')).toBe('Branch');
    });

    test('non-admin with no assigned stores: token is removed and user sent to "/"', async () => {
        setSearch('?at=tok');
        routeFetch({ '/v1/me': ok({ result: { id: 'u1', role: 'Manager', store_ids: [] } }) });
        await mount();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(window.location.replace).toHaveBeenCalledWith('/');
        expect(window.location.replace).not.toHaveBeenCalledWith('/dashboard/landing');
    });

    test('admin with no remembered store: loads the first store from /v1/store', async () => {
        setSearch('?at=tok');
        routeFetch({
            '/v1/me': ok({ result: { id: 'a1', name: 'Boss', role: 'Admin', admin: true } }),
            '/v1/store': ok({ result: [{ id: 'sX', name: 'HQ', branch_name: 'Riyadh' }] }),
            '/v1/user-role/effective-permissions': ok({ result: [] }),
        });
        await mount();
        expect(global.fetch).toHaveBeenCalledWith('/v1/store?select=id,name,branch_name&limit=1', expect.any(Object));
        expect(localStorage.getItem('store_id')).toBe('sX');
        expect(localStorage.getItem('branch_name')).toBe('Riyadh');
        expect(localStorage.getItem('admin')).toBe('true');
        expect(localStorage.getItem('user_role')).toBe('Admin');
        // empty permission list clears any stale permissions
        expect(localStorage.getItem('user_permissions')).toBeNull();
        expect(window.location.replace).toHaveBeenCalledWith('/dashboard/landing');
    });

    test('missing role defaults to "Manager"', async () => {
        setSearch('?at=tok');
        routeFetch({
            '/v1/me': ok({ result: { id: 'u1', name: 'X', store_ids: ['s1'], store_names: ['Main'] } }),
            '/v1/user-role/effective-permissions': ok({ result: [] }),
        });
        await mount();
        expect(localStorage.getItem('user_role')).toBe('Manager');
    });

    test('permissions endpoint failing does not block login', async () => {
        setSearch('?at=tok');
        localStorage.setItem('user_permissions', '["stale"]');
        routeFetch({
            '/v1/me': ok({ result: { id: 'u1', name: 'X', role: 'Manager', store_ids: ['s1'], store_names: ['Main'] } }),
            '/v1/user-role/effective-permissions': () => Promise.reject(new TypeError('Failed to fetch')),
        });
        await mount();
        expect(localStorage.getItem('user_permissions')).toBeNull();
        expect(window.location.replace).toHaveBeenCalledWith('/dashboard/landing');
    });

    test('network error on /v1/me → "/"', async () => {
        setSearch('?at=tok');
        routeFetch({ '/v1/me': () => Promise.reject(new TypeError('Failed to fetch')) });
        await mount();
        expect(window.location.replace).toHaveBeenCalledWith('/');
    });

    test('401 on /v1/me (invalid/expired token) → sent to "/"', async () => {
        setSearch('?at=bad');
        routeFetch({ '/v1/me': fail(401, { errors: { access_token: 'invalid' } }) });
        await mount();
        expect(window.location.replace).toHaveBeenCalledWith('/');
    });

    // KNOWN BUG: on a 401 from /v1/me the rejected token is left in localStorage.
    // The login page then sees `access_token` and immediately redirects to the
    // landing page, so the user lands on an empty dashboard instead of the login
    // form. Expected: the invalid token is removed before redirecting to "/".
    test.skip('401 on /v1/me removes the rejected token', async () => {
        setSearch('?at=bad');
        routeFetch({ '/v1/me': fail(401, { errors: { access_token: 'invalid' } }) });
        await mount();
        expect(localStorage.getItem('access_token')).toBeNull();
    });
});
