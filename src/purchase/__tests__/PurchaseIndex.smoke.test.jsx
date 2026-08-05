import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / static assets ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-i18next ---
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "en" } }),
}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const passthrough = ({ children }) => <>{children}</>;
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  return {
    Button: ({ children, onClick, disabled, variant, ...rest }) => (
      <button onClick={onClick} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    Spinner: () => <span />,
    Modal,
    Form: passthrough,
    Table: passthrough,
    Row: passthrough,
    Col: passthrough,
    Alert: passthrough,
  };
});

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// --- react-draggable ---
jest.mock("react-draggable", () => ({ children, ...rest }) => <>{children}</>);

// --- react-data-export ---
jest.mock("react-data-export", () => {
  const ExcelSheet = () => null;
  const ExcelFile = ({ children }) => <>{children}</>;
  ExcelFile.ExcelSheet = ExcelSheet;
  return { __esModule: true, default: { ExcelFile } };
});

// --- react-router-dom: keep MemoryRouter real, mock hooks/Link ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to, ...rest }) => <a href={to} {...rest}>{children}</a>,
  };
});

// --- i18n dateLocales ---
jest.mock("../../i18n/dateLocales", () => ({
  getDateLocale: () => undefined,
}));

// --- WebSocketContext ---
jest.mock("../../utils/WebSocketContext", () => ({
  WebSocketContext: require("react").createContext({ lastMessage: null }),
}));

// --- eventEmitter ---
jest.mock("../../utils/eventEmitter", () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}));

// --- utils ---
jest.mock("../../utils/OverflowTooltip", () => () => null);
jest.mock("../../utils/amount", () => () => null);
jest.mock("../../utils/StatsSummary", () => () => null);
jest.mock("../../utils/numberUtils", () => ({ trimTo2Decimals: (v) => v }));
jest.mock("../../utils/queryUtils", () => ({ ObjectToSearchQueryParams: () => "" }));
jest.mock("../../utils/storeUtils", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));
jest.mock("../../utils/SuccessModal", () => () => null);
jest.mock("../../utils/useTableSettings", () => ({
  useTableSettings: () => ({
    columns: [],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));
jest.mock("../../utils/PaginationControls", () => () => null);
jest.mock("../../utils/TableSettingsModal", () => () => null);

// --- child domain components ---
jest.mock("../create", () => require("react").forwardRef(() => null));
jest.mock("../view", () => require("react").forwardRef(() => null));
jest.mock("../../purchase_return/create", () => require("react").forwardRef(() => null));
jest.mock("../../purchase_payment/index", () => require("react").forwardRef(() => null));
jest.mock("../../purchase_return/index", () => require("react").forwardRef(() => null));
jest.mock("../../order/preview", () => require("react").forwardRef(() => null));
jest.mock("../../order/report", () => require("react").forwardRef(() => null));
jest.mock("../../order/print", () => require("react").forwardRef(() => null));
jest.mock("../../vendor/create", () => require("react").forwardRef(() => null));

// --- SUT ---
import PurchaseIndex from "../index";

// --- test setup ---
beforeEach(() => {
  jest.useFakeTimers();
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
        meta: {
          total_purchase: 0,
          accounted_purchase: 0,
          vat_price: 0,
          shipping_handling_fees: 0,
          discount: 0,
          cash_discount: 0,
          paid_purchase: 0,
          unpaid_purchase: 0,
          cash_purchase: 0,
          bank_account_purchase: 0,
          sales_purchase: 0,
          purchase_return_purchase: 0,
        },
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("PurchaseIndex smoke test", () => {
  it("renders without crashing", () => {
    expect(() => {
      render(
        <MemoryRouter>
          <PurchaseIndex />
        </MemoryRouter>
      );
    }).not.toThrow();
  });
});
