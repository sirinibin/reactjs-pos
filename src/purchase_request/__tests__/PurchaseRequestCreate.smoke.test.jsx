import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// CSS mocks
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// react-datepicker
jest.mock('react-datepicker', () => () => null);

// react-bootstrap
jest.mock('react-bootstrap', () => ({
  Modal: ({ children, show }) => (show ? <div>{children}</div> : null),
  'Modal.Header': ({ children }) => <div>{children}</div>,
  'Modal.Title': ({ children }) => <div>{children}</div>,
  'Modal.Body': ({ children }) => <div>{children}</div>,
  'Modal.Footer': ({ children }) => <div>{children}</div>,
  Spinner: () => null,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Form: ({ children }) => <form>{children}</form>,
  'Form.Group': ({ children }) => <div>{children}</div>,
  'Form.Label': ({ children }) => <label>{children}</label>,
  'Form.Control': (props) => <input {...props} />,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
  Container: ({ children }) => <div>{children}</div>,
  InputGroup: ({ children }) => <div>{children}</div>,
  'InputGroup.Text': ({ children }) => <span>{children}</span>,
  Badge: ({ children }) => <span>{children}</span>,
  Alert: ({ children }) => <div>{children}</div>,
}));

// react-bootstrap-typeahead
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  Menu: ({ children }) => <div>{children}</div>,
  MenuItem: ({ children }) => <div>{children}</div>,
}));

// react-number-format
jest.mock('react-number-format', () => () => null);

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
jest.mock('../../product/create.js', () => () => null);
jest.mock('../../product/view.js', () => () => null);
jest.mock('../../utils/products.js', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../order/preview.js', () => () => null);

// Utility modules
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => v,
}));
jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));
jest.mock('../../i18n/dateLocales', () => ({
  getDateLocale: () => undefined,
}));

// date-fns
jest.mock('date-fns', () => ({
  format: (date, fmt) => String(date),
}));

import PurchaseRequestCreate from '../create.js';

describe('PurchaseRequestCreate smoke test', () => {
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
        <PurchaseRequestCreate ref={ref} />
      </MemoryRouter>
    );
    // Component renders without throwing
    expect(true).toBe(true);
  });
});
