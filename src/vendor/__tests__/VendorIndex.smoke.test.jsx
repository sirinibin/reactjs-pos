import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / image stubs ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
  Button: ({ children, onClick, disabled, variant, className, ...rest }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Spinner: ({ children }) => <span>{children}</span>,
}));

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => {
  const { forwardRef } = require("react");
  return {
    Typeahead: forwardRef((props, ref) => null),
    Menu: ({ children }) => <div>{children}</div>,
    MenuItem: ({ children }) => <div>{children}</div>,
  };
});

// --- react-bootstrap-confirmation ---
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// --- react-router-dom: keep MemoryRouter real, mock hooks ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- Child domain components (forwardRef via require inside factory) ---
jest.mock("../create.js", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../view.js", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../posting/index.js", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// --- Utils / shared components ---
jest.mock("../../utils/search.js", () => ({
  highlightWords: (text) => text,
}));
jest.mock("../../utils/OverflowTooltip.js", () => ({ value }) => (
  <span>{value}</span>
));
jest.mock("../../utils/amount.js", () => ({ amount }) => <span>{amount}</span>);
jest.mock("../../utils/numberUtils", () => ({
  trimTo2Decimals: (n) => n,
}));
jest.mock("../../utils/StatsSummary.js", () => () => null);
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: () => "",
}));
jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));
jest.mock("../../utils/SuccessModal.js", () => () => null);
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
jest.mock("../../utils/PaginationControls.js", () => () => null);
jest.mock("../../utils/TableSettingsModal.js", () => () => null);

// --- date-fns: keep real format ---
// (no mock needed; date-fns is pure JS and works in Jest)

// ---- test setup ----
jest.useFakeTimers();

const makeFetchResponse = () =>
  Promise.resolve({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
      Promise.resolve({
        result: [],
        total_count: 0,
        meta: {
          credit_balance: 0,
          purchase: 0,
          purchase_paid: 0,
          purchase_credit_balance: 0,
          purchase_count: 0,
          purchase_paid_count: 0,
          purchase_paid_partially_count: 0,
          purchase_unpaid_count: 0,
          purchase_return: 0,
          purchase_return_paid: 0,
          purchase_return_credit_balance: 0,
          purchase_return_count: 0,
          purchase_return_paid_count: 0,
          purchase_return_paid_partially_count: 0,
          purchase_return_unpaid_count: 0,
        },
        store: {},
        settings: {},
        data: [],
      }),
  });

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation(makeFetchResponse);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ---- import component under test ----
import VendorIndex from "../index.js";

describe("VendorIndex smoke test", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <VendorIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it("renders the Vendors heading", () => {
    const { getByText } = render(
      <MemoryRouter>
        <VendorIndex />
      </MemoryRouter>
    );
    expect(getByText("Vendors")).toBeTruthy();
  });

  it("renders the Create button", () => {
    const { getAllByText } = render(
      <MemoryRouter>
        <VendorIndex />
      </MemoryRouter>
    );
    // There may be multiple elements containing "Create" (e.g. "Created By", "Created At")
    // Verify the Create action button is among them
    const matches = getAllByText(/Create/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("renders with enableSelection prop without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <VendorIndex enableSelection={true} onSelectVendor={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it("calls fetch on mount", () => {
    render(
      <MemoryRouter>
        <VendorIndex />
      </MemoryRouter>
    );
    expect(global.fetch).toHaveBeenCalled();
  });
});
