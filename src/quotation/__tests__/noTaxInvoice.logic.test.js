/**
 * Pure logic tests for the "No Tax for Quotation Invoice & Quotation Sales Return"
 * feature added to quotation/create.js and QuotationType3Form.js.
 *
 * Functions below mirror the exact decision expressions in those files.
 * Keep in sync when source logic changes.
 */

// ── addProduct price resolution — QuotationType3Form style ───────────────────
// Mirrors: addProduct() and handleSelectedProductsFromModal()
function resolvePriceWithVat_Type3({ basePrice, retailPriceWithVat, excludeVat, isNoTaxInvoice }) {
    if (excludeVat || isNoTaxInvoice) return basePrice;
    return retailPriceWithVat || 0;
}

// ── addProduct price resolution — create.js style ────────────────────────────
// Mirrors: addProduct() lines 1373-1375 in create.js
function resolvePriceWithVat_Create({ retailUnitPrice, retailUnitPriceWithVat, isNoTaxInvoice }) {
    const unitPrice = retailUnitPrice || 0;
    return isNoTaxInvoice ? unitPrice : (retailUnitPriceWithVat || 0);
}

// ── isNoTaxInvoice flag evaluation ───────────────────────────────────────────
// Mirrors: store?.settings?.no_tax_for_quotation_invoice && formData.type === 'invoice'
function isNoTaxInvoice(storeSettings, formType) {
    return !!(storeSettings?.no_tax_for_quotation_invoice && formType === 'invoice');
}

// ── vat_percent resolution on type dropdown change ───────────────────────────
// Mirrors: QuotationType3Form onChange lines 891-892 and create.js onChange
function resolveVatPct(newType, flagOn, storeVatPercent) {
    if (!flagOn) return storeVatPercent;
    return newType === 'invoice' ? 0 : (storeVatPercent || 15);
}

// ── useEffect guard: should zero-out VAT? ────────────────────────────────────
// Mirrors: useEffect lines 544-545 in QuotationType3Form.js
function shouldApplyNoTaxEffect(flagOn, formType, currentVatPct) {
    if (!flagOn || formType !== 'invoice') return false;
    if (currentVatPct === 0) return false;
    return true;
}

// ── product price update when vat_percent becomes 0 ─────────────────────────
// vatMul = 1 + 0/100 = 1  →  priceWithVat = price × 1 = price
function applyZeroVat(unitPrice, unitDiscount) {
    const vatMul = 1 + (0 / 100);
    return {
        unit_price_with_vat: (parseFloat(unitPrice) || 0) * vatMul,
        unit_discount_with_vat: (parseFloat(unitDiscount) || 0) * vatMul,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('isNoTaxInvoice — flag evaluation', () => {
    test('flag ON + type=invoice → true', () => {
        expect(isNoTaxInvoice({ no_tax_for_quotation_invoice: true }, 'invoice')).toBe(true);
    });

    test('flag ON + type=quotation → false', () => {
        expect(isNoTaxInvoice({ no_tax_for_quotation_invoice: true }, 'quotation')).toBe(false);
    });

    test('flag OFF + type=invoice → false', () => {
        expect(isNoTaxInvoice({ no_tax_for_quotation_invoice: false }, 'invoice')).toBe(false);
    });

    test('no settings object → false', () => {
        expect(isNoTaxInvoice(undefined, 'invoice')).toBe(false);
    });

    test('empty settings → false', () => {
        expect(isNoTaxInvoice({}, 'invoice')).toBe(false);
    });
});

describe('resolvePriceWithVat_Type3 — QuotationType3Form addProduct / modal', () => {
    test('flag ON → priceWithVat equals basePrice (no VAT)', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 100, retailPriceWithVat: 115, excludeVat: false, isNoTaxInvoice: true,
        })).toBe(100);
    });

    test('flag OFF → priceWithVat from store (with VAT)', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 100, retailPriceWithVat: 115, excludeVat: false, isNoTaxInvoice: false,
        })).toBe(115);
    });

    test('excludeVat=true + flag OFF → priceWithVat = basePrice (existing logic preserved)', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 100, retailPriceWithVat: 115, excludeVat: true, isNoTaxInvoice: false,
        })).toBe(100);
    });

    test('excludeVat=true + flag ON → priceWithVat = basePrice', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 100, retailPriceWithVat: 115, excludeVat: true, isNoTaxInvoice: true,
        })).toBe(100);
    });

    test('flag ON + zero base price → 0', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 0, retailPriceWithVat: 0, excludeVat: false, isNoTaxInvoice: true,
        })).toBe(0);
    });

    test('flag OFF + null retailPriceWithVat → 0 (fallback)', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 100, retailPriceWithVat: null, excludeVat: false, isNoTaxInvoice: false,
        })).toBe(0);
    });

    test('flag ON + decimal price → basePrice returned exactly', () => {
        expect(resolvePriceWithVat_Type3({
            basePrice: 49.99, retailPriceWithVat: 57.49, excludeVat: false, isNoTaxInvoice: true,
        })).toBe(49.99);
    });
});

