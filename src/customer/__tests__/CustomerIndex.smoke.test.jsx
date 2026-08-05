import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS stubs ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const Modal = ({ show, children }) => {
    if (!show) return null;
    return <div data-testid="modal">{children}</div>;
  };
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
  const Spinner = ({ children }) => <span>{children}</span>;
  const Dropdown = ({ children }) => <div>{children}</div>;
  Dropdown.Toggle = ({ children }) => <button>{children}</button>;
  Dropdown.Menu = ({ children }) => <div>{children}</div>;
  Dropdown.Item = ({ children, onClick }) => (
    <div onClick={onClick}>{children}</div>
  );

  return { Modal, Button, Spinner, Dropdown };
});

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  Menu: ({ children }) => <div>{children}</div>,
  MenuItem: ({ children }) => <div>{children}</div>,
}));

// --- react-bootstrap-confirmation ---
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// --- react-router-dom: keep MemoryRouter real, mock hooks/Link ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({
      pathname: "/",
      search: "",
      hash: "",
      state: undefined,
    }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- Child domain components (all use forwardRef + imperative handle) ---
// require('react') inside each factory because jest.mock factories are hoisted
// before imports and cannot reference outer-scope variables.
jest.mock("../create.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../view.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../posting/index.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../utils/customer_pending.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../utils/sales.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../utils/salesReturn.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../utils/quotations.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});
jest.mock("../../utils/quotation_sales_returns.js", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
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
jest.mock("../../utils/amount.js", () => ({ amount }) => (
  <span>{amount}</span>
));
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
    setColumns: jest.fn(),
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));
jest.mock("../../utils/PaginationControls.js", () => () => null);
jest.mock("../../utils/TableSettingsModal.js", () => () => null);

// ---- fake timers ----
jest.useFakeTimers();

// ---- fetch mock ----
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
          // Sales
          sales: 0,
          sales_paid: 0,
          sales_credit_balance: 0,
          sales_count: 0,
          sales_paid_count: 0,
          sales_paid_partially_count: 0,
          sales_unpaid_count: 0,
          sales_profit: 0,
          sales_loss: 0,
          // Sales Return
          sales_return: 0,
          sales_return_paid: 0,
          sales_return_credit_balance: 0,
          sales_return_count: 0,
          sales_return_paid_count: 0,
          sales_return_paid_partially_count: 0,
          sales_return_unpaid_count: 0,
          sales_return_profit: 0,
          sales_return_loss: 0,
          // Quotation
          quotation: 0,
          quotation_count: 0,
          quotation_profit: 0,
          quotation_loss: 0,
          // Quotation Sales
          quotation_sales: 0,
          quotation_sales_paid: 0,
          quotation_sales_credit_balance: 0,
          quotation_sales_count: 0,
          quotation_sales_paid_count: 0,
          quotation_sales_paid_partially_count: 0,
          quotation_sales_unpaid_count: 0,
          quotation_sales_profit: 0,
          quotation_sales_loss: 0,
          // Quotation Sales Return
          quotation_sales_return: 0,
          quotation_sales_return_paid: 0,
          quotation_sales_return_credit_balance: 0,
          quotation_sales_return_count: 0,
          quotation_sales_return_paid_count: 0,
          quotation_sales_return_paid_partially_count: 0,
          quotation_sales_return_unpaid_count: 0,
          quotation_sales_return_profit: 0,
          quotation_sales_return_loss: 0,
          // Delivery Notes
          delivery_note_count: 0,
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
import CustomerIndex from "../index.js";

describe("CustomerIndex smoke test", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <CustomerIndex />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it("renders the Customers heading", () => {
    const { getByText } = render(
      <MemoryRouter>
        <CustomerIndex />
      </MemoryRouter>
    );
    expect(getByText("Customers")).toBeTruthy();
  });

  it("renders the Create button", () => {
    const { getByRole } = render(
      <MemoryRouter>
        <CustomerIndex />
      </MemoryRouter>
    );
    // Use role query so table-header text "Created By" / "Created At" is not matched
    expect(getByRole("button", { name: /Create/i })).toBeTruthy();
  });

  it("renders with enableSelection prop without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <CustomerIndex enableSelection={true} onSelectCustomer={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it("calls fetch on mount", () => {
    render(
      <MemoryRouter>
        <CustomerIndex />
      </MemoryRouter>
    );
    expect(global.fetch).toHaveBeenCalled();
  });
});
