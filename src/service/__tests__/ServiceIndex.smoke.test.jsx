import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Child domain components (both use forwardRef so refs can be attached) ──
jest.mock('../create.js', () => {
  const R = require('react');
  return R.forwardRef(function ServiceCreate(_props, _ref) { return null; });
});
jest.mock('../view.js', () => {
  const R = require('react');
  return R.forwardRef(function ServiceView(_props, _ref) { return null; });
});

// ── react-bootstrap ──
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P; Modal.Title = P; Modal.Body = P; Modal.Footer = P;
  return { Modal, Button: P, Form: P, Table: P, Row: P, Col: P, Spinner: () => null, Alert: P };
});

// ── react-paginate ──
jest.mock('react-paginate', () => () => null);

// ── react-bootstrap-confirmation ──
jest.mock('react-bootstrap-confirmation', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

// ── react-bootstrap-typeahead: Typeahead used with ref; Menu/MenuItem used in renderMenu ──
jest.mock('react-bootstrap-typeahead', () => {
  const R = require('react');
  return {
    Typeahead: R.forwardRef(function Typeahead() { return null; }),
    Menu:     ({ children }) => <div>{children}</div>,
    MenuItem: ({ children }) => <div>{children}</div>,
  };
});

// ── utils ──
jest.mock('../../utils/queryUtils.js',         () => ({ ObjectToSearchQueryParams: jest.fn(() => '') }));
jest.mock('../../utils/search.js',             () => ({ highlightWords: jest.fn((t) => t) }));
jest.mock('../../utils/TableSettingsModal.js', () => () => null);
jest.mock('../../utils/OverflowTooltip.js',    () => () => null);

// useTableSettings must return the full shape including real default columns so
// visibleCols / totalColWidth calculations inside the component do not error.
// Plain arrow functions (not jest.fn) are used here because jest.mock factories
// are hoisted by babel-jest before jest.fn is in scope.
jest.mock('../../utils/useTableSettings.js', () => ({
  useTableSettings: () => ({
    columns: [
      { key: 'name',          label: 'Name',         fieldName: 'name',                  width: 30, visible: true },
      { key: 'category',      label: 'Category',     fieldName: 'service_category_name', width: 20, visible: true },
      { key: 'unit',          label: 'Unit',         fieldName: 'unit',                  width: 12, visible: true },
      { key: 'retail_price',  label: 'Retail Price', fieldName: 'retail_price',          width: 13, visible: true },
      { key: 'duration',      label: 'Duration',     fieldName: 'duration_minutes',      width: 10, visible: true },
      { key: 'delivery_mode', label: 'Delivery',     fieldName: 'delivery_mode',         width: 15, visible: true },
    ],
    showSettings:       false,
    setShowSettings:    () => {},
    handleToggleColumn: () => {},
    onDragEnd:          () => {},
    restoreDefaults:    () => {},
  }),
}));

// ── timers & fetch ──
jest.useFakeTimers();
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ result: [], total_count: 0, data: [], store: {}, settings: {} }),
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import ServiceIndex from '../index.js';

describe('ServiceIndex smoke test', () => {
  test('renders without crashing (default props)', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ServiceIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });

  test('renders without crashing (enableSelection=true)', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ServiceIndex
            showToastMessage={jest.fn()}
            enableSelection={true}
            onSelectServices={jest.fn()}
          />
        </MemoryRouter>
      );
    });
  });
});
