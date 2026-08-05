import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null };
});
jest.mock('react-number-format', () => (p) => <input />);
jest.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));

jest.mock('../../utils/numberUtils', () => ({ trimTo2Decimals: jest.fn((n) => n) }));
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/dateUtils.js', () => ({
  formatInStoreTimezone: jest.fn((d) => String(d)),
  formatPaymentMethod: jest.fn((m) => String(m)),
}));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));

jest.mock('../preview.js', () => { const R = require('react'); return R.forwardRef(() => null); });
jest.mock('../print.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import OrderView from '../view.js';

describe('OrderView smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><OrderView ref={ref} /></MemoryRouter>);
  });

  it('exposes open() via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><OrderView ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });
});
