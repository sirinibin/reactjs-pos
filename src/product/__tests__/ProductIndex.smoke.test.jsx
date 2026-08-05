// Smoke test: ProductIndex renders without crashing
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS / image assets ──────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const passthrough = ({ children }) => children || null;
  return {
    Button: passthrough,
    Spinner: () => null,
    Modal: Object.assign(passthrough, {
      Header: passthrough,
      Title: passthrough,
      Body: passthrough,
      Footer: passthrough,
    }),
    Form: Object.assign(passthrough, {
      Group: passthrough,
      Label: passthrough,
      Control: () => <input />,
      Check: () => <input type="checkbox" />,
      Select: () => <select />,
      Row: passthrough,
      Text: passthrough,
    }),
    Row: passthrough,
    Col: passthrough,
    Table: passthrough,
    Alert: passthrough,
    Badge: passthrough,
    OverlayTrigger: ({ children }) => children,
    Tooltip: passthrough,
    Dropdown: Object.assign(passthrough, {
      Toggle: passthrough,
      Menu: passthrough,
      Item: passthrough,
    }),
  };
});

// react-bootstrap/Dropdown (named direct import)
jest.mock('react-bootstrap/Dropdown', () => {
  const passthrough = ({ children }) => children || null;
  return Object.assign(passthrough, {
    Toggle: passthrough,
    Menu: passthrough,
    Item: passthrough,
  });
});

// ── react-router-dom ─────────────────────────────────────────────────────────
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
  Menu: () => null,
  MenuItem: () => null,
}));

// ── react-bootstrap-confirmation ──────────────────────────────────────────────
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(true)),
}));

// ── react-select-country-list ─────────────────────────────────────────────────
jest.mock('react-select-country-list', () => () => ({
  getData: () => [],
}));

// ── Child domain components ───────────────────────────────────────────────────
jest.mock('../create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../json.js', () => () => null);
jest.mock('../view.js', () => { const R = require('react'); return R.forwardRef(() => null); });

// ── Utils / shared components ─────────────────────────────────────────────────
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/product_sales_history.js', () => () => null);
jest.mock('../../utils/product_sales_return_history.js', () => () => null);
jest.mock('../../utils/product_purchase_history.js', () => () => null);
jest.mock('../../utils/product_purchase_return_history.js', () => () => null);
jest.mock('../../utils/product_quotation_history.js', () => () => null);
jest.mock('../../utils/product_quotation_sales_return_history.js', () => () => null);
jest.mock('../../utils/product_delivery_note_history.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/ImageViewerModal', () => () => null);
jest.mock('../../utils/products.js', () => () => null);
jest.mock('../../utils/product_history.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);

// ── Pure utility helpers (non-component) ─────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => v,
}));

jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [],
    setColumns: jest.fn(),
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

// ── Subject ───────────────────────────────────────────────────────────────────
import ProductIndex from '../index.js';

// ── Timer / fetch setup ───────────────────────────────────────────────────────
beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ProductIndex smoke test', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <ProductIndex />
      </MemoryRouter>
    );
  });

  it('renders in service mode without crashing', () => {
    render(
      <MemoryRouter>
        <ProductIndex isService={true} />
      </MemoryRouter>
    );
  });

  it('renders with enableSelection prop without crashing', () => {
    render(
      <MemoryRouter>
        <ProductIndex enableSelection={true} />
      </MemoryRouter>
    );
  });
});
