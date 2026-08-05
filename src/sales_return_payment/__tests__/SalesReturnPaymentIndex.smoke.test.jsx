import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// CSS / image stubs
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// react-datepicker
jest.mock("react-datepicker", () => () => null);

// react-bootstrap
jest.mock("react-bootstrap", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Spinner: () => null,
  Badge: ({ children }) => <span>{children}</span>,
}));

// react-bootstrap-typeahead
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// react-bootstrap-confirmation
jest.mock("react-bootstrap-confirmation", () => ({
  confirm: jest.fn().mockResolvedValue(false),
}));

// react-number-format
jest.mock("react-number-format", () =>
  ({ value, renderText, ...rest }) => {
    if (renderText) return renderText(String(value ?? ""), rest);
    return <span>{value}</span>;
  }
);

// Child domain components — both use forwardRef
// Must use require() inside the factory because jest.mock hoists before imports
jest.mock("../create.js", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../view.js", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// Utils
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../utils/PaginationControls.js", () => () => null);

// react-router-dom — keep MemoryRouter real, stub the rest
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/" }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// ─── global fetch mock ───────────────────────────────────────────────────────
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
        meta: { total_payment: 0 },
        store: {},
        settings: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ─── import subject AFTER all mocks ──────────────────────────────────────────
const SalesReturnPaymentIndex = require("../index.js").default;

// ─── tests ───────────────────────────────────────────────────────────────────
describe("SalesReturnPaymentIndex smoke", () => {
  it("renders without crashing (no props)", () => {
    const { unmount } = render(
      <MemoryRouter>
        <SalesReturnPaymentIndex />
      </MemoryRouter>
    );
    unmount();
  });

  it("renders without crashing with salesReturn prop", () => {
    const salesReturn = { id: "sr-1", net_total: 500 };
    const { unmount } = render(
      <MemoryRouter>
        <SalesReturnPaymentIndex salesReturn={salesReturn} />
      </MemoryRouter>
    );
    unmount();
  });
});
