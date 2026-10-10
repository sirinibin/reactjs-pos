// Smoke test — verifies UserCreate mounts without crashing.
// React 17, CRA, @testing-library/react v11, Jest with jsdom.

import React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
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

// The RBAC Roles picker must appear when the user's store has the RBAC module on.
// GET /v1/store/{id} returns the flag under result.settings (a store setting).


const json = (body) => Promise.resolve({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve(body) });
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function mockApi(rbac) {
  global.fetch = jest.fn((url) => {
    const u = String(url);
    if (u.startsWith("/v1/user/u1")) {
      return json({ status: true, result: { id: "u1", name: "U", email: "u@x.test", role: "Manager", store_ids: ["s1"], store_names: ["Store 1"] } });
    }
    if (u.startsWith("/v1/store/s1")) {
      return json({ status: true, result: { id: "s1", enable_rbac_module: undefined, settings: { enable_rbac_module: rbac } } });
    }
    return json({ status: true, result: [] });
  });
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key) => (key === "access_token" ? "test-token" : key === "store_id" ? "s1" : null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
    writable: true,
  });
});

async function openUser() {
  const ref = React.createRef();
  render(<MemoryRouter><UserCreate ref={ref} /></MemoryRouter>);
  await act(async () => { ref.current.open("u1"); await flush(); });
  for (let i = 0; i < 3; i++) await act(async () => { await flush(); });
  await act(async () => { fireEvent.click(screen.getAllByText("Permissions")[0]); });
}

test("shows the RBAC Roles picker when the store setting enable_rbac_module is on", async () => {
  mockApi(true);
  await openUser();
  const storeCall = global.fetch.mock.calls.map(([u]) => String(u)).find((u) => u.startsWith("/v1/store/s1"));
  expect(storeCall).toContain("settings.enable_rbac_module");
  expect(screen.getByText("RBAC Roles")).toBeTruthy();
});

test("hides the RBAC Roles picker when the setting is off", async () => {
  mockApi(false);
  await openUser();
  expect(screen.queryByText("RBAC Roles")).toBeNull();
});
