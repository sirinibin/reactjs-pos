import { ObjectToSearchQueryParams } from "../queryUtils";

describe("ObjectToSearchQueryParams", () => {
    test("single key-value pair", () => {
        expect(ObjectToSearchQueryParams({ name: "acme" })).toBe("search[name]=acme");
    });

    test("multiple keys produce ampersand-separated pairs", () => {
        const result = ObjectToSearchQueryParams({ status: "active", limit: 10 });
        // Key order in objects is insertion order in modern JS
        expect(result).toBe("search[status]=active&search[limit]=10");
    });

    test("empty object returns empty string", () => {
        expect(ObjectToSearchQueryParams({})).toBe("");
    });

    test("numeric values are coerced to string", () => {
        expect(ObjectToSearchQueryParams({ page: 3 })).toBe("search[page]=3");
    });

    test("boolean values are coerced to string", () => {
        expect(ObjectToSearchQueryParams({ deleted: true })).toBe("search[deleted]=true");
    });

    test("spaces in value are percent-encoded", () => {
        expect(ObjectToSearchQueryParams({ name: "saudi market" })).toBe(
            "search[name]=saudi%20market"
        );
    });

    test("null value is filtered out (returns empty string)", () => {
        expect(ObjectToSearchQueryParams({ id: null })).toBe("");
    });

    test("undefined value is filtered out (returns empty string)", () => {
        expect(ObjectToSearchQueryParams({ x: undefined })).toBe("");
    });

    describe("real-world search object shapes", () => {
        test("search by customer name and store", () => {
            const params = ObjectToSearchQueryParams({
                name: "Abdullah",
                store_id: "64abc123",
            });
            expect(params).toBe("search[name]=Abdullah&search[store_id]=64abc123");
        });

        test("search with pagination fields excluded (not search params)", () => {
            // ObjectToSearchQueryParams only wraps keys — caller controls what goes in
            const params = ObjectToSearchQueryParams({ status: "paid" });
            expect(params).not.toContain("page=");
            expect(params).toBe("search[status]=paid");
        });
    });

    describe("type coercion edge cases", () => {
        test("array value is percent-encoded via encodeURIComponent (commas become %2C)", () => {
            expect(ObjectToSearchQueryParams({ ids: [1, 2, 3] })).toBe("search[ids]=1%2C2%2C3");
        });

        test("'&' in value is percent-encoded to %26", () => {
            expect(ObjectToSearchQueryParams({ name: "hello&world" })).toBe(
                "search[name]=hello%26world"
            );
        });
    });
});
