import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  const DD = Object.assign(({ children }) => <div>{children}</div>, { Item: P, Toggle: P, Menu: P });
  return { Modal, Button: P, Spinner: () => null, Dropdown: DD };
});
jest.mock('react-number-format', () => (p) => <input />);

jest.mock('../../utils/product_sales_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_sales_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_purchase_return_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_quotation_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../../utils/product_delivery_note_history.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import ProductView from '../view.js';

describe('ProductView smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><ProductView ref={ref} /></MemoryRouter>);
  });

  it('exposes open() via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><ProductView ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });
});
