// Smoke tests for the Login page component.
// React 17, CRA, @testing-library/react v11, Jest with jsdom.
//
// The login flow is a three-step fetch chain:
//   POST /v1/authorize  → get code
//   POST /v1/accesstoken (with code as Auth header) → get access_token
//   GET  /v1/me         → store user data, then navigate

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Asset / CSS mocks ─────────────────────────────────────────────────────────
jest.mock('../../avatar.jpg', () => 'avatar-stub');

// ── Component dependency mocks ────────────────────────────────────────────────
jest.mock('../../Footer.js', () => () => null);
jest.mock('../../sidebar_menu_config', () => ({ getLandingPath: () => '/dashboard' }));
jest.mock('../../utils/storeUtils.js', () => ({ fetchStore: jest.fn() }));

// ── Subject under test ────────────────────────────────────────────────────────
import Login from '../login';

// ── Timers ────────────────────────────────────────────────────────────────────
jest.useFakeTimers();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a successful fetch response fixture. */
const makeOkResponse = (body) => ({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body),
});

/** Create a failed fetch response fixture (non-2xx). */
const makeErrResponse = (errors) => ({
  ok: false,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve({ errors }),
});

/**
 * Drain N rounds of the microtask queue inside the current act() call.
 * Each await Promise.resolve() yields to let one layer of the nested
 * .then() / async-await chain inside the component resolve.
 * The login flow needs ~8 ticks to reach localStorage.setItem("access_token").
 */
const drainPromises = async (rounds = 15) => {
  for (let i = 0; i < rounds; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/**
 * jsdom 16 does not implement the HTMLFormElement indexed property getter
 * (form[0] returns undefined; form.elements[0] works correctly).
 * The source code reads form values via event.target[0].value which is
 * equivalent to form[0].value — a browser feature jsdom 16 omits.
 * This helper backfills integer-keyed getters on the form DOM node so
 * event.target[0] resolves to the correct input element during tests.
 */
const patchFormElements = (formEl) => {
  for (let i = 0; i < formEl.elements.length; i++) {
    const idx = i;
    Object.defineProperty(formEl, String(idx), {
      configurable: true,
      get: () => formEl.elements[idx],
    });
  }
};

/** Render the component wrapped in a router. */
const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

// ── Global setup ──────────────────────────────────────────────────────────────

beforeAll(() => {
  // jsdom throws on window.location assignment; replace with a plain object.
  delete window.location;
  window.location = { href: '', assign: jest.fn(), reload: jest.fn() };
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  // Default fetch stub — overridden per-test where needed.
  global.fetch = jest.fn().mockResolvedValue(
    makeOkResponse({ result: { access_token: 'tok', store_id: 's1' } })
  );
});

afterEach(() => {
  jest.clearAllTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login — smoke tests', () => {
  // 1 ──────────────────────────────────────────────────────────────────────────
  it('1. renders without crashing inside MemoryRouter', () => {
    expect(() => renderLogin()).not.toThrow();
  });

  // 2 ──────────────────────────────────────────────────────────────────────────
  it('2. email / username input is present', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  // 3 ──────────────────────────────────────────────────────────────────────────
  it('3. password input is present', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  // 4 ──────────────────────────────────────────────────────────────────────────
  it('4. submit button is present', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  // 5 ──────────────────────────────────────────────────────────────────────────
  it('5. submitting form with credentials calls fetch with /v1/authorize', async () => {
    // Use the default fetch stub (succeeds for all calls).
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'secret' },
    });

    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    // jsdom 16 omits the HTMLFormElement indexed property getter (form[0]),
    // but the source reads event.target[0].value. Backfill the getters so
    // the submit handler can read the input values.
    patchFormElements(form);

    await act(async () => {
      fireEvent.submit(form);
      await drainPromises();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/v1/authorize',
      expect.objectContaining({ method: 'POST' })
    );
  });

  // 6 ──────────────────────────────────────────────────────────────────────────
  it('6. successful login stores access_token in localStorage', async () => {
    // Pre-set last_store so the Admin path goes through fetchStore (mocked)
    // rather than spawning an additional fetch('/v1/store') call.
    localStorage.setItem('last_store_u1', 's1');

    const { fetchStore } = require('../../utils/storeUtils.js');
    fetchStore.mockResolvedValue({ id: 's1', name: 'Test Store', settings: null });

    // Three-step fetch chain:
    //   1. POST /v1/authorize   → { result: { code } }
    //   2. POST /v1/accesstoken → { result: { access_token } }  ← token stored here
    //   3. GET  /v1/me          → user info + navigation
    //   4. GET  /v1/user-role/effective-permissions (inside me())
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeOkResponse({ result: { code: 'authcode' } }))
      .mockResolvedValueOnce(makeOkResponse({ result: { access_token: 'tok' } }))
      .mockResolvedValueOnce(makeOkResponse({
        result: {
          role: 'Admin',
          id: 'u1',
          name: 'Test User',
          admin: false,
          store_ids: [],
          store_names: [],
        },
      }))
      .mockResolvedValue(makeOkResponse({ result: {} })); // effective-permissions

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'secret' },
    });

    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    // Backfill jsdom 16's missing form[n] indexed getter before submission.
    patchFormElements(form);

    await act(async () => {
      fireEvent.submit(form);
      // Drain enough rounds to traverse authorize → accesstoken chains.
      // Access token is written after the second fetch resolves (~8 ticks).
      await drainPromises(20);
    });

    expect(localStorage.getItem('access_token')).toBe('tok');
  });

  // 7 ──────────────────────────────────────────────────────────────────────────
  it('7. failed login shows error message', async () => {
    // The authorize endpoint returns a non-OK response with error details.
    // handleSubmit catches it and calls setErrors({ email: ... }).
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeErrResponse({ email: 'Invalid credentials' })
    );

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'wrong' },
    });

    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    // Backfill jsdom 16's missing form[n] indexed getter before submission.
    patchFormElements(form);

    await act(async () => {
      fireEvent.submit(form);
      await drainPromises();
    });

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  // 8 ──────────────────────────────────────────────────────────────────────────
  it('8. password field is type="password" (not plain text)', () => {
    renderLogin();
    expect(
      screen.getByPlaceholderText('Enter your password')
    ).toHaveAttribute('type', 'password');
  });
});
