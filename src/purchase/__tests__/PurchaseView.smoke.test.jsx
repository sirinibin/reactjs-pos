import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- react-i18next ---
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "en" } }),
}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const passthrough = ({ children }) => <>{children}</>;
  const Modal = ({ children, show }) => (show ? <div>{children}</div> : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  return {
    Button: ({ children, onClick, disabled, ...rest }) => (
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

// --- react-number-format ---
jest.mock("react-number-format", () => ({ value, renderText, displayType }) => {
  if (renderText) return renderText(value != null ? String(value) : "");
  return <span>{value != null ? String(value) : ""}</span>;
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

// --- child domain components ---
jest.mock("../../order/preview", () => require("react").forwardRef(() => null));
jest.mock("../print", () => require("react").forwardRef(() => null));

// --- utils (paths resolved from test file in src/purchase/__tests__/) ---
jest.mock("../../utils/numberUtils", () => ({ trimTo2Decimals: (v) => v }));
jest.mock("../../utils/queryUtils", () => ({ ObjectToSearchQueryParams: () => "" }));
jest.mock("../../utils/dateUtils", () => ({
  formatInStoreTimezone: (v) => (v ? String(v) : ""),
  formatPaymentMethod: (v) => (v ? String(v) : ""),
}));

// --- SUT ---
import PurchaseView from "../view";

// --- test setup ---
beforeEach(() => {
  jest.useFakeTimers();
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
        meta: {
          total_cash_discount: 0,
          total_payment: 0,
        },
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("PurchaseView smoke test", () => {
  it("renders without crashing", () => {
    const ref = React.createRef();
    expect(() => {
      render(
        <MemoryRouter>
          <PurchaseView ref={ref} />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it("renders with store prop without crashing", () => {
    const ref = React.createRef();
    expect(() => {
      render(
        <MemoryRouter>
          <PurchaseView ref={ref} store={{ country_code: "AE" }} />
        </MemoryRouter>
      );
    }).not.toThrow();
  });
});
