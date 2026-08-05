// Shared smoke-test factory for the Store*Duplicate*.js modal family.
// These components (StoreDuplicate, StoreDuplicateProducts,
// StoreDuplicateProductsNoImages, StoreDuplicateWithoutData) are structurally
// identical forwardRef modals that differ only in title text, button text and
// API endpoint slug. Rather than duplicating ~150 lines of test boilerplate
// per file, each Store*Duplicate*.test.jsx imports and invokes this factory.
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

const baseStore = { id: "store1", name: "Acme Store" };

export function runDuplicateModalTests(Component, { titleText, buttonText, endpointSlug }) {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mockSizeResponseOnce(json) {
    global.fetch.mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve(json) }));
  }

  it("renders nothing visible until open() is called", () => {
    const ref = React.createRef();
    render(<Component ref={ref} />);
    expect(screen.queryByText(new RegExp(titleText))).not.toBeInTheDocument();
  });

  it("shows the store name in the title and fetches size from the correct endpoint on open()", async () => {
    mockSizeResponseOnce({
      status: true,
      result: {
        mongodb_store_db: 1024,
        mongodb_store_doc: 0,
        mongodb_users: 0,
        images_size: 0,
        zatca_size: 0,
        total_size: 1024,
      },
    });
    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    expect(screen.getByText(new RegExp(`${titleText}.*Acme Store`))).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/v1/store/store1/${endpointSlug}/size`),
      expect.any(Object)
    );
  });

  it("shows a sizeError alert when the size fetch responds with status:false", async () => {
    mockSizeResponseOnce({ status: false });
    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    expect(await screen.findByText(/Could not calculate size/i)).toBeInTheDocument();
  });

  it("shows a sizeError alert when the size fetch itself rejects", async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error("network down")));
    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    expect(await screen.findByText(/Could not calculate size/i)).toBeInTheDocument();
  });

  it('pre-fills the new name field with "<name> - Copy" and disables the duplicate button when cleared', async () => {
    mockSizeResponseOnce({ status: true, result: { total_size: 0 } });
    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    const nameInput = screen.getByPlaceholderText("Enter new store name");
    expect(nameInput.value).toBe("Acme Store - Copy");

    const duplicateButton = screen.getByRole("button", { name: new RegExp(buttonText) });
    expect(duplicateButton).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "" } });
    expect(duplicateButton).toBeDisabled();
  });

  it("closes the modal when Cancel is clicked", async () => {
    mockSizeResponseOnce({ status: true, result: { total_size: 0 } });
    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(titleText))).not.toBeInTheDocument();
    });
  });

  it("POSTs the trimmed new name to the start endpoint when the duplicate button is clicked", async () => {
    mockSizeResponseOnce({ status: true, result: { total_size: 0 } });
    // Second fetch (start) is left pending forever so we don't need to mock the progress-poll cycle.
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));

    const ref = React.createRef();
    render(<Component ref={ref} />);
    await act(async () => {
      ref.current.open(baseStore);
    });

    const nameInput = screen.getByPlaceholderText("Enter new store name");
    fireEvent.change(nameInput, { target: { value: "  New Name  " } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(buttonText) }));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/v1/store/store1/${endpointSlug}/start`),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ new_name: "New Name", new_name_in_arabic: "" }),
      })
    );
  });
}
