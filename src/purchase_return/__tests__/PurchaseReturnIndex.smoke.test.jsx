import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / asset mocks ──────────────────────────────────────────────────────────

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── External library mocks ─────────────────────────────────────────────────────

jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Button = ({ children, onClick, disabled, className, style, onKeyDown }) =>
    React.createElement('button', { onClick, disabled, className, style, onKeyDown }, children);
  const Spinner = () => null;
  const Alert = ({ children }) => React.createElement('div', null, children);
  const Modal = Object.assign(
    ({ show, children }) =>
      show ? React.createElement('div', { 'data-testid': 'modal' }, children) : null,
    {
      Header: ({ children }) => React.createElement('div', null, children),
      Title: ({ children }) => React.createElement('div', null, children),
      Body: ({ children }) => React.createElement('div', null, children),
      Footer: ({ children }) => React.createElement('div', null, children),
    }
  );
  return { Button, Spinner, Modal, Alert };
});

jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: require('react').forwardRef((_props, _ref) => null),
  AsyncTypeahead: () => null,
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
  };
});

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

jest.mock('react-bootstrap-confirmation', () => ({
  __esModule: true,
  default: {},
  confirm: jest.fn().mockResolvedValue(false),
}));

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

jest.mock('../../i18n/dateLocales', () => ({
  getDateLocale: jest.fn(() => undefined),
}));

// ── Utility mocks ──────────────────────────────────────────────────────────────

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => (v !== undefined && v !== null ? String(v) : '0'),
}));

jest.mock('../../utils/amount.js', () => () => null);

jest.mock('../../utils/OverflowTooltip.js', () => {
  const React = require('react');
  return ({ value }) => React.createElement('span', null, value);
});

jest.mock('../../utils/StatsSummary.js', () => () => null);

jest.mock('../../utils/SuccessModal.js', () => () => null);

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'actions', label: 'Actions', fieldName: 'actions', visible: true },
      { key: 'id', label: 'Purchase Return ID', fieldName: 'code', visible: true },
      { key: 'date', label: 'Date', fieldName: 'date', visible: true },
      { key: 'vendor', label: 'Vendor', fieldName: 'vendor_name', visible: true },
      { key: 'net_total', label: 'Net Total', fieldName: 'net_total', visible: true },
      { key: 'payment_status', label: 'Payment Status', fieldName: 'payment_status', visible: true },
      { key: 'actions_end', label: 'Actions', fieldName: 'actions_end', visible: true },
    ],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

jest.mock('../../utils/TableSettingsModal.js', () => () => null);

jest.mock('../../utils/PaginationControls.js', () => () => null);

jest.mock('../../utils/WebSocketContext.js', () => {
  const React = require('react');
  return { WebSocketContext: React.createContext({ lastMessage: null }) };
});

jest.mock('../../utils/eventEmitter', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

jest.mock('../../utils/purchases.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

// ── Child domain component mocks ───────────────────────────────────────────────

jest.mock('../create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../purchase_return_payment/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../purchase_return_payment/view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../purchase_return_payment/index.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../vendor/create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../order/preview.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../order/report.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

jest.mock('../../order/print.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_props, _ref) => null) };
});

// ── Component under test ───────────────────────────────────────────────────────

import PurchaseReturnIndex from '../index.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPTY_META = {
  total_purchase_return: 0,
  accounted_purchase_return: 0,
  purchase_purchase_return: 0,
  vat_price: 0,
  discount: 0,
  cash_discount: 0,
  paid_purchase_return: 0,
  unpaid_purchase_return: 0,
  cash_purchase_return: 0,
  bank_account_purchase_return: 0,
  shipping_handling_fees: 0,
};

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('PurchaseReturnIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          meta: EMPTY_META,
          store: {},
          settings: {},
        }),
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnIndex showToastMessage={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders with enableSelection prop without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnIndex
          showToastMessage={jest.fn()}
          enableSelection={true}
          onSelectPurchaseReturn={jest.fn()}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders with pendingView prop without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnIndex showToastMessage={jest.fn()} pendingView={true} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders with selectedVendors prop without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <PurchaseReturnIndex
          showToastMessage={jest.fn()}
          selectedVendors={[{ id: 'v1', name: 'Test Vendor' }]}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
