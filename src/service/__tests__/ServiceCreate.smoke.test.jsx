import React, { createRef } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => {
  const mockReact = require("react");
  const passthrough = ({ children, ...rest }) =>
    mockReact.createElement("div", rest, children);
  const Modal = ({ children, show, ...rest }) =>
    show
      ? mockReact.createElement("div", { "data-testid": "modal", ...rest }, children)
      : null;
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
      Control: passthrough,
      Check: passthrough,
      Select: passthrough,
      Text: passthrough,
    }),
    Row: passthrough,
    Col: passthrough,
    Table: passthrough,
    Alert: passthrough,
    Spinner: () =>
      mockReact.createElement("span", { "data-testid": "spinner" }),
    Badge: passthrough,
    Container: passthrough,
    Nav: passthrough,
    Navbar: passthrough,
    InputGroup: Object.assign(passthrough, { Text: passthrough }),
  };
});

// ── react-router-dom ─────────────────────────────────────────────────────────
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  const mockReact = require("react");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), go: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({
      pathname: "/",
      search: "",
      hash: "",
      state: undefined,
    }),
    Link: ({ children, to, ...rest }) =>
      mockReact.createElement("a", { href: to, ...rest }, children),
  };
});

// ── react-bootstrap-typeahead ────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => {
  const mockReact = require("react");
  return {
    Typeahead: mockReact.forwardRef((_props, _ref) => null),
    AsyncTypeahead: mockReact.forwardRef((_props, _ref) => null),
  };
});

// ── child domain components ──────────────────────────────────────────────────
jest.mock("../../service_category/create.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, _ref) => null);
});

// ── utils components ─────────────────────────────────────────────────────────
jest.mock("../../utils/ImageGallery.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, _ref) => null);
});
jest.mock("../../utils/product_sales_history.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, _ref) => null);
});
jest.mock("../../utils/product_sales_return_history.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, _ref) => null);
});
jest.mock("../../utils/product_quotation_history.js", () => {
  const mockReact = require("react");
  return mockReact.forwardRef((_props, _ref) => null);
});

// ── utility functions ────────────────────────────────────────────────────────
jest.mock("../../utils/numberUtils", () => ({
  trimTo8Decimals: jest.fn((n) => String(n)),
}));
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));
jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

// ── timers / fetch ────────────────────────────────────────────────────────────
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

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── subject under test ────────────────────────────────────────────────────────
import ServiceCreate from "../create.js";

describe("ServiceCreate – smoke", () => {
  it("renders without crashing (modal hidden by default)", () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <ServiceCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal starts hidden – component must mount without throwing
    expect(container).toBeTruthy();
  });
});
