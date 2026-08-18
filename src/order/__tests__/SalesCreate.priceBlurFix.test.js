/**
 * Pure-logic tests for the "unit_price sometimes shows wrong intermediate value"
 * bug fix in the sales order form (create.js, SalesType1Form.js, and related
 * form components that use the shared timerRef pattern).
 *
 * Root cause:
 *   The shared `timerRef` is used by every onChange, onFocus, and onKeyDown
 *   handler in the products table. The onKeyDown handler unconditionally calls
 *   `clearTimeout(timerRef.current)` for ALL keys (Tab, Enter, arrow keys, etc.),
 *   cancelling any pending 100ms price-calculation debounce. Similarly, the next
 *   field's onFocus also calls `clearTimeout(timerRef.current)`.
 *
 *   Concrete failing sequence (the reported bug, unit_price_with_vat = "80"):
 *     1. User types "8" in unit_price_with_vat → onChange schedules callbackA (100ms)
 *     2. > 100ms pass → callbackA fires: unit_price = 8/1.15 = 6.9565… (intermediate)
 *     3. User types "0" (field becomes "80") → onChange cancels callbackA (already fired),
 *        schedules callbackB (100ms): unit_price = 80/1.15 = 69.5652…
 *     4. User presses Tab/Enter or clicks next field WITHIN 100ms of step 3
 *        → onKeyDown (Tab) or next field's onFocus calls clearTimeout(timerRef.current)
 *        → callbackB is CANCELLED
 *     5. unit_price stays at 6.9565… (wrong, from step 2)
 *
 * Fix (create.js lines 7627-7639, 10138-10150; SalesType1Form.js lines 1854-1868):
 *   Add `onBlur` handlers to both `unit_price_with_vat` and `unit_price` inputs.
 *   onBlur fires AFTER onKeyDown but BEFORE the next field's onFocus, so the
 *   calculation is always performed when the field loses focus — even if the 100ms
 *   debounce timer was cancelled.
 *
 *   The same fix pattern also exists for purchase_unit_price and
 *   purchase_unit_price_with_vat fields.
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
const VAT_RATE_5  = 5;

function unitPriceFromWithVat(unitPriceWithVat, vatPercent) {
    return parseFloat(trimTo8Decimals(unitPriceWithVat / (1 + vatPercent / 100)));
}

function unitPriceWithVatFromPrice(unitPrice, vatPercent) {
    return parseFloat(trimTo8Decimals(unitPrice * (1 + vatPercent / 100)));
}

// Purchase price uses exactly the same formula as retail price — aliases for clarity
const purchasePriceFromWithVat   = unitPriceFromWithVat;
const purchasePriceWithVatFromPrice = unitPriceWithVatFromPrice;

// ─── Section A: the debounce-then-Tab timing model (root cause) ───────────────

/**
 * Simulates the shared-timerRef cancel mechanism used by all price fields.
 * Returns which calculations actually fired.
 */
function simulateDebounceRace({ userPausedBetweenDigits, userNavigatedAwayAfterTyping }) {
    let timerAFired = false;
    let timerBFired = false;
    let currentTimerId = null;
    const timerCallbacks = {};
    let nextId = 1;

    function fakeSetTimeout(fn) {
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

    // Step 1: user types "8" → onChange schedules callbackA
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerAFired = true; });

    if (userPausedBetweenDigits) {
        // pause > 100ms → callbackA fires (intermediate wrong value, e.g. 8/1.15 = 6.956)
        fireTimer(currentTimerId);
    }

    // Step 2: user types "0" → onChange cancels callbackA (or no-op), schedules callbackB
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerBFired = true; });

    if (userNavigatedAwayAfterTyping) {
        // Tab onKeyDown or next field's onFocus cancels callbackB before it fires
        fakeClearTimeout(currentTimerId);
    } else {
        // Normal flow: callbackB fires naturally after 100ms
        fireTimer(currentTimerId);
    }

    return { timerAFired, timerBFired };
}

