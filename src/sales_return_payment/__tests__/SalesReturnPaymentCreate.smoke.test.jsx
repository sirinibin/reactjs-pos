import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-bootstrap with passthrough implementations
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;
  const Button = ({ children, onClick }) => <button onClick={onClick}>{children}</button>;
  const Spinner = () => null;
  return { Modal, Button, Spinner };
});

// Mock react-datepicker
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: () => '2026-08-04',
}));

// Mock internal utilities
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: () => { },
}));

import SalesReturnPaymentCreate from '../create.js';

describe('SalesReturnPaymentCreate smoke tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <SalesReturnPaymentCreate ref={ref} />
      </MemoryRouter>
    );
    // Component renders without throwing; modal is hidden by default so nothing visible to assert
    expect(true).toBe(true);
  });
});
