import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, { Item: P, Toggle: P, Menu: P });
  return { Modal, Button: P, Spinner: () => null, Dropdown: DD, Badge: P };
});
jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null, Menu: () => null, MenuItem: () => null }));
jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));
jest.mock('react-number-format', () => (p) => <input />);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({ columns: [], showSettings: false, setShowSettings: jest.fn(), handleToggleColumn: jest.fn(), onDragEnd: jest.fn(), restoreDefaults: jest.fn() }),
}));
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../quotation/QuotationType3Form.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../repair_job/card_view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../customer/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../product/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../service/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/preview.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../quotation/view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/search.js', () => ({ highlightWords: jest.fn((t) => t) }));
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../utils/WebSocketContext.js', () => {
  const R = require('react');
  return { WebSocketContext: R.createContext({ lastMessage: null }) };
});

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: [], total_count: 0 }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import NonVatSalesIndex from '../index.js';

describe('NonVatSalesIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(<MemoryRouter><NonVatSalesIndex /></MemoryRouter>);
    });
  });
});

// The list used to be fetched twice on open (the page effect and the filter effect),
// and three times in the pendings view.
describe('NonVatSalesIndex API calls', () => {
  // The CRA config resets mocks before each test, which leaves the fake setTimeout a no-op.
  beforeEach(() => jest.useFakeTimers());
  const listCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).startsWith('/v1/non-vat-sales?'));

  test('loads the list once on open', async () => {
    await act(async () => { render(<MemoryRouter><NonVatSalesIndex /></MemoryRouter>); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(listCalls()).toHaveLength(1);
  });

  test('loads the list once in the pendings view, and again when the customer changes', async () => {
    const a = [{ id: 'c1' }];
    let view;
    await act(async () => { view = render(<MemoryRouter><NonVatSalesIndex pendingView selectedCustomers={a} /></MemoryRouter>); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(listCalls()).toHaveLength(1);
    expect(listCalls()[0][0]).toContain('search[customer_id]=c1');
    await act(async () => { view.rerender(<MemoryRouter><NonVatSalesIndex pendingView selectedCustomers={[{ id: 'c2' }]} /></MemoryRouter>); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(listCalls()).toHaveLength(2);
    expect(listCalls()[1][0]).toContain('search[customer_id]=c2');
  });
});
