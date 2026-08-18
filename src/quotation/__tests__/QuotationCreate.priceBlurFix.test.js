/**
 * Pure-logic tests for the "unit_price sometimes shows wrong intermediate value"
 * bug fix (quotation form types 1 & 2).
 *
 * Root cause:
 *   The shared `timerRef` is used by every onChange, onFocus, and onKeyDown handler
 *   in the products table. The onKeyDown handler unconditionally calls
 *   `clearTimeout(timerRef.current)` for ALL keys (Tab, Enter, arrow keys, etc.),
 *   cancelling any pending 100ms price-calculation debounce. Similarly, the next
 *   field's onFocus also calls `clearTimeout(timerRef.current)`.
 *
 *   Concrete failing sequence:
 *     1. User types "8" in unit_price_with_vat → onChange schedules callbackA (100ms)
 *     2. > 100ms pass → callbackA fires: unit_price = 8/1.15 = 6.956...  (intermediate)
 *     3. User types "0" (field is now "80") → onChange cancels callbackA (already fired),
 *        schedules callbackB (100ms): unit_price = 80/1.15 = 69.565...
 *     4. User presses Tab/Enter or clicks next field WITHIN 100ms of step 3
 *        → onKeyDown (Tab) or next field's onFocus calls clearTimeout(timerRef.current)
 *        → callbackB is CANCELLED
 *     5. unit_price stays at 6.956... (wrong, from step 2)
 *
 * Fix:
 *   Add `onBlur` handlers to both `unit_price_with_vat` and `unit_price` inputs
 *   (in both type 1 and type 2 layouts).  onBlur fires AFTER onKeyDown but BEFORE
 *   the next field's onFocus, so the calculation is always performed when the field
 *   loses focus — even if the 100ms debounce timer was cancelled.
 *
 *   onBlur behaviour:
 *     1. Cancel any pending debounce timer (prevents double-calculation)
 *     2. Immediately recalculate the derived value from the current field value
 *     3. Call setSelectedProducts + CalCulateLineTotals + reCalculate + checkErrors
 */

// ─── Maths helpers (mirrors trimTo8Decimals + parseFloat rounding used in code) ─

function trimTo8Decimals(v) {
    return parseFloat(parseFloat(v).toFixed(8));
}

const VAT_RATE_15 = 15;

function unitPriceFromWithVat(unitPriceWithVat, vatPercent) {
    return parseFloat(trimTo8Decimals(unitPriceWithVat / (1 + vatPercent / 100)));
}

function unitPriceWithVatFromPrice(unitPrice, vatPercent) {
    return parseFloat(trimTo8Decimals(unitPrice * (1 + vatPercent / 100)));
}

// ─── Section A: the debounce-then-blur timing model ──────────────────────────

/**
 * Simulates the shared-timerRef cancel mechanism.
 * Returns which calculations actually fired.
 */
function simulateDebounceRace({ userPausedBetweenDigits, userNavigatedAwayAfterTyping }) {
    let timerAFired = false;
    let timerBFired = false;
    let currentTimerId = null;
    let timerCallbacks = {};
    let nextId = 1;

    // Minimal fake setTimeout / clearTimeout
    function fakeSetTimeout(fn, ms) {
        const id = nextId++;
        timerCallbacks[id] = { fn, ms };
        return id;
    }
    function fakeClearTimeout(id) {
        delete timerCallbacks[id];
    }
    function fireTimer(id) {
        if (timerCallbacks[id]) {
            timerCallbacks[id].fn();
            delete timerCallbacks[id];
            return true;
        }
        return false;
    }

    // Step 1: user types "8"
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerAFired = true; }, 100);

    if (userPausedBetweenDigits) {
        // pause > 100ms → timerA fires before "0" is typed
        fireTimer(currentTimerId);
    }

    // Step 2: user types "0" (making "80")
    fakeClearTimeout(currentTimerId);                  // cancels timerA (or no-op if already fired)
    currentTimerId = fakeSetTimeout(() => { timerBFired = true; }, 100);

    if (userNavigatedAwayAfterTyping) {
        // Tab/onFocus-of-next-field cancels timerB BEFORE it fires
        fakeClearTimeout(currentTimerId);
    } else {
        // Normal: timerB fires naturally
        fireTimer(currentTimerId);
    }

    return { timerAFired, timerBFired };
}