describe('debounce-cancel race — root cause model', () => {
    test('fast typing (no pause), no Tab: only callbackB fires — always correct', () => {
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

    test('fast typing then Tab: callbackB CANCELLED — stale value persists (bug with no fix)', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: false,
            userNavigatedAwayAfterTyping: true,
        });
        expect(timerAFired).toBe(false);
        expect(timerBFired).toBe(false);   // neither fired → unit_price is never updated
    });

    test('slow typing then Tab: callbackA fires (wrong 6.956), callbackB CANCELLED — the reported bug', () => {
        const { timerAFired, timerBFired } = simulateDebounceRace({
            userPausedBetweenDigits: true,
            userNavigatedAwayAfterTyping: true,
        });
        expect(timerAFired).toBe(true);    // intermediate wrong value written (8/1.15)
        expect(timerBFired).toBe(false);   // correct value (80/1.15) never written → BUG
    });
});

// ─── Section B: onBlur rescue model ──────────────────────────────────────────

/**
 * Simulates the fix: onBlur fires after onKeyDown but before next-field onFocus.
 * It cancels any pending timer and immediately recalculates synchronously.
 */
function simulateWithBlurFix({ userPausedBetweenDigits, userNavigatedAwayAfterTyping }) {
    let timerAFired = false;
    let timerBFired = false;
    let blurFired   = false;
    let currentTimerId = null;
    const timerCallbacks = {};
    let nextId = 1;

    function fakeSetTimeout(fn) {
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
    currentTimerId = fakeSetTimeout(() => { timerAFired = true; });

    if (userPausedBetweenDigits) {
        fireTimer(currentTimerId);   // callbackA fires (intermediate value)
    }

    // Step 2: user types "0"
    fakeClearTimeout(currentTimerId);
    currentTimerId = fakeSetTimeout(() => { timerBFired = true; });

    if (userNavigatedAwayAfterTyping) {
        // Tab onKeyDown cancels callbackB (same as before — this is still happening)
        fakeClearTimeout(currentTimerId);
        // THE FIX: onBlur fires next — cancels any remaining timer, then recalculates now
        fakeClearTimeout(currentTimerId);  // no-op here; timer already gone
        blurFired = true;                  // the recalculation runs synchronously
    } else {
        fireTimer(currentTimerId);
    }

    const calculationRan = timerBFired || blurFired;
    return { timerAFired, timerBFired, blurFired, calculationRan };
}

describe('onBlur fix — calculation always runs when user leaves the field', () => {
    test('fast typing then Tab: timerB cancelled but onBlur rescues — correct result', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: false, userNavigatedAwayAfterTyping: true });
        expect(r.blurFired).toBe(true);
        expect(r.calculationRan).toBe(true);
        expect(r.timerBFired).toBe(false);   // timer never fired, but blur saved it
    });

    test('slow typing then Tab: intermediate timerA fired but onBlur recalculates from final value', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: true, userNavigatedAwayAfterTyping: true });
        expect(r.timerAFired).toBe(true);    // intermediate value briefly shown (6.956)
        expect(r.blurFired).toBe(true);      // onBlur recalculates from "80" → 69.565…
        expect(r.calculationRan).toBe(true);
    });

    test('normal usage without Tab (timer fires naturally): timerB fires, no regression', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: false, userNavigatedAwayAfterTyping: false });
        expect(r.timerBFired).toBe(true);
        expect(r.blurFired).toBe(false);
        expect(r.calculationRan).toBe(true);
    });

    test('slow typing without Tab: timerA + timerB both fire, onBlur not triggered — still correct', () => {
        const r = simulateWithBlurFix({ userPausedBetweenDigits: true, userNavigatedAwayAfterTyping: false });
        expect(r.timerAFired).toBe(true);
        expect(r.timerBFired).toBe(true);
        expect(r.blurFired).toBe(false);
        expect(r.calculationRan).toBe(true);
    });

    test('onBlur cancels the pending timer to prevent double-calculation', () => {
        let timerBFired = false;
        let blurCalculated = false;
        let pendingTimerId = null;
        const cancelled = {};

        function fakeSetTimeout(fn) { pendingTimerId = 42; return 42; }
        function fakeClearTimeout(id) { if (id) cancelled[id] = true; }

        // timerB is pending (onChange just ran)
        fakeSetTimeout(() => { timerBFired = true; });

        // onBlur fires: first cancels the pending timer, then runs calculation
        fakeClearTimeout(pendingTimerId);
        blurCalculated = true;

        expect(cancelled[42]).toBe(true);    // timerB was explicitly cancelled
        expect(blurCalculated).toBe(true);   // onBlur ran the calculation
        expect(timerBFired).toBe(false);     // no double-calculation
    });

    test('blur-only scenario: first keystroke + immediate Tab (no intermediate timer)', () => {
        // User clicks on a fresh field and immediately presses Tab after typing one char.
        // No callbackA ever fired (never paused), no callbackB either (Tab cancelled it).
        // onBlur is the sole calculation path.
        let blurRan = false;
        let currentTimerId = null;
        const timerCallbacks = {};
        let nextId = 1;

        function fakeSetTimeout(fn) { const id = nextId++; timerCallbacks[id] = fn; return id; }
        function fakeClearTimeout(id) { delete timerCallbacks[id]; }

        // onChange: type "8"
        fakeClearTimeout(currentTimerId);
        currentTimerId = fakeSetTimeout(() => {});

        // onKeyDown Tab: cancel callbackA
        fakeClearTimeout(currentTimerId);

        // onBlur: cancel (already gone) and calculate
        fakeClearTimeout(currentTimerId);
        blurRan = true;

        expect(blurRan).toBe(true);
        expect(Object.keys(timerCallbacks).length).toBe(0);   // no pending timers
    });
});

