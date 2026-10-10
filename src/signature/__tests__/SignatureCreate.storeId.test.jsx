import React, { createRef } from "react";
import { render, act, fireEvent, screen } from "@testing-library/react";

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
jest.mock("react-image-file-resizer", () => ({ imageFileResizer: jest.fn() }));
jest.mock("../../utils/storeUtils.js", () => ({ fetchStore: jest.fn(() => Promise.resolve({})) }));
jest.mock("../../utils/useEnterKeyNavigation.js", () => ({ useEnterKeyNavigation: jest.fn() }));

import SignatureCreate from "../create";

function mockPost(body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
  });
}

async function openAndCreate(props = {}) {
  const ref = createRef();
  render(<SignatureCreate ref={ref} {...props} />);
  act(() => { ref.current.open(); });
  fireEvent.change(document.querySelector("#name"), { target: { value: "Sig A" } });
  const createButtons = screen.getAllByRole("button").filter((b) => /create/i.test(b.textContent));
  await act(async () => { fireEvent.click(createButtons[0]); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  localStorage.setItem("access_token", "t");
  localStorage.setItem("store_id", "64aa00000000000000000001");
});
afterEach(() => localStorage.clear());

describe("SignatureCreate submit", () => {
  it("sends store_id in the request body", async () => {
    mockPost({ status: true, result: { id: "s1" } });
    const openDetailsView = jest.fn();
    await openAndCreate({ openDetailsView });
    const post = global.fetch.mock.calls.find(([, o]) => o && o.method === "POST");
    expect(post).toBeTruthy();
    expect(JSON.parse(post[1].body).store_id).toBe("64aa00000000000000000001");
    expect(openDetailsView).toHaveBeenCalledWith("s1");
  });

  it("shows the API errors on status:false without crashing", async () => {
    mockPost({ status: false, errors: { store_id: "invalid store id" } });
    const showToastMessage = jest.fn();
    const openDetailsView = jest.fn();
    await openAndCreate({ showToastMessage, openDetailsView });
    expect(openDetailsView).not.toHaveBeenCalled();
    expect(screen.getByText("invalid store id")).toBeTruthy();
    expect(showToastMessage).toHaveBeenCalledWith(expect.anything(), "danger");
    expect(showToastMessage).not.toHaveBeenCalledWith(expect.anything(), "success");
  });
});
