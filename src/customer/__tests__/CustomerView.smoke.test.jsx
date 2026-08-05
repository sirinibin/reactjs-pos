import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, { Item: P, Toggle: P, Menu: P });
  return { Modal, Button: P, Spinner: () => null, Dropdown: DD };
});

jest.mock('../../utils/ImageGallery.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/dateUtils.js', () => ({ formatInStoreTimezone: jest.fn((d) => String(d)) }));
jest.mock('../../utils/sales.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/salesReturn.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/quotations.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/quotation_sales_returns.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import CustomerView from '../view.js';

describe('CustomerView smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><CustomerView ref={ref} /></MemoryRouter>);
  });

  it('exposes open() via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><CustomerView ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });

  it('modal hidden before open()', () => {
    const ref = createRef();
    const { queryByRole } = render(<MemoryRouter><CustomerView ref={ref} /></MemoryRouter>);
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
