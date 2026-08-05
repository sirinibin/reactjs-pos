import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ──────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── Third-party library mocks ──────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Button = ({ children, onClick, disabled }) =>
    React.createElement('button', { onClick, disabled }, children);
  const Spinner = () => null;
  return { Button, Spinner };
});

jest.mock('react-bootstrap-typeahead', () => {
  const React = require('react');
  const Typeahead = React.forwardRef((_props, _ref) => null);
  return { Typeahead };
});

// ── Local child component mocks (all use forwardRef) ──────────────────────
jest.mock('../create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

jest.mock('../../customer_deposit/preview.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((_p, _r) => null) };
});

// ── Utility component mocks ────────────────────────────────────────────────
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);

// ── Utility function / hook mocks ──────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => String(parseFloat(v).toFixed(2)),
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: (obj) =>
    Object.entries(obj || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('&'),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'actions', label: 'Actions', fieldName: 'actions', visible: true },
      { key: 'id', label: 'ID', fieldName: 'code', visible: true },
      { key: 'date', label: 'Date', fieldName: 'date', visible: true },
      { key: 'type', label: 'Type', fieldName: 'type', visible: true },
      { key: 'customer', label: 'Customer', fieldName: 'customer_name', visible: true },
      { key: 'vendor', label: 'Vendor', fieldName: 'vendor_name', visible: true },
      { key: 'net_total', label: 'Net Total', fieldName: 'net_total', visible: true },
      { key: 'payment_methods', label: 'Payment Methods', fieldName: 'payment_methods', visible: true },
      { key: 'description', label: 'Description', fieldName: 'description', visible: true },
      { key: 'created_by', label: 'Created By', fieldName: 'created_by_name', visible: true },
      { key: 'created_at', label: 'Created At', fieldName: 'created_at', visible: true },
      { key: 'reported_to_zatca', label: 'Reported to Zatca', fieldName: 'zatca.reporting_passed', visible: true },
      { key: 'actions_end', label: 'Actions', fieldName: 'actions_end', visible: true },
    ],
    showSettings: false,
    setShowSettings: () => {},
    handleToggleColumn: () => {},
    onDragEnd: () => {},
    restoreDefaults: () => {},
  }),
}));

// ── Subject under test ─────────────────────────────────────────────────────
import CustomerWithdrawalIndex from '../index.js';

// ── Test suite ─────────────────────────────────────────────────────────────
describe('CustomerWithdrawalIndex smoke tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          meta: {
            total: 0,
            cash: 0,
            bank: 0,
            total_vendor: 0,
            total_customer: 0,
          },
        }),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing inside MemoryRouter', () => {
    render(
      <MemoryRouter>
        <CustomerWithdrawalIndex />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
