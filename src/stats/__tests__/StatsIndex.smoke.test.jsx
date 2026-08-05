// Smoke test for src/stats/index.js
// React 17, CRA, @testing-library/react v11, no TypeScript

import React from 'react';
import { render } from '@testing-library/react';
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

describe('StatsIndex smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () =>
        Promise.resolve({
          result: {},
          data: [],
          total_count: 0,
          meta: {},
          store: {},
          settings: {},
        }),
      text: () => Promise.resolve(''),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <StatsIndex />
      </MemoryRouter>
    );
  });
});
