import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("react-bootstrap", () => {
  const Modal = ({ show, children }) =>
    show ? <div data-testid="mock-modal">{children}</div> : null;
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body  = ({ children }) => <div>{children}</div>;
  return {
    Modal,
    Spinner: () => null,
  };
});

jest.mock("react-bootstrap-typeahead", () => {
  const React = require("react");
  return {
    Typeahead: React.forwardRef((_props, ref) => {
      // expose clear() so the component's ref.current?.clear() call doesn't throw
      React.useImperativeHandle(ref, () => ({ clear: jest.fn() }));
      return null;
    }),
  };
});

jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));

// ─── Timer / Fetch setup ─────────────────────────────────────────────────────

jest.useFakeTimers();

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
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ─── Import component after mocks ────────────────────────────────────────────

import ServiceCategoryCreate from "../create";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ServiceCategoryCreate — smoke tests", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "test-token");
    localStorage.setItem("store_id", "store-123");
  });

  it("renders without crashing (modal hidden by default)", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ServiceCategoryCreate ref={ref} />
      </MemoryRouter>
    );
  });

  it("opens modal (create mode) without crashing", () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ServiceCategoryCreate ref={ref} />
      </MemoryRouter>
    );

    act(() => {
      ref.current.open();
    });
  });

  it("opens modal with an id (edit mode) without crashing", async () => {
    const ref = React.createRef();
    render(
      <MemoryRouter>
        <ServiceCategoryCreate ref={ref} />
      </MemoryRouter>
    );

    await act(async () => {
      ref.current.open("cat-42");
    });
  });

  it("accepts optional props without crashing", () => {
    const ref = React.createRef();
    const showToastMessage = jest.fn();
    const refreshList = jest.fn();

    render(
      <MemoryRouter>
        <ServiceCategoryCreate
          ref={ref}
          showToastMessage={showToastMessage}
          refreshList={refreshList}
        />
      </MemoryRouter>
    );

    act(() => {
      ref.current.open();
    });
  });
});
