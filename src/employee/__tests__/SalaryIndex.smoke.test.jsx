import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-i18next ---
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const React = require("react");
  return {
    Button: ({ children, onClick, disabled, variant, className, title }) =>
      React.createElement("button", { onClick, disabled, className, title }, children),
    Spinner: ({ children }) => React.createElement("span", null, children),
  };
});

// --- react-bootstrap-confirmation ---
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- date-fns ---
jest.mock("date-fns", () => ({
  format: jest.fn(() => "Jan 01 2026"),
}));

// --- Child domain component (uses forwardRef + useImperativeHandle) ---
jest.mock("../salaryPayment.js", () => {
  const React = require("react");
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// --- Utils ---
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/PaginationControls.js", () => () => null);
jest.mock("../../utils/OverflowTooltip.js", () => () => null);
jest.mock("../../utils/StatsSummary.js", () => () => null);

// --- Fake timers (module level so they are in place before any test lifecycle) ---
jest.useFakeTimers();

// --- Seed localStorage ---
localStorage.setItem("access_token", "test-token");
localStorage.setItem("store_id", "test-store-id");

// ---------------------------------------------------------------------------
// CRA's jest config has `resetMocks: true`, which calls mockReset() on every
// jest.fn() before each test — including global.fetch.  The only safe place
// to (re-)assign global.fetch is inside beforeEach, which runs AFTER the
// automatic mock reset.
// ---------------------------------------------------------------------------
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
        meta: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
  localStorage.clear();
});

// --- Import after all mocks are declared ---
import SalaryIndex from "../salaryIndex";

// ---------------------------------------------------------------------------
// Smoke tests
// ---------------------------------------------------------------------------
describe("SalaryIndex smoke test", () => {
  it("renders without crashing", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SalaryIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });
});
