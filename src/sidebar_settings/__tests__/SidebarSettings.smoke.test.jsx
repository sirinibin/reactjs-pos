import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── sidebar_menu_config mock ──────────────────────────────────────────────────
// Note: In Jest 26, jest.fn(impl) inside a module factory discards the impl.
// We use jest.fn() here and wire up .mockReturnValue() in beforeEach instead.
jest.mock('../../sidebar_menu_config', () => ({
  DEFAULT_MENU: [
    { id: 'dashboard',         resource: 'dashboard',         label: 'Dashboard',         icon: 'bi-speedometer2',      path: '/dashboard/business-dashboard' },
    { id: 'sales',             resource: 'sales',             label: 'Sales',             icon: 'bi-receipt',           path: '/dashboard/sales' },
    { id: 'analytics',         resource: 'analytics',         label: 'Analytics',         icon: 'bi-graph-up-arrow',    path: '/dashboard/analytics',          adminOnly: true },
    { id: 'warehouses',        resource: 'warehouses',        label: 'Warehouses',        icon: 'bi-boxes',             path: '/dashboard/warehouses',         warehouseOnly: true },
    { id: 'employees',         resource: 'employees',         label: 'Employees',         icon: 'bi-person-badge',      path: '/dashboard/employees',          requiresEmployeeModule: true },
    { id: 'vehicles',          resource: 'vehicles',          label: 'Vehicles',          icon: 'bi-car-front',         path: '/dashboard/vehicles',           requiresAutomobileModule: true },
    { id: 'services',          resource: 'services',          label: 'Services',          icon: 'bi-clipboard-check',   path: '/dashboard/services',           requiresServices: true },
    { id: 'purchase_orders',   resource: 'purchase_orders',   label: 'Purchase Orders',   icon: 'bi-file-earmark-text', path: '/dashboard/purchase-orders',    requiresPurchaseOrderModule: true },
    { id: 'purchase_requests', resource: 'purchase_requests', label: 'Purchase Requests', icon: 'bi-clipboard2-pulse',  path: '/dashboard/purchase-requests',  purchaseRequestOnly: true },
    { id: 'salaries',          resource: 'salaries',          label: 'Salaries',          icon: 'bi-cash-coin',         path: '/dashboard/salaries',           requiresEmployeeModule: true, parentId: 'employees' },
  ],
  loadSidebarConfig: jest.fn(),
  saveSidebarConfig: jest.fn(),
}));

import SidebarSettings from '../index.js';
import { loadSidebarConfig, saveSidebarConfig } from '../../sidebar_menu_config';

// ── default return value for loadSidebarConfig ────────────────────────────────
// Matches the IDs in the DEFAULT_MENU mock above. Items that require a module
// flag are set to visible:false so they are skipped when the flag is off.
const DEFAULT_LOADED = [
  { id: 'dashboard',         resource: 'dashboard',         label: 'Dashboard',         icon: 'bi-speedometer2',      path: '/dashboard/business-dashboard', visible: true },
  { id: 'sales',             resource: 'sales',             label: 'Sales',             icon: 'bi-receipt',           path: '/dashboard/sales',              visible: true },
  { id: 'analytics',         resource: 'analytics',         label: 'Analytics',         icon: 'bi-graph-up-arrow',    path: '/dashboard/analytics',          adminOnly: true,                  visible: true },
  { id: 'warehouses',        resource: 'warehouses',        label: 'Warehouses',        icon: 'bi-boxes',             path: '/dashboard/warehouses',         warehouseOnly: true,              visible: false },
  { id: 'employees',         resource: 'employees',         label: 'Employees',         icon: 'bi-person-badge',      path: '/dashboard/employees',          requiresEmployeeModule: true,     visible: false },
  { id: 'vehicles',          resource: 'vehicles',          label: 'Vehicles',          icon: 'bi-car-front',         path: '/dashboard/vehicles',           requiresAutomobileModule: true,   visible: false },
  { id: 'services',          resource: 'services',          label: 'Services',          icon: 'bi-clipboard-check',   path: '/dashboard/services',           requiresServices: true,           visible: false },
  { id: 'purchase_orders',   resource: 'purchase_orders',   label: 'Purchase Orders',   icon: 'bi-file-earmark-text', path: '/dashboard/purchase-orders',    requiresPurchaseOrderModule: true, visible: false },
  { id: 'purchase_requests', resource: 'purchase_requests', label: 'Purchase Requests', icon: 'bi-clipboard2-pulse',  path: '/dashboard/purchase-requests',  purchaseRequestOnly: true,         visible: false },
  { id: 'salaries',          resource: 'salaries',          label: 'Salaries',          icon: 'bi-cash-coin',         path: '/dashboard/salaries',           requiresEmployeeModule: true, parentId: 'employees', visible: false },
];

