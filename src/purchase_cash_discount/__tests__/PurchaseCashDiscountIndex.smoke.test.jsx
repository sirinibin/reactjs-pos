import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PurchaseCashDiscountIndex from "../index.js";

// --- CSS mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Spinner: () => null,
  Badge: ({ children }) => <span>{children}</span>,
}));

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-number-format ---
jest.mock("react-number-format", () => ({
  __esModule: true,
  default: ({ renderText, value }) =>
    renderText ? renderText(String(value ?? ""), {}) : String(value ?? ""),
}));

// --- utils ---
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../utils/PaginationControls.js", () => () => null);

// --- child domain components (use forwardRef + imperative handle) ---
// React must be required inside the factory to satisfy jest.mock scope rules.
jest.mock("../create.js", () => {
  const ReactInFactory = require("react");
  return ReactInFactory.forwardRef((_props, ref) => {
    ReactInFactory.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

jest.mock("../view.js", () => {
  const ReactInFactory = require("react");
  return ReactInFactory.forwardRef((_props, ref) => {
    ReactInFactory.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  });
});

// ---------------------------------------------------------------------------

describe("PurchaseCashDiscountIndex", () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          meta: { total_cash_discount: 0 },
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

  it("renders without crashing", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PurchaseCashDiscountIndex />
        </MemoryRouter>
      );
    });
  });
});
