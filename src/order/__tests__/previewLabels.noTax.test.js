/**
 * Pure logic tests for preview column headers and bill-summary labels
 * changed by the "No Tax for Quotation Invoice" feature.
 *
 * Each helper mirrors the ternary in its source file.
 * Keep in sync when the source changes.
 */

// ── previewContentType2.js (hideVAT branch of the last-column header) ────────
function type2LineTotalHeader(hideVAT) {
    return hideVAT ? 'Price' : 'Line Total';
}

// ── previewContentType3.js (hideVAT branch of the last-column header) ────────
function type3LineTotalHeader(hideVAT) {
    return hideVAT ? 'Price' : 'Total (inc. VAT)';
}

// ── previewContent.js — bill-summary discount row label ──────────────────────
function discountLabel(hideVAT) {
    return hideVAT ? 'Sales Discount خصم المبيعات :' : 'Total Discount الخصم الإجمالي :';
}

// ── previewContentWithSellerInfo.js — same ternary ───────────────────────────
const discountLabelWithSellerInfo = discountLabel;

// ─────────────────────────────────────────────────────────────────────────────

describe('previewContentType2 — last-column header', () => {
    test('hideVAT=true  → "Price" (no-tax mode)', () => {
        expect(type2LineTotalHeader(true)).toBe('Price');
    });

    test('hideVAT=false → "Line Total" (normal VAT mode)', () => {
        expect(type2LineTotalHeader(false)).toBe('Line Total');
    });
});

describe('previewContentType3 — last-column header', () => {
    test('hideVAT=true  → "Price" (no-tax mode)', () => {
        expect(type3LineTotalHeader(true)).toBe('Price');
    });

    test('hideVAT=false → "Total (inc. VAT)" (normal VAT mode)', () => {
        expect(type3LineTotalHeader(false)).toBe('Total (inc. VAT)');
    });
});

describe('previewContent — bill-summary discount label', () => {
    test('hideVAT=true  → includes Arabic "خصم المبيعات"', () => {
        const label = discountLabel(true);
        expect(label).toBe('Sales Discount خصم المبيعات :');
        expect(label).toContain('خصم المبيعات');
        expect(label).toContain('Sales Discount');
    });

    test('hideVAT=false → "Total Discount الخصم الإجمالي :"', () => {
        const label = discountLabel(false);
        expect(label).toBe('Total Discount الخصم الإجمالي :');
        expect(label).toContain('الخصم الإجمالي');
    });

    test('hideVAT=true  → does NOT show "Total Discount"', () => {
        expect(discountLabel(true)).not.toContain('Total Discount');
    });

    test('hideVAT=false → does NOT show "Sales Discount"', () => {
        expect(discountLabel(false)).not.toContain('Sales Discount');
    });
});

describe('previewContentWithSellerInfo — bill-summary discount label (same logic)', () => {
    test('hideVAT=true  → Arabic label matches previewContent', () => {
        expect(discountLabelWithSellerInfo(true)).toBe(discountLabel(true));
    });

    test('hideVAT=false → label matches previewContent', () => {
        expect(discountLabelWithSellerInfo(false)).toBe(discountLabel(false));
    });
});
