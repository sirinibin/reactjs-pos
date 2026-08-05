/**
 * Smoke test for DeliveryNoteCreate (delivery_note/create.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── bootstrap JS mock ─────────────────────────────────────────────────────────
jest.mock('bootstrap', () => ({
  Modal:   jest.fn(),
  Tooltip: Object.assign(jest.fn(), { getInstance: jest.fn(() => null) }),
  Popover: jest.fn(),
}));

// ── react-beautiful-dnd ───────────────────────────────────────────────────────
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <>{children}</>,
  Droppable: ({ children }) =>
    <>{children({ innerRef: null, droppableProps: {}, placeholder: null }, {})}</>,
  Draggable: ({ children }) =>
    <>{children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {})}</>,
}));

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P;
  Modal.Title  = P;
  Modal.Body   = P;
  Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, {
    Item: P, Toggle: P, Menu: P,
  });
  return {
    Modal,
    Button:         P,
    Spinner:        () => null,
    OverlayTrigger: P,
    Popover:        P,
    Dropdown:       DD,
  };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  Menu:      () => null,
  MenuItem:  () => null,
}));

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-debounce-input ──────────────────────────────────────────────────────
jest.mock('react-debounce-input', () => ({
  DebounceInput: ({ onChange }) => <input onChange={onChange} />,
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
  trimTo8Decimals: (v) => v,
}));

jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));

// ── stub factory for domain/util components ───────────────────────────────────
const Stub = () => null;

jest.mock('../../order/preview.js',                                () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js',                              () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js',                               () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/view.js',                                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../user/create.js',                                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../signature/create.js',                             () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_return_history.js',           () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_history.js',               () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_purchase_return_history.js',        () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_history.js',              () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_quotation_sales_return_history.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_delivery_note_history.js',          () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/products.js',                               () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/customers.js',                              () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/ImageViewerModal',                          () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js',                                 () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_history.js',                        () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/product_sales_history.js',                  () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js',                           () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js',                     () => ({ __esModule: true, default: Stub }));
jest.mock('../../purchase_order/PurchaseOrderPicker.js',           () => ({ __esModule: true, default: Stub }));

// ── timers ────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── fetch mock ────────────────────────────────────────────────────────────────
beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok:      true,
    headers: { get: () => 'application/json' },
    json:    () => Promise.resolve({ result: {}, data: [], total_count: 0 }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import DeliveryNoteCreate from '../create.js';

// ── tests ─────────────────────────────────────────────────────────────────────
describe('DeliveryNoteCreate smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <DeliveryNoteCreate />
        </MemoryRouter>
      );
    });
  });
});
