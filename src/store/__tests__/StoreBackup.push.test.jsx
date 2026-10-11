// The backup window follows the job by server push (job_progress), not by
// polling backup/progress every 500 ms (user rule 2026-10-11).
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StoreBackup from "../StoreBackup.js";
import eventEmitter from "../../utils/eventEmitter";

const json = (body) => Promise.resolve({ json: () => Promise.resolve(body) });
const progressCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).includes("/backup/progress"));

beforeEach(() => {
    global.fetch = jest.fn((url) => {
        const u = String(url);
        if (u.includes("/backup/size")) return json({ status: true, result: { total_size: 10 } });
        if (u.includes("/backup/start")) return json({ status: true, result: { job_id: "bk-1" } });
        if (u.includes("/backup/progress")) return json({ status: true, result: { steps: [], overall_progress: 0, done: false } });
        return json({ status: true });
    });
});

async function start() {
    const ref = React.createRef();
    render(<StoreBackup ref={ref} />);
    await act(async () => { ref.current.open({ id: "store1", name: "Acme" }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Download Data/ })); });
    await act(async () => { await Promise.resolve(); });
}

test("one progress read at the start, no timer polling, file download once on the done push", async () => {
    jest.useFakeTimers();
    const clicks = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { });
    try {
        await start();
        expect(progressCalls()).toHaveLength(1);
        await act(async () => { jest.advanceTimersByTime(20000); });
        expect(progressCalls()).toHaveLength(1);

        const done = { job_id: "bk-1", progress: { steps: [], overall_progress: 100, done: true, file_token: "bk-1" } };
        await act(async () => { eventEmitter.emit("job_progress", done); });
        await act(async () => { eventEmitter.emit("job_progress", done); });
        expect(clicks).toHaveBeenCalledTimes(1);
    } finally {
        clicks.mockRestore();
        jest.useRealTimers();
    }
});

test("a pushed error ends the job with the message", async () => {
    await start();
    await act(async () => {
        eventEmitter.emit("job_progress", { job_id: "bk-1", progress: { steps: [], overall_progress: 20, done: true, error: "disk full" } });
    });
    expect(screen.getByText(/disk full/)).toBeInTheDocument();
});
