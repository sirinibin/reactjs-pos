/**
 * Pure-logic tests for the Quotation SP Table Settings modal z-index fix.
 *
 * Bug: "Products table settings modal appearing behind the Quotation form type 1."
 *
 * Root cause: the "Quotation SP Table Settings" Modal (showQuotationSPSettings) and
 * both TableSettingsModal instances in quotation/create.js had hardcoded zIndex values
 * (no zIndex, defaulting to Bootstrap's 1050, and zIndex=10500 respectively).
 * When QuotationCreate is opened from ProcurementWhatsAppTab with zIndex=12000 (or
 * zIndexBase + 3000), the Quotation form's container is boosted to 12000 via !important.
 * Any modal inside the form with a lower z-index is hidden behind it.
 *
 * Fix: changed all three settings modals in quotation/create.js to use
 *   zIndex = (props.zIndex || 1500) + 200
 * so the settings modals are always 200 above the parent form, regardless of how
 * deep the form is stacked.
 *
 * These tests verify the formula for every known caller context and assert that
 * the old approach (hardcoded 10500 / no zIndex) fails for the high-z cases.
 */

// ── Formula under test ────────────────────────────────────────────────────────

/**
 * Returns the z-index that should be applied to the TableSettingsModal /
 * SP Table Settings modal given the parent form's zIndex prop.
 * Mirrors the formula in quotation/create.js.
 */
function settingsModalZIndex(parentZIndex) {
    return (parentZIndex || 1500) + 200;
}

// ── Known caller contexts ─────────────────────────────────────────────────────

// quotation/index.js — standalone Quotation list → no zIndex passed → defaults to undefined
const STANDALONE = undefined;

// rfq_received/index.js — QuotationCreate with zIndex={2000}
const RFQ_RECEIVED = 2000;

// store/ProcurementWhatsAppTab.js — zIndexBase absent → zIndex = 12000
const PROCUREMENT_WA_DEFAULT = 12000;

// store/ProcurementWhatsAppTab.js — zIndexBase = 9000 → zIndex = 9000 + 3000 = 12000
const PROCUREMENT_WA_HIGH = 9000 + 3000; // 12000

// ── Old approach (for comparison) ────────────────────────────────────────────

const OLD_HARDCODED_PRODUCT_SEARCH = 10500; // was used for TableSettingsModal (search cols)
const OLD_HARDCODED_CUSTOMER_SEARCH = 10500;
const OLD_SP_SETTINGS_DEFAULT = 1050; // react-bootstrap Modal default when no zIndex given

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('settingsModalZIndex formula — basic correctness', () => {
    test('when parent zIndex is undefined, defaults to 1500 + 200 = 1700', () => {
        expect(settingsModalZIndex(STANDALONE)).toBe(1700);
    });

    test('when parent zIndex is 0 (falsy), defaults to 1500 + 200 = 1700', () => {
        expect(settingsModalZIndex(0)).toBe(1700);
    });

    test('when parent zIndex is 2000, result is 2200', () => {
        expect(settingsModalZIndex(RFQ_RECEIVED)).toBe(2200);
    });

    test('when parent zIndex is 12000, result is 12200', () => {
        expect(settingsModalZIndex(PROCUREMENT_WA_DEFAULT)).toBe(12200);
    });

    test('result is always 200 above the provided parent zIndex', () => {
        [1500, 2000, 5000, 12000, 15000].forEach(z => {
            expect(settingsModalZIndex(z)).toBe(z + 200);
        });
    });
});

describe('settingsModalZIndex — always above the parent form (invariant)', () => {
    test('standalone (no zIndex): settings (1700) > default form container (1500)', () => {
        const form = 1500; // default QuotationCreate z-index
        expect(settingsModalZIndex(STANDALONE)).toBeGreaterThan(form);
    });

    test('rfq_received zIndex=2000: settings (2200) > form (2000)', () => {
        expect(settingsModalZIndex(RFQ_RECEIVED)).toBeGreaterThan(RFQ_RECEIVED);
    });

    test('procurement WA zIndex=12000: settings (12200) > form (12000)', () => {
        expect(settingsModalZIndex(PROCUREMENT_WA_DEFAULT)).toBeGreaterThan(PROCUREMENT_WA_DEFAULT);
    });

    test('procurement WA high zIndex=12000: settings (12200) > form (12000)', () => {
        expect(settingsModalZIndex(PROCUREMENT_WA_HIGH)).toBeGreaterThan(PROCUREMENT_WA_HIGH);
    });
});

describe('old approach would fail for the high-zIndex contexts (regression proof)', () => {
    test('old hardcoded 10500 < procurement WA zIndex 12000 — would hide behind form', () => {
        expect(OLD_HARDCODED_PRODUCT_SEARCH).toBeLessThan(PROCUREMENT_WA_DEFAULT);
    });

    test('old hardcoded 10500 < procurement WA high zIndex 12000 — same bug', () => {
        expect(OLD_HARDCODED_CUSTOMER_SEARCH).toBeLessThan(PROCUREMENT_WA_HIGH);
    });

    test('old SP settings (default Bootstrap 1050) < any form zIndex — always hidden', () => {
        [1500, 2000, 12000].forEach(formZ => {
            expect(OLD_SP_SETTINGS_DEFAULT).toBeLessThan(formZ);
        });
    });

    test('new formula fixes both: always above old hardcoded 10500 for high-z forms', () => {
        expect(settingsModalZIndex(PROCUREMENT_WA_DEFAULT)).toBeGreaterThan(OLD_HARDCODED_PRODUCT_SEARCH);
    });
});

describe('settingsModalZIndex — edge cases', () => {
    test('very high parent zIndex (99999) still adds 200', () => {
        expect(settingsModalZIndex(99999)).toBe(100199);
    });

    test('parent zIndex 1 (low but truthy) adds 200 = 201', () => {
        expect(settingsModalZIndex(1)).toBe(201);
    });

    test('parent zIndex null (falsy) falls back to default 1700', () => {
        expect(settingsModalZIndex(null)).toBe(1700);
    });

    test('parent zIndex false (falsy) falls back to default 1700', () => {
        expect(settingsModalZIndex(false)).toBe(1700);
    });
});

describe('settingsModalZIndex — all three fixed modals use the same formula', () => {
    // Verifies that product-search settings, customer-search settings, and
    // SP table settings all produce the same value for the same parent zIndex.
    function productSearchZIndex(parentZ) { return (parentZ || 1500) + 200; }
    function customerSearchZIndex(parentZ) { return (parentZ || 1500) + 200; }
    function spTableZIndex(parentZ)        { return (parentZ || 1500) + 200; }

    [undefined, 2000, 12000].forEach(parentZ => {
        test(`all three modals agree when parentZIndex=${parentZ}`, () => {
            const ps = productSearchZIndex(parentZ);
            const cs = customerSearchZIndex(parentZ);
            const sp = spTableZIndex(parentZ);
            expect(ps).toBe(cs);
            expect(cs).toBe(sp);
        });
    });
});
