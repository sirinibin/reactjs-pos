import React, { createRef } from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-i18next ---
// Plain arrow function (not jest.fn) so resetMocks:true cannot clear it.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// --- react-bootstrap ---
// Modal sub-components must be defined on the constructor because the
// component references Modal.Header / Modal.Title / Modal.Body / Modal.Footer.
jest.mock("react-bootstrap", () => {
  const React = require("react");
  const Modal = ({ children, show }) =>
    show ? React.createElement("div", null, children) : null;
  Modal.Header = ({ children }) => React.createElement("div", null, children);
  Modal.Title = ({ children }) => React.createElement("div", null, children);
  Modal.Body = ({ children }) => React.createElement("div", null, children);
  Modal.Footer = ({ children }) => React.createElement("div", null, children);
  return {
    Modal,
    Spinner: ({ children }) => React.createElement("span", null, children),
    Button: ({ children, onClick, disabled }) =>
      React.createElement("button", { onClick, disabled }, children),
  };
});

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- date-fns ---
// jest.fn() — implementation re-set in beforeEach because resetMocks:true clears it.
jest.mock("date-fns", () => ({
  format: jest.fn(),
}));

// --- Utility function mocks ---
// All use jest.fn() — implementations are re-set in beforeEach.
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(),
}));

jest.mock("../../utils/employeeBalance.js", () => ({
  getEmployeeBalanceInfo: jest.fn(),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(),
}));

jest.mock("../../utils/timezone.js", () => ({
  toStoreLocalDate: jest.fn(),
  fromStoreLocalDate: jest.fn(),
}));

// --- Import mocked modules so we can re-set implementations in beforeEach ---
// (resetMocks:true resets every jest.fn() before each test; beforeEach re-arms them)
import { fetchStore } from "../../utils/storeUtils.js";
import { ObjectToSearchQueryParams } from "../../utils/queryUtils.js";
import { getEmployeeBalanceInfo } from "../../utils/employeeBalance.js";
import { toStoreLocalDate, fromStoreLocalDate } from "../../utils/timezone.js";
import { format } from "date-fns";

// --- Import subject under test (after all mocks are declared) ---
import EmployeeSalaryPaymentCreate from "../salaryPayment";

// ---------------------------------------------------------------------------
// Test setup — beforeEach re-arms every jest.fn() implementation because
// resetMocks:true (active in this project's jest config) wipes implementations
// before each test, including those set inside jest.mock() factory functions.
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.useFakeTimers();

  localStorage.setItem("access_token", "test-token");
  localStorage.setItem("store_id", "test-store-id");

  // Re-arm module-level mocks cleared by resetMocks:true
  fetchStore.mockResolvedValue({ country_code: "US" });
  ObjectToSearchQueryParams.mockReturnValue("");
  getEmployeeBalanceInfo.mockReturnValue({
    label: "Balance Due",
    colorHex: "#000000",
    amount: 0,
    suffix: "",
  });
  toStoreLocalDate.mockImplementation((iso) => (iso ? new Date(iso) : new Date()));
  fromStoreLocalDate.mockImplementation((date) =>
    date ? date.toISOString() : new Date().toISOString()
  );
  format.mockReturnValue("January 1, 2026 12:00 PM");

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
});

afterEach(() => {
  jest.clearAllTimers();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Smoke tests
// ---------------------------------------------------------------------------
describe("EmployeeSalaryPaymentCreate smoke test", () => {
  it("renders without crashing (modal closed)", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <EmployeeSalaryPaymentCreate ref={ref} />
      </MemoryRouter>
    );
  });

  it("opens the modal for a new payment without crashing", async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <EmployeeSalaryPaymentCreate
          ref={ref}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
          onSaved={jest.fn()}
        />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open("emp-test-123");
    });
  });

  it("opens the modal for an existing payment (edit mode) without crashing", async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <EmployeeSalaryPaymentCreate
          ref={ref}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
          onSaved={jest.fn()}
        />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open("emp-test-123", "pay-test-456");
    });
  });

  it("opens the modal with no pre-selected employee (employee search mode)", async () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <EmployeeSalaryPaymentCreate
          ref={ref}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
        />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open(); // no employeeId → shows employee search input
    });
  });
});