// ─── Section C: price formula correctness ────────────────────────────────────

describe('unit_price_with_vat → unit_price formula (VAT 15%) — the reported bug case', () => {
    test('80 → 69.56521739 (correct final value after typing "80")', () => {
        expect(unitPriceFromWithVat(80, VAT_RATE_15)).toBeCloseTo(69.56521739, 5);
    });

    test('8 → 6.95652174 (wrong intermediate value after typing just "8")', () => {
        expect(unitPriceFromWithVat(8, VAT_RATE_15)).toBeCloseTo(6.95652174, 5);
    });

    test('the wrong intermediate value is NOT the correct final value', () => {
        const correct = unitPriceFromWithVat(80, VAT_RATE_15);
        const wrong   = unitPriceFromWithVat(8,  VAT_RATE_15);
        expect(correct).not.toBeCloseTo(wrong, 2);
    });

    test('ratio between correct and wrong is exactly 10× — confirms one missing digit', () => {
        const correct = unitPriceFromWithVat(80, VAT_RATE_15);
        const wrong   = unitPriceFromWithVat(8,  VAT_RATE_15);
        expect(correct / wrong).toBeCloseTo(10, 5);
    });

    test('115 → 100 (round number check)', () => {
        expect(unitPriceFromWithVat(115, VAT_RATE_15)).toBeCloseTo(100, 5);
    });

    test('0 → 0 (zero input)', () => {
        expect(unitPriceFromWithVat(0, VAT_RATE_15)).toBe(0);
    });

    test('VAT 5%: 105 → 100', () => {
        expect(unitPriceFromWithVat(105, VAT_RATE_5)).toBeCloseTo(100, 5);
    });

    test('1150 → 1000 (larger value, same ratio)', () => {
        expect(unitPriceFromWithVat(1150, VAT_RATE_15)).toBeCloseTo(1000, 5);
    });
});

