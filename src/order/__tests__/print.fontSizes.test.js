/**
 * Unit tests for buildInitialPrintFontSizes in order/print.js
 *
 * Changes covered:
 *   1. buildInitialPrintFontSizes() replaces `useState(defaultFontSizes)` + async useEffect:
 *      it reads localStorage and returns model-prefixed fontSizes synchronously.
 *   2. Old pattern: initial state was PRINT_DEFAULT_FONT_SIZES (unprefixed keys) so
 *      fontSizes["sales_storeName"] was undefined on first render.
 *   3. New pattern: buildInitialPrintFontSizes() prefixes ALL keys immediately so
 *      fontSizes["sales_storeName"] is populated from the very first render.
 *   4. Partial localStorage upgrade: missing keys for existing or new models
 *      (e.g. "non_vat_invoice", "non_vat_sales_return") are filled with defaults.
 */

// ── Mirror constants from print.js ────────────────────────────────────────────

// Mirrors PRINT_DEFAULT_FONT_SIZES from order/print.js (lines 15-43)
const PRINT_DEFAULT_FONT_SIZES = {
    "qrCode": {
        "height": { "value": 138, "unit": "px", "size": "138px", "step": 1 },
        "width": { "value": 138, "unit": "px", "size": "138px", "step": 1 },
    },
    "printPageSize": 11,
    "font": "Cairo",
    "printReportPageSize": 20,
    "marginTop": { "value": 0, "unit": "px", "size": "0px", "step": 3 },
    "storeHeader": { "visible": true },
    "storeName": { "value": 3.5, "unit": "mm", "size": "3.5mm", "step": 0.1 },
    "storeTitle": { "value": 2.8, "unit": "mm", "size": "3.8mm", "step": 0.1 },
    "storeCR": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "storeVAT": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "storeNameArabic": { "value": 3.5, "unit": "mm", "size": "3.5mm", "step": 0.1 },
    "storeTitleArabic": { "value": 2.8, "unit": "mm", "size": "3.8mm", "step": 0.1 },
    "storeCRArabic": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "storeVATArabic": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "invoiceTitle": { "value": 3, "unit": "mm", "size": "3mm", "step": 0.1 },
    "invoiceDetails": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "invoicePageCount": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "tableHead": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "tableBody": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "tableFooter": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "signature": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "footer": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "bankAccountHeader": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
    "bankAccountBody": { "value": 2.2, "unit": "mm", "size": "2.2mm", "step": 0.1 },
};

// Mirrors PRINT_MODEL_NAMES from order/print.js (lines 45-60)
const PRINT_MODEL_NAMES = [
    "sales", "whatsapp_sales",
    "sales_return", "whatsapp_sales_return",
    "purchase", "whatsapp_purchase",
    "purchase_return", "whatsapp_purchase_return",
    "quotation", "whatsapp_quotation",
    "quotation_sales_return", "whatsapp_quotation_sales_return",
    "delivery_note", "whatsapp_delivery_note",
    "customer_deposit", "whatsapp_customer_deposit",
    "customer_withdrawal", "whatsapp_customer_withdrawal",
    "balance_sheet", "whatsapp_balance_sheet",
    "stock_transfer", "whatsapp_stock_transfer",
    "purchase_order", "whatsapp_purchase_order",
    "purchase_request", "whatsapp_purchase_request",
    "non_vat_invoice", "non_vat_sales_return",
];

// Mirrors buildInitialPrintFontSizes from order/print.js (lines 62-76).
// Accepts storedData string instead of reading real localStorage — keeps tests pure.
function buildInitialPrintFontSizes(storedData) {
    let stored = {};
    try {
        if (storedData) stored = JSON.parse(storedData);
    } catch (_) {}
    for (const modelName of PRINT_MODEL_NAMES) {
        for (const key in PRINT_DEFAULT_FONT_SIZES) {
            if (!stored[modelName + "_" + key]) {
                stored[modelName + "_" + key] = PRINT_DEFAULT_FONT_SIZES[key];
            }
        }
    }
    return stored;
}

// ── 1. Empty localStorage (fresh install) ─────────────────────────────────────

