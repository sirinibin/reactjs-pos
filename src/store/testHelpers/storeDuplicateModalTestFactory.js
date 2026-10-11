// Shared smoke-test factory for the Store*Duplicate*.js modal family.
// These components (StoreDuplicate, StoreDuplicateProducts,
// StoreDuplicateProductsNoImages, StoreDuplicateWithoutData) are structurally
// identical forwardRef modals that differ only in title text, button text and
// API endpoint slug. Rather than duplicating ~150 lines of test boilerplate
// per file, each Store*Duplicate*.test.jsx imports and invokes this factory.
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import eventEmitter from "../../utils/eventEmitter";

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

  // Progress arrives by server push (job_progress), not by polling the
  // progress endpoint (user rule 2026-10-11: push, never periodic fetching).
  describe("progress by server push", () => {
    const json = (body) => Promise.resolve({ json: () => Promise.resolve(body) });
    const step = { id: "s1", name: "Copy things", status: "running", progress: 50 };

    async function startJob(onDuplicated) {
      global.fetch.mockImplementation((url) => {
        const u = String(url);
        if (u.includes("/size")) return json({ status: true, result: { total_size: 0 } });
        if (u.includes("/start")) return json({ status: true, result: { job_id: "job-7", new_store_id: "n1" } });
        if (u.includes("/progress")) return json({ status: true, result: { steps: [], overall_progress: 0, done: false } });
        return json({ status: true, result: {} });
      });
      const ref = React.createRef();
      render(<Component ref={ref} onDuplicated={onDuplicated} />);
      await act(async () => { ref.current.open(baseStore); });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: new RegExp(buttonText) }));
      });
      await act(async () => { await Promise.resolve(); });
    }

    const progressCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).includes("/progress"));

    it("reads progress once at the start, then only from pushes", async () => {
      jest.useFakeTimers();
      try {
        await startJob();
        expect(progressCalls()).toHaveLength(1);
        expect(progressCalls()[0][0]).toContain("job_id=job-7");
        await act(async () => { jest.advanceTimersByTime(30000); });
        expect(progressCalls()).toHaveLength(1);

        await act(async () => {
          eventEmitter.emit("job_progress", { job_id: "job-7", progress: { steps: [step], overall_progress: 50, done: false } });
        });
        expect(screen.getAllByText("Copy things").length).toBeGreaterThan(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it("ignores pushes for other jobs and finishes once on the done push", async () => {
      const onDuplicated = jest.fn();
      await startJob(onDuplicated);
      await act(async () => {
        eventEmitter.emit("job_progress", { job_id: "other", progress: { steps: [step], overall_progress: 50, done: true } });
      });
      expect(onDuplicated).not.toHaveBeenCalled();
      const done = { job_id: "job-7", progress: { steps: [{ ...step, status: "done", progress: 100 }], overall_progress: 100, done: true, new_store_id: "n1", new_store_name: "Copy" } };
      await act(async () => { eventEmitter.emit("job_progress", done); });
      await act(async () => { eventEmitter.emit("job_progress", done); }); // a late duplicate
      expect(onDuplicated).toHaveBeenCalledTimes(1);
    });

    it("re-reads progress once after a reconnect, and not after the job ended", async () => {
      await startJob(jest.fn());
      await act(async () => { eventEmitter.emit("socket_connection_open"); });
      expect(progressCalls()).toHaveLength(2);
      await act(async () => {
        eventEmitter.emit("job_progress", { job_id: "job-7", progress: { steps: [], overall_progress: 100, done: true } });
      });
      await act(async () => { eventEmitter.emit("socket_connection_open"); });
      expect(progressCalls()).toHaveLength(2);
    });
  });
}
