import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-datepicker
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock react-bootstrap with sub-components
jest.mock('react-bootstrap', () => {
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button = ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  );

  const Spinner = () => null;

  return { Modal, Button, Spinner };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: () => '2026-08-04',
}));

// Mock local utils
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: () => { },
}));

import PurchasePaymentCreate from '../create';

describe('PurchasePaymentCreate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
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
        <PurchasePaymentCreate ref={ref} />
      </MemoryRouter>
    );
  });
});