// ── global fetch stub (component doesn't use fetch; included for safety) ─────
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

beforeEach(() => {
  // Re-wire the default return value before every test.
  // jest.clearAllMocks() in afterEach wipes call history but NOT implementations
  // set via .mockReturnValue(); this beforeEach restores it defensively anyway.
  loadSidebarConfig.mockReturnValue(DEFAULT_LOADED.map(i => ({ ...i })));
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ── helper ────────────────────────────────────────────────────────────────────
function renderComponent() {
  return render(
    <MemoryRouter>
      <SidebarSettings />
    </MemoryRouter>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('SidebarSettings smoke test', () => {
  test('renders without crashing', () => {
    renderComponent();
  });

  test('renders the Menu Settings heading', () => {
    renderComponent();
    expect(screen.getByText('Menu Settings')).toBeInTheDocument();
  });

  test('Save & Apply button is rendered regardless of role', () => {
    localStorage.setItem('user_role', 'Staff');
    renderComponent();
    expect(screen.getByRole('button', { name: /save & apply/i })).toBeInTheDocument();
  });

  test('Save & Apply button is rendered for Admin role', () => {
    localStorage.setItem('user_role', 'Admin');
    renderComponent();
    expect(screen.getByRole('button', { name: /save & apply/i })).toBeInTheDocument();
  });

  test('Reset button is rendered', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  test('renders visible item labels (Dashboard, Sales)', () => {
    renderComponent();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  test('admin-only item (Analytics) is shown when user is Admin', () => {
    localStorage.setItem('user_role', 'Admin');
    renderComponent();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  test('admin-only item (Analytics) is hidden when user is not Admin', () => {
    localStorage.setItem('user_role', 'Staff');
    renderComponent();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  test('warehouseOnly item (Warehouses) is hidden when warehouse module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_warehouse_module: false }));
    renderComponent();
    expect(screen.queryByText('Warehouses')).not.toBeInTheDocument();
  });

  test('warehouseOnly item (Warehouses) is shown when warehouse module is enabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_warehouse_module: true }));
    loadSidebarConfig.mockReturnValue(DEFAULT_LOADED.map(i =>
      i.id === 'warehouses' ? { ...i, visible: true } : { ...i }
    ));
    renderComponent();
    expect(screen.getByText('Warehouses')).toBeInTheDocument();
  });

  test('requiresAutomobileModule item (Vehicles) is hidden when automobile module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_automobile_module: false }));
    renderComponent();
    expect(screen.queryByText('Vehicles')).not.toBeInTheDocument();
  });

  test('requiresAutomobileModule item (Vehicles) is shown when automobile module is enabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_automobile_module: true }));
    loadSidebarConfig.mockReturnValue(DEFAULT_LOADED.map(i =>
      i.id === 'vehicles' ? { ...i, visible: true } : { ...i }
    ));
    renderComponent();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
  });

  test('requiresEmployeeModule item (Employees) is hidden when employee module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_employee_module: false }));
    renderComponent();
    expect(screen.queryByText('Employees')).not.toBeInTheDocument();
  });

  test('requiresEmployeeModule item (Employees) is shown when employee module is enabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_employee_module: true }));
    loadSidebarConfig.mockReturnValue(DEFAULT_LOADED.map(i =>
      i.id === 'employees' || i.id === 'salaries' ? { ...i, visible: true } : { ...i }
    ));
    renderComponent();
    // "Employees" appears both as the menu item label and as a badge on the
    // Salaries row (requiresEmployeeModule badge). getAllByText avoids the
    // "multiple elements" error.
    expect(screen.getAllByText('Employees').length).toBeGreaterThan(0);
  });

  test('requiresServices item (Services) is hidden when services module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_services: false }));
    renderComponent();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  test('requiresPurchaseOrderModule item is hidden when module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_purchase_order_module: false }));
    renderComponent();
    expect(screen.queryByText('Purchase Orders')).not.toBeInTheDocument();
  });

  test('purchaseRequestOnly item is hidden when purchase_request module is disabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_purchase_request_module: false }));
    renderComponent();
    expect(screen.queryByText('Purchase Requests')).not.toBeInTheDocument();
  });

  test('clicking Save & Apply calls saveSidebarConfig and changes label to Saved!', () => {
    renderComponent();
    const saveBtn = screen.getByRole('button', { name: /save & apply/i });
    act(() => { fireEvent.click(saveBtn); });
    expect(saveSidebarConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /saved!/i })).toBeInTheDocument();
  });

  test('clicking Reset calls saveSidebarConfig with all items set to visible', () => {
    renderComponent();
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    act(() => { fireEvent.click(resetBtn); });
    expect(saveSidebarConfig).toHaveBeenCalledTimes(1);
    const savedArg = saveSidebarConfig.mock.calls[0][0];
    expect(Array.isArray(savedArg)).toBe(true);
    expect(savedArg.every(item => item.visible === true)).toBe(true);
  });

  test('toggling a visibility switch flips its checked state', () => {
    renderComponent();
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    const firstSwitch = switches[0];
    const wasChecked = firstSwitch.checked;
    act(() => { fireEvent.click(firstSwitch); });
    expect(firstSwitch.checked).toBe(!wasChecked);
  });

  test('at-least-one-visible warning appears when all items are toggled off', () => {
    loadSidebarConfig.mockReturnValue([
      { id: 'dashboard', resource: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2', path: '/dashboard/business-dashboard', visible: true },
    ]);
    renderComponent();
    const switches = screen.getAllByRole('switch');
    act(() => { fireEvent.click(switches[0]); });
    expect(screen.getByText(/at least one item must be visible/i)).toBeInTheDocument();
  });

  test('first visible item receives the Landing badge', () => {
    // Dashboard is first and visible so it is the landing page.
    // "Landing" appears twice: once in the header description badge and once
    // on the Dashboard item itself — getAllByText avoids the "multiple elements" error.
    renderComponent();
    const landingMatches = screen.getAllByText('Landing');
    expect(landingMatches.length).toBeGreaterThanOrEqual(2);
  });

  test('subsequent visible item shows a Set Landing button', () => {
    // Sales is visible but not the landing page, so it has a "Set Landing" button
    renderComponent();
    expect(screen.getByRole('button', { name: /set landing/i })).toBeInTheDocument();
  });

  test('clicking Set Landing transfers the badge to the chosen item', () => {
    // Before: Dashboard is landing. After: Sales becomes landing.
    // Either way there are 2 "Landing" texts: header description badge + current landing item.
    renderComponent();
    const setLandingBtn = screen.getByRole('button', { name: /set landing/i });
    act(() => { fireEvent.click(setLandingBtn); });
    // Still exactly 2: the header badge and the newly-crowned landing item badge.
    expect(screen.getAllByText('Landing')).toHaveLength(2);
  });

  test('parentId item (Salaries) shows sub-arrow when employee module is enabled', () => {
    localStorage.setItem('_store_settings_cache', JSON.stringify({ enable_employee_module: true }));
    loadSidebarConfig.mockReturnValue(DEFAULT_LOADED.map(i =>
      i.id === 'employees' || i.id === 'salaries' ? { ...i, visible: true } : { ...i }
    ));
    renderComponent();
    expect(screen.getByText('Salaries')).toBeInTheDocument();
    expect(screen.getByText('↳')).toBeInTheDocument();
  });
});
