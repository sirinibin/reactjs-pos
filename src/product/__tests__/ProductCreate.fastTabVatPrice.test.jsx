// Regression: a fast Tab after typing a price must not save a stale
// VAT-inclusive price. All price inputs share one timerRef; the with-VAT
// recalculation used to be deferred 100 ms via that timer and Tab
// (onKeyDown + next field's onFocus) cleared it, so e.g. retail 125 was
// saved together with the old retail_unit_price_with_vat 115.
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
jest.mock('../../utils/search.js', () => ({
  highlightWords: (text) => text,
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: () => {},
}));

import ProductCreate from '../create.js';
import { fetchStore } from '../../utils/storeUtils.js';

const jsonResponse = (body) => ({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body),
});

let existingProduct;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('access_token', 'tok');
  localStorage.setItem('store_id', 'store1');
  // CRA enables resetMocks, so (re)install the implementation per test
  fetchStore.mockImplementation(() => Promise.resolve({ id: 'store1', vat_percent: 15, settings: {} }));
  existingProduct = {
    id: 'p1',
    name: 'Widget',
    category: [],
    product_stores: {
      store1: {
        store_id: 'store1',
        purchase_unit_price: 80,
        purchase_unit_price_with_vat: 92,
        wholesale_unit_price: 90,
        wholesale_unit_price_with_vat: 103.5,
        retail_unit_price: 100,
        retail_unit_price_with_vat: 115,
      },
    },
  };
  global.fetch = jest.fn((url, opts) => {
    if (opts && (opts.method === 'POST' || opts.method === 'PUT')) {
      return Promise.resolve(jsonResponse({ result: { id: 'p1' } }));
    }
    if (String(url).startsWith('/v1/product/p1')) {
      return Promise.resolve(jsonResponse({ result: JSON.parse(JSON.stringify(existingProduct)) }));
    }
    return Promise.resolve(jsonResponse({ result: [], data: [], total_count: 0 }));
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const flush = (ms = 0) => act(() => new Promise((r) => setTimeout(r, ms)));

async function openForm(id) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <ProductCreate ref={ref} />
    </MemoryRouter>
  );
  await act(async () => { await ref.current.open(id); });
  await flush(20);
  return utils;
}

function typeThenTab(container, fromId, toId, value) {
  const from = container.querySelector('#' + fromId);
  const to = container.querySelector('#' + toId);
  fireEvent.focus(from);
  fireEvent.change(from, { target: { value } });
  // Tab immediately: keydown on the current field, focus on the next one
  fireEvent.keyDown(from, { key: 'Tab', code: 'Tab' });
  fireEvent.blur(from);
  fireEvent.focus(to);
}

function savedBody() {
  const call = global.fetch.mock.calls.find(([, o]) => o && (o.method === 'POST' || o.method === 'PUT'));
  expect(call).toBeTruthy();
  return { method: call[1].method, body: JSON.parse(call[1].body) };
}

describe('ProductCreate — fast Tab after typing a price keeps VAT prices consistent', () => {
  it('update: retail Excl. VAT 125 + immediate Tab + immediate save sends retail_unit_price_with_vat 143.75', async () => {
    const { container } = await openForm('p1');
    expect(container.querySelector('#product_retail_unit_price').value).toBe('100');

    typeThenTab(container, 'product_retail_unit_price', 'product_retail_unit_price_with_vat', '125');
    await act(async () => { fireEvent.submit(container.querySelector('form.pw-form')); });
    await flush(20);

    const { method, body } = savedBody();
    expect(method).toBe('PUT');
    expect(body.product_stores.store1.retail_unit_price).toBe(125);
    expect(body.product_stores.store1.retail_unit_price_with_vat).toBe(143.75);
  });

  it('update: after Tab the Incl. VAT field shows the recalculated value', async () => {
    const { container } = await openForm('p1');
    typeThenTab(container, 'product_retail_unit_price', 'product_retail_unit_price_with_vat', '125');
    await flush(300);
    expect(container.querySelector('#product_retail_unit_price_with_vat').value).toBe('143.75');
  });

  it('create: purchase Excl. VAT 100 + immediate Tab + immediate save sends purchase_unit_price_with_vat 115', async () => {
    const { container } = await openForm();
    typeThenTab(container, 'product_purchase_unit_price_0', 'product_purchase_unit_price_with_vat_0', '100');
    await act(async () => { fireEvent.submit(container.querySelector('form.pw-form')); });
    await flush(20);

    const { method, body } = savedBody();
    expect(method).toBe('POST');
    expect(body.product_stores.store1.purchase_unit_price).toBe(100);
    expect(body.product_stores.store1.purchase_unit_price_with_vat).toBe(115);
  });

  it('update: wholesale Incl. VAT 230 + immediate Tab + immediate save sends wholesale_unit_price 200', async () => {
    const { container } = await openForm('p1');
    typeThenTab(container, 'product_wholesale_unit_price_with_vat', 'product_retail_unit_price_with_vat', '230');
    await act(async () => { fireEvent.submit(container.querySelector('form.pw-form')); });
    await flush(20);

    const { body } = savedBody();
    expect(body.product_stores.store1.wholesale_unit_price_with_vat).toBe(230);
    expect(body.product_stores.store1.wholesale_unit_price).toBe(200);
  });
});
