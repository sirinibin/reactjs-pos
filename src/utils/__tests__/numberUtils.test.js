import {
    trimTo2Decimals,
    trimTo3Decimals,
    trimTo4Decimals,
    trimTo8Decimals,
    stripSarBreakdown,
    addCommasToInfoValue,
} from "../numberUtils";

// ── trimTo2Decimals ───────────────────────────────────────────────────────────
describe("trimTo2Decimals", () => {
    describe("normal rounding", () => {
        test("integer stays as .00", () => expect(trimTo2Decimals(5)).toBe("5.00"));
        test("already 2 dp passes through", () => expect(trimTo2Decimals(1.23)).toBe("1.23"));
        test("rounds half-up at third decimal", () => expect(trimTo2Decimals(1.235)).toBe("1.24"));
        test("rounds down at third decimal", () => expect(trimTo2Decimals(1.234)).toBe("1.23"));
        test("zero returns 0.00", () => expect(trimTo2Decimals(0)).toBe("0.00"));
        test("negative number", () => expect(trimTo2Decimals(-3.456)).toBe("-3.46"));
        // Math.round rounds toward +∞ for .5: -1.235 * 100 = -123.5 → rounds to -123 (not -124)
        test("negative rounding: Math.round rounds toward +∞", () => expect(trimTo2Decimals(-1.235)).toBe("-1.23"));
    });

    describe("floating-point edge cases", () => {
        test("0.1 + 0.2 gives 0.30 not 0.30000…", () =>
            expect(trimTo2Decimals(0.1 + 0.2)).toBe("0.30"));
        test("1.005 rounds up correctly (EPSILON guard)", () =>
            expect(trimTo2Decimals(1.005)).toBe("1.01"));
        test("large number retains precision", () =>
            expect(trimTo2Decimals(123456.789)).toBe("123456.79"));
        test("very small positive number rounds to 0.00", () =>
            expect(trimTo2Decimals(0.001)).toBe("0.00"));
        test("0.995 rounds to 1.00", () => expect(trimTo2Decimals(0.995)).toBe("1.00"));
    });

    describe("invalid / non-number inputs", () => {
        test("NaN returns 0.00", () => expect(trimTo2Decimals(NaN)).toBe("0.00"));
        test("string returns 0.00", () => expect(trimTo2Decimals("hello")).toBe("0.00"));
        test("numeric string returns 0.00 (not a number type)", () =>
            expect(trimTo2Decimals("1.5")).toBe("0.00"));
        test("undefined returns 0.00", () => expect(trimTo2Decimals(undefined)).toBe("0.00"));
        test("null returns 0.00", () => expect(trimTo2Decimals(null)).toBe("0.00"));
        test("boolean true returns 0.00", () => expect(trimTo2Decimals(true)).toBe("0.00"));
        test("empty string returns 0.00", () => expect(trimTo2Decimals("")).toBe("0.00"));
        test("array returns 0.00", () => expect(trimTo2Decimals([])).toBe("0.00"));
        test("object returns 0.00", () => expect(trimTo2Decimals({})).toBe("0.00"));
    });

    describe("return type is always string", () => {
        test("positive number → string", () =>
            expect(typeof trimTo2Decimals(5)).toBe("string"));
        test("zero → string", () =>
            expect(typeof trimTo2Decimals(0)).toBe("string"));
    });

    describe("business-critical invoice scenarios", () => {
        test("15% VAT on 100.00 = 15.00", () => expect(trimTo2Decimals(100 * 0.15)).toBe("15.00"));
        test("15% VAT on 99.99 = 15.00 (rounded)", () =>
            expect(trimTo2Decimals(99.99 * 0.15)).toBe("15.00"));
        test("unit price × quantity", () => expect(trimTo2Decimals(12.34 * 3)).toBe("37.02"));
        test("net after 10% discount on 155.75", () =>
            expect(trimTo2Decimals(155.75 * 0.9)).toBe("140.18"));
    });

    describe("special number values (Infinity, -0)", () => {
        // Infinity/−Infinity pass typeof+isNaN but are blocked by the isFinite guard
        // Without the guard they'd return "Infinity"/"-Infinity" in invoice UI — a display bug
        test("Infinity → '0.00' (isFinite guard)", () =>
            expect(trimTo2Decimals(Infinity)).toBe("0.00"));
        test("-Infinity → '0.00' (isFinite guard)", () =>
            expect(trimTo2Decimals(-Infinity)).toBe("0.00"));
        // -0 + EPSILON is a tiny positive number → rounds to 0 → "0.00"
        test("-0 treated same as 0 → '0.00'", () =>
            expect(trimTo2Decimals(-0)).toBe("0.00"));
    });
});

