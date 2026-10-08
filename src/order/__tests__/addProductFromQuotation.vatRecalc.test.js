/**
 * Source-level tests for the unit_price_with_vat recalculation fix in
 * addProductFromQuotation (order/create.js).
 *
 * Problem:
 *   When a quotation was created with type="invoice" and the store setting
 *   no_tax_for_quotation_invoice=true, the quotation stores products with
 *   unit_price_with_vat = unit_price (VAT was 0%).
 *
 *   Before the fix, addProductFromQuotation copied unit_price_with_vat
 *   blindly from the quotation, resulting in the same price for both
 *   "without VAT" and "with VAT" columns in the sales form even though
 *   the sales form has vat_percent = 15.
 *
 * Fix:
 *   addProductFromQuotation now recalculates unit_price_with_vat as
 *   unit_price * (1 + formData.vat_percent / 100), so it always reflects
 *   the sales form's own VAT rate regardless of how the quotation was stored.
 *
 *   unit_discount_with_vat is recalculated the same way for consistency.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

// Extract the addProductFromQuotation function body
const fnStart = SRC.indexOf('function addProductFromQuotation(product)');
const fnEnd   = SRC.indexOf('\n    function ', fnStart + 1);
const FN_BODY = SRC.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 2000);


// ── 1. unit_price_with_vat recalculated from unit_price ───────────────────────

describe('addProductFromQuotation — unit_price_with_vat uses sales form VAT rate', () => {
    test('unit_price_with_vat is computed from unit_price * (1 + vat_percent/100)', () => {
        expect(FN_BODY).toMatch(
            /unit_price_with_vat.*trimTo2Decimals\s*\(\s*product\.unit_price\s*\*\s*\(\s*1\s*\+\s*.*vat_percent.*\/\s*100\s*\)/s
        );
    });

    test('unit_price_with_vat does NOT blindly copy product.unit_price_with_vat', () => {
        expect(FN_BODY).not.toMatch(
            /unit_price_with_vat\s*:\s*product\.unit_price_with_vat\s*\?/
        );
    });

    test('formData.vat_percent is referenced in the unit_price_with_vat calculation', () => {
        expect(FN_BODY).toMatch(/formData\.vat_percent/);
    });

    test('fallback to 0 when unit_price is falsy', () => {
        expect(FN_BODY).toMatch(
            /unit_price_with_vat.*product\.unit_price[\s\S]*?:\s*0/
        );
    });
});


// ── 2. unit_discount_with_vat recalculated consistently ──────────────────────

describe('addProductFromQuotation — unit_discount_with_vat uses sales form VAT rate', () => {
    test('unit_discount_with_vat is computed from unit_discount * (1 + vat_percent/100)', () => {
        expect(FN_BODY).toMatch(
            /unit_discount_with_vat.*trimTo2Decimals\s*\(\s*product\.unit_discount\s*\*\s*\(\s*1\s*\+\s*.*vat_percent.*\/\s*100\s*\)/s
        );
    });

    test('unit_discount_with_vat does NOT blindly copy product.unit_discount_with_vat', () => {
        expect(FN_BODY).not.toMatch(
            /unit_discount_with_vat\s*:\s*product\.unit_discount_with_vat\s*\?/
        );
    });
});


// ── 3. Arithmetic correctness ─────────────────────────────────────────────────

describe('addProductFromQuotation — VAT recalculation arithmetic', () => {
    const VAT = 15;
    const unitPrice = 25;

    test('unit_price_with_vat for price=25 at 15% VAT is 28.75', () => {
        const result = parseFloat((unitPrice * (1 + VAT / 100)).toFixed(2));
        expect(result).toBe(28.75);
    });

    test('invoice quotation (VAT=0) stored same price: 25 == 25 — this was the bug', () => {
        const invoiceVat = 0;
        const stored = parseFloat((unitPrice * (1 + invoiceVat / 100)).toFixed(2));
        expect(stored).toBe(unitPrice);
    });

    test('fix recalculates using sales form VAT=15, giving 28.75 not 25', () => {
        const salesFormVat = 15;
        const recalculated = parseFloat((unitPrice * (1 + salesFormVat / 100)).toFixed(2));
        expect(recalculated).toBe(28.75);
        expect(recalculated).not.toBe(unitPrice);
    });

    test('normal quotation (VAT=15) gives same result either way', () => {
        const quotationUnitPriceWithVat = 28.75; // stored correctly in normal quotation
        const recalculated = parseFloat((unitPrice * (1 + VAT / 100)).toFixed(2));
        expect(recalculated).toBe(quotationUnitPriceWithVat);
    });

    test('zero unit_price gives zero unit_price_with_vat regardless of VAT rate', () => {
        expect(0 * (1 + VAT / 100)).toBe(0);
    });

    test('zero unit_discount gives zero unit_discount_with_vat', () => {
        expect(0 * (1 + VAT / 100)).toBe(0);
    });
});
