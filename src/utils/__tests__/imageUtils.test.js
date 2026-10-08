import { resolveImageUrl, storeLogoUrl } from "../imageUtils";

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

describe("storeLogoUrl", () => {
    test("returns null when store has no logo", () => {
        expect(storeLogoUrl({ id: "abc", updated_at: "2026-01-01T00:00:00Z" })).toBeNull();
    });

    test("returns null when store is null", () => {
        expect(storeLogoUrl(null)).toBeNull();
    });

    test("uses updated_at timestamp as cache-buster", () => {
        const store = { id: "abc123", logo: "logo_abc.png", updated_at: "2026-01-15T10:00:00Z" };
        const url = storeLogoUrl(store);
        const expected = new Date("2026-01-15T10:00:00Z").getTime();
        expect(url).toBe(`/images/abc123/store/logo_abc.png?v=${expected}`);
    });

    test("uses v=0 when updated_at is missing", () => {
        const store = { id: "abc123", logo: "logo_abc.png" };
        const url = storeLogoUrl(store);
        expect(url).toBe("/images/abc123/store/logo_abc.png?v=0");
    });

    test("same updated_at produces same URL (cacheable)", () => {
        const store = { id: "abc123", logo: "logo_abc.png", updated_at: "2026-06-01T00:00:00Z" };
        expect(storeLogoUrl(store)).toBe(storeLogoUrl(store));
    });

    test("different updated_at produces different URL (cache-busts on update)", () => {
        const store1 = { id: "abc123", logo: "logo_abc.png", updated_at: "2026-06-01T00:00:00Z" };
        const store2 = { id: "abc123", logo: "logo_abc.png", updated_at: "2026-06-02T00:00:00Z" };
        expect(storeLogoUrl(store1)).not.toBe(storeLogoUrl(store2));
    });
});
