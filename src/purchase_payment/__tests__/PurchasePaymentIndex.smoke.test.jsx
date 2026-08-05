import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── CSS / asset mocks ────────────────────────────────────────────────────────
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock("react-datepicker", () => () => null);

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Spinner: () => null,
  Badge: ({ children }) => <span>{children}</span>,
}));

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
}));

// ── react-bootstrap-confirmation ──────────────────────────────────────────────
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock("react-number-format", () =>
  function NumberFormat({ value, renderText, ...props }) {
    return renderText ? (
      <span>{renderText(value, props)}</span>
    ) : (
      <span>{value}</span>
    );
  }
);

// ── date-fns ──────────────────────────────────────────────────────────────────
jest.mock("date-fns", () => ({
  format: () => "Jan 01 2026",
}));

// ── Child domain components (forwardRef with imperative open()) ───────────────
// React must be required inside the factory — jest.mock hoists factories and
// cannot reference out-of-scope variables other than `jest` and `require`.
jest.mock("../create.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef(function PurchasePaymentCreate(props, ref) {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../view.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef(function PurchasePaymentView(props, ref) {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// ── utils ─────────────────────────────────────────────────────────────────────
// Paths are resolved relative to the source file that imports them.
// We match with the path as seen from the test file's own directory.
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../utils/PaginationControls.js", () => () => null);

// ── Import component under test (after all mocks are defined) ─────────────────
import PurchasePaymentIndex from "../index.js";

// ── Per-test setup ────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: { total_payment: 0 },
      }),
  });
  localStorage.setItem("access_token", "test-token");
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("PurchasePaymentIndex smoke", () => {
  it("renders without crashing (no props)", () => {
    render(
      <MemoryRouter>
        <PurchasePaymentIndex />
      </MemoryRouter>
    );
  });

  it("renders without crashing when given a purchase prop", () => {
    const purchase = {
      id: "purchase-abc",
      net_total: 1000,
      cash_discount: 50,
    };
    render(
      <MemoryRouter>
        <PurchasePaymentIndex purchase={purchase} />
      </MemoryRouter>
    );
  });

  it("renders without crashing with full callback props", () => {
    const purchase = {
      id: "purchase-xyz",
      net_total: 2000,
      cash_discount: 100,
    };
    render(
      <MemoryRouter>
        <PurchasePaymentIndex
          purchase={purchase}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
          refreshPurchaseList={jest.fn()}
        />
      </MemoryRouter>
    );
  });
});
