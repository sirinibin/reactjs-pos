import { calcExVAT, calcWithVAT, sumPos } from "../profitCalcs";

// ── calcExVAT ─────────────────────────────────────────────────────────────────

describe("calcExVAT", () => {
    test("cost-based: (sellingPrice - discount - cost) × qty", () => {
        const p = { unit_price: 100, unit_discount: 5, purchase_unit_price: 60, quantity: 2, is_service: false };
        // (100 - 5 - 60) × 2 = 70
        expect(calcExVAT(p)).toBeCloseTo(70);
    });

    test("cost-based: zero discount treated as 0", () => {
        const p = { unit_price: 100, purchase_unit_price: 70, quantity: 3, is_service: false };
        // (100 - 0 - 70) × 3 = 90
        expect(calcExVAT(p)).toBeCloseTo(90);
    });

    test("service item (is_service=true, no purchase cost): full margin", () => {
        const p = { unit_price: 80, unit_discount: 10, purchase_unit_price: 0, quantity: 1, is_service: true };
        // (80 - 10) × 1 = 70
        expect(calcExVAT(p)).toBeCloseTo(70);
    });

    test("service item with no discount field", () => {
        const p = { unit_price: 50, purchase_unit_price: 0, quantity: 2, is_service: true };
        expect(calcExVAT(p)).toBeCloseTo(100);
    });

    test("spare part with no purchase cost: returns 0 (unknown cost)", () => {
        const p = { unit_price: 200, unit_discount: 0, purchase_unit_price: 0, quantity: 5, is_service: false };
        expect(calcExVAT(p)).toBe(0);
    });

    test("spare part with no purchase cost and is_service undefined: returns 0", () => {
        const p = { unit_price: 50, quantity: 3 };
        expect(calcExVAT(p)).toBe(0);
    });

    test("cost-based takes priority even when is_service=true", () => {
        const p = { unit_price: 100, unit_discount: 0, purchase_unit_price: 40, quantity: 1, is_service: true };
        // Cost branch fires first: (100 - 0 - 40) × 1 = 60
        expect(calcExVAT(p)).toBeCloseTo(60);
    });

    test("zero quantity yields zero profit", () => {
        const p = { unit_price: 100, unit_discount: 0, purchase_unit_price: 50, quantity: 0, is_service: false };
        expect(calcExVAT(p)).toBe(0);
    });

    test("negative margin (selling below cost) is returned as-is", () => {
        const p = { unit_price: 50, unit_discount: 0, purchase_unit_price: 80, quantity: 1, is_service: false };
        // (50 - 80) × 1 = -30
        expect(calcExVAT(p)).toBeCloseTo(-30);
    });
});

// ── calcWithVAT ───────────────────────────────────────────────────────────────

describe("calcWithVAT", () => {
    test("cost-based with VAT: uses _with_vat fields", () => {
        const p = {
            unit_price_with_vat: 115, unit_discount_with_vat: 0,
            purchase_unit_price_with_vat: 69, quantity: 1, is_service: false,
        };
        // (115 - 0 - 69) × 1 = 46
        expect(calcWithVAT(p)).toBeCloseTo(46);
    });

    test("cost-based with VAT: discount applied correctly", () => {
        const p = {
            unit_price_with_vat: 115, unit_discount_with_vat: 5.75,
            purchase_unit_price_with_vat: 69, quantity: 2, is_service: false,
        };
        // (115 - 5.75 - 69) × 2 = 80.50
        expect(calcWithVAT(p)).toBeCloseTo(80.5);
    });

    test("service item (no purchase cost): uses full VAT selling price", () => {
        const p = {
            unit_price_with_vat: 92, unit_discount_with_vat: 2,
            purchase_unit_price_with_vat: 0, quantity: 1, is_service: true,
        };
        // (92 - 2) × 1 = 90
        expect(calcWithVAT(p)).toBeCloseTo(90);
    });

    test("spare with no purchase_unit_price_with_vat and is_service false: returns 0", () => {
        const p = { unit_price_with_vat: 200, purchase_unit_price_with_vat: 0, quantity: 1, is_service: false };
        expect(calcWithVAT(p)).toBe(0);
    });

    test("missing discount field defaults to 0", () => {
        const p = {
            unit_price_with_vat: 100, purchase_unit_price_with_vat: 60,
            quantity: 1, is_service: false,
        };
        expect(calcWithVAT(p)).toBeCloseTo(40);
    });
});

