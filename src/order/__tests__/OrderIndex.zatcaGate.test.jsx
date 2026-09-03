/**
 * Smoke tests for the ZATCA gate condition change in OrderIndex.
 *
 * The gate condition changed from:
 *   store.zatca?.phase === "2" && store.zatca?.connected
 * to:
 *   store.zatca?.phase === "2" && store.zatca?.connected && !store.zatca?.zatca_reconnect_required
 *
 * This file verifies:
 *  1. The component renders without crashing.
 *  2. The store fetch URL includes `zatca_reconnect_required` in the select param,
 *     confirming the new field is requested from the API.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ──────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── External library mocks ─────────────────────────────────────────────────────

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (opts && typeof key === 'string') {
        return key.replace(/\{\{(\w+)\}\}/g, (_, k) =>
          opts[k] !== undefined ? String(opts[k]) : ''
        );
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Button = ({ children, onClick, disabled, className, style }) =>
    React.createElement('button', { onClick, disabled, className, style }, children);
  const Spinner = () => null;
  const Alert = ({ children }) => React.createElement('div', null, children);
  const Modal = Object.assign(
    ({ show, children }) =>
      show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
    {
      Header: ({ children }) => React.createElement('div', null, children),
      Title:  ({ children }) => React.createElement('div', null, children),
      Body:   ({ children }) => React.createElement('div', null, children),
      Footer: ({ children }) => React.createElement('div', null, children),
    }
  );
  return { Button, Spinner, Modal, Alert };
});

jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

jest.mock('react-paginate', () => () => null);

jest.mock('react-draggable', () => {
  const React = require('react');
  return ({ children }) => React.createElement(React.Fragment, null, children);
});

jest.mock('react-data-export', () => {
  const React = require('react');
  const ExcelSheet = () => null;
  const ExcelFile = Object.assign(
    ({ children }) => React.createElement('div', null, children),
    { ExcelSheet }
  );
  return { __esModule: true, default: { ExcelFile } };
});

// ── i18n / locale ──────────────────────────────────────────────────────────────
jest.mock('../../i18n/dateLocales', () => ({ getDateLocale: () => undefined }));

// ── Utility mocks ──────────────────────────────────────────────────────────────
jest.mock('../../utils/OverflowTooltip.js', () => {
  const React = require('react');
  return ({ value }) => React.createElement('span', null, value);
});

jest.mock('../../utils/dateUtils.js',    () => ({ TimeAgo: () => null }));
jest.mock('../../utils/numberUtils',     () => ({ trimTo2Decimals: (v) => (v != null ? String(v) : '0') }));
jest.mock('../../utils/amount.js',       () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../utils/queryUtils.js',   () => ({ ObjectToSearchQueryParams: () => '' }));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

jest.mock('../../utils/TableSettingsModal.js', () => () => null);

jest.mock('../../utils/WebSocketContext.js', () => {
  const R = require('react');
  return { WebSocketContext: R.createContext({ lastMessage: null, sendMessage: jest.fn() }) };
});

jest.mock('../../utils/eventEmitter', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

// ── Child component mocks ──────────────────────────────────────────────────────
jest.mock('../create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../view.js',   () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../preview.js',() => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../report.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../print.js',  () => { const R = require('react'); return R.forwardRef(() => null); });

jest.mock('../../repair_job/card_view.js',   () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../sales_payment/index.js',    () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../sales_return/index.js',     () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../sales_return/create.js',    () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../customer/create.js',        () => { const R = require('react'); return R.forwardRef(() => null); });

// ── Timers ─────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Component under test ───────────────────────────────────────────────────────
import OrderIndex from '../index.js';

// ── Setup ──────────────────────────────────────────────────────────────────────
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: {
          total_sales: 0, net_profit: 0, net_loss: 0, vat_price: 0,
          shipping_handling_fees: 0, discount: 0, cash_discount: 0,
          commission: 0, commission_paid_by_cash: 0, commission_paid_by_bank: 0,
          paid_sales: 0, unpaid_sales: 0, cash_sales: 0, bank_account_sales: 0,
          purchase_sales: 0, sales_return_sales: 0, delivery_note_total: 0,
        },
        store: {},
        settings: {},
      }),
  });
  localStorage.clear();
  // getStore() guards with `if (!storeId) return`, so we need a store_id for the
  // store-fetch URL test to trigger the actual fetch call.
  localStorage.setItem('store_id', 'store-abc');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ═══════════════════════════════════════════════════════════════════════════════
// OrderIndex — ZATCA gate smoke tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('OrderIndex ZATCA gate (zatca_reconnect_required)', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('store fetch URL includes zatca_reconnect_required in the select param', () => {
    render(
      <MemoryRouter>
        <OrderIndex />
      </MemoryRouter>
    );
    // The component fetches the store with a select query string that should include
    // zatca.zatca_reconnect_required to power the new gate condition.
    const storeFetchUrl = global.fetch.mock.calls
      .map(([url]) => url)
      .find(url => typeof url === 'string' && url.includes('/v1/store/') && url.includes('select='));

    expect(storeFetchUrl).toBeDefined();
    expect(storeFetchUrl).toContain('zatca_reconnect_required');
  });

  it('renders with enableSelection prop without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderIndex enableSelection={true} onSelectSale={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders with pendingView prop without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderIndex pendingView={true} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
