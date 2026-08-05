// Smoke test — renders without crashing
// React 17, CRA, @testing-library/react v11, NO TypeScript

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / asset mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const Modal = ({ show, children }) => show ? <div>{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Footer = ({ children }) => <div>{children}</div>;
  return {
    Modal,
    Button: () => null,
    Form: Object.assign(() => null, {
      Group: () => null, Label: () => null,
      Control: () => null, Check: () => null,
      Select: () => null, Text: () => null,
    }),
    Table: () => null,
    Row: ({ children }) => <>{children}</>,
    Col: ({ children }) => <>{children}</>,
    Spinner: () => null,
    Alert: () => null,
    Dropdown: Object.assign(() => null, {
      Toggle: () => null, Menu: () => null, Item: () => null,
    }),
    Container: ({ children }) => <>{children}</>,
    Badge: () => null,
    Card: Object.assign(({ children }) => <>{children}</>, {
      Body: ({ children }) => <>{children}</>,
    }),
    Nav: () => null,
    Navbar: () => null,
    Tabs: () => null,
    Tab: () => null,
  };
});

// --- react-router-dom: keep MemoryRouter real, stub hooks/Link ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children }) => <>{children}</>,
  };
});

// --- react-draggable: passthrough ---
jest.mock("react-draggable", () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// --- child domain component ---
// Path resolves from TEST file: src/utils/__tests__/ -> ../../delivery_note/index.js = src/delivery_note/index.js
jest.mock("../../delivery_note/index.js", () => (props) => {
  const React = require("react");
  return React.createElement(
    "button",
    { "data-testid": "delivery-note-select", onClick: () => props.onSelectDeliveryNote && props.onSelectDeliveryNote({ id: "dn1" }) },
    "select"
  );
});

// --- global fetch ---
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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

import { createRef } from "react";
import { screen, act } from "@testing-library/react";
import DeliveryNotes from "../delivery_notes.js";

describe("DeliveryNotes (smoke)", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <DeliveryNotes onSelectDeliveryNote={jest.fn()} />
      </MemoryRouter>
    );
  });

  it('open(false) shows "Delivery Notes" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <DeliveryNotes ref={ref} onSelectDeliveryNote={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false, []));
    expect(screen.getByText("Delivery Notes")).toBeInTheDocument();
  });

  it('open(true) shows "Select Delivery Note" title', () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <DeliveryNotes ref={ref} onSelectDeliveryNote={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true, []));
    expect(screen.getByText("Select Delivery Note")).toBeInTheDocument();
  });

  it("selecting a delivery note calls onSelectDeliveryNote and closes the modal", () => {
    const onSelectDeliveryNote = jest.fn();
    const ref = createRef();
    render(
      <MemoryRouter>
        <DeliveryNotes ref={ref} onSelectDeliveryNote={onSelectDeliveryNote} />
      </MemoryRouter>
    );
    act(() => ref.current.open(true));
    act(() => screen.getByTestId("delivery-note-select").click());
    expect(onSelectDeliveryNote).toHaveBeenCalledWith({ id: "dn1" });
  });

  it("clicking the close button hides the modal", () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <DeliveryNotes ref={ref} onSelectDeliveryNote={jest.fn()} />
      </MemoryRouter>
    );
    act(() => ref.current.open(false));
    act(() => container.querySelector(".btn-close").click());
    expect(screen.queryByText("Delivery Notes")).not.toBeInTheDocument();
  });
});
