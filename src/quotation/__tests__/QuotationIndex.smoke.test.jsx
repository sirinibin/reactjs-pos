/**
 * Smoke test for QuotationIndex (quotation/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── WebSocketContext — default value is undefined, so we must provide one ─────
jest.mock('../../utils/WebSocketContext.js', () => {
  const { createContext } = require('react');
  return { WebSocketContext: createContext({ lastMessage: null }) };
});

// ── eventEmitter ──────────────────────────────────────────────────────────────
jest.mock('../../utils/eventEmitter', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

// ── bootstrap JS mock ─────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({ Modal: jest.fn(), Tooltip: jest.fn(), Popover: jest.fn() }));

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
  Menu: () => null,
  MenuItem: () => null,
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── utility helpers ───────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => String(v || 0),
  trimTo8Decimals: (v) => String(v || 0),
}));

jest.mock('../../utils/dateUtils.js', () => ({
  TimeAgo: () => null,
}));

// ── stub factory for domain/util components ───────────────────────────────────
const Stub = () => null;

jest.mock('../create.js',                                  () => ({ __esModule: true, default: Stub }));
jest.mock('../QuotationType3Form.js',                      () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js',                                    () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js',                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js',                       () => ({ __esModule: true, default: Stub }));
jest.mock('../../repair_job/card_view.js',                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/report.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/create.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js',                        () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/print.js',                          () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/create.js',        () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return/index.js',         () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',                      () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js',                () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js',                         () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js',             () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js',             () => ({ __esModule: true, default: Stub }));

// ── fetch mock ────────────────────────────────────────────────────────────────
const fetchMeta = {
  total_quotation: 0,
  profit: 0,
  loss: 0,
  invoiced_count: 0,
  invoiced_amount: 0,
  invoice_total_sales: 0,
  invoice_net_profit: 0,
  invoice_net_loss: 0,
  invoice_vat_price: 0,
  invoice_shipping_handling_fees: 0,
  invoice_discount: 0,
  invoice_cash_discount: 0,
  invoice_paid_sales: 0,
  invoice_unpaid_sales: 0,
  invoice_cash_sales: 0,
  invoice_bank_account_sales: 0,
  invoice_sales_return_sales: 0,
};

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: [], total_count: 0, meta: fetchMeta }),
});

// ── timers ────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import QuotationIndex from '../index.js';

// ── tests ─────────────────────────────────────────────────────────────────────
describe('QuotationIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <QuotationIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders with enableSelection prop without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <QuotationIndex enableSelection={true} onSelectQuotation={jest.fn()} />
        </MemoryRouter>
      );
    });
  });

  test('renders with pendingView prop without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <QuotationIndex pendingView={true} />
        </MemoryRouter>
      );
    });
  });
});
