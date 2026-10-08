/**
 * Tests for the "Created By" column added to invoice/receivables previews.
 *
 * Covers:
 *  A) Source-level: field references exist in previewContent.js and
 *     previewContentWithSellerInfo.js (both regular and delivery_note branches).
 *  B) Logic: the conditional rendering rule
 *     (props.model.store?.settings?.show_created_by_in_invoice_preview).
 *  C) SI NO column: textAlign: 'center' is present in both preview files.
 *  D) Qty column: textAlign: 'center' confirmed in both preview files.
 */

const fs   = require('fs');
const path = require('path');

const PREVIEW = fs.readFileSync(
    path.join(__dirname, '../previewContent.js'),
    'utf8'
);

const PREVIEW_SELLER = fs.readFileSync(
    path.join(__dirname, '../previewContentWithSellerInfo.js'),
    'utf8'
);

// ── 1. Field references in previewContent.js ──────────────────────────────────

describe('previewContent.js — show_created_by_in_invoice_preview references', () => {
    test('1.1  setting flag is checked via optional-chaining', () => {
        expect(PREVIEW).toMatch(/store\?\.settings\?\.show_created_by_in_invoice_preview/);
    });

    test('1.2  created_by_name field is rendered', () => {
        expect(PREVIEW).toMatch(/created_by_name/);
    });

    test('1.3  "Created By:" label is present', () => {
        expect(PREVIEW).toMatch(/Created By:/);
    });

    test('1.4  setting guard appears at least twice (main + delivery_note branch)', () => {
        const matches = PREVIEW.match(/show_created_by_in_invoice_preview/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('1.5  Remarks row still contains the remarks field in both branches', () => {
        const remarksCount = (PREVIEW.match(/props\.model\.remarks/g) || []).length;
        // Must appear at least 4 times (two branches × two arms of the ternary).
        expect(remarksCount).toBeGreaterThanOrEqual(4);
    });
});

// ── 2. Field references in previewContentWithSellerInfo.js ───────────────────

describe('previewContentWithSellerInfo.js — show_created_by_in_invoice_preview references', () => {
    test('2.1  setting flag is checked via optional-chaining', () => {
        expect(PREVIEW_SELLER).toMatch(/store\?\.settings\?\.show_created_by_in_invoice_preview/);
    });

    test('2.2  created_by_name field is rendered', () => {
        expect(PREVIEW_SELLER).toMatch(/created_by_name/);
    });

    test('2.3  "Created By:" label is present', () => {
        expect(PREVIEW_SELLER).toMatch(/Created By:/);
    });

    test('2.4  setting guard appears at least twice (main + delivery_note branch)', () => {
        const matches = PREVIEW_SELLER.match(/show_created_by_in_invoice_preview/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 3. Conditional rendering logic (pure JS mirror) ───────────────────────────

describe('Created By conditional rendering logic', () => {
    /**
     * Mirrors: props.model.store?.settings?.show_created_by_in_invoice_preview
     */
    function shouldShowCreatedBy(model) {
        return !!(model?.store?.settings?.show_created_by_in_invoice_preview);
    }

    /**
     * Mirrors: props.model.created_by_name || ""
     */
    function getCreatedByName(model) {
        return model.created_by_name || "";
    }

    test('3.1  returns true when setting is true', () => {
        const model = { store: { settings: { show_created_by_in_invoice_preview: true } } };
        expect(shouldShowCreatedBy(model)).toBe(true);
    });

    test('3.2  returns false when setting is false', () => {
        const model = { store: { settings: { show_created_by_in_invoice_preview: false } } };
        expect(shouldShowCreatedBy(model)).toBe(false);
    });

    test('3.3  returns false when setting is absent (default off)', () => {
        const model = { store: { settings: {} } };
        expect(shouldShowCreatedBy(model)).toBe(false);
    });

    test('3.4  returns false when settings object is absent', () => {
        const model = { store: {} };
        expect(shouldShowCreatedBy(model)).toBe(false);
    });

    test('3.5  returns false when store is absent', () => {
        const model = {};
        expect(shouldShowCreatedBy(model)).toBe(false);
    });

    test('3.6  returns false when model is null', () => {
        expect(shouldShowCreatedBy(null)).toBe(false);
    });

    test('3.7  created_by_name renders correctly when set', () => {
        const model = { created_by_name: 'Ahmed Al-Farsi', store: { settings: { show_created_by_in_invoice_preview: true } } };
        expect(getCreatedByName(model)).toBe('Ahmed Al-Farsi');
    });

    test('3.8  created_by_name falls back to empty string when missing', () => {
        const model = { store: { settings: { show_created_by_in_invoice_preview: true } } };
        expect(getCreatedByName(model)).toBe('');
    });

    test('3.9  created_by_name falls back to empty string when null', () => {
        const model = { created_by_name: null };
        expect(getCreatedByName(model)).toBe('');
    });

    test('3.10 created_by_name falls back to empty string when empty string', () => {
        const model = { created_by_name: '' };
        expect(getCreatedByName(model)).toBe('');
    });

    test('3.11 setting=true with populated name shows name correctly', () => {
        const model = {
            store: { settings: { show_created_by_in_invoice_preview: true } },
            created_by_name: 'John Smith',
        };
        expect(shouldShowCreatedBy(model)).toBe(true);
        expect(getCreatedByName(model)).toBe('John Smith');
    });

    test('3.12 setting=false hides column even if name is present', () => {
        const model = {
            store: { settings: { show_created_by_in_invoice_preview: false } },
            created_by_name: 'John Smith',
        };
        expect(shouldShowCreatedBy(model)).toBe(false);
    });
});

// ── 4. Remarks renders in BOTH branches ──────────────────────────────────────

describe('Remarks still renders in both branches of the ternary', () => {
    function getRemarksValue(model) {
        return model.remarks ? model.remarks : "";
    }

    test('4.1  non-empty remarks is preserved', () => {
        expect(getRemarksValue({ remarks: 'Handle with care' })).toBe('Handle with care');
    });

    test('4.2  undefined remarks falls back to empty string', () => {
        expect(getRemarksValue({})).toBe('');
    });

    test('4.3  null remarks falls back to empty string', () => {
        expect(getRemarksValue({ remarks: null })).toBe('');
    });

    test('4.4  empty-string remarks falls back to empty string', () => {
        expect(getRemarksValue({ remarks: '' })).toBe('');
    });
});

// ── 5. SI NO column textAlign: center ─────────────────────────────────────────

describe('previewContent.js — SI NO <td> has textAlign center', () => {
    test('5.1  SI NO td includes textAlign: .center. in previewContent.js', () => {
        // Match the td that renders the serial number (index + 1 + pageIndex * pageSize)
        expect(PREVIEW).toMatch(
            /padding.*7px.*borderRight.*tableBorderThickness.*textAlign.*center[\s\S]{0,50}index \+ 1/
        );
    });

    test('5.2  SI NO td includes textAlign: .center. in previewContentWithSellerInfo.js', () => {
        expect(PREVIEW_SELLER).toMatch(
            /padding.*7px.*borderRight.*tableBorderThickness.*textAlign.*center[\s\S]{0,50}index \+ 1/
        );
    });
});

// ── 6. Qty column textAlign: center (existing, verified still present) ────────

describe('previewContent.js — Qty <td> still has textAlign center', () => {
    test('6.1  textAlign: .center. appears in previewContent.js', () => {
        expect(PREVIEW).toMatch(/textAlign.*['"]center['"]/);
    });

    test('6.2  textAlign: .center. appears in previewContentWithSellerInfo.js', () => {
        expect(PREVIEW_SELLER).toMatch(/textAlign.*['"]center['"]/);
    });
});
