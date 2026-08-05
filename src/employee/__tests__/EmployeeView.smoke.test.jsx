import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-i18next ---
// Plain arrow function (not jest.fn) so resetMocks:true cannot clear it.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// --- react-bootstrap ---
// Modal sub-components must be defined on the constructor because the
// component references Modal.Header / Modal.Title / Modal.Body / Modal.Footer.
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const P = ({ children }) => React.createElement(React.Fragment, null, children);
  const Modal = ({ show, children }) =>
    show ? React.createElement('div', null, children) : null;
  Modal.Header = P;
  Modal.Title = P;
  Modal.Body = P;
  Modal.Footer = P;
  return {
    Modal,
    Button: P,
    Spinner: () => null,
  };
});

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- date-fns ---
// jest.fn() — implementation re-set in beforeEach because resetMocks:true clears it.
jest.mock('date-fns', () => ({
  format: jest.fn(),
}));

// --- Utility function mocks ---
// All use jest.fn() — implementations are re-set in beforeEach.
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(),
}));

jest.mock('../../utils/employeeBalance.js', () => ({
  getEmployeeBalanceInfo: jest.fn(),
}));

jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(),
}));

jest.mock('../../utils/timezone.js', () => ({
  toStoreLocalDate: jest.fn(),
  fromStoreLocalDate: jest.fn(),
}));

// --- Child component from this domain ---
// Must be a forwardRef component because EmployeeView attaches a ref to it.
jest.mock('../salaryPayment.js', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

// --- Import mocked modules so we can re-set implementations in beforeEach ---
// (resetMocks:true resets every jest.fn() before each test; beforeEach re-arms them)
import { ObjectToSearchQueryParams } from '../../utils/queryUtils.js';
import { getEmployeeBalanceInfo } from '../../utils/employeeBalance.js';
import { fetchStore } from '../../utils/storeUtils.js';
import { toStoreLocalDate } from '../../utils/timezone.js';
import { format } from 'date-fns';

// --- Import subject under test (after all mocks are declared) ---
import EmployeeView from '../view.js';

// ---------------------------------------------------------------------------
// Test setup — beforeEach re-arms every jest.fn() implementation because
// resetMocks:true (active in this project's jest config) wipes implementations
// before each test, including those set inside jest.mock() factory functions.
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.useFakeTimers();

  localStorage.setItem('access_token', 'test-token');
  localStorage.setItem('store_id', 'test-store-id');

  // Re-arm module-level mocks cleared by resetMocks:true
  ObjectToSearchQueryParams.mockReturnValue('');
  getEmployeeBalanceInfo.mockReturnValue({
    label: 'Balance',
    colorHex: '#1a7a3a',
    amount: 0,
    suffix: '',
  });
  fetchStore.mockResolvedValue({ country_code: 'US' });
  toStoreLocalDate.mockImplementation((iso) => (iso ? new Date(iso) : new Date()));
  format.mockReturnValue('Jan 01 2026, 12:00 PM');

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, store: {}, settings: {} }),
  });
});

afterEach(() => {
  jest.clearAllTimers();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Smoke tests
// ---------------------------------------------------------------------------
describe('EmployeeView smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><EmployeeView ref={ref} /></MemoryRouter>);
  });

  it('exposes open() via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><EmployeeView ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });
});
