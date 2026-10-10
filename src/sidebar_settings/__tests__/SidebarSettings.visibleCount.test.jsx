import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

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

// Every item visible, the module items included, with all modules switched off
// and a non-admin user: only Dashboard and Sales are listed.
const ALL_VISIBLE = [
  'dashboard', 'sales', 'analytics', 'warehouses', 'employees', 'vehicles',
  'services', 'purchase_orders', 'purchase_requests', 'salaries',
].map((id) => ({ id, visible: true }));

beforeEach(() => {
  localStorage.clear();
  loadSidebarConfig.mockReturnValue(ALL_VISIBLE.map((i) => ({ ...i })));
});

test('hiding every listed item warns, though items of disabled modules are still marked visible', () => {
  render(<SidebarSettings />);
  const switches = screen.getAllByRole('switch');
  expect(switches).toHaveLength(2);
  expect(screen.queryByText('At least one item must be visible.')).toBeNull();
  switches.forEach((s) => fireEvent.click(s));
  expect(screen.getByText('At least one item must be visible.')).toBeTruthy();
});

test('the landing badge goes to the first listed visible item', () => {
  loadSidebarConfig.mockReturnValue([{ id: 'warehouses', visible: true }, { id: 'sales', visible: true }, { id: 'dashboard', visible: true }]);
  render(<SidebarSettings />);
  const row = screen.getByText('Sales').closest('.card > div');
  expect(row.querySelector('.badge.bg-success')).not.toBeNull();
  expect(row.textContent).not.toContain('Set Landing');
});
