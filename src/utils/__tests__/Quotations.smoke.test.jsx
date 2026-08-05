// Smoke test for src/utils/quotations.js
// React 17, CRA, @testing-library/react v11, no TypeScript

// --- CSS / asset mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap: stub every component used (Modal + sub-components) ---
jest.mock("react-bootstrap", () => {
  const Modal = ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;
  return {
    Modal,
    Button: ({ children, ...p }) => <button {...p}>{children}</button>,
    Form: ({ children }) => <form>{children}</form>,
    Table: ({ children }) => <table><tbody>{children}</tbody></table>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Spinner: () => null,
    Alert: ({ children }) => <div>{children}</div>,
    Dropdown: ({ children }) => <div>{children}</div>,
  };
});

// --- react-draggable ---
jest.mock("react-draggable", () => {
  const Draggable = ({ children }) => <>{children}</>;
  return Draggable;
});

// --- child domain component ---
// Path is relative to THIS test file (src/utils/__tests__/), not to the source file
jest.mock("../../quotation/index.js", () => (props) => {
  const React = require("react");
  return React.createElement(
    "button",
    { "data-testid": "quotation-select", onClick: () => props.onSelectQuotation && props.onSelectQuotation({ id: "q1" }) },
    "select"
  );
});

// ---------------------------------------------------------------------------

import React, { createRef } from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Quotations from "../quotations.js";

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

describe("Quotations (smoke)", () => {
  it("renders without crashing", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={jest.fn()} />
      </MemoryRouter>
    );
  });

  it('open(false) shows "Quotations" title (not selection mode)', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false, [], "invoice"));
    expect(screen.getByText("Quotations")).toBeInTheDocument();
  });

  it('open(true) shows "Select Quotation" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true, [], "invoice"));
    expect(screen.getByText("Select Quotation")).toBeInTheDocument();
  });

  it("selecting a quotation calls onSelectQuotation and closes the modal", () => {
    const onSelectQuotation = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={onSelectQuotation} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    act(() => screen.getByTestId("quotation-select").click());
    expect(onSelectQuotation).toHaveBeenCalledWith({ id: "q1" });
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("clicking the close button hides the modal", () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    act(() => container.querySelector(".btn-close").click());
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("open() without a typeValue resets type to empty string (falsy branch)", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <Quotations ref={ref} onSelectQuotation={jest.fn()} />
      </MemoryRouter>
    );
    // First open with a type, then reopen without one — should reset, not preserve.
    act(() => ref.current.open(false, [], "invoice"));
    act(() => ref.current.open(false, []));
    // No direct DOM assertion available for `type` (passed straight to the mocked
    // child), but this exercises the else-branch without throwing.
    expect(screen.getByText("Quotations")).toBeInTheDocument();
  });
});
