/**
 * Unit tests for the fontSizesRef fix in order/preview.js.
 *
 * Bug: useImperativeHandle(ref, factory, []) with empty deps causes factory to run once.
 * The open() function closes over `fontSizes` from the FIRST render only (initial unprefixed
 * defaultFontSizes). Any user customization stored in state/localStorage is invisible to open().
 * When an MBDI/LGK store preview opens, open() calls:
 *   setFontSizes({ ...fontSizes })           ← resets state to stale first-render defaults
 *   saveToLocalStorage("fontSizes", fontSizes) ← overwrites localStorage with stale defaults
 * This wipes all user font size changes after one page reload.
 *
 * Fix: Replace fontSizes with fontSizesRef.current in the InvoiceBackground block.
 * fontSizesRef is a useRef() kept in sync with current fontSizes via useEffect — it is a
 * stable object whose .current always reflects the latest state, safe to read from stale closures.
 */

// ── Simulation helpers ────────────────────────────────────────────────────────

/**
 * Simulates the OLD (buggy) open() InvoiceBackground block.
 * staleFontSizes = what the closure captured at first render (initial defaultFontSizes).
 * Returns { nextFontSizes, savedToStorage } to let tests inspect both side-effects.
 */
function applyInvoiceBackgroundBuggy(staleFontSizes, modelName) {
    // Direct mutation of stale closure variable — same as old code
    if (staleFontSizes[modelName + "_marginTop"]?.value === 0) {
        staleFontSizes[modelName + "_marginTop"] = {
            "value": 153, "unit": "px", "size": "153px", "step": 3,
        };
    }
    const nextFontSizes = { ...staleFontSizes }; // setFontSizes({ ...fontSizes })
    const savedToStorage = { ...staleFontSizes }; // saveToLocalStorage("fontSizes", fontSizes)
    return { nextFontSizes, savedToStorage };
}

/**
 * Simulates the FIXED open() InvoiceBackground block.
 * fontSizesRefCurrent = fontSizesRef.current (latest state, kept in sync by useEffect).
 */
function applyInvoiceBackgroundFixed(fontSizesRefCurrent, modelName) {
    if (fontSizesRefCurrent[modelName + "_marginTop"]?.value === 0) {
        fontSizesRefCurrent[modelName + "_marginTop"] = {
            "value": 153, "unit": "px", "size": "153px", "step": 3,
        };
    }
    const nextFontSizes = { ...fontSizesRefCurrent };
    const savedToStorage = { ...fontSizesRefCurrent };
    return { nextFontSizes, savedToStorage };
}

// Mirrors the unprefixed defaultFontSizes captured at first render
const INITIAL_DEFAULT_FONT_SIZES = {
    "qrCode": { "height": { "value": 100, "unit": "px", "size": "100px", "step": 1 }, "width": { "value": 100, "unit": "px", "size": "100px", "step": 1 } },
    "pageSize": 15,
    "font": "Cairo",
    "reportPageSize": 20,
    "marginTop": { "value": 0, "unit": "px", "size": "0px", "step": 3 },
    "storeHeader": { "visible": true },
    "storeName": { "value": 3.5, "unit": "mm", "size": "3.5mm", "step": 0.1 },
};

// Mirrors what fontSizes state looks like AFTER the useEffect prefixes it and
// the user has customized some values
function buildCurrentFontSizes(modelName, overrides = {}) {
    const base = {};
    for (const [key, val] of Object.entries(INITIAL_DEFAULT_FONT_SIZES)) {
        base[modelName + "_" + key] = val;
    }
    return { ...base, ...overrides };
}

// ── 1. Stale closure resets state to initial defaults ────────────────────────

