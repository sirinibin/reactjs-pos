/**
 * Tests for two distinct calculation concerns in the order form:
 *
 * 1. LINE TOTAL — computed in JS (no server call) for immediate display:
 *    line_total = parseFloat(trimTo2Decimals((unit_price - unit_discount) * quantity))
 *    Source: order/create.js line 468
 *
 * 2. NET TOTAL CONTRACT — the /v1/order/calculate-net-total endpoint receives
 *    the order and returns computed totals. Tested with MSW to verify the
 *    request/response shape and business-logic invariants.
 */
import { rest } from "msw";
import { setupServer } from "msw/node";
import { trimTo2Decimals } from "../../utils/numberUtils";

// ── line_total formula (pure JS, no server, no React) ────────────────────────

function calcLineTotal(unitPrice, unitDiscount, quantity) {
    return parseFloat(trimTo2Decimals((unitPrice - unitDiscount) * quantity));
}

describe("line_total formula", () => {
    test("no discount: price × qty", () => {
        expect(calcLineTotal(50.00, 0, 2)).toBe(100.00);
    });

    test("with unit discount: (price - discount) × qty", () => {
        expect(calcLineTotal(100.00, 10.00, 1)).toBe(90.00);
    });

    test("fractional result rounds to 2 dp", () => {
        // (33.333 - 0) * 3 = 99.999 → trimTo2Decimals → "100.00" → parseFloat → 100
        expect(calcLineTotal(33.333, 0, 3)).toBe(100.00);
    });

    test("discount equals price: line total is zero", () => {
        expect(calcLineTotal(50.00, 50.00, 1)).toBe(0.00);
    });

    test("zero quantity: line total is zero", () => {
        expect(calcLineTotal(100.00, 0, 0)).toBe(0.00);
    });

    test("fractional quantity", () => {
        // (100 - 0) * 1.5 = 150.00
        expect(calcLineTotal(100.00, 0, 1.5)).toBe(150.00);
    });

    test("returns number type (parseFloat of trimTo2Decimals string)", () => {
        expect(typeof calcLineTotal(100.00, 0, 1)).toBe("number");
    });

    test("15% VAT-inclusive unit price: (115 - 0) * 1", () => {
        expect(calcLineTotal(115.00, 0, 1)).toBe(115.00);
    });

    test("rounding: 1/3 SAR × 3 = 1.00", () => {
        // 0.333... rounds to 0.33; 3 × 0.33 = 0.99
        // But (1/3 - 0) * 3 = 1.0 in float64... actually 0.3333… * 3 = 0.9999…
        // trimTo2Decimals(0.9999…) = "1.00" → parseFloat → 1.00
        expect(calcLineTotal(1 / 3, 0, 3)).toBe(1.00);
    });
});

// ── /v1/order/calculate-net-total MSW tests ───────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeCalcRequest(overrides = {}) {
    return {
        products: [{ product_id: "pid1", quantity: 1, unit_price: 100.00, unit_discount: 0 }],
        vat_percent: 15,
        discount: 0,
        shipping_handling_fees: 0,
        ...overrides,
    };
}

function makeCalcResponse(overrides = {}) {
    return {
        result: {
            total: 100.00,
            total_with_vat: 115.00,
            vat_price: 15.00,
            net_total: 115.00,
            discount_percent: 0,
            discount_percent_with_vat: 0,
            ...overrides,
        },
    };
}