describe('buildInitialPrintFontSizes — empty localStorage', () => {
    let result;
    beforeAll(() => { result = buildInitialPrintFontSizes(null); });

    test('returns an object (not null/undefined)', () => {
        expect(result).not.toBeNull();
        expect(typeof result).toBe('object');
    });

    test('returns ALL model-prefixed keys (model count × default key count)', () => {
        const expectedKeyCount = PRINT_MODEL_NAMES.length * Object.keys(PRINT_DEFAULT_FONT_SIZES).length;
        expect(Object.keys(result).length).toBe(expectedKeyCount);
    });

    test('"sales" model has correct default storeName (3.5mm)', () => {
        expect(result['sales_storeName']).toEqual(
            { value: 3.5, unit: 'mm', size: '3.5mm', step: 0.1 }
        );
    });

    test('"sales" model has correct printPageSize (11)', () => {
        expect(result['sales_printPageSize']).toBe(11);
    });

    test('"sales" model has correct font ("Cairo")', () => {
        expect(result['sales_font']).toBe('Cairo');
    });

    test('"quotation" model has default keys populated', () => {
        expect(result['quotation_storeName']).toBeDefined();
        expect(result['quotation_qrCode']).toBeDefined();
    });

    test('"non_vat_invoice" model has default keys populated (newly added model)', () => {
        expect(result['non_vat_invoice_storeName']).toBeDefined();
        expect(result['non_vat_invoice_qrCode']).toBeDefined();
    });

    test('"non_vat_sales_return" model has default keys populated (newly added model)', () => {
        expect(result['non_vat_sales_return_storeName']).toBeDefined();
        expect(result['non_vat_sales_return_qrCode']).toBeDefined();
    });

    test('ALL model names in PRINT_MODEL_NAMES have all default keys', () => {
        for (const modelName of PRINT_MODEL_NAMES) {
            for (const key of Object.keys(PRINT_DEFAULT_FONT_SIZES)) {
                expect(result[modelName + '_' + key]).toBeDefined();
            }
        }
    });
});

// ── 2. Partial localStorage (upgrade scenario) ────────────────────────────────

describe('buildInitialPrintFontSizes — partial localStorage (upgrade scenario)', () => {
    const customStoreName = { value: 4.0, unit: 'mm', size: '4mm', step: 0.1 };
    const customTableBody = { value: 2.8, unit: 'mm', size: '2.8mm', step: 0.1 };

    const partialData = JSON.stringify({
        sales_storeName: customStoreName,
        quotation_tableBody: customTableBody,
        // sales_qrCode is deliberately absent → should be filled with default
        // non_vat_invoice_* keys are absent → should be filled with defaults
    });

    let result;
    beforeAll(() => { result = buildInitialPrintFontSizes(partialData); });

    test('preserves existing "sales_storeName" (user\'s saved preference)', () => {
        expect(result['sales_storeName']).toEqual(customStoreName);
    });

    test('fills in "sales_qrCode" when missing from existing data', () => {
        expect(result['sales_qrCode']).toEqual(PRINT_DEFAULT_FONT_SIZES['qrCode']);
    });

    test('does NOT overwrite existing "quotation_tableBody"', () => {
        expect(result['quotation_tableBody']).toEqual(customTableBody);
    });

    test('adds "non_vat_invoice" keys when not in old saved data', () => {
        expect(result['non_vat_invoice_storeName']).toEqual(PRINT_DEFAULT_FONT_SIZES['storeName']);
        expect(result['non_vat_invoice_qrCode']).toEqual(PRINT_DEFAULT_FONT_SIZES['qrCode']);
    });
});

// ── 3. Full localStorage (normal return visit) ────────────────────────────────

describe('buildInitialPrintFontSizes — full localStorage (normal return visit)', () => {
    const customStoreName = { value: 4.0, unit: 'mm', size: '4mm', step: 0.1 };

    // Build a complete stored object and then override a couple of keys
    const base = buildInitialPrintFontSizes(null);
    base['sales_storeName'] = customStoreName;
    base['sales_printPageSize'] = 14;
    const fullData = JSON.stringify(base);

    let result;
    beforeAll(() => { result = buildInitialPrintFontSizes(fullData); });

    test('returns stored values unchanged', () => {
        expect(Object.keys(result).length).toBeGreaterThanOrEqual(
            PRINT_MODEL_NAMES.length * Object.keys(PRINT_DEFAULT_FONT_SIZES).length
        );
    });

    test('custom storeName "4mm" is preserved, not reset to default', () => {
        expect(result['sales_storeName']).toEqual(customStoreName);
        expect(result['sales_storeName'].size).toBe('4mm');
    });

    test('custom printPageSize 14 is preserved', () => {
        expect(result['sales_printPageSize']).toBe(14);
    });
});

