import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / static asset mocks ────────────────────────────────────────────────
jest.mock('../../utils/stickyHeader.css', () => ({}));
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ─────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  return {
    Button: ({ children, ...rest }) => <button {...rest}>{children}</button>,
    Spinner: () => <span />,
    Modal,
  };
});

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap-typeahead ────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
}));

// ── WebSocketContext ─────────────────────────────────────────────────────────
jest.mock('../../utils/WebSocketContext.js', () => {
  const React = require('react');
  return {
    WebSocketContext: React.createContext({ lastMessage: null }),
  };
});

// ── eventEmitter ─────────────────────────────────────────────────────────────
jest.mock('../../utils/eventEmitter.js', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

// ── utils components ─────────────────────────────────────────────────────────
jest.mock('../../utils/StatsSummary.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: () => null }));

// ── utils helpers ─────────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils.js', () => ({
  trimTo2Decimals: (v) => v,
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

// ── useTableSettings ──────────────────────────────────────────────────────────
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'actions',             label: 'Actions',              fieldName: 'actions',             visible: true },
      { key: 'select',              label: 'Select',               fieldName: 'select',              visible: false },
      { key: 'id',                  label: 'ID',                   fieldName: 'code',                visible: true },
      { key: 'date',                label: 'Date',                 fieldName: 'date',                visible: true },
      { key: 'from_warehouse_code', label: 'From Warehouse/Store', fieldName: 'from_warehouse_code', visible: true },
      { key: 'to_warehouse_code',   label: 'To Warehouse/Store',   fieldName: 'to_warehouse_code',   visible: true },
      { key: 'total_quantity',      label: 'Total Qty',            fieldName: 'total_quantity',      visible: true },
      { key: 'net_total',           label: 'Net Total Amt.',       fieldName: 'net_total',           visible: true },
      { key: 'created_by',          label: 'Created By',           fieldName: 'created_by',          visible: true },
      { key: 'created_at',          label: 'Created At',           fieldName: 'created_at',          visible: true },
      { key: 'actions_end',         label: 'Actions',              fieldName: 'actions_end',         visible: true },
    ],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

// ── child domain components (all use forwardRef internally) ───────────────────
jest.mock('../create.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../view.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../order/preview.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock('../../order/print.js', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef(() => null) };
});

// ── component under test ──────────────────────────────────────────────────────
import StockTransferIndex from '../index';

// ── timers & fetch ────────────────────────────────────────────────────────────
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: { total_stocktransfer: 0, total_quantity: 0 },
        store: {},
        settings: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('StockTransferIndex smoke test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <StockTransferIndex />
        </MemoryRouter>
      );
    });
  });

  it('renders the Stock Transfers heading', async () => {
    let container;
    await act(async () => {
      ({ container } = render(
        <MemoryRouter>
          <StockTransferIndex />
        </MemoryRouter>
      ));
    });
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h1').textContent).toMatch(/Stock Transfers/i);
  });

  it('renders Create button', async () => {
    let getAllByText;
    await act(async () => {
      ({ getAllByText } = render(
        <MemoryRouter>
          <StockTransferIndex />
        </MemoryRouter>
      ));
    });
    // "Create" also appears in column headers "Created By" / "Created At"
    const matches = getAllByText(/\bCreate\b/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows empty-state message when no records returned', async () => {
    let container;
    await act(async () => {
      ({ container } = render(
        <MemoryRouter>
          <StockTransferIndex />
        </MemoryRouter>
      ));
    });
    expect(container.textContent).toMatch(/No Stock Transfers to display/i);
  });
});
