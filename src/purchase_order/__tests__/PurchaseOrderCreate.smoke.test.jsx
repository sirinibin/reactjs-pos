import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS mocks
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-bootstrap
jest.mock('react-bootstrap', () => ({
  Modal: ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null),
  Spinner: () => <div data-testid="spinner" />,
}));

// react-bootstrap-typeahead
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: ({ children }) => <div>{children}</div>,
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
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => v,
}));
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

describe('PurchaseOrderCreate smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <PurchaseOrderCreate ref={ref} />
      </MemoryRouter>
    );
    // Component mounts without throwing
  });
});
