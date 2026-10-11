import {
    fetchStore, invalidateStoreCache, _clearAllStoreCaches, getCachedStore, primeStoreCache,
    refreshStore, refreshCurrentStore, handleStoreUpdatedPush, subscribeStoreUpdates,
} from "../storeUtils";

beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
    _clearAllStoreCaches();
});

afterEach(() => {
    jest.restoreAllMocks();
});

const makeJsonResponse = (body, ok = true, status = 200) => ({
    ok,
    status,
    headers: { get: (h) => (h === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(body),
});

const makeNonJsonResponse = (ok = false, status = 500) => ({
    ok,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(null),
});

// ── happy path ────────────────────────────────────────────────────────────────

test("fetchStore returns data.result on success", async () => {
    const storeData = { id: "abc123", name: "My Store" };
    fetch.mockResolvedValue(makeJsonResponse({ result: storeData }));

    const result = await fetchStore("abc123");
    expect(result).toEqual(storeData);
});

test("fetchStore calls correct URL with store id", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));

    await fetchStore("store-42");
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0][0];
    expect(url).toMatch(/\/v1\/store\/store-42/);
});

test("fetchStore loads the whole store (no select), so any field is in the shared copy", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));

    await fetchStore("s1");
    expect(fetch.mock.calls[0][0]).toBe("/v1/store/s1");
});

test("fetchStore sends Authorization header from localStorage", async () => {
    localStorage.setItem("access_token", "Bearer test-token");
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));

    await fetchStore("s1");
    const opts = fetch.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe("Bearer test-token");
});

test("fetchStore uses GET method", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));

    await fetchStore("s1");
    const opts = fetch.mock.calls[0][1];
    expect(opts.method).toBe("GET");
});

test("a custom select is answered from the shared copy", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "s1", name: "X", vat_no: "3" } }));

    await fetchStore("s1");
    const narrow = await fetchStore("s1", "id,name");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(narrow).toEqual({ id: "s1", name: "X", vat_no: "3" });
});

// ── error paths ───────────────────────────────────────────────────────────────

test("fetchStore rejects with data.errors on non-ok JSON response", async () => {
    const errors = { general: "Not found" };
    fetch.mockResolvedValue(makeJsonResponse({ errors }, false, 404));

    await expect(fetchStore("missing")).rejects.toEqual(errors);
});

test("fetchStore rejects with undefined errors on non-ok non-JSON response", async () => {
    fetch.mockResolvedValue(makeNonJsonResponse(false, 500));

    await expect(fetchStore("s1")).rejects.toBeUndefined();
});

test("fetchStore rejects on network failure", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchStore("s1")).rejects.toThrow("Failed to fetch");
});

// ── cache behaviour ───────────────────────────────────────────────────────────

test("second fetchStore call returns cached result without hitting the API", async () => {
    invalidateStoreCache("cache-test");
    const storeData = { id: "cache-test", name: "Cached Store" };
    fetch.mockResolvedValue(makeJsonResponse({ result: storeData }));

    const first = await fetchStore("cache-test");
    const second = await fetchStore("cache-test");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(storeData);
    expect(second).toEqual(storeData);
});

test("invalidateStoreCache causes next fetchStore to re-fetch from API", async () => {
    invalidateStoreCache("inv-test");
    const v1 = { id: "inv-test", name: "v1" };
    const v2 = { id: "inv-test", name: "v2" };
    fetch
        .mockResolvedValueOnce(makeJsonResponse({ result: v1 }))
        .mockResolvedValueOnce(makeJsonResponse({ result: v2 }));

    await fetchStore("inv-test");
    invalidateStoreCache("inv-test");
    const result = await fetchStore("inv-test");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(v2);
});

test("custom selects share the cache too — one request", async () => {
    invalidateStoreCache("custom-test");
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "custom-test" } }));

    await fetchStore("custom-test", "id,name");
    await fetchStore("custom-test", "id,settings");

    expect(fetch).toHaveBeenCalledTimes(1);
});

test("fetchStore returns null for falsy id without calling API", async () => {
    const result = await fetchStore(null);
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
});

// ── concurrent callers share one request ─────────────────────────────────────
// The top bar, a list and its forms all ask for the store as a screen mounts;
// before the in-flight sharing each sent its own GET /v1/store/{id}.

test("concurrent fetchStore calls for one store send one request", async () => {
    let resolve;
    fetch.mockReturnValue(new Promise((r) => { resolve = r; }));
    const calls = [fetchStore("s1"), fetchStore("s1"), fetchStore("s1")];
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(makeJsonResponse({ result: { id: "s1", name: "One" } }));
    const results = await Promise.all(calls);
    results.forEach((r) => expect(r).toEqual({ id: "s1", name: "One" }));
    await fetchStore("s1"); // now from the cache
    expect(fetch).toHaveBeenCalledTimes(1);
});

test("different stores are fetched separately", async () => {
    fetch.mockImplementation((url) => Promise.resolve(makeJsonResponse({ result: { id: url.split("/")[3].split("?")[0] } })));
    const [a, b] = await Promise.all([fetchStore("a1"), fetchStore("b2")]);
    expect(a.id).toBe("a1");
    expect(b.id).toBe("b2");
    expect(fetch).toHaveBeenCalledTimes(2);
});

test("a failed request is not shared with the next caller", async () => {
    fetch.mockResolvedValueOnce(makeJsonResponse({ errors: { x: "down" } }, false, 500));
    const first = fetchStore("s2");
    const second = fetchStore("s2");
    await expect(first).rejects.toEqual({ x: "down" });
    await expect(second).rejects.toEqual({ x: "down" });
    expect(fetch).toHaveBeenCalledTimes(1);

    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "s2" } }));
    await expect(fetchStore("s2")).resolves.toEqual({ id: "s2" });
    expect(fetch).toHaveBeenCalledTimes(2);
});

