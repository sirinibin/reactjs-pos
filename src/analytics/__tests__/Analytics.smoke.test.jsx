// Smoke test for Analytics (index.js)
// React 17, CRA, @testing-library/react v11, no TypeScript

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Sub-chart child components ────────────────────────────────────────────────
jest.mock('../sales/allSales', () => () => null);
jest.mock('../sales/hourlySales', () => () => null);
jest.mock('../sales/dailySales', () => () => null);
jest.mock('../sales/monthlySales', () => () => null);
jest.mock('../sales/yearlySales', () => () => null);

// ── Utility used by the component ────────────────────────────────────────────
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

// ── react-google-charts (used by sub-charts; mocked for safety) ──────────────
jest.mock('react-google-charts', () => ({
  Chart: () => null,
  default: { Chart: () => null },
}));

// ── Subject under test ────────────────────────────────────────────────────────
import Analytics from '../index.js';

// ── Timer & fetch setup ───────────────────────────────────────────────────────
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Analytics (smoke)', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );
  });
});
