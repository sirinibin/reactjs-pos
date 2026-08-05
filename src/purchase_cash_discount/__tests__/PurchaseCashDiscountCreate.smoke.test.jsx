import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-bootstrap with passthrough implementations
jest.mock('react-bootstrap', () => ({
  Modal: ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null),
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Spinner: ({ children }) => <span>{children}</span>,
}));

// Attach sub-components used via Modal.Header, Modal.Body, etc.
const ReactBootstrap = require('react-bootstrap');
ReactBootstrap.Modal.Header = ({ children }) => <div>{children}</div>;
ReactBootstrap.Modal.Title = ({ children }) => <div>{children}</div>;
ReactBootstrap.Modal.Body = ({ children }) => <div>{children}</div>;
ReactBootstrap.Modal.Footer = ({ children }) => <div>{children}</div>;

// Mock utility modules
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

import PurchaseCashDiscountCreate from '../create.js';

describe('PurchaseCashDiscountCreate smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });

    localStorage.clear();
    localStorage.setItem('access_token', 'test-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <PurchaseCashDiscountCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is hidden by default (show=false), component mounts without error
    expect(document.body).toBeTruthy();
  });
});
