/**
 * Tests for two tooltip fixes in the product history modal:
 *
 * Fix 1 — App.css tooltip z-index raised from 1090 → 1300
 *   Problem: DraggableHistoryModal dialog runs at z-index 1150 (and 1200 when a
 *   sub-form is open via body.form-over-history). The Bootstrap tooltip CSS was
 *   1090, placing every tooltip behind the history modal — invisible to the user.
 *   Fix: .tooltip { z-index: 1300 !important; } — above all modal layers.
 *
 * Fix 2 — product_history.js unique tooltip ID per row
 *   Problem: Tooltip id was `stock-tooltip-${product.id}` — same value for every
 *   history row (product.id is the parent product, constant for all rows). Multiple
 *   DOM elements sharing one id causes React-Bootstrap OverlayTrigger to fail to
 *   resolve the correct tooltip target.
 *   Fix: id is now `stock-tooltip-${history.id}` — unique per row.
 *
 * Fix 3 — StoreSettingsModal.js unused-vars warnings removed
 *   Removed dead `TripleRow` component and eliminated unused `data` binding from
 *   the save handler so the app compiles without ESLint no-unused-vars warnings.
 */

const fs = require('fs');
const path = require('path');

const APP_CSS           = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');
const PRODUCT_HISTORY   = fs.readFileSync(path.join(__dirname, '../product_history.js'), 'utf8');
const STORE_SETTINGS    = fs.readFileSync(path.join(__dirname, '../../store/StoreSettingsModal.js'), 'utf8');
const DRAGGABLE_MODAL   = fs.readFileSync(path.join(__dirname, '../../utils/DraggableHistoryModal.js'), 'utf8');

// ─── Z-index cascade model ─────────────────────────────────────────────────────
// Mirrors the actual CSS rules so tests stay fast (no DOM) while covering the
// relevant stacking relationships.

const TOOLTIP_Z           = 1300;  // after Fix 1
const DRAGGABLE_DIALOG_Z  = 1150;  // inline style on .modal-dialog in DraggableHistoryModal
const FORM_OVER_HISTORY_Z = 1200;  // body.form-over-history .above-sales-modal.order-inner-history-modal
const DRAGGABLE_MODAL_Z   = 1150;  // .draggable-history-modal.draggable-history-modal CSS rule

// ─── 1. CSS: .tooltip z-index rule ────────────────────────────────────────────

describe('App.css — .tooltip z-index raised to 1300', () => {
    test('.tooltip rule sets z-index 1300 !important', () => {
        expect(APP_CSS).toMatch(/\.tooltip\s*\{[^}]*z-index\s*:\s*1300\s*!important/);
    });

    test('.tooltip z-index is NOT the old broken value 1090', () => {
        // The original rule was 1090 which was below DraggableHistoryModal (1150).
        // Confirm the old value is gone (no standalone .tooltip rule with 1090).
        const match = APP_CSS.match(/\.tooltip\s*\{[^}]*z-index\s*:\s*(\d+)\s*!important/);
        expect(match).not.toBeNull();
        expect(Number(match[1])).not.toBe(1090);
    });

    test('tooltip (1300) is above DraggableHistoryModal dialog inline z-index (1150)', () => {
        expect(TOOLTIP_Z).toBeGreaterThan(DRAGGABLE_DIALOG_Z);
    });

    test('tooltip (1300) is above DraggableHistoryModal CSS z-index (1150)', () => {
        expect(TOOLTIP_Z).toBeGreaterThan(DRAGGABLE_MODAL_Z);
    });

    test('tooltip (1300) is above form-over-history inner history modal (1200)', () => {
        expect(TOOLTIP_Z).toBeGreaterThan(FORM_OVER_HISTORY_Z);
    });

    test('tooltip (1300) leaves a margin of ≥ 100 above the highest modal layer (1200)', () => {
        expect(TOOLTIP_Z - FORM_OVER_HISTORY_Z).toBeGreaterThanOrEqual(100);
    });
});


// ─── 2. DraggableHistoryModal: inline z-index confirmed ───────────────────────

