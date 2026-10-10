import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS mocks
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-bootstrap
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  const Pass = ({ children }) => <div>{children}</div>;
  Modal.Header = Pass; Modal.Title = Pass; Modal.Body = Pass; Modal.Footer = Pass;
  return { Modal, Spinner: () => <div data-testid="spinner" /> };
});

// react-bootstrap-typeahead
// Typeahead stand-in that records its props, so a test can pick an option.
const typeaheads = {};
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: require('react').forwardRef((props, ref) => { typeaheads[props.id] = props; return null; }),
  Menu: ({ children }) => <div>{children}</div>,
  MenuItem: ({ children }) => <div>{children}</div>,
}));

// react-number-format
jest.mock('react-number-format', () => () => null);

// react-datepicker
jest.mock('react-datepicker', () => () => null);

// date-fns
jest.mock('date-fns', () => ({
  format: (date, fmt) => String(date),
}));

// react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) => <div>{children(
    { innerRef: () => {}, droppableProps: {}, placeholder: null },
    {}
  )}</div>,
  Draggable: ({ children }) => <div>{children(
    { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
    {}
  )}</div>,
}));

// Child components
jest.mock('../../vendor/create.js', () => require('react').forwardRef((props, ref) => null));
jest.mock('../../product/create.js', () => require('react').forwardRef((props, ref) => null));
jest.mock('../../product/view.js', () => require('react').forwardRef((props, ref) => null));
jest.mock('../SourceDocumentPicker.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../order/preview.js', () => require('react').forwardRef((props, ref) => null));
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/vendor_pending.js', () => require('react').forwardRef((props, ref) => null));

// Utility mocks
jest.mock('../../utils/vendors.js', () => () => null);
jest.mock('../../utils/products.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));
jest.mock('../../i18n/dateLocales', () => ({
  getDateLocale: () => undefined,
}));
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: (obj) => '',
}));

import PurchaseOrderCreate from '../create.js';

const product = (id, price) => ({
  id, name: `Part ${id}`, part_number: `PN-${id}`, unit: 'PC',
  product_stores: { s1: { purchase_unit_price: price, purchase_unit_price_with_vat: price * 1.15, stock: 0 } },
});
const lineInputs = (i) => document.querySelectorAll('tbody tr')[i].querySelectorAll('input[type=text]');
const tick = (ms) => act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); });

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.setItem('store_id', 's1');
  localStorage.setItem('access_token', 't');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {} }),
  });
});
afterEach(() => { jest.clearAllTimers(); localStorage.clear(); });

async function addLine(p) {
  await act(async () => { typeaheads.po_product_id.onChange([p]); });
  await tick(400);
}

test('a unit price edited on line 1 survives tabbing through the row and adding/editing line 2', async () => {
  const ref = React.createRef();
  render(<MemoryRouter><PurchaseOrderCreate ref={ref} /></MemoryRouter>);
  await act(async () => { ref.current.open(); });
  await tick(100);

  await addLine(product('a', 60));
  let [, price, priceVat] = lineInputs(0);
  expect(parseFloat(price.value)).toBe(60);

  // Type 40 and Tab on to the price-with-VAT box, as a person does; it takes focus
  // before the line is recalculated, then is left without typing.
  fireEvent.focus(price);
  fireEvent.change(price, { target: { value: '40' } });
  fireEvent.blur(price);
  fireEvent.focus(priceVat);
  fireEvent.blur(priceVat);
  await tick(500);
  [, price, priceVat] = lineInputs(0);
  expect(parseFloat(price.value)).toBe(40);
  expect(parseFloat(priceVat.value)).toBe(46);

  await addLine(product('b', 12.5));
  const [qtyB] = lineInputs(1);
  fireEvent.focus(qtyB);
  fireEvent.change(qtyB, { target: { value: '2' } });
  fireEvent.blur(qtyB);
  await tick(500);
  expect(parseFloat(lineInputs(0)[1].value)).toBe(40);
  expect(parseFloat(lineInputs(1)[0].value)).toBe(2);
});

test('a price-with-VAT typed and left still sets the unit price', async () => {
  const ref = React.createRef();
  render(<MemoryRouter><PurchaseOrderCreate ref={ref} /></MemoryRouter>);
  await act(async () => { ref.current.open(); });
  await tick(100);
  await addLine(product('a', 60));
  const priceVat = lineInputs(0)[2];
  fireEvent.focus(priceVat);
  fireEvent.change(priceVat, { target: { value: '115' } });
  fireEvent.blur(priceVat);
  await tick(500);
  expect(parseFloat(lineInputs(0)[1].value)).toBe(100);
});
