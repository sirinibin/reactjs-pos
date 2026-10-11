import eventEmitter from "../eventEmitter";
import { _clearAllStoreCaches, fetchStore } from "../storeUtils";

jest.mock("react-use-websocket", () => () => ({}));
jest.mock("@fingerprintjs/fingerprintjs", () => ({ load: jest.fn() }));

const { dispatchSocketMessage } = require("../WebSocketContext");

const json = (result) => ({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve({ result }) });
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
    localStorage.clear();
    _clearAllStoreCaches();
    global.fetch = jest.fn();
});

test("store_updated re-reads the current store once", async () => {
    localStorage.setItem("store_id", "s1");
    fetch.mockResolvedValueOnce(json({ id: "s1", name: "old" }));
    await fetchStore("s1");
    fetch.mockResolvedValueOnce(json({ id: "s1", name: "new" }));
    dispatchSocketMessage({ event: "store_updated", data: { store_id: "s1" } });
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await fetchStore("s1")).name).toBe("new");
    expect(fetch).toHaveBeenCalledTimes(2);
});

test("store_updated for a store this page does not use sends nothing", async () => {
    localStorage.setItem("store_id", "s1");
    dispatchSocketMessage({ event: "store_updated", data: { store_id: "s2" } });
    await flush();
    expect(fetch).not.toHaveBeenCalled();
});

test("existing events still reach the app", () => {
    const seen = [];
    const on = (e) => seen.push(e);
    eventEmitter.on("wa_unread_changed", () => on("wa"));
    eventEmitter.on("purchase_request_updated", (d) => on(d));
    dispatchSocketMessage({ event: "wa_unread_changed" });
    dispatchSocketMessage({ event: "purchase_request_updated", data: { id: 7 } });
    dispatchSocketMessage({ event: "unknown_event" });
    expect(seen).toEqual(["wa", { id: 7 }]);
});

test("procurement_messages_changed and user status events reach their listeners", () => {
    const seen = [];
    const onMsgs = (d) => seen.push(["msgs", d]);
    const onUsers = () => seen.push(["users"]);
    eventEmitter.on("procurement_messages_changed", onMsgs);
    eventEmitter.on("user_status_change", onUsers);
    dispatchSocketMessage({ event: "procurement_messages_changed", data: { store_id: "s1", type: "whatsapp" } });
    dispatchSocketMessage({ event: "user_status_change" });
    dispatchSocketMessage({ event: "user_device_count_change" });
    eventEmitter.off("procurement_messages_changed", onMsgs);
    eventEmitter.off("user_status_change", onUsers);
    expect(seen).toEqual([["msgs", { store_id: "s1", type: "whatsapp" }], ["users"], ["users"]]);
});

test("job, WhatsApp connect, dashboard and deploy events reach their listeners", () => {
    const seen = [];
    const names = ["job_progress", "whatsapp_connect", "dashboard_recomputed", "frontend_deployed"];
    const handlers = names.map((n) => [n, (d) => seen.push([n, d])]);
    handlers.forEach(([n, h]) => eventEmitter.on(n, h));
    dispatchSocketMessage({ event: "job_progress", data: { job_id: "j" } });
    dispatchSocketMessage({ event: "whatsapp_connect", data: { store_id: "s1", connected: true } });
    dispatchSocketMessage({ event: "dashboard_recomputed", data: { store_id: "s1" } });
    dispatchSocketMessage({ event: "frontend_deployed" });
    handlers.forEach(([n, h]) => eventEmitter.off(n, h));
    expect(seen).toEqual([
        ["job_progress", { job_id: "j" }],
        ["whatsapp_connect", { store_id: "s1", connected: true }],
        ["dashboard_recomputed", { store_id: "s1" }],
        ["frontend_deployed", undefined],
    ]);
});
