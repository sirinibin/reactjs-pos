/**
 * Unit tests for margin back-calculation when wholesale/retail unit price is changed manually.
 * Formula: margin_percent = ((selling_price / purchase_unit_price) - 1) * 100
 */

function calcMargin(sellingPrice, purchasePrice) {
    if (!purchasePrice || purchasePrice <= 0) return null;
    return parseFloat((((sellingPrice / purchasePrice) - 1) * 100).toFixed(8));
}

describe("Margin back-calculation from selling price", () => {
    test("wholesale margin: 100% markup → 100%", () => {
        expect(calcMargin(200, 100)).toBeCloseTo(100, 5);
    });

    test("wholesale margin: 50% markup → 50%", () => {
        expect(calcMargin(150, 100)).toBeCloseTo(50, 5);
    });

    test("retail margin: 25% markup", () => {
        expect(calcMargin(125, 100)).toBeCloseTo(25, 5);
    });

    test("margin is 0 when selling price equals purchase price", () => {
        expect(calcMargin(100, 100)).toBeCloseTo(0, 5);
    });

    test("margin is negative when selling price is below purchase price", () => {
        expect(calcMargin(80, 100)).toBeCloseTo(-20, 5);
    });

    test("margin is null when purchase price is 0 (no division by zero)", () => {
        expect(calcMargin(150, 0)).toBeNull();
    });

    test("margin is null when purchase price is missing", () => {
        expect(calcMargin(150, null)).toBeNull();
    });

    test("fractional prices: 10.50 selling, 8.40 purchase → 25%", () => {
        expect(calcMargin(10.50, 8.40)).toBeCloseTo(25, 4);
    });

    test("round-trip: margin applied to purchase price yields original selling price", () => {
        const purchase = 84.5;
        const selling = 110;
        const margin = calcMargin(selling, purchase);
        const recovered = parseFloat((purchase * (1 + margin / 100)).toFixed(8));
        expect(recovered).toBeCloseTo(selling, 4);
    });
});
