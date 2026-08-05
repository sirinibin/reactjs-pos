import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-bootstrap with passthrough implementations
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) =>
    show ? <div data-testid="modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button = ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  );

  const Spinner = ({ children }) => <span>{children}</span>;

  return { Modal, Button, Spinner };
});

// Mock react-datepicker
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock local utils — paths are relative to THIS test file
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

import QuotationSalesReturnPaymentCreate from '../create.js';

describe('QuotationSalesReturnPaymentCreate', () => {
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
        <QuotationSalesReturnPaymentCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is hidden by default (show=false), no crash is the goal
    expect(document.body).toBeTruthy();
  });
});