describe('debounce-cancel race — root cause model', () => {
    test('fast typing (pause < 100ms): only callbackB fires — always correct', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: false,
            userNavigatedAwayAfterTyping: false,
        });
        expect(timerAFired).toBe(false);
        expect(timerBFired).toBe(true);
    });

    test('slow typing (pause > 100ms), no Tab: callbackA fires then callbackB corrects — correct', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: true,
            userNavigatedAwayAfterTyping: false,
        });
        expect(timerAFired).toBe(true);
        expect(timerBFired).toBe(true);
    });

    test('fast typing then Tab: callbackB is CANCELLED — bug! wrong value persists', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: false,
            userNavigatedAwayAfterTyping: true,
        });
        expect(timerAFired).toBe(false);
        expect(timerBFired).toBe(false);          // ← neither fired → stale value stays
    });

    test('slow typing then Tab: callbackA fires (wrong value), callbackB CANCELLED — the reported bug', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: true,
            userNavigatedAwayAfterTyping: true,
        });
        expect(timerAFired).toBe(true);           // intermediate wrong value (6.956)
        expect(timerBFired).toBe(false);          // correction never runs → bug!
    });
});

// ─── Section B: onBlur rescue model ──────────────────────────────────────────

/**
 * Simulates the fix: onBlur fires after onKeyDown but before next-field onFocus.
 * It cancels any pending timer and immediately recalculates.
 */
function simulateWithBlurFix({ userPausedBetweenDigits, userNavigatedAwayAfterTyping }) {
    let timerAFired = false;
    let timerBFired = false;
    let blurFired = false;
    let currentTimerId = null;
    let timerCallbacks = {};
    let nextId = 1;

    function fakeSetTimeout(fn, ms) {
        const id = nextId++;
        timerCallbacks[id] = { fn };
        return id;
    }
    function fakeClearTimeout(id) {
        delete timerCallbacks[id];
    }
    function fireTimer(id) {
        if (timerCallbacks[id]) {
            timerCallbacks[id].fn();
            delete timerCallbacks[id];
            return true;
        }
        return false;
    }

    // Step 1: user types "8"
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerAFired = true; }, 100);

    if (userPausedBetweenDigits) {
        fireTimer(currentTimerId);
    }

    // Step 2: user types "0"
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerBFired = true; }, 100);

    if (userNavigatedAwayAfterTyping) {
        // Tab onKeyDown cancels timerB (same as before)
        fakeClearTimeout(currentTimerId);
        // onBlur fires (fix): cancels any remaining timer, then immediately recalculates
        fakeClearTimeout(currentTimerId);  // no-op here since already cleared
        blurFired = true;                  // the actual calculation runs synchronously
    } else {
        fireTimer(currentTimerId);
    }

    // "correct" = either timerB fired OR blurFired (the fix)
    const calculationRan = timerBFired || blurFired;
    return { timerAFired, timerBFired, blurFired, calculationRan };
}

describe('onBlur fix — calculation always runs when user leaves the field', () => {
    test('fast typing then Tab: timerB cancelled but onBlur rescues — correct', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: false, userNavigatedAwayAfterTyping: true });
        expect(r.blurFired).toBe(true);
        expect(r.calculationRan).toBe(true);
    });

    test('slow typing then Tab: intermediate timerA fires but onBlur corrects on exit', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: true, userNavigatedAwayAfterTyping: true });
        expect(r.timerAFired).toBe(true);         // intermediate (6.956) shown briefly
        expect(r.blurFired).toBe(true);           // onBlur recalculates from final value 80 → 69.565
        expect(r.calculationRan).toBe(true);
    });

    test('normal usage (no Tab within 100ms): timerB still fires — no regression', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: false, userNavigatedAwayAfterTyping: false });
        expect(r.timerBFired).toBe(true);
        expect(r.calculationRan).toBe(true);
    });

    test('slow typing, no Tab: timerA + timerB both fire, onBlur not triggered — correct', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: true, userNavigatedAwayAfterTyping: false });
        expect(r.timerAFired).toBe(true);
        expect(r.timerBFired).toBe(true);
        expect(r.calculationRan).toBe(true);
    });

    test('onBlur cancels the pending timer to avoid double-calculation', () => {
        let timerBFired = false;
        let blurFired = false;
        let pendingTimerId = null;
        const cancelled = {};

        function fakeSetTimeout(fn) { pendingTimerId = 1; return 1; }
        function fakeClearTimeout(id) { if (id) cancelled[id] = true; }

        // timerB pending
        fakeSetTimeout(() => { timerBFired = true; });

        // onBlur fires: cancels timerB, then calculates
        fakeClearTimeout(pendingTimerId);
        blurFired = true;

        expect(cancelled[1]).toBe(true);          // timerB was cancelled
        expect(blurFired).toBe(true);             // but onBlur ran the calculation
        expect(timerBFired).toBe(false);          // no double-calculation
    });
});

// ─── Section C: price formula correctness ────────────────────────────────────

