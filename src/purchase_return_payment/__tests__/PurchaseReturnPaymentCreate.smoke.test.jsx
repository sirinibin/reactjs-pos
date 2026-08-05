import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock CSS
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// Mock react-datepicker
jest.mock('react-datepicker', () => () => null);

// Mock react-bootstrap with passthrough implementations
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
  const Modal = ({ children, show }) => show ? React.createElement(React.Fragment, null, children) : null;
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  const Button = ({ children, onClick }) =>
    React.createElement('button', { onClick }, children);
  const Spinner = () => null;
  return { Modal, Button, Spinner };
});

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => {
  const React = require('react');
  const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
  return {
    DragDropContext: passthrough,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
  };
});

// Mock utilities
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

import PurchaseReturnPaymentCreate from '../create.js';

describe('PurchaseReturnPaymentCreate', () => {
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
        <PurchaseReturnPaymentCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is hidden by default (show=false), so no visible content — just confirm no crash
    expect(true).toBe(true);
  });
});
