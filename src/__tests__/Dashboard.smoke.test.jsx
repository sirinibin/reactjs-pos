import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / static assets ────────────────────────────────────────────────────
jest.mock('../dashboard.css', () => ({}));

// ── Utilities ──────────────────────────────────────────────────────────────
jest.mock('../utils/eventEmitter', () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}));

jest.mock('../sidebar_menu_config', () => ({
  DEFAULT_MENU: [],
  getLandingPath: jest.fn(() => '/'),
}));

// ── react-router-dom ───────────────────────────────────────────────────────
// Keep MemoryRouter real (used in the test wrapper).
// Mock BrowserRouter, Switch, Route as passthroughs so Dashboard mounts
// without a real browser history and routes render unconditionally.
// Mock useLocation so RouteGuard does not throw outside a real Router.
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => children,
    Switch: ({ children }) => children,
    Route: ({ children }) => children,
    Redirect: () => null,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: undefined }),
  };
});

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? children : null);
  Modal.Header = ({ children }) => children;
  Modal.Title = ({ children }) => children;
  Modal.Body = ({ children }) => children;
  Modal.Footer = ({ children }) => children;

  const Button = ({ children }) => children || null;

  return { Modal, Button };
});

jest.mock('react-bootstrap/Toast', () => {
  const Toast = ({ children }) => children;
  Toast.Header = ({ children }) => children;
  Toast.Body = ({ children }) => children;
  return Toast;
});

jest.mock('react-bootstrap/ToastContainer', () => ({ children }) => children);

// ── Layout / shell components ──────────────────────────────────────────────
jest.mock('../Footer', () => () => null);
jest.mock('../Sidebar', () => () => null);
jest.mock('../Topbar', () => () => null);
jest.mock('../user/login.js', () => () => null);

// ── Domain index components ────────────────────────────────────────────────
jest.mock('../posting/index.js', () => () => null);
jest.mock('../quotation/index.js', () => () => null);
jest.mock('../quotation_sales_return/index.js', () => () => null);
jest.mock('../non_vat_sales/index.js', () => () => null);
jest.mock('../non_vat_sales_return/index.js', () => () => null);
jest.mock('../delivery_note/index.js', () => () => null);
jest.mock('../order/index.js', () => () => null);
jest.mock('../stock_transfer/index.js', () => () => null);
jest.mock('../sales_cash_discount/index.js', () => () => null);
jest.mock('../purchase_cash_discount/index.js', () => () => null);
jest.mock('../sales_payment/index.js', () => () => null);
jest.mock('../purchase_payment/index.js', () => () => null);
jest.mock('../sales_return_payment/index.js', () => () => null);
jest.mock('../purchase_return_payment/index.js', () => () => null);
jest.mock('../sales_return/index.js', () => () => null);
jest.mock('../purchase/index.js', () => () => null);
jest.mock('../purchase_order/index.js', () => () => null);
jest.mock('../purchase_request/index.js', () => () => null);
jest.mock('../purchase_return/index.js', () => () => null);
jest.mock('../vendor/index.js', () => () => null);
jest.mock('../store/index.js', () => () => null);
jest.mock('../warehouse/index.js', () => () => null);
jest.mock('../customer/index.js', () => () => null);
jest.mock('../product/index.js', () => () => null);
jest.mock('../product_category/index.js', () => () => null);
jest.mock('../product_brand/index.js', () => () => null);
jest.mock('../service/index.js', () => () => null);
jest.mock('../service_category/index.js', () => () => null);
jest.mock('../expense_category/index.js', () => () => null);
jest.mock('../expense/index.js', () => () => null);
jest.mock('../customer_deposit/index.js', () => () => null);
jest.mock('../customer_withdrawal/index.js', () => () => null);
jest.mock('../capital/index.js', () => () => null);
jest.mock('../capital_withdrawal/index.js', () => () => null);
jest.mock('../divident/index.js', () => () => null);
jest.mock('../ledger/index.js', () => () => null);
jest.mock('../account/index.js', () => () => null);
jest.mock('../user/index.js', () => () => null);
jest.mock('../role/index.js', () => () => null);
jest.mock('../customer_package/index.js', () => () => null);
jest.mock('../signature/index.js', () => () => null);
jest.mock('../analytics/index.js', () => () => null);
jest.mock('../stats/index.js', () => () => null);
jest.mock('../business_dashboard/index.js', () => () => null);
jest.mock('../sidebar_settings/index.js', () => () => null);
jest.mock('../automobile_dashboard/index.js', () => () => null);
jest.mock('../employee/index.js', () => () => null);
jest.mock('../employee/salaryIndex.js', () => () => null);
jest.mock('../vehicle/index.js', () => () => null);
jest.mock('../repair_job/index.js', () => () => null);

// ── Global fetch stub ──────────────────────────────────────────────────────
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({
      result: {},
      data: [],
      total_count: 0,
      store: {},
      settings: {},
    }),
});

jest.useFakeTimers();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

import Dashboard from '../Dashboard';

describe('Dashboard smoke tests', () => {
  test('renders without crashing inside MemoryRouter', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/analytics']}>
        <Dashboard />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  test('renders without crashing when no access_token is set', () => {
    localStorage.clear();
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );
    // Dashboard returns <></> when no token — must not throw
    expect(container).toBeTruthy();
  });
});
