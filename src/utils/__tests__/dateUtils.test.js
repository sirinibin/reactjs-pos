import { countryTimezoneMap, formatPaymentMethod, formatInStoreTimezone } from "../dateUtils";

// ── countryTimezoneMap ────────────────────────────────────────────────────────

describe("countryTimezoneMap", () => {
    test("Saudi Arabia maps to Asia/Riyadh", () => {
        expect(countryTimezoneMap["SA"]).toBe("Asia/Riyadh");
    });
    test("UAE maps to Asia/Dubai", () => {
        expect(countryTimezoneMap["AE"]).toBe("Asia/Dubai");
    });
    test("India maps to Asia/Kolkata", () => {
        expect(countryTimezoneMap["IN"]).toBe("Asia/Kolkata");
    });
    test("unknown country code is undefined", () => {
        expect(countryTimezoneMap["XX"]).toBeUndefined();
    });
    test("map has at least 20 entries", () => {
        expect(Object.keys(countryTimezoneMap).length).toBeGreaterThanOrEqual(20);
    });
    test("all values are valid IANA timezone strings (contain slash)", () => {
        Object.values(countryTimezoneMap).forEach((tz) => {
            expect(tz).toMatch(/\//);
        });
    });
});

// ── formatPaymentMethod ───────────────────────────────────────────────────────

describe("formatPaymentMethod", () => {
    test("snake_case to Title Case", () => {
        expect(formatPaymentMethod("debit_card")).toBe("Debit Card");
    });
    test("single word capitalised", () => {
        expect(formatPaymentMethod("cash")).toBe("Cash");
    });
    test("three-word method", () => {
        expect(formatPaymentMethod("bank_transfer_sa")).toBe("Bank Transfer Sa");
    });
    test("null returns em-dash", () => {
        expect(formatPaymentMethod(null)).toBe("—");
    });
    test("undefined returns em-dash", () => {
        expect(formatPaymentMethod(undefined)).toBe("—");
    });
    test("empty string returns em-dash", () => {
        expect(formatPaymentMethod("")).toBe("—");
    });
    test("already capitalised passes through", () => {
        expect(formatPaymentMethod("CASH")).toBe("CASH");
    });
    test("bank_cheque converts correctly", () => {
        expect(formatPaymentMethod("bank_cheque")).toBe("Bank Cheque");
    });
    test("credit_card converts correctly", () => {
        expect(formatPaymentMethod("credit_card")).toBe("Credit Card");
    });
});

// ── formatInStoreTimezone ─────────────────────────────────────────────────────

describe("formatInStoreTimezone", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test("empty string returns empty string", () => {
        expect(formatInStoreTimezone("")).toBe("");
    });
    test("null returns empty string", () => {
        expect(formatInStoreTimezone(null)).toBe("");
    });
    test("undefined returns empty string", () => {
        expect(formatInStoreTimezone(undefined)).toBe("");
    });

    test("uses localStorage store_country_code when set", () => {
        localStorage.setItem("store_country_code", "SA");
        const result = formatInStoreTimezone("2024-01-15T10:00:00Z");
        // tz.replace(/_/g, ' ') only replaces underscores; slash is preserved
        // Asia/Riyadh → label is "Asia/Riyadh"
        expect(result).toContain("Asia/Riyadh");
    });

    test("falls back to storeCountryCode param when localStorage is empty", () => {
        const result = formatInStoreTimezone("2024-01-15T10:00:00Z", "AE");
        // Asia/Dubai has no underscores → label is "Asia/Dubai"
        expect(result).toContain("Asia/Dubai");
    });

    test("falls back to UTC for unknown country code", () => {
        const result = formatInStoreTimezone("2024-01-15T10:00:00Z", "XX");
        expect(result).toContain("UTC");
    });

    test("returns non-empty string for valid date without country code", () => {
        const result = formatInStoreTimezone("2024-06-01T08:30:00Z");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    test("returns string containing 'Invalid Date' for non-parseable input", () => {
        const bad = "not-a-date";
        const result = formatInStoreTimezone(bad, "SA");
        // new Date("not-a-date") is Invalid Date; toLocaleString returns "Invalid Date" string
        // (no exception thrown in modern JS), so the function appends the timezone label
        expect(result).toContain("Invalid Date");
    });
});
