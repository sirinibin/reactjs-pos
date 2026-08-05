// Smoke test — verifies UserCreate mounts without crashing.
// React 17, CRA, @testing-library/react v11, Jest with jsdom.

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── CSS / asset mocks ──────────────────────────────────────────────────────
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));
jest.mock("../styles.css", () => ({}));

// ── react-bootstrap ────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => {
  const passthrough = ({ children }) => <>{children}</>;
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  const Spinner = () => <span data-testid="spinner" />;
  return { Modal, Spinner, Button: passthrough, Form: passthrough, Row: passthrough, Col: passthrough, Alert: passthrough, Table: passthrough };
});

// ── react-datepicker ───────────────────────────────────────────────────────
jest.mock("react-datepicker", () => () => null);

// ── date-fns/locale ────────────────────────────────────────────────────────
jest.mock("date-fns/locale", () => ({ enUS: {} }));

// ── react-bootstrap-typeahead ──────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── utils ──────────────────────────────────────────────────────────────────
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── Subject under test ─────────────────────────────────────────────────────
import UserCreate from "../create";

// ── Timer & fetch setup ────────────────────────────────────────────────────
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
      Promise.resolve({
        result: {},
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });

  // Provide an access_token so the useEffect redirect is not triggered.
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key) => {
        if (key === "access_token") return "test-token";
        if (key === "store_id") return "store-1";
        return null;
      },
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
    writable: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────
describe("UserCreate smoke test", () => {
  it("renders without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <UserCreate ref={ref} />
      </MemoryRouter>
    );
    // No assertion needed — a thrown error would fail the test.
  });

  it("exposes an open() method via ref", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <UserCreate ref={ref} />
      </MemoryRouter>
    );
    expect(typeof ref.current.open).toBe("function");
  });
});
