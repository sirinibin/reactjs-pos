import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null, Badge: P };
});
jest.mock('react-datepicker', () => () => null);
jest.mock('react-bootstrap-typeahead', () => ({ Typeahead: () => null }));
jest.mock('react-number-format', () => () => null);

jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// CapitalCreate and CapitalView both receive a ref from the parent — must use forwardRef
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});

jest.mock('../../user/create.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});
jest.mock('../../user/view.js', () => {
  const R = require('react');
  return R.forwardRef(() => null);
});

jest.useFakeTimers();

// NOTE: CRA's jest config has resetMocks:true which calls jest.resetAllMocks() before
// every test, stripping any mockResolvedValue set at module scope.  Set global.fetch
// inside beforeEach so it is always re-applied after the automatic reset.
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    // meta.total is required — the component reads data.meta.total
    json: () => Promise.resolve({ result: [], total_count: 0, meta: { total: 0 } }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import CapitalIndex from '../index.js';

describe('CapitalIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(<MemoryRouter><CapitalIndex /></MemoryRouter>);
    });
  });
});
