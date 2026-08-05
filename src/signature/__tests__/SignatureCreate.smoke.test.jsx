import React, { createRef } from "react";
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
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Spinner: () => <span data-testid="spinner" />,
}));

// ── react-image-file-resizer ─────────────────────────────────────────────────
jest.mock("react-image-file-resizer", () => ({
  imageFileResizer: jest.fn(),
}));

// ── utils ────────────────────────────────────────────────────────────────────
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../utils/useEnterKeyNavigation.js", () => ({
  useEnterKeyNavigation: jest.fn(),
}));

// ── fetch ────────────────────────────────────────────────────────────────────
beforeEach(() => {
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

jest.useFakeTimers();

// ── component under test ─────────────────────────────────────────────────────
import SignatureCreate from "../create";

describe("SignatureCreate — smoke", () => {
  it("renders without crashing (modal hidden by default)", () => {
    const ref = createRef();
    const { container } = render(
      <MemoryRouter>
        <SignatureCreate ref={ref} />
      </MemoryRouter>
    );
    // Modal is hidden on mount — component must not throw
    expect(container).toBeTruthy();
  });

  it("exposes an open() imperative handle without throwing", () => {
    const ref = createRef();
    render(
      <MemoryRouter>
        <SignatureCreate ref={ref} />
      </MemoryRouter>
    );
    expect(() => act(() => { ref.current.open(); })).not.toThrow();
  });

  it("shows modal content after open() is called", () => {
    const ref = createRef();
    const { getByTestId } = render(
      <MemoryRouter>
        <SignatureCreate ref={ref} />
      </MemoryRouter>
    );
    act(() => { ref.current.open(); });
    expect(getByTestId("modal")).toBeTruthy();
  });

  it("passes showToastMessage and refreshList props without crashing", () => {
    const ref = createRef();
    const showToastMessage = jest.fn();
    const refreshList = jest.fn();
    expect(() =>
      render(
        <MemoryRouter>
          <SignatureCreate
            ref={ref}
            showToastMessage={showToastMessage}
            refreshList={refreshList}
          />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