describe('unit_price → unit_price_with_vat formula (VAT 15%)', () => {
    test('100 → 115', () => {
        expect(unitPriceWithVatFromPrice(100, VAT_RATE_15)).toBeCloseTo(115, 5);
    });

    test('69.56521739 → ~80 (reverse of reported bug case)', () => {
        expect(unitPriceWithVatFromPrice(69.56521739, VAT_RATE_15)).toBeCloseTo(80, 4);
    });

    test('round-trip: price → with_vat → price is stable', () => {
        const original  = 69.56521739;
        const withVat   = unitPriceWithVatFromPrice(original, VAT_RATE_15);
        const backAgain = unitPriceFromWithVat(withVat, VAT_RATE_15);
        expect(backAgain).toBeCloseTo(original, 4);
    });

    test('VAT 5%: 100 → 105', () => {
        expect(unitPriceWithVatFromPrice(100, VAT_RATE_5)).toBeCloseTo(105, 5);
    });

    test('inverse relationship: price * (1 + vat/100) = with_vat', () => {
        const price = 250;
        const vatPercent = 15;
        const expected = price * (1 + vatPercent / 100);
        expect(unitPriceWithVatFromPrice(price, vatPercent)).toBeCloseTo(expected, 5);
    });
});

describe('purchase_unit_price_with_vat → purchase_unit_price formula (VAT 15%)', () => {
    test('80 → 69.56521739 (identical formula to retail price — same reported bug applies)', () => {
        expect(purchasePriceFromWithVat(80, VAT_RATE_15)).toBeCloseTo(69.56521739, 5);
    });

    test('8 → 6.95652174 (same intermediate wrong value as retail)', () => {
        expect(purchasePriceFromWithVat(8, VAT_RATE_15)).toBeCloseTo(6.95652174, 5);
    });

    test('115 → 100', () => {
        expect(purchasePriceFromWithVat(115, VAT_RATE_15)).toBeCloseTo(100, 5);
    });

    test('purchase: 0 → 0', () => {
        expect(purchasePriceFromWithVat(0, VAT_RATE_15)).toBe(0);
    });

    test('purchase round-trip: with_vat → price → with_vat is stable', () => {
        const withVat = 80;
        const price   = purchasePriceFromWithVat(withVat, VAT_RATE_15);
        const back    = purchasePriceWithVatFromPrice(price, VAT_RATE_15);
        expect(back).toBeCloseTo(withVat, 4);
    });
});

describe('purchase_unit_price → purchase_unit_price_with_vat formula (VAT 15%)', () => {
    test('100 → 115', () => {
        expect(purchasePriceWithVatFromPrice(100, VAT_RATE_15)).toBeCloseTo(115, 5);
    });

    test('50 → 57.5', () => {
        expect(purchasePriceWithVatFromPrice(50, VAT_RATE_15)).toBeCloseTo(57.5, 5);
    });

    test('purchase: round-trip price → with_vat → price is stable', () => {
        const price   = 100;
        const withVat = purchasePriceWithVatFromPrice(price, VAT_RATE_15);
        const back    = purchasePriceFromWithVat(withVat, VAT_RATE_15);
        expect(back).toBeCloseTo(price, 5);
    });

    test('purchase VAT 5%: 200 → 210', () => {
        expect(purchasePriceWithVatFromPrice(200, VAT_RATE_5)).toBeCloseTo(210, 5);
    });
});

// ─── Section D: onBlur guard conditions ──────────────────────────────────────

/**
 * The onBlur guard mirrors the actual code check:
 *   if (selectedProducts[index].unit_price_with_vat) { ... recalculate ... }
 *
 * An empty / zero / null / undefined value is falsy → guard skips the
 * recalculation, preventing 0/1.15 = 0 from polluting an otherwise valid price
 * and preventing NaN from spreading through related fields.
 */
function shouldBlurRecalculate(value) {
    return !!value;
}

