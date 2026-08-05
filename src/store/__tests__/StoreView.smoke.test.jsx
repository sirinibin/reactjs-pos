import React, { createRef } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null };
});

jest.mock('../../utils/imageUtils', () => ({ resolveImageUrl: jest.fn((u) => u || '') }));
jest.mock('../../utils/dateUtils.js', () => ({ formatInStoreTimezone: jest.fn((d) => String(d)) }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: {}, store: {}, settings: {} }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import StoreView from '../view.js';

describe('StoreView smoke test', () => {
  it('renders without crashing', () => {
    const ref = createRef();
    render(<MemoryRouter><StoreView ref={ref} /></MemoryRouter>);
  });

  it('exposes open() via ref', () => {
    const ref = createRef();
    render(<MemoryRouter><StoreView ref={ref} /></MemoryRouter>);
    expect(typeof ref.current?.open).toBe('function');
  });
});
