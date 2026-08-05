/**
 * Smoke test for DeliveryNoteIndex (delivery_note/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS files ─────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) => {
    if (!show) return null;
    return <div data-testid="modal">{children}</div>;
  };
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body   = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button  = ({ children, ...rest }) => <button {...rest}>{children}</button>;
  const Spinner = () => <span data-testid="spinner" />;

  return { Modal, Button, Spinner };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead:      () => null,
  AsyncTypeahead: () => null,
  Menu:           () => null,
  MenuItem:       () => null,
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── useTableSettings hook ─────────────────────────────────────────────────────
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'actions',      label: 'Actions',    fieldName: 'actions',      visible: true },
      { key: 'select',       label: 'Select',     fieldName: 'select',       visible: true },
      { key: 'id',           label: 'ID',         fieldName: 'code',         visible: true },
      { key: 'date',         label: 'Date',       fieldName: 'date',         visible: true },
      { key: 'customer',     label: 'Customer',   fieldName: 'customer_name',visible: true },
      { key: 'net_total',    label: 'Net Total',  fieldName: 'net_total',    visible: true },
      { key: 'invoiced',     label: 'Invoiced',   fieldName: 'invoiced',     visible: true },
      { key: 'order_code',   label: 'Sales ID',   fieldName: 'order_code',   visible: true },
      { key: 'created_by',   label: 'Created By', fieldName: 'created_by',   visible: true },
      { key: 'created_at',   label: 'Created At', fieldName: 'created_at',   visible: true },
      { key: 'actions_end',  label: 'Actions',    fieldName: 'actions_end',  visible: true },
    ],
    showSettings:      false,
    setShowSettings:   jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd:         jest.fn(),
    restoreDefaults:   jest.fn(),
  }),
}));

// ── utility helpers ───────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

// ── stub factory for domain/util components ───────────────────────────────────
const Stub = () => null;

jest.mock('../create.js',                   () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js',                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/create.js',          () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/report.js',          () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js',         () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/print.js',           () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',       () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/OverflowTooltip.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js',    () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js',    () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js',  () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js',  () => ({ __esModule: true, default: Stub }));

// ── timers ────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── fetch mock ────────────────────────────────────────────────────────────────
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: {
          total_deliverynote: 0,
          vat_price: 0,
          discount: 0,
          shipping_handling_fees: 0,
          invoiced_count: 0,
        },
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import DeliveryNoteIndex from '../index.js';

// ── tests ─────────────────────────────────────────────────────────────────────
describe('DeliveryNoteIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <DeliveryNoteIndex />
        </MemoryRouter>
      );
    });
  });

  test('renders with enableSelection prop without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <DeliveryNoteIndex
            enableSelection={true}
            onSelectDeliveryNote={jest.fn()}
          />
        </MemoryRouter>
      );
    });
  });
});
