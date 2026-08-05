/**
 * Smoke test for PurchaseOrderIndex (purchase_order/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ─────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));

// ── WebSocketContext — provide a context with lastMessage: null ────────────────
jest.mock('../../utils/WebSocketContext.js', () => {
  const { createContext } = require('react');
  return { WebSocketContext: createContext({ lastMessage: null }) };
});

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => ({
  Spinner: () => null,
}));

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => ({
  __esModule: true,
  default: () => null,
}));

// ── date-fns ──────────────────────────────────────────────────────────────────
jest.mock('date-fns', () => ({
  format: (_date, _fmt) => '01-Jan-2024',
}));

// ── i18n dateLocales ──────────────────────────────────────────────────────────
jest.mock('../../i18n/dateLocales', () => ({
  getDateLocale: () => undefined,
}));

// ── utility helpers ───────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => v,
}));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: null,
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

// ── stub factory for domain/util components ───────────────────────────────────
const Stub = () => null;

jest.mock('../../utils/OverflowTooltip.js',   () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js',       () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: Stub }));

// ── child components that expose an imperative handle via ref ─────────────────
jest.mock('../create.js', () => {
  const { forwardRef } = require('react');
  return forwardRef((_props, _ref) => null);
});
jest.mock('../../order/preview.js', () => {
  const { forwardRef } = require('react');
  return forwardRef((_props, _ref) => null);
});

// ── timers ────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: {
          total_purchase_order: 0,
          vat_price: 0,
          discount: 0,
          count: 0,
        },
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import PurchaseOrderIndex from '../index.js';

// ── tests ─────────────────────────────────────────────────────────────────────
describe('PurchaseOrderIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PurchaseOrderIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders with showToastMessage prop without crashing', async () => {
    const showToastMessage = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <PurchaseOrderIndex showToastMessage={showToastMessage} />
        </MemoryRouter>
      );
    });
  });
});
