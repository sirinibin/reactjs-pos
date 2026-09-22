/**
 * Unit tests for quotation import handlers added in Task 2:
 *  - handleImportFromSales: copies products with unit_price/unit_price_with_vat from sale
 *  - handleImportFromPurchases: copies products with unit_price = 0 (user fills in)
 * and for the multi-order_code display logic used in quotation/index.js.
 */

// ── helpers (extracted from create.js / index.js) ────────────────────────────

function importFromSales(selectedProducts, sale) {
    if (!sale || !sale.products || sale.products.length === 0) return selectedProducts;
    sale.products.forEach(p => {
        const already = selectedProducts.findIndex(s => s.product_id === p.product_id);
        if (already >= 0) {
            selectedProducts[already].quantity =
                parseFloat(selectedProducts[already].quantity || 0) + parseFloat(p.quantity || 1);
        } else {
            selectedProducts.push({
                product_id: p.product_id,
                name: p.name || '',
                quantity: parseFloat(p.quantity) || 1,
                unit_price: parseFloat(p.unit_price) || 0,
                unit_price_with_vat: parseFloat(p.unit_price_with_vat) || 0,
            });
        }
    });
    return [...selectedProducts];
}

function importFromPurchases(selectedProducts, purchase) {
    if (!purchase || !purchase.products || purchase.products.length === 0) return selectedProducts;
    purchase.products.forEach(p => {
        const already = selectedProducts.findIndex(s => s.product_id === p.product_id);
        if (already >= 0) {
            selectedProducts[already].quantity =
                parseFloat(selectedProducts[already].quantity || 0) + parseFloat(p.quantity || 1);
        } else {
            selectedProducts.push({
                product_id: p.product_id,
                name: p.name || '',
                quantity: parseFloat(p.quantity) || 1,
                unit_price: 0,               // user fills in for quotation
                unit_price_with_vat: 0,
                purchase_unit_price: parseFloat(p.unit_price) || 0,
            });
        }
    });
    return [...selectedProducts];
}

// orderCodesDisplay: returns all codes from order_codes array if length > 1,
// else falls back to single order_code.
function getDisplayCodes(quotation) {
    if (quotation.order_codes && quotation.order_codes.length > 1) {
        return quotation.order_codes;
    }
    return quotation.order_code ? [quotation.order_code] : [];
}

// ── handleImportFromSales ─────────────────────────────────────────────────────

describe('importFromSales', () => {
    test('adds new products from a sale', () => {
        const sale = {
            products: [
                { product_id: 'p1', name: 'Product 1', quantity: 2, unit_price: 100, unit_price_with_vat: 115 },
            ],
        };
        const result = importFromSales([], sale);
        expect(result).toHaveLength(1);
        expect(result[0].unit_price).toBe(100);
        expect(result[0].unit_price_with_vat).toBe(115);
        expect(result[0].quantity).toBe(2);
    });

    test('merges quantity when same product already in list', () => {
        const existing = [{ product_id: 'p1', name: 'X', quantity: 3, unit_price: 50 }];
        const sale = { products: [{ product_id: 'p1', quantity: 2, unit_price: 50 }] };
        const result = importFromSales(existing, sale);
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(5);
    });

    test('returns original array unchanged when sale has no products', () => {
        const result = importFromSales([], { products: [] });
        expect(result).toHaveLength(0);
    });

    test('handles null sale gracefully', () => {
        const result = importFromSales([], null);
        expect(result).toHaveLength(0);
    });
});

// ── handleImportFromPurchases ─────────────────────────────────────────────────

describe('importFromPurchases', () => {
    test('adds products with unit_price=0 from a purchase', () => {
        const purchase = {
            products: [
                { product_id: 'p1', name: 'Part A', quantity: 5, unit_price: 80 },
            ],
        };
        const result = importFromPurchases([], purchase);
        expect(result).toHaveLength(1);
        expect(result[0].unit_price).toBe(0);          // user fills in later
        expect(result[0].purchase_unit_price).toBe(80); // preserved for reference
        expect(result[0].quantity).toBe(5);
    });

    test('merges quantity for duplicate product_id', () => {
        const existing = [{ product_id: 'p1', quantity: 1, unit_price: 0 }];
        const purchase = { products: [{ product_id: 'p1', quantity: 4, unit_price: 50 }] };
        const result = importFromPurchases(existing, purchase);
        expect(result[0].quantity).toBe(5);
    });
});

// ── multi-order_code display logic ────────────────────────────────────────────

describe('getDisplayCodes (multi-sales in quotation index)', () => {
    test('returns array of order_codes when multiple exist', () => {
        const q = { order_codes: ['S-001', 'S-002', 'S-003'], order_code: 'S-003' };
        const codes = getDisplayCodes(q);
        expect(codes).toEqual(['S-001', 'S-002', 'S-003']);
    });

    test('falls back to single order_code when order_codes has only one entry', () => {
        const q = { order_codes: ['S-001'], order_code: 'S-001' };
        const codes = getDisplayCodes(q);
        expect(codes).toEqual(['S-001']);
    });

    test('falls back to single order_code when order_codes is absent', () => {
        const q = { order_code: 'S-042' };
        const codes = getDisplayCodes(q);
        expect(codes).toEqual(['S-042']);
    });

    test('returns empty array when no order_code at all', () => {
        const q = {};
        const codes = getDisplayCodes(q);
        expect(codes).toHaveLength(0);
    });
});
