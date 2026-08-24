/**
 * Unit tests for the vat_percent inheritance fix in quotation_sales_return/create.js.
 *
 * Problem: When opening the QSR form for a quotation that was created with
 * vat_percent=0 (no-tax invoice), the form was re-initialised with a
 * hardcoded vat_percent=15. This caused:
 *   - QSR net_total = quotation.total * 1.15 (= 120)
 *   - Quotation's stored net_total = 104.35 (zero-rate, no VAT added)
 *   - Backend validation: totalPayment(120) > quotation.NetTotal(104.35) → 400 error
 *
 * Fix: after loading the original quotation in getQuotation(), copy
 * quotation.vat_percent into formData.vat_percent so the QSR uses the
 * same VAT rate as the original document.
 *
 * Source-code check: the assignment must be present and guarded against
 * undefined/null (backend field is *float64, so it CAN be null in JSON).
 */

const fs   = require('fs');
const path = require('path');

const QSR_CREATE_JS = fs.readFileSync(
    path.join(__dirname, '../create.js'), 'utf8'
);


// ─── 1. Source presence ───────────────────────────────────────────────────────

describe('QuotationSalesReturn create — vat_percent copied from original quotation', () => {
    test('formData.vat_percent is assigned from quotation.vat_percent in getQuotation()', () => {
        expect(QSR_CREATE_JS).toMatch(
            /formData\.vat_percent\s*=\s*quotation\.vat_percent/
        );
    });

    test('the assignment is guarded against undefined/null', () => {
        // Must be inside an if-guard so a missing field does not overwrite the default
        expect(QSR_CREATE_JS).toMatch(
            /if\s*\(quotation\.vat_percent\s*!==\s*undefined.*quotation\.vat_percent\s*!==\s*null\)/s
        );
    });

    test('the guarded block contains the assignment', () => {
        // Pattern: if (quotation.vat_percent !== undefined && ... !== null) { formData.vat_percent = quotation.vat_percent; }
        expect(QSR_CREATE_JS).toMatch(
            /if\s*\(quotation\.vat_percent\s*!==\s*undefined[^}]*\)\s*\{[^}]*formData\.vat_percent\s*=\s*quotation\.vat_percent/s
        );
    });
});


// ─── 2. Pure logic — the guard condition ─────────────────────────────────────

// Mirrors: if (quotation.vat_percent !== undefined && quotation.vat_percent !== null)
function shouldApplyVatPercent(vatPercent) {
    return vatPercent !== undefined && vatPercent !== null;
}

// Mirrors: formData.vat_percent = quotation.vat_percent (if guard passes), else keep 15
function resolveVatPercent(quotation, defaultVatPercent = 15) {
    if (shouldApplyVatPercent(quotation.vat_percent)) {
        return quotation.vat_percent;
    }
    return defaultVatPercent;
}

describe('resolveVatPercent — guard logic', () => {
    test('quotation.vat_percent=0 (no-tax/zero-rate) overrides default 15', () => {
        expect(resolveVatPercent({ vat_percent: 0 })).toBe(0);
    });

    test('quotation.vat_percent=15 (standard VAT) keeps 15', () => {
        expect(resolveVatPercent({ vat_percent: 15 })).toBe(15);
    });

    test('quotation.vat_percent=5 (reduced rate) overrides default 15', () => {
        expect(resolveVatPercent({ vat_percent: 5 })).toBe(5);
    });

    test('quotation.vat_percent=undefined falls back to default 15', () => {
        expect(resolveVatPercent({ vat_percent: undefined })).toBe(15);
    });

    test('quotation.vat_percent=null (JSON null from Go *float64) falls back to default 15', () => {
        expect(resolveVatPercent({ vat_percent: null })).toBe(15);
    });

    test('quotation with no vat_percent key falls back to default 15', () => {
        expect(resolveVatPercent({})).toBe(15);
    });
});


// ─── 3. Net total mismatch scenario that caused the 400 error ─────────────────

// Mirrors backend calculation: net_total = total * (1 + vat_percent / 100)
function calcNetTotal(total, vatPercent) {
    return parseFloat((total * (1 + vatPercent / 100)).toFixed(2));
}

describe('Net total mismatch — the original bug', () => {
    const QUOTATION_TOTAL     = 104.35; // original quotation total (without VAT)
    const ORIGINAL_VAT_PCT    = 0;      // original quotation was zero-rate
    const HARDCODED_VAT_PCT   = 15;     // old hardcoded value in QSR form

    const originalNetTotal   = calcNetTotal(QUOTATION_TOTAL, ORIGINAL_VAT_PCT);
    const wrongQsrNetTotal   = calcNetTotal(QUOTATION_TOTAL, HARDCODED_VAT_PCT);
    const correctQsrNetTotal = calcNetTotal(QUOTATION_TOTAL, resolveVatPercent({ vat_percent: ORIGINAL_VAT_PCT }));

    test('original quotation net_total = 104.35 (zero-rate, no VAT added)', () => {
        expect(originalNetTotal).toBe(104.35);
    });

    test('OLD behaviour: QSR net_total was 120 (wrong — 104.35 * 1.15)', () => {
        expect(wrongQsrNetTotal).toBe(120.00);
    });

    test('OLD: payment (120) exceeded original net_total (104.35) → 400 error', () => {
        expect(wrongQsrNetTotal).toBeGreaterThan(originalNetTotal);
    });

    test('NEW behaviour: QSR net_total = 104.35 (matches original)', () => {
        expect(correctQsrNetTotal).toBe(104.35);
    });

    test('NEW: payment (104.35) does NOT exceed original net_total (104.35) → no error', () => {
        expect(correctQsrNetTotal).toBeLessThanOrEqual(originalNetTotal);
    });
});


// ─── 4. Other vat_percent values are passed through correctly ─────────────────

describe('vat_percent pass-through for various rates', () => {
    test.each([
        [0,    104.35, 104.35],   // zero-rate
        [5,    104.35, 109.57],   // 5% reduced
        [15,   104.35, 120.00],   // 15% standard
    ])('vat_percent=%s%% on total=104.35 → net_total=%s', (pct, total, expected) => {
        const vatPct    = resolveVatPercent({ vat_percent: pct });
        const netTotal  = calcNetTotal(total, vatPct);
        expect(netTotal).toBe(expected);
    });
});
