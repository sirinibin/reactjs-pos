import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── react-bootstrap ──────────────────────────────────────────────────────────
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
  Spinner: () => <span data-testid="spinner" />,
}));

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────

import ArabicNameCreate from "../create";

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
  localStorage.setItem("access_token", "test-token");
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

describe("ArabicNameCreate smoke test", () => {
  it("renders without crashing when modal is closed (default state)", () => {
    const ref = React.createRef();
    const { container } = render(
      <MemoryRouter>
        <ArabicNameCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is hidden by default — component should mount without errors
    expect(container).toBeTruthy();
  });

  it("renders modal content when opened via ref", () => {
    const ref = React.createRef();
    const { getByTestId } = render(
      <MemoryRouter>
        <ArabicNameCreate ref={ref} />
      </MemoryRouter>
    );

    // open() without an id (create mode)
    act(() => {
      ref.current.open();
    });

    expect(getByTestId("modal")).toBeTruthy();
  });

  it("opens in edit mode and fires fetch for existing id", async () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ArabicNameCreate ref={ref} />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open("abc123");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/arabic-name/abc123"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("accepts showToastMessage and refreshList props without crashing", () => {
    const ref = React.createRef();
    const showToast = jest.fn();
    const refreshList = jest.fn();

    const { container } = render(
      <MemoryRouter>
        <ArabicNameCreate
          ref={ref}
          showToastMessage={showToast}
          refreshList={refreshList}
        />
      </MemoryRouter>
    );

    expect(container).toBeTruthy();
  });
});
