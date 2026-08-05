import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// react-bootstrap: Button, Spinner used in index.js
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  return { Button: P, Spinner: () => null };
});

// react-bootstrap-confirmation: confirm used in handleDelete
jest.mock('react-bootstrap-confirmation', () => ({
  confirm: jest.fn(() => Promise.resolve(false)),
}));

// CustomerPackageCreate is a forwardRef component; ref.open() only called on user interaction
jest.mock('../create.js', () => { const R = require('react'); return R.forwardRef(() => null); });

jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ status: true, result: [], total_count: 0 }),
  });
});

afterEach(() => { jest.clearAllMocks(); jest.clearAllTimers(); });

import CustomerPackageIndex from '../index.js';

describe('CustomerPackageIndex smoke test', () => {
  test('renders without crashing', async () => {
    await act(async () => {
      render(<MemoryRouter><CustomerPackageIndex /></MemoryRouter>);
    });
  });

  test('renders with showToastMessage prop without crashing', async () => {
    const showToastMessage = jest.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <CustomerPackageIndex showToastMessage={showToastMessage} />
        </MemoryRouter>
      );
    });
  });
});
