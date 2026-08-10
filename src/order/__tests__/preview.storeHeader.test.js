/**
 * Unit tests for the storeHeader toggle fix in order/preview.js.
 *
 * Bug: Two onChange handlers for "Show Store Header" did:
 *   fontSizes[key].visible = !fontSizes[key]?.visible;
 * This crashes with "Cannot set properties of undefined" when fontSizes[key]
 * is undefined (key missing from localStorage or first-ever toggle).
 *
 * Fix:
 *   fontSizes[key] = { ...(fontSizes[key] || {}), visible: !fontSizes[key]?.visible };
 * Creates the object if absent, preserves other props, and sets visible correctly.
 */

// ── Mirror of the toggle logic from preview.js ────────────────────────────────

/**
 * Mirrors the FIXED onChange handler:
 *   fontSizes[key] = { ...(fontSizes[key] || {}), visible: !fontSizes[key]?.visible };
 */
function applyToggle(fontSizes, key) {
    fontSizes[key] = { ...(fontSizes[key] || {}), visible: !fontSizes[key]?.visible };
    return fontSizes;
}

/**
 * OLD (buggy) version — crashes when fontSizes[key] is undefined.
 * Used to prove the old behavior was broken.
 */
function applyToggleBuggy(fontSizes, key) {
    fontSizes[key].visible = !fontSizes[key]?.visible;
    return fontSizes;
}

// ── 1. Crash scenario — proves the bug existed ────────────────────────────────

describe('storeHeader toggle — OLD code crashes when key is missing', () => {
    test('applyToggleBuggy throws TypeError when key is undefined', () => {
        const fontSizes = {};
        expect(() => applyToggleBuggy(fontSizes, 'sales_storeHeader')).toThrow(TypeError);
    });

    test('applyToggleBuggy throws when key exists but is null', () => {
        const fontSizes = { sales_storeHeader: null };
        expect(() => applyToggleBuggy(fontSizes, 'sales_storeHeader')).toThrow(TypeError);
    });
});

// ── 2. Fixed toggle — key absent (fresh install / never saved) ────────────────

describe('storeHeader toggle — fixed: key absent → created as { visible: true }', () => {
    test('does NOT throw when key is missing', () => {
        const fontSizes = {};
        expect(() => applyToggle(fontSizes, 'sales_storeHeader')).not.toThrow();
    });

    test('creates key with visible=true (since !undefined === true)', () => {
        const fontSizes = {};
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader']).toEqual({ visible: true });
    });

    test('does NOT throw when fontSizes itself is empty object', () => {
        const fontSizes = {};
        expect(() => applyToggle(fontSizes, 'purchase_storeHeader')).not.toThrow();
        expect(fontSizes['purchase_storeHeader'].visible).toBe(true);
    });

    test('works for all model names without throwing', () => {
        const models = [
            'sales', 'purchase', 'quotation', 'sales_return',
            'quotation_sales_return', 'delivery_note',
        ];
        const fontSizes = {};
        for (const m of models) {
            expect(() => applyToggle(fontSizes, m + '_storeHeader')).not.toThrow();
            expect(fontSizes[m + '_storeHeader'].visible).toBe(true);
        }
    });
});

// ── 3. Fixed toggle — key present with visible=true → toggles to false ────────

describe('storeHeader toggle — key exists, visible=true → becomes false', () => {
    test('visible true → false after one toggle', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
    });

    test('returns an object (not undefined or null)', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(typeof fontSizes['sales_storeHeader']).toBe('object');
        expect(fontSizes['sales_storeHeader']).not.toBeNull();
    });
});

// ── 4. Fixed toggle — key present with visible=false → toggles to true ────────

describe('storeHeader toggle — key exists, visible=false → becomes true', () => {
    test('visible false → true after one toggle', () => {
        const fontSizes = { sales_storeHeader: { visible: false } };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(true);
    });
});

// ── 5. Double toggle returns to original state ────────────────────────────────

