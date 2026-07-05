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

    test("keys with spaces in value", () => {
        expect(ObjectToSearchQueryParams({ name: "saudi market" })).toBe(
            "search[name]=saudi market"
        );
    });

    test("null value is coerced to string 'null'", () => {
        expect(ObjectToSearchQueryParams({ id: null })).toBe("search[id]=null");
    });

    test("undefined value produces 'undefined' string", () => {
        expect(ObjectToSearchQueryParams({ x: undefined })).toBe("search[x]=undefined");
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
        test("array value is comma-joined via Array.toString coercion", () => {
            // [1, 2, 3].toString() = "1,2,3" — useful for multi-ID filters
            expect(ObjectToSearchQueryParams({ ids: [1, 2, 3] })).toBe("search[ids]=1,2,3");
        });

        test("'&' in value is NOT URL-encoded — raw template literal, no escaping", () => {
            // "hello&world" would break URL parsers: "&world" is read as a new param.
            // Callers must URL-encode unsafe characters before passing them here.
            expect(ObjectToSearchQueryParams({ name: "hello&world" })).toBe(
                "search[name]=hello&world"
            );
        });
    });
});