// ── trimTo3Decimals ───────────────────────────────────────────────────────────
describe("trimTo3Decimals", () => {
    test("rounds to third decimal", () => expect(trimTo3Decimals(1.2345)).toBe("1.235"));
    test("rounds down at fourth decimal", () => expect(trimTo3Decimals(1.2344)).toBe("1.234"));
    test("zero → 0.000", () => expect(trimTo3Decimals(0)).toBe("0.000"));
    test("NaN → 0.000", () => expect(trimTo3Decimals(NaN)).toBe("0.000"));
    test("undefined → 0.000", () => expect(trimTo3Decimals(undefined)).toBe("0.000"));
    test("string → 0.000", () => expect(trimTo3Decimals("abc")).toBe("0.000"));
    // Math.round(-1234.5) = -1234 (rounds toward +∞), so trimTo3Decimals(-1.2345) = "-1.234"
    test("negative rounds toward +∞ (Math.round asymmetry)", () => expect(trimTo3Decimals(-1.2345)).toBe("-1.234"));
    test("floating-point 0.001 + 0.002", () =>
        expect(trimTo3Decimals(0.001 + 0.002)).toBe("0.003"));
});

// ── trimTo4Decimals ───────────────────────────────────────────────────────────
describe("trimTo4Decimals", () => {
    test("rounds to fourth decimal", () => expect(trimTo4Decimals(1.23456)).toBe("1.2346"));
    test("rounds down", () => expect(trimTo4Decimals(1.23454)).toBe("1.2345"));
    test("zero → 0.0000", () => expect(trimTo4Decimals(0)).toBe("0.0000"));
    test("NaN → 0.0000", () => expect(trimTo4Decimals(NaN)).toBe("0.0000"));
    test("null → 0.0000", () => expect(trimTo4Decimals(null)).toBe("0.0000"));
    test("exchange-rate precision: 3.7520 SAR/USD", () =>
        expect(trimTo4Decimals(3.752)).toBe("3.7520"));
});

// ── trimTo8Decimals ───────────────────────────────────────────────────────────
describe("trimTo8Decimals", () => {
    test("rounds to 8th decimal", () =>
        expect(trimTo8Decimals(1.123456789)).toBe("1.12345679"));
    test("rounds down", () =>
        expect(trimTo8Decimals(1.123456781)).toBe("1.12345678"));
    test("zero → 0.00000000", () => expect(trimTo8Decimals(0)).toBe("0.00000000"));
    test("NaN → 0.00000000", () => expect(trimTo8Decimals(NaN)).toBe("0.00000000"));
    test("undefined → 0.00000000", () =>
        expect(trimTo8Decimals(undefined)).toBe("0.00000000"));
    // 99.99999995 * 1e8 = 9999999995 in float64, exact representation
    test("very precise unit price at exact float64 boundary", () =>
        expect(trimTo8Decimals(99.99999995)).toBe("99.99999995"));
    test("Infinity → '0.00000000' (isFinite guard)", () =>
        expect(trimTo8Decimals(Infinity)).toBe("0.00000000"));
});

