/**
 * Integration: the ERP shell — menu built from the store's flags and the
 * user's Menu Settings, group collapse, menu search, Ctrl+K navigation,
 * mobile drawer and the footer credit.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import AppShell from '../../shell/AppShell';

jest.mock('../../../Topbar', () => function TopbarMock(props) {
    return <div data-testid="legacy-topbar">{props.centerSlot}</div>;
});

let storeSettings;
const server = setupServer(
    rest.get('/v1/store/:id', (req, res, ctx) => res(ctx.json({ status: true, result: { id: req.params.id, name: 'Main Store', settings: storeSettings } }))),
    rest.get('/v1/user-role/effective-permissions', (req, res, ctx) => res(ctx.json({ status: true, result: [{ resource: 'sales', read: true }] }))),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'tok');
    localStorage.setItem('store_id', 's1');
    localStorage.setItem('user_role', 'Admin');
    storeSettings = {};
});

function renderShell(path = '/dashboard/sales') {
    let location;
    const utils = render(
        <MemoryRouter initialEntries={[path]}>
            <AppShell><div>page body</div></AppShell>
            <Route path="*" render={({ location: l }) => { location = l; return null; }} />
        </MemoryRouter>
    );
    return { ...utils, getPath: () => location.pathname };
}

it('renders the page inside the shell with nav, header slot and footer credit', async () => {
    renderShell();
    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(within(screen.getByTestId('legacy-topbar')).getByRole('button', { name: 'Search menus' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ai.gulfunionozone.com' })).toHaveAttribute('href', 'https://ai.gulfunionozone.com/');
    expect(screen.getByText(/An AI & Software Wing of Gulf Union Ozone/)).toBeInTheDocument();
    expect(await screen.findByText('Main Store')).toBeInTheDocument();
});

it('marks the current page in the menu', () => {
    renderShell('/dashboard/salesreturn');
    expect(screen.getByRole('link', { name: 'Sales Returns' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sales' })).not.toHaveAttribute('aria-current');
});

it('shows feature modules only after the store enables them', async () => {
    renderShell();
    expect(screen.queryByRole('link', { name: 'Vehicles' })).toBeNull();
    storeSettings = { enable_automobile_module: true };
    window.dispatchEvent(new StorageEvent('storage', { key: 'store_settings_updated' }));
    expect(await screen.findByRole('link', { name: 'Vehicles' })).toBeInTheDocument();
    // workshop group leads when the automobile module is on
    const groups = screen.getAllByRole('button', { expanded: true }).map(b => b.textContent);
    expect(groups[0]).toBe('Workshop');
});

it('hides menus switched off in Menu Settings and reacts to changes from other tabs', async () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument();
    localStorage.setItem('sidebar_config', JSON.stringify([{ id: 'customers', visible: false }]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'sidebar_config' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Customers' })).toBeNull());
});

it('collapses a group and remembers it, but never hides the active page', () => {
    const { unmount } = renderShell('/dashboard/products');
    fireEvent.click(screen.getByRole('button', { name: 'Purchasing' }));
    expect(screen.queryByRole('link', { name: 'Purchases' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument();
    unmount();
    renderShell('/dashboard/products');
    expect(screen.queryByRole('link', { name: 'Purchases' })).toBeNull();
});

it('filters the menu by name', () => {
    renderShell();
    fireEvent.change(screen.getByLabelText('Find a menu…'), { target: { value: 'return' } });
    expect(screen.getByRole('link', { name: 'Sales Returns' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Purchase Returns' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Customers' })).toBeNull();
});

it('Ctrl+K opens the command palette and Enter navigates to the top match', () => {
    const { getPath } = renderShell();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'vendors' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getPath()).toBe('/dashboard/vendors');
    expect(screen.queryByRole('combobox')).toBeNull();
});

it('command palette supports arrow keys, Escape and no-results', () => {
    const { getPath } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Search menus' }));
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'returns' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const selected = screen.getAllByRole('option').find(o => o.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveTextContent(/Purchase Returns|Sales Returns/);
    fireEvent.change(input, { target: { value: 'qqqq' } });
    expect(screen.getByText('No matching menus')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(getPath()).toBe('/dashboard/sales');
});

it('non-admins with RBAC only see what they can read', async () => {
    localStorage.setItem('user_role', 'Manager');
    storeSettings = { enable_rbac_module: true };
    renderShell();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Customers' })).toBeNull(), { timeout: 4000 });
    expect(screen.getByRole('link', { name: 'Sales' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('user_permissions'))).toEqual([{ resource: 'sales', read: true }]);
});

it('toggle collapses the desktop nav to a rail and remembers it', () => {
    const { container } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(container.querySelector('.erp-shell')).toHaveClass('is-nav-collapsed');
    expect(localStorage.getItem('erp_nav_rail')).toBe('1');
});

it('on narrow screens the toggle opens a drawer that closes on navigation', () => {
    const width = window.innerWidth;
    window.innerWidth = 500;
    const { container } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(container.querySelector('.erp-shell')).toHaveClass('is-nav-open');
    fireEvent.click(screen.getByRole('link', { name: 'Customers' }));
    expect(container.querySelector('.erp-shell')).not.toHaveClass('is-nav-open');
    window.innerWidth = width;
});
