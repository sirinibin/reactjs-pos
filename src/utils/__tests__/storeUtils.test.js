import { fetchStore, invalidateStoreCache, _clearAllStoreCaches } from "../storeUtils";

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

test("fetchStore includes select param in URL", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));

    await fetchStore("s1");
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("select=");
    expect(url).toContain("name");
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

test("fetchStore accepts custom select fields", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "s1", name: "X" } }));

    await fetchStore("s1", "id,name");
    const url = fetch.mock.calls[0][0];
    // The function does not URL-encode the select param; commas are passed as-is
    expect(url).toContain("select=id,name");
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

// ── default select contains key fields ───────────────────────────────────────

test("default select string includes vat_no", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));
    await fetchStore("s1");
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("vat_no");
});

test("default select string includes settings", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: {} }));
    await fetchStore("s1");
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("settings");
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

test("custom select bypasses cache — always hits API", async () => {
    invalidateStoreCache("custom-test");
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "custom-test" } }));

    await fetchStore("custom-test", "id,name");
    await fetchStore("custom-test", "id,name");

    expect(fetch).toHaveBeenCalledTimes(2);
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

test("a custom select is never shared or cached", async () => {
    fetch.mockResolvedValue(makeJsonResponse({ result: { id: "s3" } }));
    await Promise.all([fetchStore("s3", "id"), fetchStore("s3", "id")]);
    expect(fetch).toHaveBeenCalledTimes(2);
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
});
