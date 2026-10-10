// Regression: index.js had `<td> style={{ width: "auto", whiteSpace: "nowrap" }}`
// (the style object rendered as a child). React throws error #31 ("Objects
// are not valid as a React child") and the whole app goes blank as soon as
// a single capital withdrawal (drawing) exists.
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── CSS mocks ──────────────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Spinner: () => null, Badge: P };
});

// ── react-datepicker ───────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-number-format ────────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/storeUtils.js', () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// ── child domain components — all accept a ref, so forwardRef is required ──────
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

import CapitalWithdrawalIndex from '../index.js';

beforeEach(() => {
  localStorage.setItem('access_token', 'tok');
  localStorage.setItem('store_id', 'store1');
  // CRA enables resetMocks, so the fetch mock is (re)created per test
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [
          {
            id: 'cw1',
            code: 'CW-0001',
            date: '2026-10-01T10:00:00Z',
            amount: 250,
            payment_method: 'cash',
            description: 'Owner drawing',
            withdrawn_by_user_name: 'Owner Person',
            created_by_name: 'Admin',
            created_at: '2026-10-01T10:00:00Z',
          },
        ],
        total_count: 1,
        meta: { total: 250 },
      }),
  });
});

afterEach(() => {
  localStorage.clear();
});

describe('CapitalWithdrawalIndex — list with a drawing', () => {
  it('renders the row (withdrawn-by cell included) without throwing', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { findByText, getByText } = render(
      <MemoryRouter>
        <CapitalWithdrawalIndex />
      </MemoryRouter>
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));

    expect(await findByText('CW-0001')).toBeTruthy();
    const cell = getByText('Owner Person').closest('td');
    expect(cell).toBeTruthy();
    expect(cell.style.whiteSpace).toBe('nowrap');
    const objectChildErrors = errSpy.mock.calls.filter((c) => String(c[0]).includes('Objects are not valid as a React child'));
    expect(objectChildErrors).toHaveLength(0);
    errSpy.mockRestore();
  });
});
