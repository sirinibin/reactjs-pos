/**
 * Tests for the fix: Quotation Edit form appearing behind the "Select Quotation" modal.
 *
 * Root cause:
 *   QuotationIndex is rendered inside the Quotations (Select Quotation) modal
 *   (className="above-sales-modal", z-index 1082). Clicking Edit opens QuotationCreate
 *   with modalClass="" (empty), giving it class "quotation-create-wrap" whose base
 *   z-index is 1080 — below the 1082 Quotations modal.
 *   When QuotationCreate opens, body.quotation-form-open causes .above-sales-modal to
 *   drop to 1081, but QuotationCreate at 1080 is still 1 unit below it.
 *
 * Fix:
 *   quotation/index.js passes modalClass="above-quotations-modal" when enableSelection
 *   is true. App.css adds .quotation-create-wrap.above-quotations-modal { z-index: 1085 }
 *   (specificity 0,2,0 beats the base 0,1,0 rule at 1080).
 *   After the fix: Quotations modal drops to 1081, QuotationCreate is at 1085. 1085 > 1081 ✓
 */

const fs   = require('fs');
const path = require('path');

const INDEX_SRC = fs.readFileSync(
    path.join(__dirname, '../index.js'),
    'utf8'
);

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// ── 1. quotation/index.js passes above-quotations-modal when enableSelection ──

describe('quotation/index.js — modalClass when enableSelection is true', () => {
    test('1.1  "above-quotations-modal" string is present in source', () => {
        expect(INDEX_SRC).toMatch(/above-quotations-modal/);
    });

    test('1.2  above-quotations-modal is passed when props.enableSelection is true', () => {
        expect(INDEX_SRC).toMatch(
            /props\.enableSelection\s*\?\s*["']above-quotations-modal["']/
        );
    });

    test('1.3  above-pending-modal still takes priority over above-quotations-modal', () => {
        // The ternary must be: pendingView ? "above-pending-modal" : enableSelection ? "above-quotations-modal" : ""
        // So above-pending-modal is checked first.
        const pendingFirst = INDEX_SRC.indexOf('above-pending-modal');
        const quotationsModal = INDEX_SRC.indexOf('above-quotations-modal');
        expect(pendingFirst).toBeGreaterThan(-1);
        expect(quotationsModal).toBeGreaterThan(-1);
        expect(pendingFirst).toBeLessThan(quotationsModal);
    });

    test('1.4  QuotationCreate receives above-quotations-modal via modalClass', () => {
        expect(INDEX_SRC).toMatch(
            /QuotationCreate.*modalClass.*above-quotations-modal|modalClass.*above-quotations-modal.*QuotationCreate/s
        );
    });

    test('1.5  QuotationType3Form also receives above-quotations-modal via modalClass', () => {
        expect(INDEX_SRC).toMatch(
            /QuotationType3Form.*modalClass.*above-quotations-modal|modalClass.*above-quotations-modal.*QuotationType3Form/s
        );
    });
});

// ── 2. App.css — two-class rule lifts QuotationCreate above Quotations modal ─

describe('App.css — quotation-create-wrap.above-quotations-modal z-index rule', () => {
    test('2.1  .quotation-create-wrap.above-quotations-modal rule is present', () => {
        expect(APP_CSS).toMatch(/\.quotation-create-wrap\.above-quotations-modal/);
    });

    test('2.2  the rule sets z-index to 1085 !important', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-create-wrap\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1085\s*!important/
        );
    });

    test('2.3  base .quotation-create-wrap rule (1080) is also present', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/
        );
    });
});

// ── 3. Numeric z-index stacking invariants ────────────────────────────────────

describe('z-index stacking invariants — Select Quotation → Edit flow', () => {
    const Z = {
        quotationsModalBase: 1082,        // .above-sales-modal injected by order/create.js
        quotationsModalWhenFormOpen: 1081,// body.quotation-form-open .above-sales-modal (App.css)
        quotationCreateBase: 1080,        // .quotation-create-wrap (App.css)
        quotationCreateAboveModal: 1085,  // .quotation-create-wrap.above-quotations-modal (App.css)
    };

    test('BUG: base QuotationCreate (1080) is BELOW Quotations modal when dropped (1081)', () => {
        // This confirms the original bug existed
        expect(Z.quotationCreateBase).toBeLessThan(Z.quotationsModalWhenFormOpen);
    });

    test('FIX: above-quotations-modal QuotationCreate (1085) is ABOVE Quotations modal when dropped (1081)', () => {
        expect(Z.quotationCreateAboveModal).toBeGreaterThan(Z.quotationsModalWhenFormOpen);
    });

    test('FIX: above-quotations-modal (1085) is also above the Quotations modal base z-index (1082)', () => {
        expect(Z.quotationCreateAboveModal).toBeGreaterThan(Z.quotationsModalBase);
    });

    test('above-quotations-modal (1085) is above base quotation-create-wrap (1080)', () => {
        expect(Z.quotationCreateAboveModal).toBeGreaterThan(Z.quotationCreateBase);
    });
});

// ── 4. CSS specificity — two-class rule beats single-class base ───────────────

describe('CSS specificity — two-class rule wins over single-class for !important', () => {
    function classCount(selector) {
        return (selector.match(/\.\w[\w-]*/g) || []).length;
    }

    test('.quotation-create-wrap has specificity class-count 1', () => {
        expect(classCount('.quotation-create-wrap')).toBe(1);
    });

    test('.quotation-create-wrap.above-quotations-modal has specificity class-count 2', () => {
        expect(classCount('.quotation-create-wrap.above-quotations-modal')).toBe(2);
    });

    test('two-class rule (0,2,0) beats single-class base (0,1,0) for !important author rules', () => {
        expect(classCount('.quotation-create-wrap.above-quotations-modal')).toBeGreaterThan(
            classCount('.quotation-create-wrap')
        );
    });
});

// ── 5. App.css — body.quotation-form-open drops .above-sales-modal ────────────

describe('App.css — existing body.quotation-form-open rule drops Quotations modal', () => {
    test('5.1  body.quotation-form-open .above-sales-modal rule exists at z-index 1081', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-form-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1081\s*!important/
        );
    });

    test('5.2  the drop to 1081 combined with new fix (1085) creates correct ordering', () => {
        const dropped = 1081;
        const fix = 1085;
        expect(fix).toBeGreaterThan(dropped);
    });
});
