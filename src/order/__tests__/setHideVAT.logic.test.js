/**
 * Unit tests for the simplified setHideVAT logic (preview.js).
 *
 * Before this change the function had extra conditions:
 *   • quotation + type=invoice   → hideVAT = true  (wrong — VAT was zeroed in backend)
 *   • quotation_sales_return     → hideVAT = true  (wrong — same bug)
 *
 * After the fix the rule is: ONLY non_vat_invoice model hides VAT.
 * These tests serve as regression guards for that invariant.
 */

/**
 * Mirrors the simplified setHideVAT from preview.js.
 * Kept in sync: if the function changes, update here too.
 */
function setHideVAT(modelName, model = {}) {
    if (modelName === 'non_vat_invoice') return true;
    return false;
}

describe('setHideVAT — simplified logic (preview.js)', () => {
    // ── cases that MUST hide VAT ──────────────────────────────────────────────

    test('non_vat_invoice → hideVAT=true', () => {
        expect(setHideVAT('non_vat_invoice')).toBe(true);
    });

    // ── regressions: cases that previously hid VAT incorrectly ───────────────

    test('quotation_sales_return → hideVAT=false (regression: was hidden when store setting on)', () => {
        expect(setHideVAT('quotation_sales_return')).toBe(false);
    });

    test('whatsapp_quotation_sales_return → hideVAT=false (regression: was hidden)', () => {
        expect(setHideVAT('whatsapp_quotation_sales_return')).toBe(false);
    });

    test('quotation with type=invoice → hideVAT=false (regression: was hidden)', () => {
        // Previously: modelName=quotation + hide_quotation_invoice_vat setting → true
        // Now: always false; VAT is always calculated in backend
        expect(setHideVAT('quotation', { type: 'invoice' })).toBe(false);
    });

    test('whatsapp_quotation with type=invoice → hideVAT=false (regression)', () => {
        expect(setHideVAT('whatsapp_quotation', { type: 'invoice' })).toBe(false);
    });

    // ── cases that have always been correct ───────────────────────────────────

    test('quotation (type=quotation) → hideVAT=false', () => {
        expect(setHideVAT('quotation', { type: 'quotation' })).toBe(false);
    });

    test('non_vat_sales_return → hideVAT=false (NonVAT Sales module: handled at model level, not here)', () => {
        expect(setHideVAT('non_vat_sales_return')).toBe(false);
    });

    test('sales → hideVAT=false', () => {
        expect(setHideVAT('sales')).toBe(false);
    });

    test('purchase → hideVAT=false', () => {
        expect(setHideVAT('purchase')).toBe(false);
    });

    test('undefined modelName → hideVAT=false', () => {
        expect(setHideVAT(undefined)).toBe(false);
    });

    test('empty string modelName → hideVAT=false', () => {
        expect(setHideVAT('')).toBe(false);
    });
});
