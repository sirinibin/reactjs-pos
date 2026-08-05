import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null };
});

jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/PaginationControls.js', () => () => null);

jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});

import ArabicNameIndex from '../index.js';

describe('ArabicNameIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: [], data: [], total_count: 0, store: {}, settings: {} }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing in standalone mode', async () => {
    await act(async () => {
      render(<MemoryRouter><ArabicNameIndex /></MemoryRouter>);
    });
  });

  test('renders without crashing in modal mode via ref', async () => {
    const ref = React.createRef();
    await act(async () => {
      render(<MemoryRouter><ArabicNameIndex ref={ref} /></MemoryRouter>);
    });
    // open the modal
    await act(async () => {
      ref.current.open();
    });
  });
});
