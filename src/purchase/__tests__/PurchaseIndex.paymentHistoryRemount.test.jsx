/**
 * Regression: the "Payment history" dialog of the Purchases list must not remount its
 * content when the list re-renders (websocket "purchase_updated" refresh, a toast in
 * the Dashboard). It used an inline `dialogAs={(...) => ...}`, a new component type
 * on every render, so every re-render unmounted PurchasePaymentIndex and the Add
 * Payment form inside it: the form closed by itself and lost what was typed, and
 * after a save its DetailsViewRef was already null.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }),
}));
jest.mock('react-datepicker', () => () => null);

jest.mock('react-bootstrap', () => {
  const React = require('react');
  const Button = ({ children, onClick, disabled, className, style }) =>
    React.createElement('button', { onClick, disabled, className, style }, children);
  const Spinner = () => null;
  const Alert = ({ children }) => React.createElement('div', null, children);
  // Like the real Modal: renders its content through `dialogAs` when given.
  const Modal = Object.assign(
    ({ show, children, dialogAs: Dialog }) => {
      if (!show) return null;
      return Dialog
        ? React.createElement(Dialog, null, children)
        : React.createElement('div', { 'data-testid': 'modal' }, children);
    },
    {
      Header: ({ children }) => React.createElement('div', null, children),
      Title: ({ children }) => React.createElement('div', null, children),
      Body: ({ children }) => React.createElement('div', null, children),
      Footer: ({ children }) => React.createElement('div', null, children),
    }
  );
  return { Button, Spinner, Modal, Alert };
});

jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null, AsyncTypeahead: () => null }));
jest.mock('react-paginate', () => () => null);
jest.mock('react-draggable', () => {
  const React = require('react');
  return ({ children }) => React.createElement(React.Fragment, null, children);
});
jest.mock('react-data-export', () => {
  const React = require('react');
  const ExcelFile = Object.assign(({ children }) => React.createElement('div', null, children), { ExcelSheet: () => null });
  return { __esModule: true, default: { ExcelFile } };
});
jest.mock('../../i18n/dateLocales', () => ({ getDateLocale: () => undefined }));
jest.mock('../../utils/OverflowTooltip.js', () => {
  const React = require('react');
  return ({ value }) => React.createElement('span', null, value);
});
jest.mock('../../utils/dateUtils.js', () => ({ TimeAgo: () => null }));
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: (v) => (v != null ? String(v) : '0') }));
jest.mock('../../utils/amount.js', () => {
  const React = require('react');
  return ({ amount }) => React.createElement('span', null, amount);
});
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/SuccessModal.js', () => () => null);
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: () => '' }));
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [{ key: 'total_payment_paid', fieldName: 'total_payment_paid', label: 'Paid', visible: true }],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/WebSocketContext.js', () => {
  const R = require('react');
  return { WebSocketContext: R.createContext({ lastMessage: null, sendMessage: jest.fn() }) };
});
jest.mock('../../utils/eventEmitter', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

jest.mock('../create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../purchase_return/index.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../purchase_return/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/preview.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/report.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../order/print.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn().mockResolvedValue({}) }));
jest.mock('../../utils/PaginationControls.js', () => () => null);
jest.mock('../../vendor/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });

// Stand-in for the payment history: counts mounts and holds a typed value in state,
// the way the real Add Payment form does.
const mounts = { count: 0 };
jest.mock('../../purchase_payment/index.js', () => {
  const R = require('react');
  return R.forwardRef(() => {
    const [amount, setAmount] = R.useState('');
    R.useEffect(() => { mounts.count += 1; }, []);
    return R.createElement('input', {
      'data-testid': 'payment-amount', value: amount, onChange: (e) => setAmount(e.target.value),
    });
  });
});

import PurchaseIndex from '../index.js';
import { WebSocketContext } from '../../utils/WebSocketContext.js';

const ORDER = { id: 'p1', code: 'P-0001', total_payment_paid: '12.5', net_total: 100, balance_amount: 87.5 };

beforeEach(() => {
  mounts.count = 0;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  localStorage.setItem('access_token', 'tok');
  global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: [ORDER], total_count: 1, meta: {} }),
  }));
});
afterEach(() => jest.restoreAllMocks());

function ui(lastMessage, showToastMessage = jest.fn()) {
  return (
    <WebSocketContext.Provider value={{ lastMessage, sendMessage: jest.fn() }}>
      <MemoryRouter><PurchaseIndex showToastMessage={showToastMessage} /></MemoryRouter>
    </WebSocketContext.Provider>
  );
}

test('payment history content survives a websocket list refresh and parent re-renders', async () => {
  const { rerender } = render(ui(null));
  const link = await screen.findByRole('button', { name: '12.5' });
  fireEvent.click(link);

  const input = await screen.findByTestId('payment-amount');
  fireEvent.change(input, { target: { value: '50' } });
  expect(mounts.count).toBe(1);

  // Another sale in the store: the list refreshes.
  const fetchesBefore = global.fetch.mock.calls.length;
  rerender(ui({ data: JSON.stringify({ event: 'purchase_updated' }) }));
  await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(fetchesBefore));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  // A toast in the Dashboard re-renders the list with a new callback.
  rerender(ui({ data: JSON.stringify({ event: 'purchase_updated' }) }, jest.fn()));

  expect(mounts.count).toBe(1);
  expect(screen.getByTestId('payment-amount')).toHaveValue('50');
});