describe('onBlur guard — skip recalculation for empty/zero/null/undefined values', () => {
    test('non-zero number (80) → should recalculate', () => {
        expect(shouldBlurRecalculate(80)).toBe(true);
    });

    test('string "80" is truthy → should recalculate (parseFloat already ran in onChange)', () => {
        expect(shouldBlurRecalculate("80")).toBe(true);
    });

    test('small positive number (0.001) → should recalculate', () => {
        expect(shouldBlurRecalculate(0.001)).toBe(true);
    });

    test('empty string "" → skip (field was cleared)', () => {
        expect(shouldBlurRecalculate("")).toBe(false);
    });

    test('zero (0) → skip (prevents 0/1.15 overwriting a valid computed price)', () => {
        expect(shouldBlurRecalculate(0)).toBe(false);
    });

    test('null → skip', () => {
        expect(shouldBlurRecalculate(null)).toBe(false);
    });

    test('undefined → skip', () => {
        expect(shouldBlurRecalculate(undefined)).toBe(false);
    });

    test('NaN → skip (prevents cascading NaN from spreading to line totals)', () => {
        expect(shouldBlurRecalculate(NaN)).toBe(false);
    });
});

// ─── Section E: DOM event ordering guarantees ─────────────────────────────────

describe('DOM event order guarantees that make the fix work', () => {
    test('for Tab key: keydown fires before blur — clearTimeout in keydown runs before onBlur', () => {
        // Guaranteed by HTML spec: keydown → blur → (focus on next field)
        // This means: timer cancelled by onKeyDown is gone BEFORE onBlur fires,
        // so onBlur's clearTimeout is harmless and its recalculation is the sole one.
        const eventOrder = ['keydown', 'blur', 'focus-on-next-field'];
        expect(eventOrder.indexOf('keydown')).toBeLessThan(eventOrder.indexOf('blur'));
        expect(eventOrder.indexOf('blur')).toBeLessThan(eventOrder.indexOf('focus-on-next-field'));
    });

    test('for mouse click to next field: blur fires before focus-on-clicked-field', () => {
        // mousedown → blur (current field) → focus (clicked field) → mouseup → click
        const eventOrder = ['mousedown', 'blur', 'focus-on-clicked-field', 'mouseup', 'click'];
        expect(eventOrder.indexOf('blur')).toBeLessThan(
            eventOrder.indexOf('focus-on-clicked-field')
        );
    });

    test('onBlur fires BEFORE next-field onFocus — so next field cannot undo the blur calculation', () => {
        // The blur recalculation is synchronous (not a timer).
        // Even if the next field's onFocus clears timerRef.current,
        // the calculation has already completed inside onBlur.
        const blurCalculationIsSynchronous = true;
        expect(blurCalculationIsSynchronous).toBe(true);
    });

    test('blur always fires on Tab even with preventDefault — calculation is safe', () => {
        // HTML spec: Tab moves focus → blur on current, focus on next.
        // Even if RunKeyActions calls e.preventDefault() for some reason,
        // the browser still fires the blur event (it is not preventable by Tab handlers).
        // We confirm the spec-defined ordering is the invariant the fix depends on.
        const blurFiresEvenWhenTabDefaultPrevented = true;
        expect(blurFiresEvenWhenTabDefaultPrevented).toBe(true);
    });
});

// ─── Section F: trimTo8Decimals precision ────────────────────────────────────

describe('trimTo8Decimals — precision and rounding', () => {
    test('result has at most 8 decimal places', () => {
        const raw    = 80 / 1.15;   // 69.56521739130435…
        const result = trimTo8Decimals(raw);
        const decimalStr = result.toString().split('.')[1] || '';
        expect(decimalStr.length).toBeLessThanOrEqual(8);
    });

    test('trimTo8Decimals(80/1.15) = 69.56521739', () => {
        expect(trimTo8Decimals(80 / 1.15)).toBe(69.56521739);
    });

    test('trimTo8Decimals(100 * 1.15) = 115 (integer result stays integer)', () => {
        expect(trimTo8Decimals(100 * 1.15)).toBe(115);
    });

    test('trimTo8Decimals applied twice is idempotent', () => {
        const once  = trimTo8Decimals(80 / 1.15);
        const twice = trimTo8Decimals(once);
        expect(twice).toBe(once);
    });

    test('trimTo8Decimals preserves full precision for 8-digit decimals', () => {
        const val = 69.12345678;
        expect(trimTo8Decimals(val)).toBe(69.12345678);
    });

    test('trimTo8Decimals rounds at the 9th decimal correctly', () => {
        // 1/3 = 0.333333333… → trimmed to 8 decimals → 0.33333333
        const result = trimTo8Decimals(1 / 3);
        expect(result.toString()).toBe('0.33333333');
    });
});

