/**
 * Unit tests for Price Comparison table product price update logic.
 * Covers: purchase/retail price calculation, VAT normalisation, margin pre-fill.
 */

// Helpers mirroring frontend logic

function normalisePurchasePrice(unitPrice, vatIncluded, vatPercent) {
    const vatMult = 1 + vatPercent / 100;
    if (vatIncluded && vatMult > 1) return unitPrice / vatMult;
    return unitPrice;
}

function computeRetailPrice(purchaseExcl, marginPct) {
    if (!purchaseExcl || purchaseExcl <= 0 || !marginPct || marginPct <= 0) return null;
    return parseFloat((purchaseExcl * (1 + marginPct / 100)).toFixed(8));
}

function buildUpdateItems(products, selectedSupplier, priceMap, margins) {
    const items = [];
    products.forEach((prod, i) => {
        if (!prod.product_id) return;
        const sid = selectedSupplier[i];
        if (!sid) return;
        const priceEntry = priceMap[i]?.[sid];
        if (!priceEntry) return;
        const marginPct = parseFloat(margins[i]) || 0;
        const retail = computeRetailPrice(priceEntry.unit_price, marginPct);
        items.push({
            product_index:       i,
            purchase_unit_price: priceEntry.unit_price,
            retail_unit_price:   retail ?? priceEntry.unit_price,
            vat_included:        !!priceEntry.vat_included,
        });
    });
    return items;
}

describe('Price update item building', () => {
    const products = [
        { product_id: 'pid1', name: 'Widget A', part_no: 'W-001' },
        { product_id: null,   name: 'Unknown B', part_no: '' },
        { product_id: 'pid3', name: 'Gadget C', part_no: 'G-003' },
    ];
    const selectedSupplier = { 0: 'sup1', 1: 'sup1', 2: null };
    const priceMap = {
        0: { sup1: { unit_price: 100, vat_included: false } },
        1: { sup1: { unit_price: 80,  vat_included: false } },
    };
    const margins = { 0: '30', 1: '25', 2: '20' };

    test('skips product without product_id', () => {
        const items = buildUpdateItems(products, selectedSupplier, priceMap, margins);
        expect(items.every(it => it.product_index !== 1)).toBe(true);
    });

    test('skips product with no selected supplier', () => {
        const items = buildUpdateItems(products, selectedSupplier, priceMap, margins);
        expect(items.some(it => it.product_index === 2)).toBe(false);
    });

    test('includes valid product with correct purchase price', () => {
        const items = buildUpdateItems(products, selectedSupplier, priceMap, margins);
        const item = items.find(it => it.product_index === 0);
        expect(item).toBeDefined();
        expect(item.purchase_unit_price).toBe(100);
    });

    test('retail price = purchase * (1 + margin/100)', () => {
        const items = buildUpdateItems(products, selectedSupplier, priceMap, margins);
        const item = items.find(it => it.product_index === 0);
        expect(item.retail_unit_price).toBeCloseTo(130, 5); // 100 * 1.30
    });

    test('vat_included flag is preserved', () => {
        const pmWithVAT = { 0: { sup1: { unit_price: 115, vat_included: true } } };
        const items = buildUpdateItems(products, { 0: 'sup1' }, pmWithVAT, margins);
        expect(items[0].vat_included).toBe(true);
    });
});

describe('VAT normalisation', () => {
    test('price excl VAT is unchanged', () => {
        expect(normalisePurchasePrice(100, false, 15)).toBeCloseTo(100, 5);
    });

    test('price incl VAT is divided by (1 + vat/100)', () => {
        expect(normalisePurchasePrice(115, true, 15)).toBeCloseTo(100, 5);
    });

    test('zero VAT rate leaves price unchanged', () => {
        expect(normalisePurchasePrice(100, true, 0)).toBe(100);
    });
});

describe('Retail price computation', () => {
    test('computes retail from margin', () => {
        expect(computeRetailPrice(100, 30)).toBeCloseTo(130, 5);
    });

    test('returns null when purchase price is 0', () => {
        expect(computeRetailPrice(0, 30)).toBeNull();
    });

    test('returns null when margin is 0', () => {
        expect(computeRetailPrice(100, 0)).toBeNull();
    });

    test('returns null for negative margin (guard prevents below-cost)', () => {
        expect(computeRetailPrice(100, -10)).toBeNull();
    });

    // Regression test: floating-point multiplication (e.g. 3 * 1.0333…) can
    // produce 15+ decimal places.  The Quotation form rejects unit_price with
    // more than 8 decimal places ("Max decimal points allowed is 8").
    test('result has at most 8 decimal places', () => {
        // 100 / 3 = 33.333… → margin gives a repeating decimal
        const cost = 100 / 3;
        const result = computeRetailPrice(cost, 15);
        const decimals = (result.toString().split('.')[1] || '').length;
        expect(decimals).toBeLessThanOrEqual(8);
    });

    test('precise value: 10.00 cost + 33.33% margin rounds to ≤8 dp', () => {
        const result = computeRetailPrice(10.00, 33.33);
        const decimals = (result.toString().split('.')[1] || '').length;
        expect(decimals).toBeLessThanOrEqual(8);
    });
});

describe('rfq_received/index.js — retailPrice decimal cap (source)', () => {
    const fs   = require('fs');
    const path = require('path');
    const SRC  = fs.readFileSync(
        path.join(__dirname, '..', 'index.js'),
        'utf8'
    );

    test('retailPrice uses toFixed(8) to cap decimal places', () => {
        expect(SRC).toMatch(/toFixed\s*\(\s*8\s*\)/);
    });

    test('retailPrice does not return bare cost * (1 + m / 100) without rounding', () => {
        // The unrounded form must not be the return value any more
        expect(SRC).not.toMatch(/return\s+cost\s*\*\s*\(1\s*\+\s*m\s*\/\s*100\)/);
    });
});
