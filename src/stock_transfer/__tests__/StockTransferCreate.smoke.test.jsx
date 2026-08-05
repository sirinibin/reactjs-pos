import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('../../order/style.css', () => ({}));

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, { Item: P, Toggle: P, Menu: P });
  return {
    Modal, Button: P, Spinner: () => null, Form: P, Row: P, Col: P,
    Alert: P, Table: P, Dropdown: DD,
    OverlayTrigger: ({ children }) => <>{children}</>, Tooltip: P,
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
  Menu: () => null,
  MenuItem: () => null,
}));
jest.mock('react-number-format', () => () => <input />);
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <>{children}</>,
  Droppable: ({ children }) => <>{typeof children === 'function' ? children({ droppableProps: {}, innerRef: null, placeholder: null }, {}) : children}</>,
  Draggable: ({ children }) => <>{typeof children === 'function' ? children({ draggableProps: {}, dragHandleProps: {}, innerRef: null }, {}) : children}</>,
}));
jest.mock('react-debounce-input', () => ({ DebounceInput: (p) => <input /> }));
jest.mock('bootstrap', () => ({}));

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: jest.fn((n) => n),
  trimTo8Decimals: jest.fn((n) => n),
}));
jest.mock('../../utils/search.js', () => ({ highlightWords: jest.fn((s) => s) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));

jest.mock('../../utils/ResizableTableCell.js', () => () => null);
jest.mock('../../utils/product_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_sales_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_sales_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_quotation_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_quotation_sales_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_delivery_note_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/products.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/quotations.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/delivery_notes.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/amount.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/ImageViewerModal.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/SuccessModal.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/TableSettingsModal.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.mock('../../product/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../product/view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../user/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/preview.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/print.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../quotation/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../delivery_note/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../view.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import StockTransferCreate from '../create.js';

describe('StockTransferCreate smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><StockTransferCreate ref={ref} /></MemoryRouter>);
  });
});