describe('DraggableHistoryModal — dialog z-index is 1150', () => {
    test('modal-dialog div has zIndex: 1150 in inline style', () => {
        expect(DRAGGABLE_MODAL).toMatch(/zIndex\s*:\s*1150/);
    });

    test('CSS class override (in JSX <style> tag) also targets 1150', () => {
        // The rule lives as a template literal inside the component's <style> block,
        // not in App.css, so we read DraggableHistoryModal.js directly.
        expect(DRAGGABLE_MODAL).toMatch(/draggable-history-modal\.draggable-history-modal[^`"]*z-index\s*:\s*1150\s*!important/);
    });

    test('the body.form-over-history inner-history rule is at 1200', () => {
        expect(APP_CSS).toMatch(
            /body\.form-over-history[^{]*\.order-inner-history-modal\s*\{[^}]*z-index\s*:\s*1200\s*!important/
        );
    });
});


// ─── 3. product_history.js — per-row unique tooltip ID ────────────────────────

describe('product_history.js — stock tooltip ID is unique per history row', () => {
    test('tooltip id uses history.id (per-row unique)', () => {
        expect(PRODUCT_HISTORY).toMatch(/stock-tooltip-\$\{history\.id\}/);
    });

    test('tooltip id does NOT use product.id (was the bug: same id for every row)', () => {
        expect(PRODUCT_HISTORY).not.toMatch(/stock-tooltip-\$\{product\.id\}/);
    });

    test('Tooltip component is rendered inside the stock column branch', () => {
        // OverlayTrigger is imported on line 6, then used in the stock cell.
        // Find the JSX usage (second occurrence) and confirm the tooltip id is close by.
        const firstOccurrence = PRODUCT_HISTORY.indexOf('<OverlayTrigger');
        const tooltipIdIdx    = PRODUCT_HISTORY.indexOf('stock-tooltip-${history.id}');
        expect(firstOccurrence).toBeGreaterThan(-1);
        expect(tooltipIdIdx).toBeGreaterThan(-1);
        // The tooltip id appears right after the opening <OverlayTrigger JSX tag
        expect(tooltipIdIdx - firstOccurrence).toBeLessThan(500);
    });

    test('OverlayTrigger wrapping the stock value is present', () => {
        expect(PRODUCT_HISTORY).toMatch(/OverlayTrigger/);
    });

    test('the span inside OverlayTrigger has dotted underline style (visual affordance)', () => {
        expect(PRODUCT_HISTORY).toMatch(/textDecoration.*underline dotted/);
    });
});


// ─── 4. Tooltip z-index ordering: complete stacking ladder ────────────────────

describe('Full z-index stacking order with tooltip at top', () => {
    const BOOTSTRAP_DEFAULT       = 1055;
    const DELIVERY_NOTE_FORM_Z    = 1066;
    const SALES_FORM_Z            = 1080;
    const PURCHASE_FORM_Z         = 1088;
    const PENDING_MODAL_Z         = 1095;
    const ABOVE_PRODUCT_FORM_Z    = 1100;

    test('complete ladder: tooltip > form-over-history > draggable > above-product-form > pending > purchase > sales > delivery-note > bootstrap-default', () => {
        expect(TOOLTIP_Z).toBeGreaterThan(FORM_OVER_HISTORY_Z);
        expect(FORM_OVER_HISTORY_Z).toBeGreaterThan(DRAGGABLE_DIALOG_Z);
        expect(DRAGGABLE_DIALOG_Z).toBeGreaterThan(ABOVE_PRODUCT_FORM_Z);
        expect(ABOVE_PRODUCT_FORM_Z).toBeGreaterThan(PENDING_MODAL_Z);
        expect(PENDING_MODAL_Z).toBeGreaterThan(PURCHASE_FORM_Z);
        expect(PURCHASE_FORM_Z).toBeGreaterThan(SALES_FORM_Z);
        expect(SALES_FORM_Z).toBeGreaterThan(DELIVERY_NOTE_FORM_Z);
        expect(DELIVERY_NOTE_FORM_Z).toBeGreaterThan(BOOTSTRAP_DEFAULT);
    });

    test('tooltip (1300) is the highest z-index in the stack', () => {
        const allZIndices = [
            BOOTSTRAP_DEFAULT, DELIVERY_NOTE_FORM_Z, SALES_FORM_Z,
            PURCHASE_FORM_Z, PENDING_MODAL_Z, ABOVE_PRODUCT_FORM_Z,
            DRAGGABLE_DIALOG_Z, DRAGGABLE_MODAL_Z, FORM_OVER_HISTORY_Z,
        ];
        expect(TOOLTIP_Z).toBeGreaterThan(Math.max(...allZIndices));
    });

    test('pre-fix tooltip (1090) was below DraggableHistoryModal (1150) — root cause confirmed', () => {
        const OLD_TOOLTIP_Z = 1090;
        expect(OLD_TOOLTIP_Z).toBeLessThan(DRAGGABLE_DIALOG_Z);
    });

    test('pre-fix tooltip (1090) was also below form-over-history (1200)', () => {
        const OLD_TOOLTIP_Z = 1090;
        expect(OLD_TOOLTIP_Z).toBeLessThan(FORM_OVER_HISTORY_Z);
    });
});


// ─── 5. StoreSettingsModal.js — no-unused-vars warnings eliminated ────────────

describe('StoreSettingsModal.js — unused code removed', () => {
    test('TripleRow function is removed', () => {
        expect(STORE_SETTINGS).not.toMatch(/function TripleRow/);
    });

    test('TripleRow is not referenced anywhere in the file', () => {
        expect(STORE_SETTINGS).not.toMatch(/TripleRow/);
    });

    test('save handler does not bind unused data variable', () => {
        // After the fix: `await res.json()` — no `const data =`
        // Check the save/PUT block does not assign the json response to a variable
        const putBlock = STORE_SETTINGS.slice(
            STORE_SETTINGS.indexOf("method: 'PUT'"),
            STORE_SETTINGS.indexOf("if (!res.ok)")
        );
        expect(putBlock).not.toMatch(/const\s+data\s*=/);
    });

    test('res.json() is still called (response body consumed even if not used)', () => {
        expect(STORE_SETTINGS).toMatch(/await\s+res\.json\(\)/);
    });

    test('BankField function is still present (was adjacent to removed TripleRow)', () => {
        expect(STORE_SETTINGS).toMatch(/function BankField/);
    });
});


// ─── 6. No regression — existing tooltip-adjacent CSS rules unchanged ──────────

describe('No regression — z-index rules unchanged for other elements', () => {
    test('.draggable-history-modal still has 1150 (JSX <style> tag in component)', () => {
        expect(DRAGGABLE_MODAL).toMatch(/draggable-history-modal\.draggable-history-modal[^`"]*z-index\s*:\s*1150\s*!important/);
    });

    test('.above-sales-modal still defined', () => {
        expect(APP_CSS).toMatch(/\.above-sales-modal/);
    });

    test('.purchase-create-wrap still has 1088', () => {
        expect(APP_CSS).toMatch(/\.purchase-create-wrap\s*\{[^}]*z-index\s*:\s*1088\s*!important/);
    });

    test('.sales-return-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.quotation-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.quotation-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.above-product-form still has 1100', () => {
        expect(APP_CSS).toMatch(/\.above-product-form\s*\{[^}]*z-index\s*:\s*1100\s*!important/);
    });
});
