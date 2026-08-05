import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-bootstrap
jest.mock('react-bootstrap', () => ({
  Modal: Object.assign(
    ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Spinner: ({ children }) => <span>{children}</span>,
  Form: Object.assign(
    ({ children, onSubmit }) => <form onSubmit={onSubmit}>{children}</form>,
    {
      Group: ({ children }) => <div>{children}</div>,
      Label: ({ children }) => <label>{children}</label>,
      Control: (props) => <input {...props} />,
      Check: (props) => <input type="checkbox" {...props} />,
      Select: ({ children, ...props }) => <select {...props}>{children}</select>,
      Text: ({ children }) => <small>{children}</small>,
    }
  ),
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
  Container: ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div>{children}</div>,
  Badge: ({ children }) => <span>{children}</span>,
  Dropdown: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Item: ({ children }) => <div>{children}</div>,
      Menu: ({ children }) => <div>{children}</div>,
      Toggle: ({ children }) => <button>{children}</button>,
    }
  ),
  InputGroup: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Text: ({ children }) => <span>{children}</span>,
    }
  ),
  Nav: Object.assign(
    ({ children }) => <nav>{children}</nav>,
    {
      Item: ({ children }) => <div>{children}</div>,
      Link: ({ children }) => <a>{children}</a>,
    }
  ),
  Navbar: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Brand: ({ children }) => <div>{children}</div>,
      Collapse: ({ children }) => <div>{children}</div>,
      Toggle: ({ children }) => <button>{children}</button>,
    }
  ),
  Tabs: ({ children }) => <div>{children}</div>,
  Tab: ({ children }) => <div>{children}</div>,
  Card: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Body: ({ children }) => <div>{children}</div>,
      Header: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Text: ({ children }) => <div>{children}</div>,
    }
  ),
  ListGroup: Object.assign(
    ({ children }) => <ul>{children}</ul>,
    {
      Item: ({ children }) => <li>{children}</li>,
    }
  ),
  Pagination: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Item: ({ children }) => <li>{children}</li>,
      Prev: ({ children }) => <li>{children}</li>,
      Next: ({ children }) => <li>{children}</li>,
    }
  ),
  Collapse: ({ children }) => <div>{children}</div>,
  Accordion: Object.assign(
    ({ children }) => <div>{children}</div>,
    {
      Item: ({ children }) => <div>{children}</div>,
      Header: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Collapse: ({ children }) => <div>{children}</div>,
    }
  ),
}));

// Mock react-datepicker and its CSS
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => ''),
}));

// Mock local utils (paths relative to test file, resolving to src/utils/)
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

import SalesCashDiscountCreate from '../create.js';

describe('SalesCashDiscountCreate smoke test', () => {
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
    render(
      <MemoryRouter>
        <SalesCashDiscountCreate />
      </MemoryRouter>
    );
    // Component renders (modal is hidden by default, show=false)
    // No crash means the test passes
  });
});
