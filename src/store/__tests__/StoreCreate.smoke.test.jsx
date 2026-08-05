import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// react-bootstrap: Modal, Button, Spinner (and sub-components used in forms)
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
  const P = ({ children }) => <>{children}</>;
  const Modal = ({ show, children }) => (show ? <>{children}</> : null);
  Modal.Header = P;
  Modal.Title = P;
  Modal.Body = P;
  Modal.Footer = P;
  return {
    Modal,
    Button: P,
    Spinner: () => null,
    Form: P,
    Row: P,
    Col: P,
    Alert: P,
    Table: P,
  };
});

// ---------------------------------------------------------------------------
// react-router-dom: keep MemoryRouter real, stub hooks
// ---------------------------------------------------------------------------
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

// ---------------------------------------------------------------------------
// Third-party UI helpers
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap-typeahead', () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// react-image-file-resizer default export is an object with imageFileResizer method
jest.mock('react-image-file-resizer', () => ({ imageFileResizer: jest.fn() }));

// react-select-country-list default export is a factory returning { getData }
jest.mock('react-select-country-list', () => () => ({ getData: () => [] }));

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

jest.mock('../../utils/timezone.js', () => ({
  toStoreLocalDate: jest.fn((v) => (v ? new Date(v) : null)),
  fromStoreLocalDate: jest.fn((d) => (d ? d.toISOString() : null)),
}));

jest.mock('../../sidebar_menu_config', () => ({
  applyAutomobileMenuOrder: jest.fn((x) => x),
  DEFAULT_MENU: [],
  loadSidebarConfig: jest.fn(() => []),
  saveSidebarConfig: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Timer / fetch setup
// ---------------------------------------------------------------------------
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () =>
    Promise.resolve({
      result: {},
      data: [],
      total_count: 0,
      store: {},
      settings: {},
      status: true,
    }),
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

import StoreCreate from '../create.js';

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------
describe('StoreCreate smoke test', () => {
  it('renders without crashing', async () => {
    const ref = createRef();
    await act(async () => {
      render(
        <MemoryRouter>
          <StoreCreate ref={ref} />
        </MemoryRouter>
      );
    });
  });
});
