import { uploadPdfForShare } from "../pdfShare";

// jest-environment-jsdom doesn't implement Blob.prototype.arrayBuffer; polyfill it.
if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function () {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(this);
        });
    };
}

beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    jest.restoreAllMocks();
});

const makeBlob = (content = "PDF content") =>
    new Blob([content], { type: "application/pdf" });

const makeResponse = (ok, status = 200) => ({
    ok,
    status,
});

// ── happy path ────────────────────────────────────────────────────────────────

test("returns a public URL on success (status 200)", async () => {
    fetch.mockResolvedValue(makeResponse(true, 200));
    const url = await uploadPdfForShare(makeBlob(), "report.pdf");
    expect(typeof url).toBe("string");
    expect(url).toContain("filebin.net");
    expect(url).toContain("report.pdf");
});

test("returns a public URL on success (status 201)", async () => {
    fetch.mockResolvedValue(makeResponse(false, 201));
    const url = await uploadPdfForShare(makeBlob(), "invoice.pdf");
    expect(url).toContain("invoice.pdf");
});

test("URL contains encoded filename", async () => {
    fetch.mockResolvedValue(makeResponse(true, 200));
    const url = await uploadPdfForShare(makeBlob(), "Sales Summary.pdf");
    expect(url).toContain("Sales%20Summary.pdf");
});

// ── request format ────────────────────────────────────────────────────────────

test("sends POST request", async () => {
    fetch.mockResolvedValue(makeResponse(true, 200));
    await uploadPdfForShare(makeBlob(), "test.pdf");
    expect(fetch).toHaveBeenCalledTimes(1);
    const opts = fetch.mock.calls[0][1];
    expect(opts.method).toBe("POST");
});

test("rewraps PDF blob as text/plain (CORS simple-request workaround)", async () => {
    fetch.mockResolvedValue(makeResponse(true, 200));
    await uploadPdfForShare(makeBlob(), "test.pdf");
    const opts = fetch.mock.calls[0][1];
    expect(opts.body).toBeInstanceOf(Blob);
    expect(opts.body.type).toBe("text/plain");
});

test("attaches AbortController signal to request", async () => {
    fetch.mockResolvedValue(makeResponse(true, 200));
    await uploadPdfForShare(makeBlob(), "test.pdf");
    const opts = fetch.mock.calls[0][1];
    expect(opts.signal).toBeDefined();
    expect(typeof opts.signal.aborted).toBe("boolean");
});

// ── error paths ───────────────────────────────────────────────────────────────

test("throws on HTTP 500", async () => {
    fetch.mockResolvedValue(makeResponse(false, 500));
    await expect(uploadPdfForShare(makeBlob(), "test.pdf")).rejects.toThrow(
        "Upload failed: HTTP 500"
    );
});

test("throws on HTTP 400", async () => {
    fetch.mockResolvedValue(makeResponse(false, 400));
    await expect(uploadPdfForShare(makeBlob(), "test.pdf")).rejects.toThrow(
        "Upload failed: HTTP 400"
    );
});

test("throws on HTTP 403", async () => {
    fetch.mockResolvedValue(makeResponse(false, 403));
    await expect(uploadPdfForShare(makeBlob(), "test.pdf")).rejects.toThrow(
        "Upload failed: HTTP 403"
    );
});

test("throws on network failure", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(uploadPdfForShare(makeBlob(), "test.pdf")).rejects.toThrow(
        "Failed to fetch"
    );
});

test("abort signal is passed — aborted fetch throws AbortError", async () => {
    fetch.mockImplementation((_url, opts) => {
        opts.signal.throwIfAborted?.();
        return Promise.reject(
            Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
        );
    });

    await expect(uploadPdfForShare(makeBlob(), "test.pdf")).rejects.toMatchObject({
        name: "AbortError",
    });
});
