import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import ProductHistory from '../product_history.js';

// Opening a product's history used to load the history list twice (two mount effects).
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  return { Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>, Spinner: () => null, OverlayTrigger: P, Tooltip: P };
});
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null }));
const fwd = () => { const R = require('react'); return R.forwardRef(() => null); };
jest.mock('../../order/create.js', () => fwd());
jest.mock('../../stock_transfer/create.js', () => fwd());
jest.mock('../../sales_return/create.js', () => fwd());
jest.mock('../../purchase/create.js', () => fwd());
jest.mock('../../purchase_return/create.js', () => fwd());
jest.mock('../../quotation/create.js', () => fwd());
jest.mock('../../quotation_sales_return/create.js', () => fwd());
jest.mock('../../delivery_note/create.js', () => fwd());
jest.mock('../../customer/create.js', () => fwd());
jest.mock('../../vendor/create.js', () => fwd());
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({ settings: {} })) }));
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({ columns: [], showSettings: false, setShowSettings: jest.fn(), handleToggleColumn: jest.fn(), onDragEnd: jest.fn(), restoreDefaults: jest.fn() }),
}));


beforeEach(() => {
  localStorage.setItem('store_id', 's1');
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: [], total_count: 0, meta: {} }),
  }));
});

const historyCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/v1/product/history/'));
// Wait for the first load, then let every pending effect and promise settle.
async function settle() {
  await waitFor(() => expect(historyCalls().length).toBeGreaterThan(0));
  // Past the 200 ms filter delay.
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
}

test('opening a product history loads the list once, for that product', async () => {
  await act(async () => { render(<ProductHistory model={{ id: 'p1', name: 'Item' }} />); });
  await settle();
  expect(historyCalls()).toHaveLength(1);
  expect(historyCalls()[0][0]).toContain('/v1/product/history/p1?');
  expect(global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/v1/warehouse'))).toHaveLength(1);
});

test('with a customer chosen in the form it still loads once, filtered by that customer', async () => {
  await act(async () => { render(<ProductHistory model={{ product_id: 'p2', name: 'Item' }} selectedCustomers={[{ id: 'c1', name: 'C' }]} />); });
  await settle();
  expect(historyCalls()).toHaveLength(1);
  expect(decodeURIComponent(historyCalls()[0][0])).toContain('search[customer_id]=c1');
});

test('with a vendor chosen (purchase form) it loads once, filtered by that vendor', async () => {
  await act(async () => { render(<ProductHistory model={{ id: 'p3', name: 'Item' }} selectedVendors={[{ id: 'v1', name: 'V' }]} />); });
  await settle();
  expect(historyCalls()).toHaveLength(1);
  expect(decodeURIComponent(historyCalls()[0][0])).toContain('search[vendor_id]=v1');
});
