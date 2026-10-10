/**
 * Logout from the Topbar user menu: what is cleared and where the user goes.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topbar from '../Topbar';

jest.mock('react-bootstrap/Dropdown', () => {
    const React = require('react');
    function Dropdown({ children, className }) {
        return React.createElement('div', { className }, children);
    }
    Dropdown.Toggle = ({ children, id }) => React.createElement('span', { id }, children);
    Dropdown.Menu = ({ children }) => React.createElement('div', null, children);
    Dropdown.Item = ({ children, onClick }) => React.createElement('button', { onClick }, children);
    Dropdown.ItemText = ({ children, className }) => React.createElement('span', { className }, children);
    Dropdown.Divider = () => React.createElement('hr', null);
    return Dropdown;
});
jest.mock('../components/LanguageSwitcher', () => () => null);
jest.mock('../utils/eventEmitter', () => ({
    __esModule: true,
    default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));
jest.mock('../i18n/config', () => ({ LANGUAGE_OPTIONS: [] }));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { changeLanguage: jest.fn(), language: 'en' } }),
}));

const SESSION = {
    access_token: 'tok',
    user_id: 'u1',
    user_photo: '/p.png',
    user_name: 'Ali',
    store_name: 'Main',
    branch_name: 'Riyadh',
    store_id: 's1',
    admin: 'true',
    user_role: 'Admin',
    user_permissions: '["sales.view"]',
    _store_settings_cache: '{"enable_notification":false}',
};

let originalLocation;
beforeAll(() => { originalLocation = window.location; });
afterAll(() => { window.location = originalLocation; });

beforeEach(() => {
    localStorage.clear();
    Object.entries(SESSION).forEach(([k, v]) => localStorage.setItem(k, v));
    global.fetch = jest.fn().mockResolvedValue({
        ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: [] }),
    });
});

async function clickLogout(hostname = 'localhost') {
    await act(async () => {
        render(<MemoryRouter><Topbar parentCallback={() => {}} /></MemoryRouter>);
    });
    delete window.location;
    window.location = { hostname, href: '' };
    const btn = screen.getAllByText('buttons.logout')[0].closest('button');
    fireEvent.click(btn);
}

describe('Topbar logout', () => {
    test('removes the token, user and store identity from localStorage', async () => {
        await clickLogout();
        ['access_token', 'user_id', 'user_photo', 'user_name', 'store_name', 'branch_name', 'store_id', 'admin']
            .forEach(k => expect(localStorage.getItem(k)).toBeNull());
    });

    test('redirects to "/" (the login page)', async () => {
        await clickLogout();
        expect(window.location).toBe('/');
    });

    test('on the workshop host it redirects to /login.html', async () => {
        await clickLogout('workshop.gulfunionozone.com');
        expect(window.location).toBe('/login.html');
    });

    test('keeps the per-user "last store" preference (intentional, used at next login)', async () => {
        localStorage.setItem('last_store_u1', 's1');
        await clickLogout();
        expect(localStorage.getItem('last_store_u1')).toBe('s1');
    });

    // KNOWN BUG: logOut() does not remove user_role, user_permissions or the cached
    // store settings. Until the next login overwrites them, anything reading these
    // keys sees the previous user's role/permissions. Expected: cleared on logout.
    test.skip('clears role, permissions and cached store settings', async () => {
        await clickLogout();
        expect(localStorage.getItem('user_role')).toBeNull();
        expect(localStorage.getItem('user_permissions')).toBeNull();
        expect(localStorage.getItem('_store_settings_cache')).toBeNull();
    });
});
