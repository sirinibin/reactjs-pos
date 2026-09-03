/**
 * Source-level tests verifying that QuotationView, print type selection modal,
 * and QuotationSalesReturnCreate are elevated above the Quotations selection
 * wrapper (z-index 1065) when enableSelection=true.
 *
 * Fixes covered:
 *   1. QuotationView: was missing enableSelection elevation — added above-quotations-modal
 *   2. Print type selection modal: had no className for enableSelection — added above-quotations-modal
 *   3. QuotationSalesReturnCreate: was missing enableSelection elevation — added above-quotations-modal
 *      (needed because body.quotation-sales-return-form-open raises Quotations wrapper to 1081,
 *       which beats the base .quotation-sales-return-create-wrap z-index of 1080)
 */

const fs   = require('fs');
const path = require('path');

const Q_IDX = fs.readFileSync(
    path.join(__dirname, '../index.js'), 'utf8'
);
const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'), 'utf8'
);


// ── 1. App.css — generic above-quotations-modal rule ─────────────────────────

describe('App.css — .above-quotations-modal generic z-index rule', () => {
    test('.above-quotations-modal rule exists at z-index 1075', () => {
        expect(APP_CSS).toMatch(
            /\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1075\s*!important/
        );
    });

    test('.above-quotations-modal (1075) is above the Quotations wrapper dialog (1065)', () => {
        expect(1075).toBeGreaterThan(1065);
    });

    test('.quotation-create-wrap.above-quotations-modal (1085) still exists and beats generic (1075)', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-create-wrap\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1085\s*!important/
        );
        expect(1085).toBeGreaterThan(1075);
    });
});


// ── 2. QuotationView modalClass ternary ───────────────────────────────────────

describe('quotation/index.js — QuotationView gets elevated modalClass when enableSelection=true', () => {
    test('QuotationView uses above-pending-modal when pendingView', () => {
        expect(Q_IDX).toMatch(
            /QuotationView[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']/
        );
    });

    test('QuotationView uses above-quotations-modal when enableSelection=true (not pendingView)', () => {
        expect(Q_IDX).toMatch(
            /QuotationView[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });

    test('QuotationView falls back to empty string when neither pendingView nor enableSelection', () => {
        expect(Q_IDX).toMatch(
            /QuotationView[^/]*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });
});


// ── 3. Print type selection modal className ───────────────────────────────────

describe('quotation/index.js — print type selection modal elevated when enableSelection=true', () => {
    test('print type selection modal uses above-pending-modal-dialog when pendingView', () => {
        expect(Q_IDX).toMatch(
            /showPrintTypeSelection[\s\S]{0,300}className=\{pendingView\s*\?\s*["']above-pending-modal-dialog["']/
        );
    });

    test('print type selection modal uses above-quotations-modal when enableSelection=true', () => {
        expect(Q_IDX).toMatch(
            /showPrintTypeSelection[\s\S]{0,300}className=\{pendingView\s*\?\s*["']above-pending-modal-dialog["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });

    test('print type selection modal falls back to empty string when neither flag is set', () => {
        expect(Q_IDX).toMatch(
            /showPrintTypeSelection[\s\S]{0,300}props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });
});


// ── 4. Stacking hierarchy sanity checks ──────────────────────────────────────

describe('z-index stacking hierarchy for quotation selection context', () => {
    const QUOTATIONS_WRAPPER = 1065; // .above-sales-modal
    const ABOVE_QUOTATIONS   = 1075; // .above-quotations-modal (new generic rule)
    const QUOTATION_CREATE   = 1085; // .quotation-create-wrap.above-quotations-modal

    test('above-quotations-modal (1075) is above the Quotations wrapper (1065)', () => {
        expect(ABOVE_QUOTATIONS).toBeGreaterThan(QUOTATIONS_WRAPPER);
    });

    test('quotation-create elevated class (1085) is above above-quotations-modal (1075)', () => {
        expect(QUOTATION_CREATE).toBeGreaterThan(ABOVE_QUOTATIONS);
    });

    test('stack gap between wrapper and above-quotations-modal is at least 5', () => {
        expect(ABOVE_QUOTATIONS - QUOTATIONS_WRAPPER).toBeGreaterThanOrEqual(5);
    });

    test('quotation-view-overlay (1070) is also above wrapper (1065) for additional safety', () => {
        const QUOTATION_VIEW_OVERLAY = 1070; // .quotation-view-overlay
        expect(QUOTATION_VIEW_OVERLAY).toBeGreaterThan(QUOTATIONS_WRAPPER);
    });
});


// ── 5. Consistency: QuotationCreate also uses above-quotations-modal ──────────

describe('quotation/index.js — QuotationCreate modalClass consistency', () => {
    test('QuotationCreate also uses above-quotations-modal when enableSelection=true', () => {
        expect(Q_IDX).toMatch(
            /QuotationCreate[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });

    test('QuotationType3Form also uses above-quotations-modal when enableSelection=true', () => {
        expect(Q_IDX).toMatch(
            /QuotationType3Form[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });
});


// ── 6. Return button — QuotationSalesReturnCreate elevated when enableSelection ──

describe('quotation/index.js — QuotationSalesReturnCreate Return button elevated when enableSelection=true', () => {
    test('QuotationSalesReturnCreate uses above-pending-modal when pendingView', () => {
        expect(Q_IDX).toMatch(
            /QuotationSalesReturnCreate[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']/
        );
    });

    test('QuotationSalesReturnCreate uses above-quotations-modal when enableSelection=true', () => {
        expect(Q_IDX).toMatch(
            /QuotationSalesReturnCreate[^/]*modalClass=\{pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });

    test('QuotationSalesReturnCreate falls back to empty string when neither flag is set', () => {
        expect(Q_IDX).toMatch(
            /QuotationSalesReturnCreate[^/]*props\.enableSelection\s*\?\s*["']above-quotations-modal["']\s*:\s*["']["']\}/
        );
    });
});


// ── 7. App.css — quotation-sales-return-create-wrap.above-quotations-modal ───

describe('App.css — .quotation-sales-return-create-wrap.above-quotations-modal', () => {
    test('compound rule exists at z-index 1085', () => {
        expect(APP_CSS).toMatch(
            /\.quotation-sales-return-create-wrap\.above-quotations-modal\s*\{[^}]*z-index\s*:\s*1085\s*!important/
        );
    });

    test('1085 beats body.quotation-sales-return-form-open raised Quotations wrapper (1081)', () => {
        const QSR_CREATE_ABOVE_QUOTATIONS = 1085;
        const WRAPPER_BODY_CLASS_RAISED   = 1081;
        expect(QSR_CREATE_ABOVE_QUOTATIONS).toBeGreaterThan(WRAPPER_BODY_CLASS_RAISED);
    });

    test('1085 beats base .quotation-sales-return-create-wrap (1080)', () => {
        expect(1085).toBeGreaterThan(1080);
    });
});
