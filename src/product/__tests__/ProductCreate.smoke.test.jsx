// Smoke test: ProductCreate renders without crashing
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap ───────────────────────────────────────────────────────────
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

// ── react-router-dom ──────────────────────────────────────────────────────────
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
  Menu: () => null,
  MenuItem: () => null,
}));

// ── react-select-country-list ─────────────────────────────────────────────────
jest.mock('react-select-country-list', () => () => ({
  getData: () => [],
}));

// ── Child domain components ───────────────────────────────────────────────────
jest.mock('../../store/create.js', () => () => null);
jest.mock('../../product_category/create.js', () => () => null);
jest.mock('../../product_brand/create.js', () => () => null);
jest.mock('../../arabic_name/create.js', () => () => null);
jest.mock('../../arabic_name/index.js', () => () => null);

// ── Utils / shared components ─────────────────────────────────────────────────
jest.mock('../../utils/ImageGallery.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/product_sales_history.js', () => () => null);
jest.mock('../../utils/product_sales_return_history.js', () => () => null);
jest.mock('../../utils/product_purchase_history.js', () => () => null);
jest.mock('../../utils/product_purchase_return_history.js', () => () => null);
jest.mock('../../utils/product_quotation_history.js', () => () => null);
jest.mock('../../utils/product_quotation_sales_return_history.js', () => () => null);
jest.mock('../../utils/product_delivery_note_history.js', () => () => null);
jest.mock('../../utils/products.js', () => () => null);
jest.mock('../../utils/ImageViewerModal', () => () => null);
jest.mock('../../utils/product_history.js', () => () => null);

// ── Pure utility helpers (non-component) ──────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (v) => v,
  trimTo8Decimals: (v) => v,
  trimTo4Decimals: (v) => v,
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

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: () => {},
}));

// ── Subject ───────────────────────────────────────────────────────────────────
import ProductCreate from '../create.js';

// ── Timer / fetch setup ───────────────────────────────────────────────────────
beforeAll(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: {},
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ProductCreate smoke test', () => {
  it('renders without crashing', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ProductCreate ref={ref} />
      </MemoryRouter>
    );
  });
});
