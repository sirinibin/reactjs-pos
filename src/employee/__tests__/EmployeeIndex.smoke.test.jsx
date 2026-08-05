import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / asset mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-i18next ---
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
  Button: ({ children, onClick, disabled, variant, size, title, className, style }) => (
    <button onClick={onClick} disabled={disabled} className={className} style={style} title={title}>
      {children}
    </button>
  ),
  Spinner: ({ children }) => <span>{children}</span>,
  Modal: ({ children, show }) => (show ? <div>{children}</div> : null),
  Form: ({ children }) => <form>{children}</form>,
  Table: ({ children }) => <table>{children}</table>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div>{children}</div>,
}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-bootstrap-confirmation ---
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// --- Child domain components (use forwardRef + expose open via ref) ---
// jest.mock factories cannot access out-of-scope variables, so require React inside each factory.
jest.mock("../create.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../view.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../salaryPayment.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../../posting/index.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// --- Util components ---
jest.mock("../../utils/OverflowTooltip.js", () => () => null);
jest.mock("../../utils/PaginationControls.js", () => () => null);
jest.mock("../../utils/StatsSummary.js", () => () => null);
jest.mock("../../utils/TableSettingsModal.js", () => () => null);

// --- Util functions ---
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../utils/employeeBalance.js", () => ({
  getEmployeeBalanceInfo: jest.fn(() => ({
    amount: 0,
    colorClass: "",
    magnitude: 0,
    suffix: "",
  })),
}));

// --- useTableSettings hook ---
jest.mock("../../utils/useTableSettings.js", () => ({
  useTableSettings: () => ({
    columns: [
      { key: "name", label: "Name", fieldName: "name", visible: true },
      { key: "mobile", label: "Mobile", fieldName: "mobile", visible: true },
      { key: "salary", label: "Salary", fieldName: "salary", visible: false },
      { key: "joining_date", label: "Joining Date", fieldName: "joining_date", visible: false },
      { key: "balance", label: "Balance", fieldName: "balance", visible: true },
      { key: "created_at", label: "Created At", fieldName: "created_at", visible: true },
      { key: "actions", label: "Actions", fieldName: "actions", visible: true },
    ],
    showSettings: false,
    setShowSettings: () => {},
    handleToggleColumn: () => {},
    onDragEnd: () => {},
    restoreDefaults: () => {},
  }),
}));

// NOTE: CRA's Jest config sets resetMocks: true, which calls jest.resetAllMocks() before
// every test and strips implementations from module-level jest.fn() mocks.
// global.fetch must therefore be set in beforeEach (which runs AFTER the automatic reset)
// so the implementation survives into each test.
beforeEach(() => {
  localStorage.setItem("access_token", "test-token");
  localStorage.setItem("store_id", "test-store-id");
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
  localStorage.clear();
});

// --- Import component under test (after all mocks are set up) ---
import EmployeeIndex from "../index.js";

// --- Smoke tests ---
describe("EmployeeIndex smoke test", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <EmployeeIndex
          showToastMessage={jest.fn()}
          enableSelection={false}
        />
      </MemoryRouter>
    );
  });

  it("renders with enableSelection=true without crashing", () => {
    render(
      <MemoryRouter>
        <EmployeeIndex
          showToastMessage={jest.fn()}
          enableSelection={true}
          onSelectEmployee={jest.fn()}
        />
      </MemoryRouter>
    );
  });
});
