// Smoke test: ExpenseIndex renders without crashing.
// React 17, CRA, @testing-library/react v11, no TypeScript.

// --- CSS / asset mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
  Button: ({ children, ...rest }) => <button {...rest}>{children}</button>,
  Spinner: () => <span data-testid="spinner" />,
  Modal: ({ children }) => <div>{children}</div>,
  Form: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table><tbody>{children}</tbody></table>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div>{children}</div>,
  Badge: ({ children }) => <span>{children}</span>,
}));

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-data-export ---
jest.mock("react-data-export", () => {
  const ExcelFile = ({ children }) => <div>{children}</div>;
  ExcelFile.ExcelSheet = () => null;
  return { __esModule: true, default: { ExcelFile } };
});

// --- Child domain components ---
jest.mock("../create.js", () => {
  const React = require("react");
  return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock("../view.js", () => {
  const React = require("react");
  return { __esModule: true, default: React.forwardRef(() => null) };
});

jest.mock("../../vendor/create.js", () => {
  const React = require("react");
  return { __esModule: true, default: React.forwardRef(() => null) };
});

// --- Utils components ---
jest.mock("../../utils/OverflowTooltip.js", () => () => null);
jest.mock("../../utils/amount.js", () => () => null);
jest.mock("../../utils/StatsSummary.js", () => () => null);
jest.mock("../../utils/SuccessModal.js", () => () => null);
jest.mock("../../utils/PaginationControls.js", () => () => null);
jest.mock("../../utils/TableSettingsModal.js", () => () => null);

// --- Utils functions ---
jest.mock("../../utils/numberUtils", () => ({
  trimTo2Decimals: (v) => v,
}));

jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: () => "",
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../utils/useTableSettings.js", () => ({
  useTableSettings: ({ defaultColumns }) => ({
    columns: defaultColumns,
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));

// --- Actual test ---
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExpenseIndex from "../index.js";

jest.useFakeTimers();

const mockFetchResponse = {
  ok: true,
  headers: { get: () => "application/json" },
  json: () =>
    Promise.resolve({
      result: [],
      total_count: 0,
      meta: {
        total: 0,
        cash: 0,
        bank: 0,
        purchase_fund: 0,
        vat: 0,
      },
      store: {},
      settings: {},
    }),
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe("ExpenseIndex smoke test", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <ExpenseIndex />
      </MemoryRouter>
    );
  });

  it("renders without crashing when enableSelection prop is provided", () => {
    render(
      <MemoryRouter>
        <ExpenseIndex enableSelection={false} />
      </MemoryRouter>
    );
  });
});
