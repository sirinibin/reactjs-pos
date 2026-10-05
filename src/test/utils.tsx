import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthContext';
import { ToastProvider } from '@/ui/Toast';
import { KEYS } from '@/api/session';

export const STORE_ID = '6ac3e9fa7bef4c39f711308f';
export const TEST_STORE = {
  id: STORE_ID, name: 'Gulf Union Ozone Co.', name_in_arabic: 'شركة اتحاد الخليج', code: 'GUO', branch_name: 'Riyadh HQ', vat_no: '300455120900003', vat_percent: 15,
  settings: { enable_warehouse_module: true, enable_purchase_order_module: true, enable_purchase_request_module: true, enable_automobile_module: true, enable_automobile_dashboard: true, enable_employee_module: true, non_vat_sales: true, enable_sales_in_quotation: true, enable_services: true, enable_products: true },
  zatca: { phase: '2', connected: true },
};
export const TEST_USER = { id: 'u1', name: 'Sirin K', email: 'sirinibin2006@gmail.com', role: 'Admin', admin: true };

type Handler = (url: URL, init: RequestInit & { json?: any }) => any | Promise<any>;
export interface MockRoute { method?: string; path: string | RegExp; reply: Handler | any; status?: number }

/**
 * Install a fetch mock. Routes match on method + pathname (string = exact, RegExp = test).
 * `/v1/me`, `/v1/store`, `/v1/store/:id` are answered automatically for an admin session.
 * Returns the vi.fn so tests can assert calls: calls(fetchMock, 'POST', '/v1/order').
 */
export function mockApi(routes: MockRoute[] = [], opts: { user?: any; store?: any } = {}) {
  const user = opts.user ?? TEST_USER;
  const store = opts.store ?? TEST_STORE;
  const all: MockRoute[] = [
    ...routes,
    { method: 'GET', path: '/v1/me', reply: { status: true, result: user } },
    { method: 'GET', path: '/v1/store', reply: { status: true, result: [store], total_count: 1 } },
    { method: 'GET', path: `/v1/store/${store.id}`, reply: { status: true, result: store } },
    { method: 'GET', path: '/v1/user-role/effective-permissions', reply: { status: true, result: [] } },
  ];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost');
    const method = (init.method || 'GET').toUpperCase();
    const json = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    const r = all.find((x) => (x.method || 'GET') === method && (typeof x.path === 'string' ? x.path === url.pathname : x.path.test(url.pathname)));
    if (!r) return new Response(JSON.stringify({ status: false, errors: { mock: `No mock for ${method} ${url.pathname}` } }), { status: 404, headers: { 'content-type': 'application/json' } });
    const body = typeof r.reply === 'function' ? await r.reply(url, { ...init, json }) : r.reply;
    return new Response(JSON.stringify(body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Calls made to fetch matching method + path, with parsed URL and JSON body. */
export function calls(fn: ReturnType<typeof mockApi>, method: string, path: string | RegExp) {
  return fn.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input), 'http://localhost'), init: (init || {}) as RequestInit }))
    .filter((c) => (c.init.method || 'GET').toUpperCase() === method && (typeof path === 'string' ? c.url.pathname === path : path.test(c.url.pathname)))
    .map((c) => ({ url: c.url, body: typeof c.init.body === 'string' ? JSON.parse(c.init.body) : undefined }));
}

/**
 * Render inside every provider with a signed-in admin session.
 * `path` is the route pattern for the element (e.g. "/sales/invoices/:id"), `at` the URL.
 */
export function renderApp(ui: ReactElement, { at = '/', path = '*', extraRoutes }: { at?: string; path?: string; extraRoutes?: ReactNode } = {}) {
  localStorage.setItem(KEYS.token, 'test-token');
  localStorage.setItem(KEYS.storeId, STORE_ID);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[at]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Routes>
              <Route path={path} element={ui} />
              {extraRoutes}
              <Route path="*" element={<div data-testid="other-route" />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