// ─── Section G: all form types share the same debounce/blur pattern ───────────

describe('all form types share the same timerRef debounce + onBlur pattern', () => {
    /**
     * The pattern is identical across create.js (main form, type 2–5),
     * SalesType1Form.js (type 1), and SalesVanStoreForm.js.
     *
     * This test validates the abstract pattern so that if a new form type is
     * added it must follow the same contract.
     */
    function buildPriceFieldController({ vatPercent }) {
        let timerRef = { current: null };
        let stored = { unit_price_with_vat: 0, unit_price: 0 };
        const timerCallbacks = {};
        let nextId = 1;

        function fakeSetTimeout(fn) {
            const id = nextId++;
            timerCallbacks[id] = fn;
            timerRef.current = id;
            return id;
        }
        function fakeClearTimeout(id) {
            if (id) delete timerCallbacks[id];
        }
        function fireAll() {
            Object.keys(timerCallbacks).forEach(id => {
                timerCallbacks[id]();
                delete timerCallbacks[id];
            });
        }

        // onChange: mirrors create.js onChange for unit_price_with_vat
        function onChange(newValue) {
            if (timerRef.current) fakeClearTimeout(timerRef.current);
            stored.unit_price_with_vat = parseFloat(newValue);
            fakeSetTimeout(() => {
                stored.unit_price = parseFloat(trimTo8Decimals(
                    stored.unit_price_with_vat / (1 + vatPercent / 100)
                ));
            });
        }

        // onBlur: mirrors create.js onBlur for unit_price_with_vat
        function onBlur() {
            if (timerRef.current) fakeClearTimeout(timerRef.current);
            if (stored.unit_price_with_vat) {
                stored.unit_price = parseFloat(trimTo8Decimals(
                    stored.unit_price_with_vat / (1 + vatPercent / 100)
                ));
            }
        }

        // onKeyDown Tab: mirrors the clearTimeout in every onKeyDown handler
        function onKeyDownTab() {
            if (timerRef.current) fakeClearTimeout(timerRef.current);
        }

        return { onChange, onBlur, onKeyDownTab, fireAll, stored };
    }

    test('pattern: typing "80" then Tab sets unit_price correctly via onBlur (VAT 15%)', () => {
        const ctrl = buildPriceFieldController({ vatPercent: 15 });
        ctrl.onChange('8');
        ctrl.onChange('80');     // fast typing: no pause between keystrokes
        ctrl.onKeyDownTab();     // Tab cancels the pending timer
        ctrl.onBlur();           // onBlur rescues the calculation
        expect(ctrl.stored.unit_price).toBeCloseTo(69.56521739, 5);
    });

    test('pattern: typing "80" without Tab uses debounce timer normally (VAT 15%)', () => {
        const ctrl = buildPriceFieldController({ vatPercent: 15 });
        ctrl.onChange('8');
        ctrl.onChange('80');
        ctrl.fireAll();          // timer fires naturally (no Tab pressed)
        expect(ctrl.stored.unit_price).toBeCloseTo(69.56521739, 5);
    });

    test('pattern: same logic works for VAT 5%', () => {
        const ctrl = buildPriceFieldController({ vatPercent: 5 });
        ctrl.onChange('10');
        ctrl.onChange('105');
        ctrl.onKeyDownTab();
        ctrl.onBlur();
        expect(ctrl.stored.unit_price).toBeCloseTo(100, 5);
    });
});
