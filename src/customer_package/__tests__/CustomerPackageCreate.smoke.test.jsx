import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / image stubs ---
jest.mock("react-bootstrap/dist/react-bootstrap.css", () => ({}), { virtual: true });

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const mockReact = require("react");
  const passthrough = ({ children }) => mockReact.createElement(mockReact.Fragment, null, children || null);
  const Modal = ({ show, children }) => (show ? mockReact.createElement(mockReact.Fragment, null, children) : null);
  Modal.Header = passthrough;
  Modal.Title = passthrough;
  Modal.Body = passthrough;
  Modal.Footer = passthrough;
  return {
    Modal,
    Button: passthrough,
    Form: Object.assign(passthrough, {
      Group: passthrough,
      Label: passthrough,
      Control: () => null,
      Check: () => null,
      Select: () => null,
      Text: passthrough,
    }),
    Table: passthrough,
    Row: passthrough,
    Col: passthrough,
    Spinner: () => null,
    Alert: passthrough,
    Badge: passthrough,
    Card: Object.assign(passthrough, { Body: passthrough, Header: passthrough }),
    Container: passthrough,
    InputGroup: Object.assign(passthrough, { Text: passthrough }),
  };
});

// --- sidebar_menu_config ---
// Path is relative to this test file (src/customer_package/__tests__/)
jest.mock("../../sidebar_menu_config", () => ({
  DEFAULT_MENU: [
    { id: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
    { id: "sales", label: "Sales", icon: "bi-receipt" },
    { id: "customers", label: "Customers", icon: "bi-people" },
  ],
}));

// --- useEnterKeyNavigation ---
jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// --- react-router-dom: keep MemoryRouter real, mock hooks/Link ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to }) => require("react").createElement("a", { href: to }, children),
  };
});

// -----------------------------------------------------------------------

import CustomerPackageCreate from "../create";

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
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("CustomerPackageCreate smoke test", () => {
  it("renders without crashing (modal closed by default)", () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <CustomerPackageCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is closed by default (show=false) — component should mount without error
    expect(container).toBeTruthy();
  });

  it("opens modal via imperative ref without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <CustomerPackageCreate ref={ref} />
      </MemoryRouter>
    );
    // Open in create mode (no id) — wrap state updates in act
    act(() => { ref.current.open(); });
  });

  it("opens modal in edit mode via imperative ref without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <CustomerPackageCreate ref={ref} />
      </MemoryRouter>
    );
    // Open in edit mode (with id) — triggers a fetch
    act(() => { ref.current.open("abc123"); });
    expect(global.fetch).toHaveBeenCalledWith(
      "/v1/customer-package/abc123",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("renders modal content after open() is called", () => {
    const ref = React.createRef();
    const { getByText } = render(
      <MemoryRouter>
        <CustomerPackageCreate ref={ref} />
      </MemoryRouter>
    );
    act(() => { ref.current.open(); });
    getByText("Create New Package");
  });

  it("accepts showToastMessage and refreshList props without crashing", () => {
    const ref = React.createRef();
    const showToastMessage = jest.fn();
    const refreshList = jest.fn();
    const { container } = render(
      <MemoryRouter>
        <CustomerPackageCreate
          ref={ref}
          showToastMessage={showToastMessage}
          refreshList={refreshList}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
