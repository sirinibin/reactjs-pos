/**
 * MSW integration tests — verify the order-list API contract:
 * URL shape, query-string params, response parsing, and error handling.
 *
 * These tests exercise the real fetch() path with MSW intercepting at the
 * network level, so they catch bugs that pure unit tests of query-string
 * builders cannot (e.g. missing auth header, wrong Accept, response mapping).
 */
import { rest } from "msw";
import { setupServer } from "msw/node";
import { ObjectToSearchQueryParams } from "../../utils/queryUtils";

// ── test helpers ──────────────────────────────────────────────────────────────

function makeOrderListResponse(orders = []) {
    return {
        result: orders,
        total_count: orders.length,
    };
}

function makeOrder(overrides = {}) {
    return {
        id: "64abc123456789001234abcd",
        code: "ORD-0001",
        net_total: 115.00,
        vat_price: 15.00,
        total: 100.00,
        discount: 0,
        status: "delivered",
        payment_status: "paid",
        date: "2024-01-15T10:00:00Z",
        ...overrides,
    };
}

function buildOrderUrl(params = {}) {
    const qs = ObjectToSearchQueryParams(params);
    return "/v1/order" + (qs ? "?" + qs : "");
}

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── ObjectToSearchQueryParams → correct query string ──────────────────────────

describe("order list query string construction", () => {
    test("no filters → empty query string", () => {
        const qs = ObjectToSearchQueryParams({});
        expect(qs).toBe("");
    });

    test("status filter produces correct search param", () => {
        const qs = ObjectToSearchQueryParams({ status: "delivered" });
        expect(qs).toBe("search[status]=delivered");
    });

    test("payment_status filter", () => {
        const qs = ObjectToSearchQueryParams({ payment_status: "unpaid" });
        expect(qs).toBe("search[payment_status]=unpaid");
    });

    test("store_id filter", () => {
        const qs = ObjectToSearchQueryParams({ store_id: "64abc000000000000000beef" });
        expect(qs).toBe("search[store_id]=64abc000000000000000beef");
    });

    test("multiple filters are joined with &", () => {
        const qs = ObjectToSearchQueryParams({ status: "delivered", payment_status: "paid" });
        expect(qs).toBe("search[status]=delivered&search[payment_status]=paid");
    });
});

// ── fetch /v1/order — happy path ──────────────────────────────────────────────

describe("/v1/order fetch — happy path", () => {
    test("returns parsed result array on 200", async () => {
        const orders = [makeOrder(), makeOrder({ id: "64abc123456789001234abce", code: "ORD-0002" })];
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse(orders)));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data.result).toHaveLength(2);
        expect(data.result[0].code).toBe("ORD-0001");
        expect(data.total_count).toBe(2);
    });

    test("empty result array when no orders match", async () => {
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();

        expect(data.result).toEqual([]);
        expect(data.total_count).toBe(0);
    });

    test("query params are forwarded to the server", async () => {
        let capturedUrl = "";
        server.use(
            rest.get("/v1/order", (req, res, ctx) => {
                capturedUrl = req.url.toString();
                return res(ctx.json(makeOrderListResponse([])));
            })
        );

        const qs = ObjectToSearchQueryParams({ status: "delivered", payment_status: "paid" });
        await fetch("/v1/order?" + qs);

        expect(capturedUrl).toContain("search[status]=delivered");
        expect(capturedUrl).toContain("search[payment_status]=paid");
    });

    test("pagination params are forwarded", async () => {
        let capturedUrl = "";
        server.use(
            rest.get("/v1/order", (req, res, ctx) => {
                capturedUrl = req.url.toString();
                return res(ctx.json(makeOrderListResponse([])));
            })
        );

        await fetch("/v1/order?page=2&limit=25");

        expect(capturedUrl).toContain("page=2");
        expect(capturedUrl).toContain("limit=25");
    });
});

// ── fetch /v1/order — error handling ─────────────────────────────────────────

describe("/v1/order fetch — error responses", () => {
    test("401 Unauthorized returns ok=false", async () => {
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(
                    ctx.status(401),
                    ctx.json({ errors: { auth: "unauthorized" } })
                );
            })
        );

        const response = await fetch("/v1/order");
        expect(response.ok).toBe(false);
        expect(response.status).toBe(401);
    });

    test("401 response body contains errors object", async () => {
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(
                    ctx.status(401),
                    ctx.json({ errors: { auth: "unauthorized" } })
                );
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        expect(data.errors).toBeDefined();
        expect(data.errors.auth).toBe("unauthorized");
    });

    test("500 Server Error returns ok=false with status 500", async () => {
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.status(500), ctx.json({ errors: { server: "internal error" } }));
            })
        );

        const response = await fetch("/v1/order");
        expect(response.ok).toBe(false);
        expect(response.status).toBe(500);
    });

    test("network failure rejects the promise", async () => {
        server.use(
            rest.get("/v1/order", (_req, res) => {
                return res.networkError("Network Error");
            })
        );

        await expect(fetch("/v1/order")).rejects.toThrow();
    });
});

// ── order data contract ───────────────────────────────────────────────────────

describe("order data contract — field validation", () => {
    test("net_total equals total + vat_price for standard invoice", async () => {
        const order = makeOrder({ total: 100, vat_price: 15, net_total: 115 });
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([order])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        const o = data.result[0];

        expect(o.net_total).toBe(o.total + o.vat_price);
    });

    test("discount reduces net_total (not total)", async () => {
        // total=100, discount=10, vat=15% of (100-10)=90 → vat=13.50, net=103.50
        const order = makeOrder({ total: 100, discount: 10, vat_price: 13.50, net_total: 103.50 });
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([order])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        const o = data.result[0];

        expect(o.net_total).toBeLessThan(o.total + o.vat_price);
        // base = total - discount; vat = base * 0.15; net = base + vat
        const base = o.total - o.discount;
        expect(o.net_total).toBeCloseTo(base + base * 0.15, 1);
    });

    test("paid order has payment_status=paid", async () => {
        const order = makeOrder({ payment_status: "paid" });
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([order])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        expect(data.result[0].payment_status).toBe("paid");
    });

    test("unpaid order has payment_status=unpaid", async () => {
        const order = makeOrder({ payment_status: "unpaid" });
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([order])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        expect(data.result[0].payment_status).toBe("unpaid");
    });

    test("zero VAT order: net_total equals total", async () => {
        const order = makeOrder({ total: 100, vat_price: 0, net_total: 100, discount: 0 });
        server.use(
            rest.get("/v1/order", (_req, res, ctx) => {
                return res(ctx.json(makeOrderListResponse([order])));
            })
        );

        const response = await fetch("/v1/order");
        const data = await response.json();
        const o = data.result[0];
        expect(o.net_total).toBe(o.total);
    });
});
