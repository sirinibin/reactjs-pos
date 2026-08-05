import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- react-bootstrap mocks ---
jest.mock("react-bootstrap", () => ({
  Modal: Object.assign(
    ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
    {
      Header: ({ children }) => <div>{children}</div>,
      Title:  ({ children }) => <div>{children}</div>,
      Body:   ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    }
  ),
  Spinner: () => <span data-testid="spinner" />,
  Button:  ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Form:    Object.assign(({ children }) => <form>{children}</form>, {
    Group:   ({ children }) => <div>{children}</div>,
    Label:   ({ children }) => <label>{children}</label>,
    Control: (props) => <input {...props} />,
    Check:   (props) => <input type="checkbox" {...props} />,
    Select:  ({ children }) => <select>{children}</select>,
    Text:    ({ children }) => <small>{children}</small>,
  }),
  Row:   ({ children }) => <div>{children}</div>,
  Col:   ({ children }) => <div>{children}</div>,
  Alert: ({ children }) => <div role="alert">{children}</div>,
  Table: ({ children }) => <table><tbody>{children}</tbody></table>,
}));

// --- react-router-dom: keep MemoryRouter real, mock hooks/Link ---
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory:  () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams:   () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// --- utils mocks ---
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// --- timers & fetch ---
jest.useFakeTimers();

const mockFetchResponse = {
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
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// --- subject ---
import ProductBrandCreate from "../create.js";

// --- tests ---
describe("ProductBrandCreate smoke", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "test-token");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders without crashing (modal hidden by default)", () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <ProductBrandCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is closed by default — component mounts cleanly
    expect(container).toBeTruthy();
  });

  it("opens modal via imperative ref without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ProductBrandCreate ref={ref} />
      </MemoryRouter>
    );
    act(() => {
      ref.current.open();
    });
    // no assertion needed — reaching here means no crash
  });

  it("opens modal in edit mode (with id) without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ProductBrandCreate ref={ref} />
      </MemoryRouter>
    );
    act(() => {
      ref.current.open("brand-123");
    });
    // fetch should have been called to load the brand
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/product-brand/brand-123"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("accepts optional props without crashing", () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <ProductBrandCreate
          ref={ref}
          showToastMessage={jest.fn()}
          refreshList={jest.fn()}
          openDetailsView={jest.fn()}
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
