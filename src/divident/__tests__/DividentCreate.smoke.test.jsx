import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── react-bootstrap ──────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => ({
  Modal: Object.assign(
    ({ show, children }) => (show ? <div>{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Button: ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Spinner: () => <span />,
  Form: Object.assign(({ children }) => <form>{children}</form>, {
    Group: ({ children }) => <div>{children}</div>,
    Label: ({ children }) => <label>{children}</label>,
    Control: (props) => <input {...props} />,
    Select: ({ children }) => <select>{children}</select>,
    Check: (props) => <input type="checkbox" {...props} />,
  }),
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
}));

// ── react-router-dom ─────────────────────────────────────────────────────────
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", state: {} }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// ── react-datepicker ─────────────────────────────────────────────────────────
jest.mock("react-datepicker", () => () => null);
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: () => null,
  AsyncTypeahead: () => null,
}));

// ── react-image-file-resizer ─────────────────────────────────────────────────
jest.mock("react-image-file-resizer", () => ({
  imageFileResizer: jest.fn(),
}));

// ── date-fns ─────────────────────────────────────────────────────────────────
jest.mock("date-fns", () => ({
  format: jest.fn((date, fmt) => String(date)),
}));

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── fetch ─────────────────────────────────────────────────────────────────────
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
  // Stub localStorage so the auth check doesn't redirect
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === "access_token") return "test-token";
    if (key === "store_id") return "store-123";
    return null;
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import DividentCreate from "../create";

describe("DividentCreate smoke test", () => {
  it("renders without crashing (modal hidden by default)", () => {
    render(
      <MemoryRouter>
        <DividentCreate />
      </MemoryRouter>
    );
  });

  it("renders modal content when opened via ref", async () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <DividentCreate ref={ref} />
      </MemoryRouter>
    );
    // open() with no id (create mode)
    await act(async () => {
      ref.current.open();
    });
  });

  it("renders modal content when opened with an id (edit mode)", async () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <DividentCreate ref={ref} />
      </MemoryRouter>
    );
    await act(async () => {
      ref.current.open("divident-abc-123");
    });
  });
});
