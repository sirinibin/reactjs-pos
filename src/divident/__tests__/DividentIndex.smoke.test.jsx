import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// --- react-bootstrap ---
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null, Badge: P };
});

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap-typeahead ---
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// --- react-number-format ---
jest.mock('react-number-format', () => () => null);

// --- Utils ---
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// --- Child domain components (all use ref → forwardRef with imperative open()) ---
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock('../../user/create.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock('../../user/view.js', () => {
  const R = require('react');
  return R.forwardRef((props, ref) => {
    R.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// --- Per-test setup: fake timers, fetch mock, localStorage stub ---
beforeEach(() => {
  jest.useFakeTimers();

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: { total: 0 },
      }),
  });

  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'access_token') return 'test-token';
    if (key === 'store_id') return 'store-123';
    return null;
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import DividentIndex from '../index.js';

describe('DividentIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <DividentIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });
});
