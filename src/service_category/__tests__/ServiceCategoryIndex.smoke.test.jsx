import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// react-bootstrap: Button, Spinner used in index.js
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  return { Button: P, Spinner: () => null };
});

// react-paginate: ReactPaginate (default export) used in index.js
jest.mock('react-paginate', () => () => null);

// react-bootstrap-confirmation: confirm used in handleDelete
jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn(() => Promise.resolve(false)) }));

// utils
jest.mock('../../utils/queryUtils.js', () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));

// child domain component
jest.mock('../create.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: [], total_count: 0, criterias: { total_pages: 0 } }),
});
afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import ServiceCategoryIndex from '../index.js';

describe('ServiceCategoryIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(<MemoryRouter><ServiceCategoryIndex showToastMessage={jest.fn()} /></MemoryRouter>);
    });
  });
});
