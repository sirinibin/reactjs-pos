import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / static assets ────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  return {
    Button: passthrough,
    Spinner: () => <span />,
    Form: passthrough,
    Row: passthrough,
    Col: passthrough,
    Table: passthrough,
    Alert: passthrough,
    Badge: passthrough,
  };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
// Mocked as forwardRef because the source passes refs to Typeahead instances
jest.mock('react-bootstrap-typeahead', () => {
  const mockReact = require('react');
  return {
    Typeahead: mockReact.forwardRef((_props, _ref) => null),
    AsyncTypeahead: mockReact.forwardRef((_props, _ref) => null),
  };
});

// ── react-datepicker ───────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── date-fns ───────────────────────────────────────────────────────────────
jest.mock('date-fns', () => ({
  format: () => 'Jan 01 2026 12:00AM',
}));

// ── child domain components (all expose an imperative .open() via ref) ─────
jest.mock('../create.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: () => {} }));
    return null;
  });
});

jest.mock('../view.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: () => {} }));
    return null;
  });
});

// source imports this as './../customer_deposit/preview.js' which resolves to
// src/customer_deposit/preview.js — same file as ../preview.js from __tests__/
jest.mock('../preview.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: () => {} }));
    return null;
  });
});

// ── ZatcaConnect (added to index.js for reconnect gate) ───────────────────
jest.mock('../../store/zatca_connect.js', () => {
  const mockReact = require('react');
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: () => {} }));
    return null;
  });
});

// ── utility components ─────────────────────────────────────────────────────
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);

// ── utility functions / hooks ──────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: () => Promise.resolve({}),
}));

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (n) => n,
}));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'actions',           label: 'Actions',           fieldName: 'actions',                visible: true },
      { key: 'id',                label: 'ID',                fieldName: 'code',                   visible: true },
      { key: 'date',              label: 'Date',              fieldName: 'date',                   visible: true },
      { key: 'type',              label: 'Type',              fieldName: 'type',                   visible: true },
      { key: 'customer',          label: 'Customer',          fieldName: 'customer_name',          visible: true },
      { key: 'vendor',            label: 'Vendor',            fieldName: 'vendor_name',            visible: true },
      { key: 'net_total',         label: 'Net Total',         fieldName: 'net_total',              visible: true },
      { key: 'payment_methods',   label: 'Payment Methods',   fieldName: 'payment_methods',        visible: true },
      { key: 'description',       label: 'Description',       fieldName: 'description',            visible: true },
      { key: 'created_by',        label: 'Created By',        fieldName: 'created_by_name',        visible: true },
      { key: 'created_at',        label: 'Created At',        fieldName: 'created_at',             visible: true },
      { key: 'reported_to_zatca', label: 'Reported to Zatca', fieldName: 'zatca.reporting_passed', visible: true },
      { key: 'actions_end',       label: 'Actions',           fieldName: 'actions_end',            visible: true },
    ],
    showSettings: false,
    setShowSettings: () => {},
    handleToggleColumn: () => {},
    onDragEnd: () => {},
    restoreDefaults: () => {},
  }),
}));

// ── subject under test ─────────────────────────────────────────────────────
import CustomerDepositIndex from '../index.js';

// ── test setup ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.useFakeTimers();

  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('store_id', 'test-store');

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: {
          total: 0,
          total_customer: 0,
          total_vendor: 0,
          cash: 0,
          bank: 0,
          purchase_fund: 0,
        },
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── tests ──────────────────────────────────────────────────────────────────
describe('CustomerDepositIndex smoke tests', () => {
  it('renders without crashing inside MemoryRouter', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CustomerDepositIndex />
        </MemoryRouter>
      );
    });
    expect(document.body).toBeTruthy();
  });

  it('renders without crashing when showToastMessage prop is provided', async () => {
    const mockToast = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <CustomerDepositIndex showToastMessage={mockToast} />
        </MemoryRouter>
      );
    });
    expect(document.body).toBeTruthy();
  });
});