test("concurrent custom selects share one request", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "s3" } }));
    await Promise.all([fetchStore("s3", "id"), fetchStore("s3", "name"), fetchStore("s3")]);
    expect(fetch).toHaveBeenCalledTimes(1);
});

test("invalidateStoreCache during a request makes the next call fetch again", async () => {
    let resolve;
    fetch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const stale = fetchStore("s4");
    invalidateStoreCache("s4");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "s4", name: "new" } }));
    const fresh = await fetchStore("s4");
    expect(fresh.name).toBe("new");
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve(makeJsonResponse({ result: { id: "s4", name: "old" } }));
    await stale;
    // the late, older answer must not replace the newer copy
    expect(getCachedStore("s4").name).toBe("new");
    expect((await fetchStore("s4")).name).toBe("new");
    expect(fetch).toHaveBeenCalledTimes(2);
});

test("a response without result is not cached", async () => {
    fetch.mockResolvedValueOnce(makeJsonResponse({}));
    await expect(fetchStore("s5")).resolves.toBeUndefined();
    expect(getCachedStore("s5")).toBeNull();
});

// ── server push keeps the copy current ───────────────────────────────────────

test("refreshStore re-reads the store and hands the new copy to subscribers", async () => {
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "p1", name: "v1" } }));
    await fetchStore("p1");
    const seen = [];
    const unsubscribe = subscribeStoreUpdates((s) => seen.push(s.name));
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "p1", name: "v2" } }));
    await refreshStore("p1");
    expect(seen).toEqual(["v2"]);
    expect((await fetchStore("p1")).name).toBe("v2");
    expect(fetch).toHaveBeenCalledTimes(2);
    unsubscribe();
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "p1", name: "v3" } }));
    await refreshStore("p1");
    expect(seen).toEqual(["v2"]);
});

test("store_updated push for the current store re-reads it once", async () => {
    localStorage.setItem("store_id", "cur");
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "cur", name: "N", settings: { a: 1 } } }));
    await handleStoreUpdatedPush({ store_id: "cur" });
    expect(fetch).toHaveBeenCalledTimes(1);
    await fetchStore("cur");
    expect(fetch).toHaveBeenCalledTimes(1);
});

test("store_updated push for a store this page never loaded is ignored", async () => {
    localStorage.setItem("store_id", "cur");
    await handleStoreUpdatedPush({ store_id: "other" });
    await handleStoreUpdatedPush({});
    await handleStoreUpdatedPush(null);
    expect(fetch).not.toHaveBeenCalled();
});

test("store_updated push for another store already loaded refreshes it", async () => {
    localStorage.setItem("store_id", "cur");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "o2", name: "old" } }));
    await fetchStore("o2");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "o2", name: "new" } }));
    await handleStoreUpdatedPush({ store_id: "o2" });
    expect(getCachedStore("o2").name).toBe("new");
});

test("a failed refresh keeps working: the push resolves and the next read retries", async () => {
    localStorage.setItem("store_id", "cur");
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(handleStoreUpdatedPush({ store_id: "cur" })).resolves.toBeNull();
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "cur" } }));
    await expect(fetchStore("cur")).resolves.toEqual({ id: "cur" });
});

test("refreshing the current store updates its settings copy in localStorage", async () => {
    localStorage.setItem("store_id", "cur");
    localStorage.setItem("branch_name", "Old branch");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "cur", name: "Shop", name_in_arabic: "متجر", settings: { enable_x: true } } }));
    await refreshStore("cur");
    expect(JSON.parse(localStorage.getItem("_store_settings_cache"))).toEqual({ enable_x: true });
    expect(localStorage.getItem("store_name")).toBe("Shop");
    expect(localStorage.getItem("store_name_in_arabic")).toBe("متجر");
    expect(localStorage.getItem("branch_name")).toBeNull();
});

test("refreshing another store leaves the current store's localStorage alone", async () => {
    localStorage.setItem("store_id", "cur");
    localStorage.setItem("_store_settings_cache", "{\"mine\":1}");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "x9", settings: { theirs: 1 } } }));
    await refreshStore("x9");
    expect(localStorage.getItem("_store_settings_cache")).toBe("{\"mine\":1}");
});

test("refreshCurrentStore does nothing when signed out", async () => {
    localStorage.setItem("store_id", "cur");
    await refreshCurrentStore();
    expect(fetch).not.toHaveBeenCalled();
    localStorage.setItem("access_token", "t");
    fetch.mockResolvedValueOnce(makeJsonResponse({ result: { id: "cur" } }));
    await refreshCurrentStore();
    expect(fetch).toHaveBeenCalledTimes(1);
});

test("primeStoreCache serves later reads and notifies subscribers", async () => {
    const seen = [];
    subscribeStoreUpdates((s) => seen.push(s.id));
    primeStoreCache({ id: "pr", name: "P" });
    primeStoreCache(null);
    expect(await fetchStore("pr")).toEqual({ id: "pr", name: "P" });
    expect(fetch).not.toHaveBeenCalled();
    expect(seen).toEqual(["pr"]);
});

test("a throwing subscriber does not stop the others", async () => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    const seen = [];
    subscribeStoreUpdates(() => { throw new Error("boom"); });
    subscribeStoreUpdates((s) => seen.push(s.id));
    primeStoreCache({ id: "t1" });
    expect(seen).toEqual(["t1"]);
});
