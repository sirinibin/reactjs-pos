// Regression: fetchForecastCSV called
//   /v1/bi/report-result/download?store_id=...
// but the backend (pos-rest DownloadBIReportResult → biAuthAndStore →
// ParseStore) only reads `search[store_id]`, so every Stats / Business
// Dashboard load got 3 × HTTP 400 and the 6-month forecast sections stayed empty.
// React 17, CRA, @testing-library/react v11

import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- CSS / asset mocks ---
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));
jest.mock('../../utils/stickyHeader.css', () => ({}));

// --- react-datepicker ---
jest.mock('react-datepicker', () => () => null);

// --- react-bootstrap: mock only what the component uses ---
jest.mock('react-bootstrap', () => {
  const R = require('react');
  return {
    Button: ({ children, onClick, disabled }) =>
      R.createElement('button', { onClick, disabled }, children),
    Modal: Object.assign(
      ({ show, children }) =>
        show ? R.createElement('div', null, children) : null,
      {
        Header: ({ children }) => R.createElement('div', null, children),
        Title:  ({ children }) => R.createElement('div', null, children),
        Body:   ({ children }) => R.createElement('div', null, children),
        Footer: ({ children }) => R.createElement('div', null, children),
      }
    ),
  };
});

// --- react-beautiful-dnd: passthrough stubs ---
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) =>
    children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, {}),
}));

// --- utils mocks ---
jest.mock('../../utils/StatsSummary.js', () => () => null);
jest.mock('../../utils/WebSocketContext.js', () => {
  const R = require('react');
  return {
    WebSocketContext: R.createContext({ lastMessage: null, sendMessage: jest.fn() }),
  };
});
jest.mock('../../utils/numberUtils', () => ({
  trimTo2Decimals: (n) => String(n),
}));
jest.mock('../../utils/eventEmitter.js', () => ({
  on:  jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}));
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

import StatsIndex from '../index.js';

const STORE_ID = '64b7f0c2a1b2c3d4e5f60718';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('access_token', 'tok');
  localStorage.setItem('store_id', STORE_ID);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, meta: {}, store: {}, settings: {} }),
    text: () => Promise.resolve(''),
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe('StatsIndex — forecast CSV download URL', () => {
  it('sends search[store_id] (what ParseStore reads) plus report_key and format=csv', async () => {
    render(
      <MemoryRouter>
        <StatsIndex />
      </MemoryRouter>
    );
    await act(() => new Promise((r) => setTimeout(r, 20)));

    const urls = global.fetch.mock.calls
      .map(([u]) => String(u))
      .filter((u) => u.startsWith('/v1/bi/report-result/download'));
    expect(urls).toHaveLength(3);

    const keys = urls.map((u) => {
      const qs = new URLSearchParams(u.split('?')[1]);
      expect(qs.get('search[store_id]')).toBe(STORE_ID);
      expect(qs.has('store_id')).toBe(false);
      expect(qs.get('format')).toBe('csv');
      return qs.get('report_key');
    });
    expect(keys.sort()).toEqual(['expense_forecast_6m', 'profit_forecast_6m', 'revenue_forecast_6m']);
  });
});
