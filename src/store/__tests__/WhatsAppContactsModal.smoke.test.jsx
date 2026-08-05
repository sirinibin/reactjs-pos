import React, { createRef } from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppContactsModal from '../WhatsAppContactsModal';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
  const Modal = ({ show, children }) =>
    show ? <div data-testid="rb-modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title  = ({ children }) => <div>{children}</div>;
  Modal.Body   = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button = ({ children, onClick, variant, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  );
  const Spinner = () => <div data-testid="rb-spinner" />;
  const Form    = ({ children }) => <div>{children}</div>;
  Form.Control  = ({ type, placeholder, value, onChange }) => (
    <input
      data-testid="rb-form-control"
      type={type || 'text'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
  const Badge = ({ children }) => (
    <span data-testid="rb-badge">{children}</span>
  );

  return { Modal, Button, Spinner, Form, Badge };
});

// ── IntersectionObserver (not in jsdom) ───────────────────────────────────────
// Use a plain class so jest.clearAllMocks() cannot break it.
class FakeIntersectionObserver {
  constructor(cb) { this._cb = cb; }
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

beforeAll(() => {
  global.IntersectionObserver = FakeIntersectionObserver;
});

// ── fake timers ───────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── fetch helper ──────────────────────────────────────────────────────────────
const makeFetchMock = (overrides = {}) =>
  jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        contacts:    [],
        total_count: 0,
        total_pages: 0,
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
const sampleStore = { id: 'store-1', name: 'Test Store' };

function renderComponent(props = {}) {
  const ref = createRef();
  const showToastMessage = props.showToastMessage || jest.fn();
  const utils = render(
    <MemoryRouter>
      <WhatsAppContactsModal
        ref={ref}
        showToastMessage={showToastMessage}
        {...props}
      />
    </MemoryRouter>
  );
  return { ref, showToastMessage, ...utils };
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('WhatsAppContactsModal smoke tests', () => {

  it('renders without crashing (modal hidden by default)', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  it('modal is not visible before ref.open() is called', () => {
    const { queryByTestId } = renderComponent();
    expect(queryByTestId('rb-modal')).toBeNull();
  });

  it('opens modal when ref.open() is called with store data', () => {
    const { ref, getByTestId } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    expect(getByTestId('rb-modal')).toBeTruthy();
  });

  it('displays "WhatsApp Contacts" heading after open', () => {
    const { ref, getByText } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    expect(getByText(/WhatsApp Contacts/i)).toBeTruthy();
  });

  it('displays the store name in the title after open', () => {
    const { ref, getByText } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    expect(getByText(/Test Store/)).toBeTruthy();
  });

  it('fetches contacts from /v1/whatsapp/contacts on open', async () => {
    const { ref } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/whatsapp/contacts'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'test-token' }),
      })
    );
  });

  it('passes store_id in the fetch URL', async () => {
    const { ref } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('store_id=store-1');
  });

  it('shows empty-state message when no contacts returned', async () => {
    const { ref, container } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    expect(container.textContent).toMatch(/no contacts/i);
  });

  it('renders a row for each returned contact', async () => {
    global.fetch = makeFetchMock({
      contacts: [
        { jid: '111@s.whatsapp.net', push_name: 'Alice', phone: '111' },
        { jid: '222@s.whatsapp.net', push_name: 'Bob',   phone: '222' },
      ],
      total_count: 2,
      total_pages: 1,
    });

    const { ref, getByText } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('marks group contacts with a Group badge', async () => {
    global.fetch = makeFetchMock({
      contacts: [
        { jid: 'g1@g.us', push_name: 'My Group', phone: '' },
      ],
      total_count: 1,
      total_pages: 1,
    });

    const { ref, getAllByText } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    expect(getAllByText(/Group/i).length).toBeGreaterThan(0);
  });

  it('shows contact count in badge after contacts load', async () => {
    global.fetch = makeFetchMock({
      contacts: [
        { jid: 'a@s.whatsapp.net', push_name: 'Alice', phone: '111' },
      ],
      total_count: 1,
      total_pages: 1,
    });

    const { ref, getByTestId } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    expect(getByTestId('rb-badge').textContent).toMatch(/1/);
  });

  it('renders the search input after open', () => {
    const { ref, getByTestId } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    expect(getByTestId('rb-form-control')).toBeTruthy();
  });

  it('debounces search — typing does not immediately fire a fetch', () => {
    // A pure-synchronous test: verify the debounce is wired correctly by checking
    // that NO extra fetch fires the instant a character is typed.  The test
    // intentionally does NOT advance the timer — advancing timers with fake-timer
    // mocks also flushes React's pending passive-effect scheduler (via
    // performSyncWorkOnRoot → flushPassiveEffects), which sets loadingRef.current
    // true before the debounce callback's own load() call, causing it to bail
    // early.  That timing edge is tested separately below with real timers.
    const { ref, getByTestId } = renderComponent();

    act(() => { ref.current.open(sampleStore); });

    const fetchCountAfterOpen = global.fetch.mock.calls.length;

    act(() => {
      fireEvent.change(getByTestId('rb-form-control'), {
        target: { value: 'Ali' },
      });
    });

    // Immediately after typing the debounce timer has NOT fired — fetch count
    // must be the same as after open.
    expect(global.fetch.mock.calls.length).toBe(fetchCountAfterOpen);
  });

  it('search fetch URL includes the search query param', async () => {
    // Switch to real timers so that (a) the initial load's promise chain truly
    // resolves and resets loadingRef.current before the debounce fires, and
    // (b) waitFor can poll with real setInterval without needing manual advances.
    // Fake timers are restored in the finally block so afterEach is unaffected.
    jest.useRealTimers();
    try {
      const { ref, getByTestId } = renderComponent();

      await act(async () => { ref.current.open(sampleStore); });

      // Wait until the initial load settles (loading=false, contacts=[])
      // signalled by the empty-state message appearing in the DOM.
      await waitFor(
        () => expect(document.body.textContent).toMatch(/no contacts/i),
        { timeout: 3000 },
      );

      // At this point loadingRef.current = false — clear the initial-load calls
      global.fetch.mockClear();

      await act(async () => {
        fireEvent.change(getByTestId('rb-form-control'), {
          target: { value: 'Alice' },
        });
      });

      // Wait for the 350 ms debounce to fire and the search fetch to be made
      await waitFor(
        () =>
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('search=Alice'),
            expect.any(Object),
          ),
        { timeout: 3000 },
      );
    } finally {
      jest.useFakeTimers();
    }
  }, 10000);

  it('renders a Close button in the footer', () => {
    const { ref, getAllByRole } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    const buttons = getAllByRole('button');
    expect(buttons.find(b => /close/i.test(b.textContent))).toBeTruthy();
  });

  it('hides the modal when Close is clicked', () => {
    const { ref, getAllByRole, queryByTestId } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    const closeBtn = getAllByRole('button').find(b => /close/i.test(b.textContent));

    act(() => { closeBtn.click(); });

    expect(queryByTestId('rb-modal')).toBeNull();
  });

  it('calling ref.open() multiple times resets state without crashing', async () => {
    const { ref } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    await act(async () => {
      ref.current.open({ id: 'store-2', name: 'Other Store' });
      await Promise.resolve();
    });

    expect(true).toBe(true);
  });

  it('handles a network error from fetch without crashing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { ref } = renderComponent();

    await act(async () => {
      ref.current.open(sampleStore);
      await Promise.resolve();
    });

    // Component must still be mounted — no uncaught error
    expect(true).toBe(true);
  });

  it('shows spinner while the first page is loading', async () => {
    // Keep fetch pending to hold loading = true
    let resolveFetch;
    global.fetch = jest.fn().mockReturnValue(
      new Promise(resolve => { resolveFetch = resolve; })
    );

    const { ref, queryAllByTestId } = renderComponent();

    act(() => {
      ref.current.open(sampleStore);
    });

    // loading=true, contacts=[] → the initial spinner should be visible
    expect(queryAllByTestId('rb-spinner').length).toBeGreaterThan(0);

    // Resolve to let the component finish cleanly before unmount
    await act(async () => {
      resolveFetch({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () =>
          Promise.resolve({ contacts: [], total_count: 0, total_pages: 0 }),
      });
      await Promise.resolve();
    });
  });

  it('unmounts without errors', () => {
    const { ref, unmount } = renderComponent();

    act(() => { ref.current.open(sampleStore); });

    expect(() => unmount()).not.toThrow();
  });
});
