/**
 * Accessibility of the top bar (axe, role audit F001/F005): the store switcher
 * and user menu toggles are <span>s that react-bootstrap gives aria-expanded,
 * which a span without a role may not carry (aria-allowed-attr); and the
 * hamburger link (.sidebar-toggle) holds only an icon, so it has no name.
 * Uses the real react-bootstrap Dropdown so its ARIA attributes are rendered.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topbar from '../Topbar';

jest.mock('../components/LanguageSwitcher', () => () => null);
jest.mock('../utils/eventEmitter', () => ({
    __esModule: true,
    default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));
jest.mock('../i18n/config', () => ({ LANGUAGE_OPTIONS: [] }));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { changeLanguage: jest.fn(), language: 'en' } }),
}));

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'tok');
    localStorage.setItem('user_name', 'Owner');
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
        ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: [] }),
    }));
});

async function renderTopbar() {
    await act(async () => {
        render(<MemoryRouter><Topbar parentCallback={() => {}} /></MemoryRouter>);
    });
}

test('dropdown toggles that carry aria-expanded have role="button"', async () => {
    await renderTopbar();
    for (const id of ['store-switcher-toggle', 'user-menu-toggle']) {
        const el = document.getElementById(id);
        expect(el).not.toBeNull();
        expect(el.getAttribute('aria-expanded')).not.toBeNull();
        expect(el.getAttribute('role')).toBe('button');
    }
});

test('the sidebar toggle link has an accessible name', async () => {
    await renderTopbar();
    const link = document.querySelector('a.sidebar-toggle');
    expect(link).not.toBeNull();
    expect(link.getAttribute('aria-label')).toBeTruthy();
});
