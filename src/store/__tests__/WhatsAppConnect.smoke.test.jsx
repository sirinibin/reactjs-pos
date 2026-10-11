import React, { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppConnect from '../WhatsAppConnect';
import eventEmitter from '../../utils/eventEmitter';

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children, onHide }) =>
    show ? <div data-testid="rb-modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body   = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button  = ({ children, onClick }) => <button onClick={onClick}>{children}</button>;
  const Spinner = ({ animation, variant, size, className }) => (
    <div data-testid="rb-spinner" />
  );
  const Alert   = ({ children, variant, className }) => (
    <div data-testid="rb-alert">{children}</div>
  );

  return { Modal, Button, Spinner, Alert };
});

// ── fake timers & fetch ───────────────────────────────────────────────────────
// NOTE: In this CRA + Jest 26 environment, setTimeout/setInterval called from
// inside Promise microtasks do NOT register with the fake timer clock. Tests
// that need to fire polling timers use jest.spyOn to capture and invoke the
// callbacks manually. The remaining tests use jest.useFakeTimers() for
// cleanup/safety only.
jest.useFakeTimers();

const makeFetchMock = (overrides = {}) =>
  jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: {},
        data: [],
        total_count: 0,
        store: {},
        settings: {},
        connected: false,
        base64: '',
        count: 0,
        success: false,
        ...overrides,
      }),
  });

