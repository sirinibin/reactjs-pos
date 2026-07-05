import { resolveImageUrl } from "../imageUtils";

describe("resolveImageUrl", () => {
    test("null filename returns null", () => {
        expect(resolveImageUrl(null, "store123", "products")).toBeNull();
    });

    test("undefined filename returns undefined", () => {
        expect(resolveImageUrl(undefined, "store123", "products")).toBeUndefined();
    });

    test("empty string filename returns empty string", () => {
        expect(resolveImageUrl("", "store123", "products")).toBe("");
    });

    test("bare filename + storeId builds /images/storeId/category/filename", () => {
        expect(resolveImageUrl("photo.jpg", "abc123", "products")).toBe(
            "/images/abc123/products/photo.jpg"
        );
    });

    test("bare filename + storeId + entityId includes entityId in path", () => {
        expect(resolveImageUrl("photo.jpg", "abc123", "products", "prod456")).toBe(
            "/images/abc123/products/prod456/photo.jpg"
        );
    });

    test("bare filename + null storeId returns filename unchanged", () => {
        expect(resolveImageUrl("photo.jpg", null, "products")).toBe("photo.jpg");
    });

    test("legacy /images/store/logo.jpg + storeId rewrites to /images/storeId/store/logo.jpg", () => {
        expect(resolveImageUrl("/images/store/logo.jpg", "abc123", "store")).toBe(
            "/images/abc123/store/logo.jpg"
        );
    });

    test("legacy path with query string strips query from basename", () => {
        expect(resolveImageUrl("/images/store/logo.jpg?v=1", "abc123", "store")).toBe(
            "/images/abc123/store/logo.jpg"
        );
    });

    test("other absolute path is returned unchanged", () => {
        expect(resolveImageUrl("/something/else.jpg", "abc123", "store")).toBe(
            "/something/else.jpg"
        );
    });

    test("legacy /images/store/ without storeId returns unchanged", () => {
        expect(resolveImageUrl("/images/store/logo.jpg", null, "store")).toBe(
            "/images/store/logo.jpg"
        );
    });
});