describe('storeHeader toggle — double toggle restores original state', () => {
    test('undefined → true → false (two toggles)', () => {
        const fontSizes = {};
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(true);
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
    });

    test('true → false → true (two toggles)', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(true);
    });

    test('false → true → false (two toggles)', () => {
        const fontSizes = { sales_storeHeader: { visible: false } };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(true);
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
    });
});

// ── 6. Spread preserves other properties on the existing object ───────────────

describe('storeHeader toggle — spread preserves other properties', () => {
    test('existing extra props on the object are preserved', () => {
        const fontSizes = {
            sales_storeHeader: { visible: true, someOtherProp: 'preserved', count: 42 },
        };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].someOtherProp).toBe('preserved');
        expect(fontSizes['sales_storeHeader'].count).toBe(42);
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
    });

    test('toggle on absent key creates minimal { visible: true } with no extra props', () => {
        const fontSizes = {};
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(Object.keys(fontSizes['sales_storeHeader'])).toEqual(['visible']);
    });
});

// ── 7. Other model keys are not affected by the toggle ────────────────────────

describe('storeHeader toggle — only the targeted key changes', () => {
    test('toggling "sales_storeHeader" does not touch "purchase_storeHeader"', () => {
        const fontSizes = {
            sales_storeHeader: { visible: true },
            purchase_storeHeader: { visible: true },
        };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeHeader'].visible).toBe(false);
        expect(fontSizes['purchase_storeHeader'].visible).toBe(true); // unchanged
    });

    test('toggling "sales_storeHeader" does not affect other font size keys', () => {
        const fontSizes = {
            sales_storeHeader: { visible: true },
            sales_storeName: { value: 3.5, unit: 'mm', size: '3.5mm', step: 0.1 },
            sales_printPageSize: 11,
        };
        applyToggle(fontSizes, 'sales_storeHeader');
        expect(fontSizes['sales_storeName']).toEqual({ value: 3.5, unit: 'mm', size: '3.5mm', step: 0.1 });
        expect(fontSizes['sales_printPageSize']).toBe(11);
    });
});

// ── 8. invoiceBackground + storeHeader visibility logic ──────────────────────

describe('invoiceBackground conditional — storeHeader.visible gate', () => {
    // Mirrors the condition in previewContent.js:
    //   props.invoiceBackground && props.fontSizes[props.modelName + "_storeHeader"]?.visible

    function shouldShowBackground(invoiceBackground, fontSizes, modelName) {
        return !!(invoiceBackground && fontSizes[modelName + '_storeHeader']?.visible);
    }

    test('shows background when invoiceBackground set AND storeHeader.visible=true', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(true);
    });

    test('hides background when invoiceBackground set but storeHeader.visible=false', () => {
        const fontSizes = { sales_storeHeader: { visible: false } };
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(false);
    });

    test('hides background when invoiceBackground is empty string regardless of flag', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        expect(shouldShowBackground('', fontSizes, 'sales')).toBe(false);
    });

    test('hides background when invoiceBackground is null regardless of flag', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        expect(shouldShowBackground(null, fontSizes, 'sales')).toBe(false);
    });

    test('hides background when storeHeader key is absent (before any toggle)', () => {
        const fontSizes = {};
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(false);
    });

    test('shows background AFTER toggle fixes absent key to visible=true', () => {
        const fontSizes = {};
        // Before toggle: not shown
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(false);
        // Toggle fires:
        applyToggle(fontSizes, 'sales_storeHeader');
        // After toggle: shown
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(true);
    });

    test('purchase visible independently from sales', () => {
        const fontSizes = {
            sales_storeHeader: { visible: false },
            purchase_storeHeader: { visible: true },
        };
        expect(shouldShowBackground('background.jpg', fontSizes, 'sales')).toBe(false);
        expect(shouldShowBackground('background.jpg', fontSizes, 'purchase')).toBe(true);
    });
});

// ── 9. Text header conditional — inverse of background ───────────────────────

