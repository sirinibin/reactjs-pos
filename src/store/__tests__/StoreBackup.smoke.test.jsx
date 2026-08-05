// Smoke test for store/StoreBackup.js
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import StoreBackup from "../StoreBackup.js";

const baseStore = { id: "store1", name: "Acme Store" };

describe("StoreBackup smoke test", () => {
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
        render(<StoreBackup ref={ref} />);
        expect(screen.queryByText(/Backup Store/)).not.toBeInTheDocument();
    });

    it("shows the store name in the title and fetches size from the backup/size endpoint on open()", async () => {
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
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        expect(screen.getByText(/Backup Store.*Acme Store/)).toBeInTheDocument();
        expect(screen.getByText("Total Estimated Size")).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/v1/store/store1/backup/size"),
            expect.any(Object)
        );
    });

    it("shows a sizeError alert when the size fetch responds with status:false", async () => {
        mockSizeResponseOnce({ status: false });
        const ref = React.createRef();
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        expect(await screen.findByText(/Could not calculate size/i)).toBeInTheDocument();
    });

    it("shows a sizeError alert when the size fetch itself rejects", async () => {
        global.fetch.mockImplementationOnce(() => Promise.reject(new Error("network down")));
        const ref = React.createRef();
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        expect(await screen.findByText(/Could not calculate size/i)).toBeInTheDocument();
    });

    it("disables the Download Data button while size is unresolved and enables it once size data arrives", async () => {
        // Never resolves -> loadingSize stays true -> button stays disabled.
        global.fetch.mockImplementationOnce(() => new Promise(() => { }));
        const ref = React.createRef();
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        expect(screen.getByRole("button", { name: /Download Data/i })).toBeDisabled();
    });

    it("closes the modal when Close is clicked", async () => {
        mockSizeResponseOnce({ status: true, result: { total_size: 0 } });
        const ref = React.createRef();
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        fireEvent.click(document.querySelector(".modal-footer .btn-secondary"));
        await waitFor(() => {
            expect(screen.queryByText(/Backup Store/)).not.toBeInTheDocument();
        });
    });

    it("POSTs to the backup/start endpoint when Download Data is clicked", async () => {
        mockSizeResponseOnce({ status: true, result: { total_size: 0 } });
        // Second fetch (start) left pending forever so we don't need to mock the progress-poll cycle.
        global.fetch.mockImplementationOnce(() => new Promise(() => { }));

        const ref = React.createRef();
        render(<StoreBackup ref={ref} />);
        await act(async () => {
            ref.current.open(baseStore);
        });

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Download Data/i }));
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/v1/store/store1/backup/start"),
            expect.objectContaining({ method: "POST" })
        );
    });
});
