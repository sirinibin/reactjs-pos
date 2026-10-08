import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ZatcaConnect from '../zatca_connect';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children, onHide }) =>
    show ? <div data-testid="rb-modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title  = ({ children }) => <div>{children}</div>;
  Modal.Body   = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button  = ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  );
  const Spinner = () => <div data-testid="rb-spinner" />;
  const Alert   = ({ children }) => <div data-testid="rb-alert">{children}</div>;

  return { Modal, Button, Spinner, Alert };
});

// ── useEnterKeyNavigation util ────────────────────────────────────────────────
jest.mock('../../utils/useEnterKeyNavigation', () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── fake timers & fetch ───────────────────────────────────────────────────────
jest.useFakeTimers();

beforeEach(() => {
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
      }),
  });
  localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── helper ────────────────────────────────────────────────────────────────────
function renderComponent(props = {}) {
  const ref = createRef();
  const utils = render(
    <MemoryRouter>
      <ZatcaConnect ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('ZatcaConnect smoke tests', () => {
  it('renders without crashing (modal hidden by default)', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  it('modal is not visible before ref.open() is called', () => {
    const { queryByTestId } = renderComponent();
    expect(queryByTestId('rb-modal')).toBeNull();
  });

  it('opens modal when ref.open() is called without an id', () => {
    const { ref, getByTestId } = renderComponent();
    act(() => { ref.current.open(); });
    expect(getByTestId('rb-modal')).toBeTruthy();
  });

  it('opens modal when ref.open() is called with an id', () => {
    const { ref, getByTestId } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    expect(getByTestId('rb-modal')).toBeTruthy();
  });

  it('renders "Connect to Zatca" heading inside the modal', () => {
    const { ref, getByText } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    expect(getByText(/connect to zatca/i)).toBeTruthy();
  });

  it('renders the OTP input field after open', () => {
    const { ref, getByPlaceholderText } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    expect(getByPlaceholderText(/otp/i)).toBeTruthy();
  });

  it('renders a Connect button after open', () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    const buttons = getAllByRole('button');
    expect(buttons.find(b => /connect/i.test(b.textContent))).toBeTruthy();
  });

  it('renders a Close button after open', () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    const buttons = getAllByRole('button');
    expect(buttons.find(b => /close/i.test(b.textContent))).toBeTruthy();
  });

  it('calls fetch POST /v1/store/zatca/connect when Connect is clicked', async () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/v1/store/zatca/connect',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls showToastMessage with success after a successful connect (first-time flow)', async () => {
    const showToastMessage = jest.fn();
    const { ref, getAllByRole } = renderComponent({ showToastMessage });
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showToastMessage).toHaveBeenCalledWith(
      'Store Connected to Zatca Successfully!',
      'success'
    );
  });

  it('shows "Successfully re-connected to ZATCA!" toast on reconnect success', async () => {
    const showToastMessage = jest.fn();
    const { ref, getAllByRole } = renderComponent({ showToastMessage });
    // open with reconnect=true
    act(() => { ref.current.open('store-123', true); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showToastMessage).toHaveBeenCalledWith(
      'Successfully re-connected to ZATCA!',
      'success'
    );
  });

  it('shows reconnect warning banner when opened with reconnect=true', () => {
    const { ref, getByText } = renderComponent();
    act(() => { ref.current.open('store-123', true); });
    expect(getByText(/re-connection required/i)).toBeTruthy();
  });

  it('warning banner mentions business category and registration number (CRN)', () => {
    const { ref, getByTestId } = renderComponent();
    act(() => { ref.current.open('store-123', true); });
    const alert = getByTestId('rb-alert');
    expect(alert.textContent).toMatch(/business category/i);
    expect(alert.textContent).toMatch(/registration number \(CRN\)/i);
  });

  it('does NOT show reconnect warning banner when opened with reconnect=false', () => {
    const { ref, queryByText } = renderComponent();
    act(() => { ref.current.open('store-123', false); });
    expect(queryByText(/re-connection required/i)).toBeNull();
  });

  it('does NOT show reconnect warning banner when opened without reconnect arg', () => {
    const { ref, queryByText } = renderComponent();
    act(() => { ref.current.open('store-123'); });
    expect(queryByText(/re-connection required/i)).toBeNull();
  });

  it('calls refreshList after a successful connect', async () => {
    const refreshList = jest.fn();
    const { ref, getAllByRole } = renderComponent({ refreshList });
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refreshList).toHaveBeenCalled();
  });

  it('hides modal after a successful connect', async () => {
    const { ref, getAllByRole, queryByTestId } = renderComponent();
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(queryByTestId('rb-modal')).toBeNull();
  });

  it('shows spinner while the connect request is in-flight', async () => {
    let resolveFetch;
    global.fetch = jest.fn().mockReturnValue(
      new Promise(resolve => { resolveFetch = resolve; })
    );

    const { ref, getAllByRole, getByTestId } = renderComponent();
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    act(() => { connectBtn.click(); });

    expect(getByTestId('rb-spinner')).toBeTruthy();

    // Resolve to avoid open-handle warnings
    await act(async () => {
      resolveFetch({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      });
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('calls showToastMessage with danger on a failed connect', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ errors: { otp: 'Invalid OTP' } }),
    });

    const showToastMessage = jest.fn();
    const { ref, getAllByRole } = renderComponent({ showToastMessage });
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(showToastMessage).toHaveBeenCalledWith(
      'Error Connecting to Zatca!',
      'danger'
    );
  });

  it('does not crash when optional props are absent', async () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open('store-123'); });

    const connectBtn = getAllByRole('button').find(b => /^connect$/i.test(b.textContent.trim()));
    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('can be opened multiple times without crashing', () => {
    const { ref } = renderComponent();
    act(() => { ref.current.open('store-1'); });
    act(() => { ref.current.open('store-2'); });
    expect(true).toBe(true);
  });
});