// ── stripSarBreakdown ─────────────────────────────────────────────────────────
describe("stripSarBreakdown", () => {
    describe("non-bold lines: strip 'SAR '", () => {
        test("plain SAR prefix removed", () =>
            expect(stripSarBreakdown("SAR 1,234.56", false)).toBe("1,234.56"));
        test("negative with SAR", () =>
            expect(stripSarBreakdown("− SAR 12,345.67", false)).toBe("− 12,345.67"));
        test("positive sign with SAR", () =>
            expect(stripSarBreakdown("+ SAR 500.00", false)).toBe("+ 500.00"));
        test("hyphen minus with SAR", () =>
            expect(stripSarBreakdown("- SAR 100.00", false)).toBe("- 100.00"));
        test("lowercase sar removed (case-insensitive)", () =>
            expect(stripSarBreakdown("sar 50.00", false)).toBe("50.00"));
        test("no SAR prefix passes through unchanged", () =>
            expect(stripSarBreakdown("1,234.56", false)).toBe("1,234.56"));
    });

    describe("bold lines: never strip", () => {
        test("bold SAR prefix kept", () =>
            expect(stripSarBreakdown("SAR 552,137.90", true)).toBe("SAR 552,137.90"));
        test("bold negative kept", () =>
            expect(stripSarBreakdown("− SAR 12,345.67", true)).toBe("− SAR 12,345.67"));
    });

    describe("edge cases", () => {
        test("non-string returns as-is when not bold", () =>
            expect(stripSarBreakdown(12345, false)).toBe(12345));
        test("null returns as-is", () =>
            expect(stripSarBreakdown(null, false)).toBeNull());
        test("empty string unchanged", () =>
            expect(stripSarBreakdown("", false)).toBe(""));
    });
});

// ── addCommasToInfoValue ──────────────────────────────────────────────────────
describe("addCommasToInfoValue", () => {
    describe("numbers >= 1000 get comma-separated", () => {
        test("1000 → 1,000", () =>
            expect(addCommasToInfoValue("1000")).toBe("1,000"));
        test("1000000 → 1,000,000", () =>
            expect(addCommasToInfoValue("1000000")).toBe("1,000,000"));
        test("preserves decimal part", () =>
            expect(addCommasToInfoValue("1234.56")).toBe("1,234.56"));
        test("large decimal", () =>
            expect(addCommasToInfoValue("99999.99")).toBe("99,999.99"));
    });

    describe("numbers < 1000 pass through", () => {
        test("999 unchanged", () => expect(addCommasToInfoValue("999")).toBe("999"));
        test("100.50 unchanged", () => expect(addCommasToInfoValue("100.50")).toBe("100.50"));
        test("0 unchanged", () => expect(addCommasToInfoValue("0")).toBe("0"));
    });

    describe("mixed text strings", () => {
        test("text with embedded number", () =>
            expect(addCommasToInfoValue("Total: 1234567")).toBe("Total: 1,234,567"));
        test("multiple numbers in one string", () =>
            expect(addCommasToInfoValue("Items: 1500, Value: 25000.00")).toBe(
                "Items: 1,500, Value: 25,000.00"
            ));
        test("pure text unchanged", () =>
            expect(addCommasToInfoValue("no numbers here")).toBe("no numbers here"));
        test("negative number: regex matches digit part, sign is preserved from original string", () =>
            expect(addCommasToInfoValue("-1234")).toBe("-1,234"));
        test("already comma-formatted '1,234' unchanged ('1' and '234' are both < 1000)", () =>
            expect(addCommasToInfoValue("1,234")).toBe("1,234"));
    });

    describe("non-string inputs", () => {
        test("number input returns as-is", () =>
            expect(addCommasToInfoValue(12345)).toBe(12345));
        test("null returns as-is", () =>
            expect(addCommasToInfoValue(null)).toBeNull());
        test("undefined returns undefined", () =>
            expect(addCommasToInfoValue(undefined)).toBeUndefined());
    });
});
