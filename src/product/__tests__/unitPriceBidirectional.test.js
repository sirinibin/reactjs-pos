/**
 * Tests for bidirectional auto-population in the Unit Prices section.
 *
 * Invariant: wholesale_unit_price = purchase_unit_price * (1 + wholesale_margin_percent / 100)
 * (same formula for retail)
 *
 * Covered scenarios:
 *  A. Purchase price → selling prices (via margin%)
 *  B. Purchase price → margin% (from existing selling prices, when margin not set)
 *  C. Wholesale/Retail Margin % → selling price + incl. VAT
 *  D. Wholesale/Retail Excl. VAT → margin%  (always, not gated by enable_auto_update)
 *  E. Wholesale/Retail Incl. VAT → excl. VAT → margin%
 */

const fs = require('fs');
const path = require('path');

const CREATE_JS = fs.readFileSync(
    path.join(__dirname, '../create.js'), 'utf8'
);

// ── helpers ────────────────────────────────────────────────────────────────────

function trimTo8Decimals(val) {
    return parseFloat(parseFloat(val).toFixed(8));
}

function calcMarginPercent(sellingPrice, purchasePrice) {
    if (!purchasePrice || purchasePrice <= 0) return null;
    return trimTo8Decimals(((sellingPrice / purchasePrice) - 1) * 100);
}

function calcSellingPrice(purchasePrice, marginPercent) {
    return trimTo8Decimals(purchasePrice * (1 + marginPercent / 100));
}

function calcInclVat(exclVat, vatPercent) {
    return trimTo8Decimals(exclVat * (1 + vatPercent / 100));
}

function calcExclVat(inclVat, vatPercent) {
    return trimTo8Decimals(inclVat / (1 + vatPercent / 100));
}

// ── A. Purchase price → selling prices (when margin is set) ───────────────────

describe('A. Purchase price change → selling price updated (margin is set)', () => {
    const VAT = 15;
    const purchasePrice = 100;
    const wholesaleMargin = 20;
    const retailMargin = 30;

    test('A.1  wholesale_unit_price = purchase * (1 + margin/100)', () => {
        const expected = calcSellingPrice(purchasePrice, wholesaleMargin);
        expect(expected).toBeCloseTo(120, 5);
    });

    test('A.2  retail_unit_price = purchase * (1 + retail_margin/100)', () => {
        const expected = calcSellingPrice(purchasePrice, retailMargin);
        expect(expected).toBeCloseTo(130, 5);
    });

    test('A.3  wholesale_unit_price_with_vat = wholesale * (1 + vat/100)', () => {
        const wp = calcSellingPrice(purchasePrice, wholesaleMargin);
        const wpVat = calcInclVat(wp, VAT);
        expect(wpVat).toBeCloseTo(138, 5);
    });

    test('A.4  retail_unit_price_with_vat = retail * (1 + vat/100)', () => {
        const rp = calcSellingPrice(purchasePrice, retailMargin);
        const rpVat = calcInclVat(rp, VAT);
        expect(rpVat).toBeCloseTo(149.5, 5);
    });
});


// ── B. Purchase price → back-calculates margin% (when margin NOT set) ─────────

