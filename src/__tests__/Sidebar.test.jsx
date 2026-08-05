import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Keep MemoryRouter real; replace Link with a plain anchor so href is inspectable.
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// react-i18next: t(key) returns key (matches global mock contract).
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

// Provide a small, controlled item list so tests are independent of real config.
const SIDEBAR_ITEMS = [
    {
        id: 'dashboard',
        resource: 'dashboard',
        path: '/dashboard/business-dashboard',
        icon: 'bi-speedometer2',
        label: 'Dashboard',
        visible: true,
    },
    {
        id: 'sales',
        resource: 'sales',
        path: '/dashboard/sales',
        icon: 'bi-receipt',
        label: 'Sales',
        visible: true,
    },
    {
        id: 'hidden_item',
        resource: 'hidden_item',
        path: '/dashboard/hidden',
        icon: 'bi-x',
        label: 'Hidden',
        visible: false,
    },
];

jest.mock('../sidebar_menu_config', () => ({
    loadSidebarConfig: jest.fn(),
}));

const { loadSidebarConfig } = require('../sidebar_menu_config');

// Stub fetch so async effects (getStore, fetchRbacPermissions) do not leak.
beforeEach(() => {
    localStorage.clear();
    // CRA's jest config sets resetMocks: true, which strips any
    // implementation set inside the jest.mock() factory before every test,
    // so it must be re-established here.
    loadSidebarConfig.mockReturnValue(SIDEBAR_ITEMS);
    global.fetch = jest.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({}) })
    );
});

afterEach(() => {
    jest.clearAllMocks();
});

const renderSidebar = (extraProps = {}) =>
    render(
        <MemoryRouter>
            <Sidebar
                isSidebarOpen=""
                parentCallback={jest.fn()}
                {...extraProps}
            />
        </MemoryRouter>
    );

describe('Sidebar', () => {
    it('1. renders without crashing inside MemoryRouter', () => {
        const { container } = renderSidebar();
        expect(container).toBeTruthy();
        expect(container.querySelector('nav#sidebar')).toBeInTheDocument();
    });

    it('2. renders navigation links for visible menu items', () => {
        renderSidebar();
        // Visible items: Dashboard + Sales + always-present Menu Settings link = 3
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThanOrEqual(3);
        // Dashboard and Sales links are present
        expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Sales/i })).toBeInTheDocument();
    });

    it('3. menu item labels are displayed; invisible items are hidden', () => {
        renderSidebar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
        // Always-present settings link at the bottom
        expect(screen.getByText('Menu Settings')).toBeInTheDocument();
        // Item with visible: false must not appear
        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('4. links have correct href paths', () => {
        renderSidebar();
        expect(
            screen.getByRole('link', { name: /Dashboard/i })
        ).toHaveAttribute('href', '/dashboard/business-dashboard');

        expect(
            screen.getByRole('link', { name: /Sales/i })
        ).toHaveAttribute('href', '/dashboard/sales');

        expect(
            screen.getByRole('link', { name: /Menu Settings/i })
        ).toHaveAttribute('href', '/dashboard/sidebar-settings');
    });

    it('5. active class is applied to the clicked item; other items are not active', () => {
        renderSidebar();

        const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
        const dashboardItem = dashboardLink.closest('li');
        const salesLink = screen.getByRole('link', { name: /Sales/i });
        const salesItem = salesLink.closest('li');

        // Nothing is active before any click
        expect(dashboardItem).not.toHaveClass('active');
        expect(salesItem).not.toHaveClass('active');

        // Click the Dashboard li (where onClick lives)
        fireEvent.click(dashboardItem);

        expect(dashboardItem).toHaveClass('active');
        expect(salesItem).not.toHaveClass('active');

        // Switch active to Sales
        fireEvent.click(salesItem);

        expect(salesItem).toHaveClass('active');
        expect(dashboardItem).not.toHaveClass('active');
    });
});
