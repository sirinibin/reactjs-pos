import React, { createRef } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / asset mocks ---
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => {
  const passThrough = ({ children }) => <>{children}</>;
  const Modal = ({ children, show }) => (show ? <>{children}</> : null);
  Modal.Header = passThrough;
  Modal.Title = passThrough;
  Modal.Body = passThrough;
  Modal.Footer = passThrough;
  return {
    Modal,
    Button: passThrough,
    Spinner: () => null,
    Form: passThrough,
    Row: passThrough,
    Col: passThrough,
    Alert: passThrough,
    Table: passThrough,
  };
});

// --- react-router-dom ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- react-datepicker ---
jest.mock("react-datepicker", () => () => null);

// --- react-bootstrap-typeahead ---
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// --- react-image-file-resizer ---
jest.mock("react-image-file-resizer", () => ({
  imageFileResizer: jest.fn(),
}));

// --- date-fns (keep real, no mock needed) ---

// --- child domain component ---
jest.mock("../../store/create.js", () => {
  const React = require("react");
  return React.forwardRef(() => null);
});

// --- utils ---
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

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

// --- timers ---
jest.useFakeTimers();

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// --- subject ---
import CapitalWithdrawalCreate from "../create.js";

describe("CapitalWithdrawalCreate smoke test", () => {
  it("renders without crashing", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CapitalWithdrawalCreate ref={ref} />
      </MemoryRouter>
    );
  });

  it("exposes an open() method via ref without crashing", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <CapitalWithdrawalCreate ref={ref} />
      </MemoryRouter>
    );
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current.open).toBe("function");
  });
});
