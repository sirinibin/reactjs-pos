/**
 * Unit tests for setHideVAT logic (preview.js).
 *
 * Rules:
 *   1. non_vat_invoice → always hideVAT=true
 *   2. store.no_tax_for_quotation_invoice=true + quotation/whatsapp_quotation type=invoice → hideVAT=true
 *   3. store.no_tax_for_quotation_invoice=true + quotation_sales_return/whatsapp_qsr → hideVAT=true
 *   4. Everything else → hideVAT=false
 */

/**
 * Mirrors setHideVAT from preview.js — update both if logic changes.
 */
function setHideVAT(modelName, model = {}) {
    if (modelName === 'non_vat_invoice') return true;
    if (model.store?.settings?.no_tax_for_quotation_invoice) {
        if (
            modelName === 'quotation_sales_return' ||
            modelName === 'whatsapp_quotation_sales_return' ||
            ((modelName === 'quotation' || modelName === 'whatsapp_quotation') && model.type === 'invoice')
        ) return true;
    }
    return false;
}

describe('setHideVAT — logic (preview.js)', () => {
    // ── non_vat_invoice always hides VAT ─────────────────────────────────────

    test('non_vat_invoice → true (no store flag needed)', () => {
        expect(setHideVAT('non_vat_invoice')).toBe(true);
    });

    test('non_vat_invoice → true even when no_tax_for_quotation_invoice is false', () => {
        expect(setHideVAT('non_vat_invoice', { store: { settings: { no_tax_for_quotation_invoice: false } } })).toBe(true);
    });

    // ── no_tax_for_quotation_invoice flag ON ─────────────────────────────────

    test('quotation type=invoice + flag ON → true', () => {
        expect(setHideVAT('quotation', { type: 'invoice', store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(true);
    });

    test('whatsapp_quotation type=invoice + flag ON → true', () => {
        expect(setHideVAT('whatsapp_quotation', { type: 'invoice', store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(true);
    });

    test('quotation_sales_return + flag ON → true', () => {
        expect(setHideVAT('quotation_sales_return', { store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(true);
    });

    test('whatsapp_quotation_sales_return + flag ON → true', () => {
        expect(setHideVAT('whatsapp_quotation_sales_return', { store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(true);
    });

    test('quotation type=quotation + flag ON → false (flag only affects invoice type)', () => {
        expect(setHideVAT('quotation', { type: 'quotation', store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(false);
    });

    // ── no_tax_for_quotation_invoice flag OFF (or absent) ────────────────────

    test('quotation type=invoice + flag OFF → false', () => {
        expect(setHideVAT('quotation', { type: 'invoice', store: { settings: { no_tax_for_quotation_invoice: false } } })).toBe(false);
    });

    test('quotation_sales_return + flag OFF → false', () => {
        expect(setHideVAT('quotation_sales_return', { store: { settings: { no_tax_for_quotation_invoice: false } } })).toBe(false);
    });

    test('quotation type=invoice + no store settings → false', () => {
        expect(setHideVAT('quotation', { type: 'invoice' })).toBe(false);
    });

    test('quotation_sales_return + no store settings → false', () => {
        expect(setHideVAT('quotation_sales_return')).toBe(false);
    });

    test('whatsapp_quotation_sales_return + no store settings → false', () => {
        expect(setHideVAT('whatsapp_quotation_sales_return')).toBe(false);
    });

    // ── unrelated models always false ────────────────────────────────────────

    test('sales → false', () => {
        expect(setHideVAT('sales')).toBe(false);
    });

    test('purchase → false', () => {
        expect(setHideVAT('purchase')).toBe(false);
    });

    test('non_vat_sales_return → false', () => {
        expect(setHideVAT('non_vat_sales_return')).toBe(false);
    });

    test('undefined modelName → false', () => {
        expect(setHideVAT(undefined)).toBe(false);
    });

    test('empty string modelName → false', () => {
        expect(setHideVAT('')).toBe(false);
    });

    // ── edge cases ───────────────────────────────────────────────────────────

    test('null store → false (no crash)', () => {
        expect(setHideVAT('quotation', { type: 'invoice', store: null })).toBe(false);
    });

    test('null settings → false (no crash)', () => {
        expect(setHideVAT('quotation', { type: 'invoice', store: { settings: null } })).toBe(false);
    });

    test('flag ON + delivery_note → false', () => {
        expect(setHideVAT('delivery_note', { store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(false);
    });

    test('flag ON + sales_return → false', () => {
        expect(setHideVAT('sales_return', { store: { settings: { no_tax_for_quotation_invoice: true } } })).toBe(false);
    });
});
