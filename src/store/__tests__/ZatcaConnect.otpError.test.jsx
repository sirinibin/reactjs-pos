// The OTP error from a failed connect clears as soon as the user types a new
// OTP, and the "Looks good!" hint takes its place.
import React, { createRef } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ZatcaConnect from '../zatca_connect';

jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) => (show ? <div data-testid="rb-modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;
  const Button = ({ children, onClick }) => <button onClick={onClick}>{children}</button>;
  const Spinner = () => <div data-testid="rb-spinner" />;
  const Alert = ({ children }) => <div data-testid="rb-alert">{children}</div>;
  return { Modal, Button, Spinner, Alert };
});

jest.mock('../../utils/useEnterKeyNavigation', () => ({ useEnterKeyNavigation: jest.fn() }));

beforeEach(() => {
  localStorage.setItem('access_token', 'test-token');
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 400,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ status: false, errors: { otp: 'OTP is required' } }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

async function openAndFailConnect() {
  const ref = createRef();
  const utils = render(<MemoryRouter><ZatcaConnect ref={ref} /></MemoryRouter>);
  act(() => { ref.current.open('store-123'); });
  const connect = utils.getAllByRole('button').find((b) => /^connect$/i.test(b.textContent.trim()));
  await act(async () => {
    connect.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  return utils;
}

test('a failed connect shows the server OTP error', async () => {
  const { findByText } = await openAndFailConnect();
  expect(await findByText('OTP is required')).toBeTruthy();
});

test('typing a new OTP clears the error and shows the "Looks good!" hint', async () => {
  const { findByText, queryByText, getByPlaceholderText } = await openAndFailConnect();
  await findByText('OTP is required');
  fireEvent.change(getByPlaceholderText('OTP'), { target: { value: '123345' } });
  expect(queryByText('OTP is required')).toBeNull();
  expect(queryByText(/Looks good!/)).toBeTruthy();
});