// ── 4. Corrupted localStorage ─────────────────────────────────────────────────

describe('buildInitialPrintFontSizes — corrupted localStorage', () => {
    test('JSON parse error → falls back to all defaults (no throw)', () => {
        expect(() => buildInitialPrintFontSizes('not-valid-json{')).not.toThrow();
        const result = buildInitialPrintFontSizes('not-valid-json{');
        expect(result['sales_storeName']).toEqual(PRINT_DEFAULT_FONT_SIZES['storeName']);
    });

    test('null storedData → falls back to all defaults', () => {
        const result = buildInitialPrintFontSizes(null);
        expect(result['sales_storeName']).toEqual(PRINT_DEFAULT_FONT_SIZES['storeName']);
    });
});

// ── 5. buildInitialPrintFontSizes vs old useState(defaultFontSizes) — why fix works ──

describe('buildInitialPrintFontSizes vs old useState(defaultFontSizes) — why fix works', () => {
    // Old broken pattern:
    //   useState(defaultFontSizes) → initial state = PRINT_DEFAULT_FONT_SIZES (UNPREFIXED)
    //   fontSizes["sales_storeName"] === undefined on first render → PreviewContent
    //   passed undefined as font size → component could display default/fallback sizes
    //
    // New pattern:
    //   useState(buildInitialPrintFontSizes) → initial state has ALL prefixed keys
    //   fontSizes["sales_storeName"] is populated immediately (synchronously)

    test('PRINT_DEFAULT_FONT_SIZES has "storeName" key (unprefixed)', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['storeName']).toBeDefined();
    });

    test('PRINT_DEFAULT_FONT_SIZES does NOT have "sales_storeName" key (no prefix in defaults)', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['sales_storeName']).toBeUndefined();
    });

    test('buildInitialPrintFontSizes(null)["sales_storeName"] IS defined (fix works)', () => {
        const result = buildInitialPrintFontSizes(null);
        expect(result['sales_storeName']).toBeDefined();
    });

    test('old behavior: fontSizes["sales_storeName"] would be undefined (unprefixed defaults)', () => {
        // Simulates: const fontSizes = PRINT_DEFAULT_FONT_SIZES (old initial state)
        const fontSizes = PRINT_DEFAULT_FONT_SIZES;
        expect(fontSizes['sales_storeName']).toBeUndefined();
    });

    test('new behavior: fontSizes["sales_storeName"] equals default value for storeName', () => {
        const fontSizes = buildInitialPrintFontSizes(null);
        expect(fontSizes['sales_storeName']).toEqual(
            { value: 3.5, unit: 'mm', size: '3.5mm', step: 0.1 }
        );
    });
});

// ── 6. PRINT_DEFAULT_FONT_SIZES content ──────────────────────────────────────

describe('PRINT_DEFAULT_FONT_SIZES content', () => {
    test('has "printPageSize" key = 11', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['printPageSize']).toBe(11);
    });

    test('has "font" key = "Cairo"', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['font']).toBe('Cairo');
    });

    test('"qrCode" has both width and height sub-keys', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['qrCode']['width']).toBeDefined();
        expect(PRINT_DEFAULT_FONT_SIZES['qrCode']['height']).toBeDefined();
    });

    test('"qrCode.width.size" = "138px"', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['qrCode']['width']['size']).toBe('138px');
    });

    test('"storeName.size" = "3.5mm"', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['storeName']['size']).toBe('3.5mm');
    });
});

// ── 7. PRINT_MODEL_NAMES completeness ────────────────────────────────────────

describe('PRINT_MODEL_NAMES completeness', () => {
    test('includes "sales"', () => {
        expect(PRINT_MODEL_NAMES).toContain('sales');
    });

    test('includes "non_vat_invoice" (newly added model)', () => {
        expect(PRINT_MODEL_NAMES).toContain('non_vat_invoice');
    });

    test('includes "non_vat_sales_return" (newly added model)', () => {
        expect(PRINT_MODEL_NAMES).toContain('non_vat_sales_return');
    });

    test('has no duplicate model names', () => {
        const unique = [...new Set(PRINT_MODEL_NAMES)];
        expect(unique.length).toBe(PRINT_MODEL_NAMES.length);
    });

    test('every entry is a non-empty string', () => {
        for (const name of PRINT_MODEL_NAMES) {
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        }
    });
});