// ── sumPos ────────────────────────────────────────────────────────────────────

describe("sumPos", () => {
    const identity = p => p; // fn that returns the item itself (treated as the profit value)

    test("sums only positive values", () => {
        expect(sumPos([10, 20, -5, 30], identity)).toBe(60);
    });

    test("all positive: full sum", () => {
        expect(sumPos([5, 10, 15], identity)).toBe(30);
    });

    test("all negative: result is 0", () => {
        expect(sumPos([-1, -2, -3], identity)).toBe(0);
    });

    test("empty array: result is 0", () => {
        expect(sumPos([], identity)).toBe(0);
    });

    test("zero is excluded (not > 0)", () => {
        expect(sumPos([0, 10, 0], identity)).toBe(10);
    });

    test("works with calcExVAT as callback", () => {
        const products = [
            // profit 30 (cost-based)
            { unit_price: 100, unit_discount: 0, purchase_unit_price: 70, quantity: 1, is_service: false },
            // profit 0 (spare, no cost)
            { unit_price: 50, purchase_unit_price: 0, quantity: 1, is_service: false },
            // profit 40 (service)
            { unit_price: 40, purchase_unit_price: 0, quantity: 1, is_service: true },
        ];
        expect(sumPos(products, calcExVAT)).toBeCloseTo(70);
    });

    test("negative margin lines are excluded from sumPos total", () => {
        const products = [
            { unit_price: 100, purchase_unit_price: 150, quantity: 1, is_service: false }, // -50, excluded
            { unit_price: 100, purchase_unit_price: 60, quantity: 1, is_service: false },  //  40, included
        ];
        expect(sumPos(products, calcExVAT)).toBeCloseTo(40);
    });
});

// ── net profit arithmetic (regression: string-concatenation bug) ───────────────

describe("net profit arithmetic — raw floats, not strings", () => {
    test("sumPos returns a number (not a string)", () => {
        const products = [
            { unit_price: 100, purchase_unit_price: 60, quantity: 1, is_service: false },
        ];
        const result = sumPos(products, calcExVAT);
        expect(typeof result).toBe("number");
        expect(Number.isFinite(result)).toBe(true);
    });

    test("adding two sumPos results gives correct arithmetic (not string concat)", () => {
        const labour = [{ unit_price: 80, purchase_unit_price: 0, quantity: 1, is_service: true }];
        const spare  = [{ unit_price: 100, purchase_unit_price: 60, quantity: 1, is_service: false }];

        const labourRaw = sumPos(labour, calcExVAT);  // 80
        const spareRaw  = sumPos(spare,  calcExVAT);  // 40

        // If these were strings "80" + "40" would give "8040" not 120.
        const net = labourRaw + spareRaw;
        expect(net).toBeCloseTo(120);
        expect(typeof net).toBe("number");
    });

    test("deductions subtracted correctly from multi-category sum", () => {
        const labour     = [{ unit_price: 80,  purchase_unit_price: 0,  quantity: 1, is_service: true  }]; // 80
        const spare      = [{ unit_price: 100, purchase_unit_price: 60, quantity: 1, is_service: false }]; // 40
        const additional = [{ unit_price: 50,  purchase_unit_price: 0,  quantity: 1, is_service: true  }]; // 50

        const raw = sumPos(labour, calcExVAT) + sumPos(spare, calcExVAT) + sumPos(additional, calcExVAT);
        const deductions = 10 + 5 + 5; // commission + cashDiscount + discount
        const net = raw - deductions;
        expect(net).toBeCloseTo(150);
    });
});