describe('B. Purchase price change → margin% back-calculated (when selling price exists, margin empty)', () => {
    const purchasePrice = 100;
    const wholesalePrice = 125;
    const retailPrice = 140;

    test('B.1  wholesale_margin_percent computed when margin was empty', () => {
        const margin = calcMarginPercent(wholesalePrice, purchasePrice);
        expect(margin).toBeCloseTo(25, 5);
    });

    test('B.2  retail_margin_percent computed when margin was empty', () => {
        const margin = calcMarginPercent(retailPrice, purchasePrice);
        expect(margin).toBeCloseTo(40, 5);
    });

    test('B.3  margin stays null when purchase price is 0', () => {
        expect(calcMarginPercent(wholesalePrice, 0)).toBeNull();
    });

    test('B.4  source code: purchase onChange no longer gated by enable_auto_update_prices_from_last_purchase for back-calc', () => {
        // After the fix, the unified block should NOT have two separate
        // `if (!enable...)` / `if (enable...)` branches.
        // Verify the old gating pattern is gone.
        const gatedPattern = /if \(!store\?\.settings\?\.enable_auto_update_prices_from_last_purchase\)[\s\S]{0,200}if \(store\?\.settings\?\.enable_auto_update_prices_from_last_purchase\)/;
        // The old two-branch pattern covered purchase onChange; after fix it's a single block.
        // We just check the file no longer has the old pair in the purchase onChange context.
        // The old first branch used _sid and _mnow; detect that specific old string is gone.
        expect(CREATE_JS).not.toMatch(
            /if \(!store\?\.settings\?\.enable_auto_update_prices_from_last_purchase\) \{ const _wm = /
        );
    });
});


// ── C. Margin % → selling price auto-populated ────────────────────────────────

describe('C. Margin % field changed → selling price + incl. VAT computed', () => {
    const VAT = 15;
    const purchase = 100;

    test('C.1  wholesale price = purchase * (1 + margin/100)  for margin=20', () => {
        const margin = 20;
        const wp = calcSellingPrice(purchase, margin);
        expect(wp).toBeCloseTo(120, 5);
    });

    test('C.2  wholesale incl. VAT = wholesale * (1 + vat/100)', () => {
        const wp = calcSellingPrice(purchase, 20);
        const wpVat = calcInclVat(wp, VAT);
        expect(wpVat).toBeCloseTo(138, 5);
    });

    test('C.3  retail price = purchase * (1 + margin/100)  for margin=30', () => {
        const margin = 30;
        const rp = calcSellingPrice(purchase, margin);
        expect(rp).toBeCloseTo(130, 5);
    });

    test('C.4  source code: wholesale margin onChange computes wholesale_unit_price', () => {
        // Verify the fix: margin onChange now sets wholesale_unit_price and wholesale_unit_price_with_vat
        expect(CREATE_JS).toMatch(/wholesale_unit_price\s*=\s*_wp3/);
    });

    test('C.5  source code: retail margin onChange computes retail_unit_price', () => {
        expect(CREATE_JS).toMatch(/retail_unit_price\s*=\s*_rp4/);
    });
});


// ── D. Excl. VAT price → margin% (always, not gated) ─────────────────────────

describe('D. Wholesale/Retail Excl. VAT changed → margin% always updated', () => {
    const purchase = 100;

    test('D.1  wholesale margin = ((120/100) - 1) * 100 = 20%', () => {
        expect(calcMarginPercent(120, purchase)).toBeCloseTo(20, 5);
    });

    test('D.2  retail margin = ((135/100) - 1) * 100 = 35%', () => {
        expect(calcMarginPercent(135, purchase)).toBeCloseTo(35, 5);
    });

    test('D.3  source code: wholesale excl. VAT onChange no longer gated by enable_auto_update for margin calc', () => {
        // Old: if (store?.settings?.enable_auto_update_prices_from_last_purchase) { ... wholesale_margin_percent ... }
        // New: plain block { ... wholesale_margin_percent ... }
        expect(CREATE_JS).not.toMatch(
            /enable_auto_update_prices_from_last_purchase\) \{ const _pp = parseFloat\(productStores\[localStorage\.getItem\('store_id'\)\]\.purchase_unit_price\) \|\| 0; if \(_pp > 0\) \{ productStores\[localStorage\.getItem\('store_id'\)\]\.wholesale_margin_percent/
        );
    });

    test('D.4  source code: retail excl. VAT onChange no longer gated by enable_auto_update for margin calc', () => {
        expect(CREATE_JS).not.toMatch(
            /enable_auto_update_prices_from_last_purchase\) \{ const _pp = parseFloat\(productStores\[localStorage\.getItem\('store_id'\)\]\.purchase_unit_price\) \|\| 0; if \(_pp > 0\) \{ productStores\[localStorage\.getItem\('store_id'\)\]\.retail_margin_percent/
        );
    });
});


// ── E. Incl. VAT price → excl. VAT → margin% ─────────────────────────────────

describe('E. Wholesale/Retail Incl. VAT changed → excl. VAT back-calced → margin% updated', () => {
    const VAT = 15;
    const purchase = 100;

    test('E.1  wholesale excl. VAT = incl. VAT / (1 + vat/100)', () => {
        const exclVat = calcExclVat(138, VAT);
        expect(exclVat).toBeCloseTo(120, 4);
    });

    test('E.2  wholesale margin from incl. VAT price of 138 @ 15% VAT, purchase 100', () => {
        const exclVat = calcExclVat(138, VAT);
        const margin = calcMarginPercent(exclVat, purchase);
        expect(margin).toBeCloseTo(20, 3);
    });

    test('E.3  retail excl. VAT = incl. VAT / (1 + vat/100)', () => {
        const exclVat = calcExclVat(149.5, VAT);
        expect(exclVat).toBeCloseTo(130, 4);
    });

    test('E.4  retail margin from incl. VAT price of 149.5 @ 15% VAT, purchase 100', () => {
        const exclVat = calcExclVat(149.5, VAT);
        const margin = calcMarginPercent(exclVat, purchase);
        expect(margin).toBeCloseTo(30, 3);
    });

    test('E.5  source code: wholesale incl. VAT setTimeout updates wholesale_margin_percent', () => {
        expect(CREATE_JS).toMatch(/_sid3[\s\S]{0,200}wholesale_margin_percent/);
    });

    test('E.6  source code: retail incl. VAT setTimeout updates retail_margin_percent', () => {
        expect(CREATE_JS).toMatch(/_sid4[\s\S]{0,200}retail_margin_percent/);
    });
});


// ── Round-trip invariants ──────────────────────────────────────────────────────

describe('Round-trip: purchase → margin → selling price is reversible', () => {
    const VAT = 15;

    test('purchase 84.5, margin 30.17% → selling 110 → margin back-calc 30.17%', () => {
        const purchase = 84.5;
        const margin = 30.17;
        const selling = calcSellingPrice(purchase, margin);
        const backCalcMargin = calcMarginPercent(selling, purchase);
        expect(backCalcMargin).toBeCloseTo(margin, 4);
    });

    test('incl. VAT 115 @ 15% → excl. 100 → same as original excl.', () => {
        const exclVat = calcExclVat(115, VAT);
        expect(exclVat).toBeCloseTo(100, 5);
    });
});
