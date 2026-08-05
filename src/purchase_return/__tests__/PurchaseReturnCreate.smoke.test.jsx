import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, { Item: P, Toggle: P, Menu: P });
  return {
    Modal, Button: P, Spinner: () => null, Form: P, Row: P, Col: P,
    Alert: P, Table: P, Dropdown: DD,
    OverlayTrigger: ({ children }) => children, Tooltip: P, Popover: P,
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
jest.mock('react-number-format', () => (p) => <input />);

jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => <>{children}</>,
  Droppable: ({ children }) => <>{children({ innerRef: () => { }, droppableProps: {}, placeholder: null }, {})}</>,
  Draggable: ({ children }) => <>{children({ innerRef: () => { }, draggableProps: {}, dragHandleProps: {} }, {})}</>,
}));

jest.mock('bootstrap', () => ({}));

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: jest.fn((n) => n), trimTo8Decimals: jest.fn((n) => n) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));
jest.mock('../../utils/search.js', () => ({ highlightWords: jest.fn((w) => w) }));
jest.mock('../../utils/ResizableTableCell', () => () => null);
jest.mock('../../utils/ImageViewerModal', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/product_sales_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_sales_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_quotation_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_delivery_note_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/products.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/vendor_pending.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/vendors.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.mock('../../i18n/dateLocales', () => ({ getDateLocale: jest.fn(() => undefined) }));

jest.mock('../../store/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../vendor/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../product/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../product/view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../user/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../signature/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/preview.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../purchase/view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../purchase/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../customer_deposit/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../view.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import PurchaseReturnCreate from '../create.js';

describe('PurchaseReturnCreate smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><PurchaseReturnCreate ref={ref} /></MemoryRouter>);
  });
});