describe('text header conditional — shown when no background but storeHeader visible', () => {
    // Mirrors: props.fontSizes[props.modelName + "_storeHeader"]?.visible && !props.invoiceBackground

    function shouldShowTextHeader(invoiceBackground, fontSizes, modelName) {
        return !!(fontSizes[modelName + '_storeHeader']?.visible && !invoiceBackground);
    }

    test('shows text header when storeHeader.visible=true and no background', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        expect(shouldShowTextHeader('', fontSizes, 'sales')).toBe(true);
    });

    test('hides text header when background IS set (image shown instead)', () => {
        const fontSizes = { sales_storeHeader: { visible: true } };
        expect(shouldShowTextHeader('background.jpg', fontSizes, 'sales')).toBe(false);
    });

    test('hides text header when storeHeader.visible=false', () => {
        const fontSizes = { sales_storeHeader: { visible: false } };
        expect(shouldShowTextHeader('', fontSizes, 'sales')).toBe(false);
    });

    test('hides text header when storeHeader key is absent', () => {
        const fontSizes = {};
        expect(shouldShowTextHeader('', fontSizes, 'sales')).toBe(false);
    });
});

// ── 10. PRINT_DEFAULT_FONT_SIZES key name fix — correct keys for previewContent ─

describe('PRINT_DEFAULT_FONT_SIZES — correct key names (no "print" prefix)', () => {
    // Keys used by previewContent.js are WITHOUT "print" prefix.
    // Preview.js stores them as: modelName + "_" + key
    // previewContent.js looks for: modelName + "_storeHeader", "_font", "_qrCode", "_marginTop"

    const CORRECTED_KEYS = ['qrCode', 'font', 'marginTop', 'storeHeader'];
    const OLD_BUGGY_KEYS = ['printQrCode', 'printFont', 'printMarginTop', 'printStoreHeader'];
    const KEPT_PRINT_KEYS = ['printPageSize', 'printReportPageSize'];

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
    };

    test('has "storeHeader" key (not "printStoreHeader")', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['storeHeader']).toBeDefined();
        expect(PRINT_DEFAULT_FONT_SIZES['printStoreHeader']).toBeUndefined();
    });

    test('storeHeader default is { visible: true }', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['storeHeader']).toEqual({ visible: true });
    });

    test('has "font" key (not "printFont")', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['font']).toBeDefined();
        expect(PRINT_DEFAULT_FONT_SIZES['printFont']).toBeUndefined();
    });

    test('has "qrCode" key (not "printQrCode")', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['qrCode']).toBeDefined();
        expect(PRINT_DEFAULT_FONT_SIZES['printQrCode']).toBeUndefined();
    });

    test('has "marginTop" key (not "printMarginTop")', () => {
        expect(PRINT_DEFAULT_FONT_SIZES['marginTop']).toBeDefined();
        expect(PRINT_DEFAULT_FONT_SIZES['printMarginTop']).toBeUndefined();
    });

    test('corrected keys are present, old buggy keys are absent', () => {
        for (const key of CORRECTED_KEYS) {
            expect(PRINT_DEFAULT_FONT_SIZES[key]).toBeDefined();
        }
        for (const key of OLD_BUGGY_KEYS) {
            expect(PRINT_DEFAULT_FONT_SIZES[key]).toBeUndefined();
        }
    });

    test('"printPageSize" and "printReportPageSize" keep their print prefix (internal to print.js)', () => {
        for (const key of KEPT_PRINT_KEYS) {
            expect(PRINT_DEFAULT_FONT_SIZES[key]).toBeDefined();
        }
    });

    test('"sales_storeHeader" would match previewContent.js lookup after prefixing', () => {
        // buildInitialPrintFontSizes stores: modelName + "_" + key
        // previewContent.js looks for: modelName + "_storeHeader"
        // They now match since key === "storeHeader"
        const stored = {};
        stored['sales_' + 'storeHeader'] = PRINT_DEFAULT_FONT_SIZES['storeHeader'];
        expect(stored['sales_storeHeader']).toEqual({ visible: true });
    });
});