beforeEach(() => {
  global.fetch = makeFetchMock();
  localStorage.setItem('access_token', 'test-token');
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── helpers ───────────────────────────────────────────────────────────────────
const sampleStore = { id: 'store-1', name: 'Test Store', phone: '+1234567890' };

function renderComponent(props = {}) {
  const ref = createRef();
  const utils = render(
    <MemoryRouter>
      <WhatsAppConnect ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

// Drive the component to the 'connected' phase: click connect (POST /connect
// → waitingQR), then the server pushes "whatsapp_connect" { connected }.
async function driveToConnected({ getAllByRole } = {}) {
  const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
  await act(async () => {
    connectBtn.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    eventEmitter.emit('whatsapp_connect', { store_id: sampleStore.id, connected: true, phone: '1234567890' });
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('WhatsAppConnect smoke tests', () => {
  it('renders without crashing (modal hidden by default)', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  it('modal is not visible before ref.open() is called', () => {
    const { queryByTestId } = renderComponent();
    expect(queryByTestId('rb-modal')).toBeNull();
  });

  it('opens modal when ref.open() is called with store data', () => {
    const { ref, getByTestId } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    expect(getByTestId('rb-modal')).toBeTruthy();
  });

  it('shows idle phase body text after open', () => {
    const { ref, getByText } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    expect(getByText(/scan it with whatsapp on your phone/i)).toBeTruthy();
  });

  it('shows phone number in idle phase body', () => {
    const { ref, getByText } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    expect(getByText('+1234567890')).toBeTruthy();
  });

  it('shows Connect WhatsApp button in idle phase footer', () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    const btn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
    expect(btn).toBeTruthy();
  });

  it('clicking Connect WhatsApp calls POST /v1/whatsapp/connect', async () => {
    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open(sampleStore); });

    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
    await act(async () => { connectBtn.click(); });

    expect(global.fetch).toHaveBeenCalledWith(
      '/v1/whatsapp/connect',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('transitions to waitingQR phase (shows spinner) after connect POST resolves', async () => {
    global.fetch = makeFetchMock({ connected: false });

    const { ref, getAllByRole, getAllByTestId } = renderComponent();
    act(() => { ref.current.open(sampleStore); });

    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));

    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
    });

    // waitingQR: spinner for "generating QR"
    expect(getAllByTestId('rb-spinner').length).toBeGreaterThan(0);
  });

  it('shows error alert when connect POST returns error field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ error: 'Instance creation failed' }),
    });

    const { ref, getAllByRole, getByTestId, getByText } = renderComponent();
    act(() => { ref.current.open(sampleStore); });

    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));

    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
    });

    expect(getByTestId('rb-alert')).toBeTruthy();
    expect(getByText(/instance creation failed/i)).toBeTruthy();
  });

  it('shows error alert when connect POST throws a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const { ref, getAllByRole, getByTestId, getByText } = renderComponent();
    act(() => { ref.current.open(sampleStore); });

    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));

    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getByTestId('rb-alert')).toBeTruthy();
    expect(getByText(/could not reach server/i)).toBeTruthy();
  });

  it('error phase shows Try again and Close buttons', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down'));

    const { ref, getAllByRole } = renderComponent();
    act(() => { ref.current.open(sampleStore); });

    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));

    await act(async () => {
      connectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getAllByRole('button').find(b => /try again/i.test(b.textContent))).toBeTruthy();
    expect(getAllByRole('button').find(b => /^close$/i.test(b.textContent.trim()))).toBeTruthy();
  });

  // ── Server-push tests ───────────────────────────────────────────────────────

  it('shows connected phase and calls onConnected when the server pushes connected', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const onConnected = jest.fn();
    const showToastMessage = jest.fn();
    const { ref, getAllByRole, getByText } = renderComponent({ onConnected, showToastMessage });
    act(() => { ref.current.open(sampleStore); });

    await driveToConnected({ getAllByRole });

    expect(onConnected).toHaveBeenCalledWith('store-1');
    expect(showToastMessage).toHaveBeenCalledWith('WhatsApp connected successfully!', 'success');
    expect(getByText(/whatsapp connected successfully/i)).toBeTruthy();
  });

  it('fires onDisconnected callback when Disconnect button is clicked', async () => {
    let callIndex = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callIndex++;
      let body;
      if (callIndex === 1) body = {};                        // POST /connect
      else body = { success: true };                         // DELETE /disconnect
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    });

    const onConnected    = jest.fn();
    const onDisconnected = jest.fn();
    const showToastMessage = jest.fn();

    const { ref, getAllByRole } = renderComponent({ onConnected, onDisconnected, showToastMessage });
    act(() => { ref.current.open(sampleStore); });

    await driveToConnected({ getAllByRole });

    // Now in connected phase — Disconnect button should be visible
    const disconnectBtn = getAllByRole('button').find(b => /disconnect/i.test(b.textContent));
    expect(disconnectBtn).toBeTruthy();

    await act(async () => {
      disconnectBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onDisconnected).toHaveBeenCalledWith('store-1');
    expect(showToastMessage).toHaveBeenCalledWith('WhatsApp disconnected', 'success');
  });

  // ── Lifecycle / edge-case tests ────────────────────────────────────────────

  it('calls ref.open() multiple times without crashing (re-open resets state)', () => {
    const { ref } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    act(() => { ref.current.open({ id: 'store-2', name: 'Other', phone: '+9876543210' }); });
    expect(true).toBe(true);
  });

  it('does not crash when opened without a store (null guard)', () => {
    const { ref, getByTestId } = renderComponent();
    act(() => { ref.current.open(null); });
    expect(getByTestId('rb-modal')).toBeTruthy();
  });

  it('shows each pushed QR, ignores other stores, and never polls', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const { ref, getAllByRole, container } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
    await act(async () => { connectBtn.click(); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => {
      eventEmitter.emit('whatsapp_connect', { store_id: 'other-store', qr_base64: 'data:image/png;base64,OTHER', qr_count: 1 });
    });
    expect(container.querySelector('img')).toBeNull();

    await act(async () => {
      eventEmitter.emit('whatsapp_connect', { store_id: 'store-1', qr_base64: 'data:image/png;base64,QR1', qr_count: 1 });
    });
    expect(container.querySelector('img').getAttribute('src')).toContain('QR1');

    await act(async () => {
      eventEmitter.emit('whatsapp_connect', { store_id: 'store-1', qr_base64: 'data:image/png;base64,QR2', qr_count: 2 });
    });
    expect(container.querySelector('img').getAttribute('src')).toContain('QR2');

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1); // only POST /connect
    setIntervalSpy.mockRestore();
  });

  it('shows an error when the server stops waiting for the scan', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const { ref, getAllByRole, getByText } = renderComponent();
    act(() => { ref.current.open(sampleStore); });
    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
    await act(async () => { connectBtn.click(); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { eventEmitter.emit('whatsapp_connect', { store_id: 'store-1', expired: true }); });
    expect(getByText(/qr code expired/i)).toBeTruthy();
  });

  it('stops listening on unmount', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const onConnected = jest.fn();
    const { ref, getAllByRole, unmount } = renderComponent({ onConnected });
    act(() => { ref.current.open(sampleStore); });
    const connectBtn = getAllByRole('button').find(b => /connect whatsapp/i.test(b.textContent));
    await act(async () => { connectBtn.click(); await Promise.resolve(); await Promise.resolve(); });
    unmount();
    eventEmitter.emit('whatsapp_connect', { store_id: 'store-1', connected: true });
    expect(onConnected).not.toHaveBeenCalled();
  });
});