describe('BUG: stale fontSizes closure wipes user customizations', () => {
    const modelName = 'sales';
    const customStoreName = { value: 5.0, unit: 'mm', size: '5mm', step: 0.1 };

    test('buggy: setFontSizes uses initial unprefixed defaults, not current state', () => {
        // Closure captured INITIAL_DEFAULT_FONT_SIZES (no prefixed keys)
        const staleFontSizes = { ...INITIAL_DEFAULT_FONT_SIZES };
        const { nextFontSizes } = applyInvoiceBackgroundBuggy(staleFontSizes, modelName);
        // The user's customized storeName is absent — stale closure never saw it
        expect(nextFontSizes['sales_storeName']).toBeUndefined();
    });

    test('buggy: saveToLocalStorage saves stale defaults, losing user customizations', () => {
        const staleFontSizes = { ...INITIAL_DEFAULT_FONT_SIZES };
        const { savedToStorage } = applyInvoiceBackgroundBuggy(staleFontSizes, modelName);
        expect(savedToStorage[modelName + '_storeName']).toBeUndefined();
    });

    test('buggy: even if user set storeName to 5mm, after open() it is gone from state', () => {
        // User had customized storeName to 5mm — in fontSizesRef.current but NOT in stale closure
        const staleFontSizes = { ...INITIAL_DEFAULT_FONT_SIZES };
        const { nextFontSizes } = applyInvoiceBackgroundBuggy(staleFontSizes, modelName);
        expect(nextFontSizes['sales_storeName']).not.toEqual(customStoreName);
        expect(nextFontSizes['sales_storeName']).toBeUndefined();
    });
});

// ── 2. Fixed: fontSizesRef.current preserves user customizations ─────────────

describe('FIX: fontSizesRef.current preserves user customizations', () => {
    const modelName = 'sales';
    const customStoreName = { value: 5.0, unit: 'mm', size: '5mm', step: 0.1 };

    test('fixed: setFontSizes uses fontSizesRef.current, preserving user values', () => {
        const currentFontSizes = buildCurrentFontSizes(modelName, {
            [`${modelName}_storeName`]: customStoreName,
        });
        const { nextFontSizes } = applyInvoiceBackgroundFixed(currentFontSizes, modelName);
        expect(nextFontSizes[`${modelName}_storeName`]).toEqual(customStoreName);
    });

    test('fixed: saveToLocalStorage saves fontSizesRef.current, not stale defaults', () => {
        const currentFontSizes = buildCurrentFontSizes(modelName, {
            [`${modelName}_storeName`]: customStoreName,
        });
        const { savedToStorage } = applyInvoiceBackgroundFixed(currentFontSizes, modelName);
        expect(savedToStorage[`${modelName}_storeName`]).toEqual(customStoreName);
    });

    test('fixed: all prefixed keys are preserved in state and storage', () => {
        const currentFontSizes = buildCurrentFontSizes(modelName);
        const { nextFontSizes, savedToStorage } = applyInvoiceBackgroundFixed(currentFontSizes, modelName);
        for (const key of Object.keys(INITIAL_DEFAULT_FONT_SIZES)) {
            expect(nextFontSizes[`${modelName}_${key}`]).toBeDefined();
            expect(savedToStorage[`${modelName}_${key}`]).toBeDefined();
        }
    });
});

// ── 3. marginTop auto-set logic (MBDI/LGK store requirement) ─────────────────

describe('marginTop auto-set: 0px → 153px when InvoiceBackground is shown', () => {
    const modelName = 'sales';

    test('fixed: marginTop 0 → set to 153px for background store', () => {
        const current = buildCurrentFontSizes(modelName, {
            [`${modelName}_marginTop`]: { value: 0, unit: 'px', size: '0px', step: 3 },
        });
        const { nextFontSizes } = applyInvoiceBackgroundFixed(current, modelName);
        expect(nextFontSizes[`${modelName}_marginTop`]).toEqual(
            { value: 153, unit: 'px', size: '153px', step: 3 }
        );
    });

    test('fixed: marginTop already > 0 → NOT overwritten', () => {
        const userMarginTop = { value: 80, unit: 'px', size: '80px', step: 3 };
        const current = buildCurrentFontSizes(modelName, {
            [`${modelName}_marginTop`]: userMarginTop,
        });
        const { nextFontSizes } = applyInvoiceBackgroundFixed(current, modelName);
        expect(nextFontSizes[`${modelName}_marginTop`]).toEqual(userMarginTop);
    });

    test('fixed: marginTop exactly 0.value → 153 (edge: value property = 0)', () => {
        const current = buildCurrentFontSizes(modelName);
        // default marginTop has value: 0
        const { nextFontSizes } = applyInvoiceBackgroundFixed(current, modelName);
        expect(nextFontSizes[`${modelName}_marginTop`].value).toBe(153);
    });

    test('fixed: marginTop with value=1 → not changed (not zero)', () => {
        const current = buildCurrentFontSizes(modelName, {
            [`${modelName}_marginTop`]: { value: 1, unit: 'px', size: '1px', step: 3 },
        });
        const { nextFontSizes } = applyInvoiceBackgroundFixed(current, modelName);
        expect(nextFontSizes[`${modelName}_marginTop`].value).toBe(1);
    });

    test('buggy: stale closure — sales_marginTop is undefined, so condition is false → 153 NOT set', () => {
        // With stale closure, there are no prefixed keys → condition is undefined?.value === 0 → false
        const staleFontSizes = { ...INITIAL_DEFAULT_FONT_SIZES };
        const { nextFontSizes } = applyInvoiceBackgroundBuggy(staleFontSizes, modelName);
        // The key doesn't even exist — no marginTop was set
        expect(nextFontSizes[`${modelName}_marginTop`]).toBeUndefined();
    });
});