describe('resolvePriceWithVat_Create — create.js addProduct', () => {
    test('flag ON + type=invoice → unit_price_with_vat = unit_price', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: 200, retailUnitPriceWithVat: 230, isNoTaxInvoice: true,
        })).toBe(200);
    });

    test('flag OFF → unit_price_with_vat from store', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: 200, retailUnitPriceWithVat: 230, isNoTaxInvoice: false,
        })).toBe(230);
    });

    test('flag ON + zero price → 0', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: 0, retailUnitPriceWithVat: 0, isNoTaxInvoice: true,
        })).toBe(0);
    });

    test('flag OFF + missing retailUnitPriceWithVat → 0 (no crash)', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: 200, retailUnitPriceWithVat: null, isNoTaxInvoice: false,
        })).toBe(0);
    });

    test('flag OFF + undefined prices → 0 (no crash)', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: undefined, retailUnitPriceWithVat: undefined, isNoTaxInvoice: false,
        })).toBe(0);
    });

    test('flag ON + decimal price → returned as-is', () => {
        expect(resolvePriceWithVat_Create({
            retailUnitPrice: 99.50, retailUnitPriceWithVat: 114.43, isNoTaxInvoice: true,
        })).toBe(99.50);
    });
});

describe('resolveVatPct — type dropdown onChange vat_percent decision', () => {
    test('flag ON + → invoice → 0', () => {
        expect(resolveVatPct('invoice', true, 15)).toBe(0);
    });

    test('flag ON + → quotation → restores store vat_percent', () => {
        expect(resolveVatPct('quotation', true, 15)).toBe(15);
    });

    test('flag ON + → quotation + store has no vat → fallback 15', () => {
        expect(resolveVatPct('quotation', true, 0)).toBe(15);
    });

    test('flag ON + → quotation + store vat=5 → restores 5', () => {
        expect(resolveVatPct('quotation', true, 5)).toBe(5);
    });

    test('flag OFF + → invoice → unchanged (returns storeVatPercent)', () => {
        expect(resolveVatPct('invoice', false, 15)).toBe(15);
    });

    test('flag OFF + → quotation → unchanged', () => {
        expect(resolveVatPct('quotation', false, 15)).toBe(15);
    });
});

describe('shouldApplyNoTaxEffect — useEffect guard', () => {
    test('flag ON + type=invoice + vat_percent=15 → apply', () => {
        expect(shouldApplyNoTaxEffect(true, 'invoice', 15)).toBe(true);
    });

    test('flag ON + type=invoice + vat_percent already 0 → skip (idempotent)', () => {
        expect(shouldApplyNoTaxEffect(true, 'invoice', 0)).toBe(false);
    });

    test('flag ON + type=quotation → skip', () => {
        expect(shouldApplyNoTaxEffect(true, 'quotation', 15)).toBe(false);
    });

    test('flag OFF + type=invoice → skip', () => {
        expect(shouldApplyNoTaxEffect(false, 'invoice', 15)).toBe(false);
    });

    test('flag OFF + type=quotation → skip', () => {
        expect(shouldApplyNoTaxEffect(false, 'quotation', 15)).toBe(false);
    });

    test('flag undefined → skip', () => {
        expect(shouldApplyNoTaxEffect(undefined, 'invoice', 15)).toBe(false);
    });
});

describe('applyZeroVat — product price update when vat_percent=0 (vatMul=1)', () => {
    test('unit_price_with_vat = unit_price when vat=0', () => {
        const r = applyZeroVat(100, 10);
        expect(r.unit_price_with_vat).toBe(100);
        expect(r.unit_discount_with_vat).toBe(10);
    });

    test('decimal prices', () => {
        const r = applyZeroVat(99.99, 5.00);
        expect(r.unit_price_with_vat).toBeCloseTo(99.99, 5);
        expect(r.unit_discount_with_vat).toBeCloseTo(5.00, 5);
    });

    test('zero price and discount', () => {
        const r = applyZeroVat(0, 0);
        expect(r.unit_price_with_vat).toBe(0);
        expect(r.unit_discount_with_vat).toBe(0);
    });

    test('no discount (0)', () => {
        const r = applyZeroVat(250, 0);
        expect(r.unit_price_with_vat).toBe(250);
        expect(r.unit_discount_with_vat).toBe(0);
    });
});