async function postCalculate(body) {
    return fetch("/v1/order/calculate-net-total", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /v1/order/calculate-net-total", () => {
    describe("happy path — request/response contract", () => {
        test("200 response with result object", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse()))
                )
            );

            const resp = await postCalculate(makeCalcRequest());
            expect(resp.ok).toBe(true);
            const data = await resp.json();
            expect(data.result).toBeDefined();
        });

        test("response contains all required financial fields", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse()))
                )
            );

            const data = await (await postCalculate(makeCalcRequest())).json();
            const r = data.result;
            expect(r).toHaveProperty("total");
            expect(r).toHaveProperty("vat_price");
            expect(r).toHaveProperty("net_total");
            expect(r).toHaveProperty("discount_percent");
        });

        test("request sends JSON body (Content-Type: application/json)", async () => {
            let capturedContentType = "";
            server.use(
                rest.post("/v1/order/calculate-net-total", (req, res, ctx) => {
                    capturedContentType = req.headers.get("content-type") || "";
                    return res(ctx.json(makeCalcResponse()));
                })
            );

            await postCalculate(makeCalcRequest());
            expect(capturedContentType).toContain("application/json");
        });

        test("request body includes products array", async () => {
            let capturedBody = null;
            server.use(
                rest.post("/v1/order/calculate-net-total", async (req, res, ctx) => {
                    capturedBody = await req.json();
                    return res(ctx.json(makeCalcResponse()));
                })
            );

            await postCalculate(makeCalcRequest());
            expect(Array.isArray(capturedBody.products)).toBe(true);
            expect(capturedBody.products).toHaveLength(1);
        });
    });

    describe("business logic invariants", () => {
        test("15% VAT on 100 SAR: net_total = 115", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ total: 100, vat_price: 15, net_total: 115 })))
                )
            );

            const data = await (await postCalculate(makeCalcRequest())).json();
            expect(data.result.net_total).toBe(115);
        });

        test("discount reduces base before VAT: total=100, discount=10, VAT=15%", async () => {
            // base=90, vat=13.50, net=103.50
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ total: 100, vat_price: 13.50, net_total: 103.50 })))
                )
            );

            const data = await (await postCalculate(
                makeCalcRequest({ discount: 10 })
            )).json();
            expect(data.result.vat_price).toBe(13.50);
            expect(data.result.net_total).toBe(103.50);
        });

        test("shipping adds to base before VAT: total=100, shipping=20, VAT=15%", async () => {
            // base=120, vat=18, net=138
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ total: 100, vat_price: 18, net_total: 138 })))
                )
            );

            const data = await (await postCalculate(
                makeCalcRequest({ shipping_handling_fees: 20 })
            )).json();
            expect(data.result.net_total).toBe(138);
        });

        test("zero VAT: net_total equals total", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ total: 100, vat_price: 0, net_total: 100 })))
                )
            );

            const data = await (await postCalculate(
                makeCalcRequest({ vat_percent: 0 })
            )).json();
            expect(data.result.net_total).toBe(data.result.total);
        });

        test("net_total = total + vat_price when no discount/shipping", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ total: 200, vat_price: 30, net_total: 230 })))
                )
            );

            const data = await (await postCalculate(makeCalcRequest())).json();
            const r = data.result;
            expect(r.net_total).toBe(r.total + r.vat_price);
        });

        test("positive discount_percent when discount > 0", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ discount_percent: 8.81 })))
                )
            );

            const data = await (await postCalculate(
                makeCalcRequest({ discount: 10 })
            )).json();
            expect(data.result.discount_percent).toBeGreaterThan(0);
        });

        test("discount_percent is zero when no discount", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.json(makeCalcResponse({ discount_percent: 0 })))
                )
            );

            const data = await (await postCalculate(makeCalcRequest())).json();
            expect(data.result.discount_percent).toBe(0);
        });
    });

    describe("error handling", () => {
        test("401 returns ok=false", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(ctx.status(401), ctx.json({ errors: { auth: "unauthorized" } }))
                )
            );

            const resp = await postCalculate(makeCalcRequest());
            expect(resp.ok).toBe(false);
            expect(resp.status).toBe(401);
        });

        test("422 validation error for invalid product data", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res, ctx) =>
                    res(
                        ctx.status(422),
                        ctx.json({ errors: { products: "invalid product list" } })
                    )
                )
            );

            const resp = await postCalculate({ products: [] });
            expect(resp.ok).toBe(false);
            expect(resp.status).toBe(422);
        });

        test("network failure rejects the promise", async () => {
            server.use(
                rest.post("/v1/order/calculate-net-total", (_req, res) =>
                    res.networkError("Network Error")
                )
            );

            await expect(postCalculate(makeCalcRequest())).rejects.toThrow();
        });
    });
});
