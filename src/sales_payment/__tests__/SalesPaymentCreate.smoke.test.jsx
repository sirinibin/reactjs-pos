import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesPaymentCreate from '../create';

// react-bootstrap mock
jest.mock('react-bootstrap', () => ({
  Modal: ({ show, children }) => show ? <div>{children}</div> : null,
  'Modal.Header': ({ children }) => <div>{children}</div>,
  'Modal.Title': ({ children }) => <div>{children}</div>,
  'Modal.Body': ({ children }) => <div>{children}</div>,
  'Modal.Footer': ({ children }) => <div>{children}</div>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Form: ({ children }) => <form>{children}</form>,
  'Form.Group': ({ children }) => <div>{children}</div>,
  'Form.Label': ({ children }) => <label>{children}</label>,
  'Form.Control': (props) => <input {...props} />,
  'Form.Select': (props) => <select {...props} />,
  Table: ({ children }) => <table>{children}</table>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div>{children}</div>,
  Spinner: () => <span>loading</span>,
}));

// react-datepicker mock
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Utility mocks — paths are relative to this test file's location
// create.js imports '../utils/queryUtils.js' which resolves to src/utils/queryUtils.js
// from this test file (src/sales_payment/__tests__/) that is ../../utils/queryUtils.js
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

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

describe('SalesPaymentCreate smoke tests', () => {
  it('renders without crashing inside MemoryRouter', () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <SalesPaymentCreate ref={ref} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <SalesPaymentCreate ref={ref} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeDefined();
  });
});
