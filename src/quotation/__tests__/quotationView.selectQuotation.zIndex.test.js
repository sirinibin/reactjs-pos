/**
 * Tests for the fix: QuotationView appearing behind the "Select Quotation" modal
 * when the latter is opened from within a Sales form (OrderCreate).
 *
 * Root cause:
 *   When OrderCreate is mounted it injects a <style> tag that raises
 *   .above-sales-modal to z-index 1082. The Select Quotation (Quotations component)
 *   uses className="above-sales-modal", so it sits at z-index 1082.
 *   QuotationView, opened via the View button inside the Select Quotation list,
 *   only had .above-quotations-modal (z-index 1075) — below 1082 — so it was
 *   invisible behind the Select Quotation modal.
 *
 * Fix:
 *   App.css adds .quotation-view-overlay.above-quotations-modal { z-index: 1096 !important }.
 *   Two-class specificity (0,2,0) beats any single-class !important rule (0,1,0).
 *   1096 > 1095 (Sales form pending) and > 1082 (Select Quotation modal).
 */

const fs   = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'), 'utf8'
);

const Q_IDX = fs.readFileSync(
    path.join(__dirname, '../index.js'), 'utf8'
);


// ── 1. App.css — two-class rules for QuotationView and Print modal ───────────

describe('App.css — .quotation-print-type-modal.above-quotations-modal z-index rule', () => {
    test('1.0a  two-class rule for print modal is present', () => {
        expect(APP_CSS).toMatch(/\.quotation-print-type-modal\.above-quotations-modal/);
    });

    test('1.0b  print modal rule sets z-index to 1096 !important', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-print-type-modal\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });
});

describe('App.css — .quotation-view-overlay.above-quotations-modal z-index rule', () => {
    test('1.1  two-class rule is present', () => {
        expect(APP_CSS).toMatch(/\.quotation-view-overlay\.above-quotations-modal/);
    });

    test('1.2  the rule sets z-index to 1096 !important', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-view-overlay\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('1.3  backdrop rule for the two-class context is present at z-index 1095', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-view-overlay\.above-quotations-modal\s*\+\s*\.modal-backdrop\s*\{[^}]*z-index\s*:\s*1095\s*!important/
        );
    });
});


// ── 2. quotation/index.js — QuotationView gets above-quotations-modal ─────────

describe('quotation/index.js — QuotationView has above-quotations-modal in enableSelection', () => {
    test('2.1  QuotationView is always mounted when props.enableSelection is true', () => {
        expect(Q_IDX).toMatch(
            /\(pendingView\s*\|\|\s*props\.enableSelection\s*\|\|\s*showQuotationView\)\s*&&\s*<QuotationView/
        );
    });

    test('2.2  QuotationView passes above-quotations-modal via modalClass when props.enableSelection', () => {
        expect(Q_IDX).toMatch(
            /QuotationView[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']/
        );
    });
});


// ── 3. Numeric z-index stacking invariants ────────────────────────────────────

describe('z-index stacking invariants — Select Quotation → View flow', () => {
    const Z = {
        selectQuotationBase: 1065,      // .above-sales-modal base (standalone)
        selectQuotationInSalesForm: 1082, // .above-sales-modal when OrderCreate's injected style is active
        salesFormPending: 1095,         // .order-create-wrap.above-pending-modal
        quotationViewBase: 1075,        // .above-quotations-modal (single-class)
        quotationViewElevated: 1096,    // .quotation-view-overlay.above-quotations-modal (two-class)
        quotationViewBackdrop: 1095,    // .quotation-view-overlay.above-quotations-modal + .modal-backdrop
    };

    test('BUG: base QuotationView (1075) was below Select Quotation inside Sales form (1082)', () => {
        expect(Z.quotationViewBase).toBeLessThan(Z.selectQuotationInSalesForm);
    });

    test('FIX: elevated QuotationView (1096) is above Select Quotation in Sales form (1082)', () => {
        expect(Z.quotationViewElevated).toBeGreaterThan(Z.selectQuotationInSalesForm);
    });

    test('FIX: elevated QuotationView (1096) is above pending Sales form (1095)', () => {
        expect(Z.quotationViewElevated).toBeGreaterThan(Z.salesFormPending);
    });

    test('FIX: elevated QuotationView (1096) is above standalone Select Quotation (1065)', () => {
        expect(Z.quotationViewElevated).toBeGreaterThan(Z.selectQuotationBase);
    });

    test('backdrop (1095) is below QuotationView (1096)', () => {
        expect(Z.quotationViewBackdrop).toBeLessThan(Z.quotationViewElevated);
    });

    test('backdrop (1095) is above Select Quotation in Sales form (1082)', () => {
        expect(Z.quotationViewBackdrop).toBeGreaterThan(Z.selectQuotationInSalesForm);
    });
});


// ── 4. CSS specificity — two-class rule beats single-class ───────────────────

describe('CSS specificity — two-class selector beats single-class for !important', () => {
    function classCount(selector) {
        return (selector.match(/\.\w[\w-]*/g) || []).length;
    }

    test('.quotation-view-overlay has specificity class-count 1', () => {
        expect(classCount('.quotation-view-overlay')).toBe(1);
    });

    test('.above-quotations-modal has specificity class-count 1', () => {
        expect(classCount('.above-quotations-modal')).toBe(1);
    });

    test('.quotation-view-overlay.above-quotations-modal has specificity class-count 2', () => {
        expect(classCount('.quotation-view-overlay.above-quotations-modal')).toBe(2);
    });

    test('two-class (0,2,0) beats both single-class rules (0,1,0) for !important author rules', () => {
        const twoClass = classCount('.quotation-view-overlay.above-quotations-modal');
        const single1  = classCount('.quotation-view-overlay');
        const single2  = classCount('.above-quotations-modal');
        expect(twoClass).toBeGreaterThan(single1);
        expect(twoClass).toBeGreaterThan(single2);
    });
});
