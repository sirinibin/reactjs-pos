// Smoke test for utils/quotation_sales_returns.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- CSS / image mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
  Modal: Object.assign(
    ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Form: Object.assign(({ children }) => <form>{children}</form>, {
    Group: ({ children }) => <div>{children}</div>,
    Label: ({ children }) => <label>{children}</label>,
    Control: (props) => <input {...props} />,
    Check: (props) => <input type="checkbox" {...props} />,
    Select: ({ children }) => <select>{children}</select>,
  }),
  Table: ({ children }) => <table>{children}</table>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Spinner: () => <span>spinner</span>,
  Alert: ({ children }) => <div>{children}</div>,
  Dropdown: Object.assign(({ children }) => <div>{children}</div>, {
    Toggle: ({ children }) => <button>{children}</button>,
    Menu: ({ children }) => <div>{children}</div>,
    Item: ({ children }) => <div>{children}</div>,
  }),
}));

// --- react-draggable ---
jest.mock("react-draggable", () => {
  const React = require("react");
  return ({ children }) => React.createElement(React.Fragment, null, children);
});

// --- child domain component ---
jest.mock("../../quotation_sales_return/index.js", () => (props) => {
  const React = require("react");
  return React.createElement(
    "button",
    { "data-testid": "qsr-select", onClick: () => props.onSelectQuotationSalesReturn && props.onSelectQuotationSalesReturn({ id: "qsr1" }) },
    "select"
  );
});

// -----------------------------------------------------------------------

import React, { createRef } from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import QuotationSalesReturns from "../quotation_sales_returns.js";

beforeEach(() => {
  jest.useFakeTimers();
});

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

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("QuotationSalesReturns (smoke)", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <QuotationSalesReturns onSelectQuotationSalesReturn={jest.fn()} />
      </MemoryRouter>
    );
  });

  it('open(false) shows "Qtn. Sales Returns" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <QuotationSalesReturns ref={ref} onSelectQuotationSalesReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false, []));
    expect(screen.getByText("Qtn. Sales Returns")).toBeInTheDocument();
  });

  it('open(true) shows "Select Qtn. Sales Return" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <QuotationSalesReturns ref={ref} onSelectQuotationSalesReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true, []));
    expect(screen.getByText("Select Qtn. Sales Return")).toBeInTheDocument();
  });

  it("selecting a return calls onSelectQuotationSalesReturn and closes the modal", () => {
    const onSelectQuotationSalesReturn = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <QuotationSalesReturns ref={ref} onSelectQuotationSalesReturn={onSelectQuotationSalesReturn} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    act(() => screen.getByTestId("qsr-select").click());
    expect(onSelectQuotationSalesReturn).toHaveBeenCalledWith({ id: "qsr1" });
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("clicking the close button hides the modal", () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <QuotationSalesReturns ref={ref} onSelectQuotationSalesReturn={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    act(() => container.querySelector(".btn-close").click());
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });
});
