import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null, Form: P, Row: P, Col: P, Alert: P, Table: P };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null, AsyncTypeahead: () => null, Menu: () => null, MenuItem: () => null }));

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));
jest.mock('../../utils/search.js', () => ({ highlightWords: jest.fn((t) => t) }));
jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: jest.fn((n) => n) }));
jest.mock('../../utils/amount.js', () => () => null);
jest.mock('../../expense_category/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../expense_category/view.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../vendor/create.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/vendors.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import ExpenseCreate from '../create.js';

describe('ExpenseCreate smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><ExpenseCreate ref={ref} /></MemoryRouter>);
  });

  it('exposes open() method via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><ExpenseCreate ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });
});
