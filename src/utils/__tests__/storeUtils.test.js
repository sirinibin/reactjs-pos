import { fetchStore } from "../storeUtils";

beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
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
