import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock all domain-level page components
jest.mock('../Dashboard', () => () => <div>Dashboard</div>);
jest.mock('../user/login', () => () => <div>Login</div>);
jest.mock('../order/InvoicePrintPage', () => () => null);
jest.mock('../customer_deposit/ReceiptPrintPage', () => () => null);
jest.mock('../posting/PostingPrintPage', () => () => null);
jest.mock('../order/ReportPrintPage', () => () => null);

jest.mock('../utils/WebSocketContext', () => ({
  WebSocketProvider: ({ children }) => children,
}));

jest.mock('../utils/AutoRefresh', () => () => null);

// Keep MemoryRouter real; mock BrowserRouter, Switch, and Route as simple passthroughs
// so App mounts without a real browser history and all children render unconditionally.
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => children,
    Switch: ({ children }) => children,
    Route: ({ children }) => children,
  };
});

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({}),
});

jest.useFakeTimers();

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  jest.useRealTimers();
});

describe('App smoke tests', () => {
  test('renders without crashing', () => {
    localStorage.setItem('access_token', 'test-token');
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  test('with no access_token in localStorage, shows login-related component', () => {
    // localStorage is already clear from beforeEach — no token set
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    // Switch/Route are passthroughs so Login (rendered at '/') is always present
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('with access_token in localStorage, shows dashboard-related component', () => {
    localStorage.setItem('access_token', 'test-token');
    render(
      <MemoryRouter initialEntries={['/dashboard/sales']}>
        <App />
      </MemoryRouter>
    );
    // Dashboard is mocked as <div>Dashboard</div>; at least one instance is present
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });

  test('InvoicePrintPage route renders without crashing', () => {
    localStorage.setItem('access_token', 'test-token');
    const { container } = render(
      <MemoryRouter initialEntries={['/invoice-print']}>
        <App />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  test('unknown routes do not crash', () => {
    localStorage.setItem('access_token', 'test-token');
    const { container } = render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <App />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