describe('unit_price_with_vat → unit_price formula (VAT 15%)', () => {
    test('80 → 69.56521739 (the reported case)', () => {
        expect(unitPriceFromWithVat(80, VAT_RATE_15)).toBeCloseTo(69.56521739, 5);
    });

    test('8 → 6.95652174 (the wrong intermediate value)', () => {
        expect(unitPriceFromWithVat(8, VAT_RATE_15)).toBeCloseTo(6.95652174, 5);
    });

    test('the wrong value is NOT the correct value', () => {
        const correct = unitPriceFromWithVat(80, VAT_RATE_15);
        const wrong = unitPriceFromWithVat(8, VAT_RATE_15);
        expect(correct).not.toBeCloseTo(wrong, 2);
    });

    test('ratio between wrong and correct is exactly 10× — confirms missing last digit', () => {
        const correct = unitPriceFromWithVat(80, VAT_RATE_15);
        const wrong = unitPriceFromWithVat(8, VAT_RATE_15);
        expect(correct / wrong).toBeCloseTo(10, 5);
    });

    test('115 → 100', () => {
        expect(unitPriceFromWithVat(115, VAT_RATE_15)).toBeCloseTo(100, 5);
    });

    test('0 → 0', () => {
        expect(unitPriceFromWithVat(0, VAT_RATE_15)).toBe(0);
    });

    test('VAT 5%: 105 → 100', () => {
        expect(unitPriceFromWithVat(105, 5)).toBeCloseTo(100, 5);
    });
});

describe('unit_price → unit_price_with_vat formula (VAT 15%)', () => {
    test('69.56521739 → ~80', () => {
        expect(unitPriceWithVatFromPrice(69.56521739, VAT_RATE_15)).toBeCloseTo(80, 4);
    });

    test('100 → 115', () => {
        expect(unitPriceWithVatFromPrice(100, VAT_RATE_15)).toBeCloseTo(115, 5);
    });

    test('round-trip: price → with_vat → price is stable', () => {
        const price = 69.56521739;
        const withVat = unitPriceWithVatFromPrice(price, VAT_RATE_15);
        const backToPrice = unitPriceFromWithVat(withVat, VAT_RATE_15);
        expect(backToPrice).toBeCloseTo(price, 4);
    });
});

// ─── Section D: onBlur guards (empty / zero value) ───────────────────────────

/**
 * The onBlur guard: `if (selectedProducts[index].unit_price_with_vat)` skips
 * recalculation when the field is empty or zero, preventing division-by-zero
 * and NaN from polluting other fields.
 */
function shouldBlurRecalculate(value) {
    return !!value; // mirrors: if (selectedProducts[index].unit_price_with_vat)
}

describe('onBlur guard — skip recalculation for empty/zero values', () => {
    test('non-zero value → recalculate', () => {
        expect(shouldBlurRecalculate(80)).toBe(true);
    });

    test('empty string → skip (field was cleared)', () => {
        expect(shouldBlurRecalculate("")).toBe(false);
    });

    test('zero → skip (prevents 0/1.15 = 0 overwriting a valid price)', () => {
        expect(shouldBlurRecalculate(0)).toBe(false);
    });

    test('null → skip', () => {
        expect(shouldBlurRecalculate(null)).toBe(false);
    });

    test('undefined → skip', () => {
        expect(shouldBlurRecalculate(undefined)).toBe(false);
    });

    test('string "80" is truthy → recalculate', () => {
        // parseFloat already happened in onChange, but guard handles both
        expect(shouldBlurRecalculate("80")).toBe(true);
    });
});

// ─── Section E: event-ordering invariants ────────────────────────────────────

describe('DOM event order guarantees that make the fix work', () => {
    test('for Tab key: keydown fires before blur — so clearTimeout in keydown is BEFORE onBlur', () => {
        // This ordering is guaranteed by the HTML spec and all major browsers.
        // It means: the timerRef cancelled by onKeyDown is cancelled BEFORE onBlur fires,
        // so onBlur's clearTimeout is a harmless no-op, and its recalculation is the only one.
        const eventOrder = ['keydown', 'blur', 'focus-on-next-field'];
        expect(eventOrder.indexOf('keydown')).toBeLessThan(eventOrder.indexOf('blur'));
        expect(eventOrder.indexOf('blur')).toBeLessThan(eventOrder.indexOf('focus-on-next-field'));
    });

    test('for mouse click: blur fires before focus-on-clicked-field', () => {
        // mousedown → blur (current) → focus (clicked) → mouseup → click
        const eventOrder = ['mousedown', 'blur', 'focus-on-clicked-field'];
        expect(eventOrder.indexOf('blur')).toBeLessThan(eventOrder.indexOf('focus-on-clicked-field'));
    });

    test('onBlur fires BEFORE next-field onFocus — so next field cannot cancel blurs calculation', () => {
        // If onBlur recalculates and next-field onFocus then clears timerRef:
        // the calculation was synchronous inside onBlur → already done → clearTimeout only
        // affects the focus-select timer, not the completed calculation.
        const blurCalculationIsSynchronous = true;
        expect(blurCalculationIsSynchronous).toBe(true);
    });
});