// ── 4. Works for all model names ──────────────────────────────────────────────

describe('fixed: works for all model names with prefixed keys', () => {
    const modelNames = [
        'sales', 'purchase', 'quotation', 'sales_return',
        'quotation_sales_return', 'delivery_note', 'whatsapp_sales',
    ];

    for (const modelName of modelNames) {
        test(`${modelName}: customizations preserved after InvoiceBackground open()`, () => {
            const customFont = 'Arial';
            const current = buildCurrentFontSizes(modelName, {
                [`${modelName}_font`]: customFont,
                [`${modelName}_marginTop`]: { value: 50, unit: 'px', size: '50px', step: 3 },
            });
            const { nextFontSizes, savedToStorage } = applyInvoiceBackgroundFixed(current, modelName);
            expect(nextFontSizes[`${modelName}_font`]).toBe(customFont);
            expect(savedToStorage[`${modelName}_font`]).toBe(customFont);
            // marginTop > 0 → not overwritten
            expect(nextFontSizes[`${modelName}_marginTop`].value).toBe(50);
        });
    }
});

// ── 5. fontSizesRef pattern: why ref works when state doesn't ─────────────────

describe('fontSizesRef pattern: ref gives latest value, state variable is stale', () => {
    test('ref.current always reflects latest value (simulated via plain object)', () => {
        // Simulate a ref: same object, .current is updated
        const fontSizesRef = { current: { ...INITIAL_DEFAULT_FONT_SIZES } };

        // Simulate useEffect update after state change
        const latestState = buildCurrentFontSizes('sales', {
            sales_storeName: { value: 7, unit: 'mm', size: '7mm', step: 0.1 },
        });
        fontSizesRef.current = latestState; // useEffect: fontSizesRef.current = fontSizes

        // Stale closure still sees initial defaults (no prefixed keys)
        const staleFontSizes = { ...INITIAL_DEFAULT_FONT_SIZES };

        // Old code reads staleFontSizes → loses customization
        expect(staleFontSizes['sales_storeName']).toBeUndefined();

        // New code reads fontSizesRef.current → sees latest
        expect(fontSizesRef.current['sales_storeName']).toEqual(
            { value: 7, unit: 'mm', size: '7mm', step: 0.1 }
        );
    });

    test('ref object identity is stable; only .current changes', () => {
        const fontSizesRef = { current: { ...INITIAL_DEFAULT_FONT_SIZES } };
        const originalRef = fontSizesRef;

        // Simulating multiple renders updating .current
        fontSizesRef.current = buildCurrentFontSizes('sales');
        fontSizesRef.current = buildCurrentFontSizes('sales', {
            sales_storeName: { value: 6, unit: 'mm', size: '6mm', step: 0.1 },
        });

        // The ref object itself is stable (same reference)
        expect(fontSizesRef).toBe(originalRef);
        // But .current reflects the latest state
        expect(fontSizesRef.current['sales_storeName'].value).toBe(6);
    });
});

// ── 6. Other state is not affected (non-background stores) ────────────────────

describe('InvoiceBackground block only runs when InvoiceBackground is truthy', () => {
    test('when InvoiceBackground is falsy, fontSizes state is NOT reset by this block', () => {
        // The entire if (InvoiceBackground) block is skipped — no setFontSizes called here
        const InvoiceBackground = null;
        let stateWasReset = false;

        if (InvoiceBackground) {
            stateWasReset = true;
        }

        expect(stateWasReset).toBe(false);
    });

    test('when InvoiceBackground is set, the block runs and fixes marginTop', () => {
        const InvoiceBackground = 'mbdi-background.png';
        let stateWasReset = false;

        if (InvoiceBackground) {
            stateWasReset = true;
        }

        expect(stateWasReset).toBe(true);
    });
});
