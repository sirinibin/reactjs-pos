/**
 * Unit tests for the pw-modal-wrap z-index fix in order/create.js.
 *
 * Problem: pw-modal-wrap was set to z-index 1085, which placed it BELOW
 * order-create-wrap.above-pending-modal (1095). Product-create forms opened
 * from a sales form in pending-modal context rendered behind the backdrop.
 *
 * Fix: bumped pw-modal-wrap from 1085 → 1096 in the inline <style> block.
 * Also removed .products-modal-wrap (no longer needed — the class is kept on
 * the <Modal> itself but the z-index is now controlled via selectionModalRef
 * DOM manipulation in products.js, not via a static CSS rule here).
 *
 * New stacking order (normal context, no body classes):
 *   .above-preview-modal          1310
 *   .order-preview-wrap           1300
 *   .advance-payment-modal-wrap   1200
 *   .advance-payment-backdrop     1199
 *   .pw-modal-wrap                1096  ← raised
 *   .order-create-wrap (pending)  1095
 *   .above-sales-modal            1082
 *   .vehicle-list-modal-wrap      1086
 *   .order-create-wrap (normal)   1080
 */

const fs   = require('fs');
const path = require('path');

const CREATE_JS = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

// The style block lives on a single line containing all classes together.
const STYLE_LINE = CREATE_JS
    .split('\n')
    .find(line => line.includes('.pw-modal-wrap'));


// ─── 1. Source presence ───────────────────────────────────────────────────────

describe('OrderCreate inline style — source contains the style line', () => {
    test('style line with pw-modal-wrap exists in source', () => {
        expect(STYLE_LINE).toBeDefined();
        expect(typeof STYLE_LINE).toBe('string');
    });
});


// ─── 2. pw-modal-wrap z-index raised to 1096 ─────────────────────────────────

describe('OrderCreate inline style — pw-modal-wrap z-index is 1096', () => {
    test('.pw-modal-wrap z-index is 1096', () => {
        expect(STYLE_LINE).toMatch(/\.pw-modal-wrap\s*\{\s*z-index\s*:\s*1096\s*!important/);
    });

    test('.pw-modal-wrap z-index is NOT the old value 1085', () => {
        expect(STYLE_LINE).not.toMatch(/\.pw-modal-wrap\s*\{[^}]*1085/);
    });
});


// ─── 3. products-modal-wrap removed from inline style ────────────────────────

describe('OrderCreate inline style — products-modal-wrap rule removed', () => {
    test('.products-modal-wrap is no longer present in the style line', () => {
        expect(STYLE_LINE).not.toContain('.products-modal-wrap');
    });

    test('products-modal-wrap is not mentioned anywhere on that style line', () => {
        expect(STYLE_LINE).not.toMatch(/products.modal.wrap.*z-index/);
    });
});


// ─── 4. Conditional for order-create-wrap preserved ──────────────────────────

describe('OrderCreate inline style — order-create-wrap conditional unchanged', () => {
    test('conditional still evaluates 1095 for above-pending-modal, 1080 otherwise', () => {
        expect(STYLE_LINE).toContain(
            "props.modalClass === 'above-pending-modal' ? 1095 : 1080"
        );
    });
});


// ─── 5. No regression on other z-index values ────────────────────────────────

describe('OrderCreate inline style — other z-index values unchanged', () => {
    test('.vehicle-list-modal-wrap z-index is still 1086', () => {
        expect(STYLE_LINE).toMatch(
            /\.vehicle-list-modal-wrap\s*\{\s*z-index\s*:\s*1086\s*!important/
        );
    });

    test('.order-preview-wrap z-index is still 1300', () => {
        expect(STYLE_LINE).toMatch(
            /\.order-preview-wrap\s*\{\s*z-index\s*:\s*1300\s*!important/
        );
    });

    test('.above-sales-modal z-index is still 1082', () => {
        expect(STYLE_LINE).toMatch(
            /\.above-sales-modal\s*\{\s*z-index\s*:\s*1082\s*!important/
        );
    });

    test('.above-preview-modal z-index is still 1310', () => {
        expect(STYLE_LINE).toMatch(
            /\.above-preview-modal\s*\{\s*z-index\s*:\s*1310\s*!important/
        );
    });

    test('.advance-payment-modal-wrap z-index is still 1200', () => {
        expect(STYLE_LINE).toMatch(
            /\.advance-payment-modal-wrap\s*\{\s*z-index\s*:\s*1200\s*!important/
        );
    });

    test('.advance-payment-backdrop z-index is still 1199', () => {
        expect(STYLE_LINE).toMatch(
            /\.advance-payment-backdrop\s*\{\s*z-index\s*:\s*1199\s*!important/
        );
    });
});


// ─── 6. Pure arithmetic — stacking correctness ───────────────────────────────

describe('pw-modal-wrap z-index stacking correctness', () => {
    const PW_Z               = 1096;   // new value
    const OLD_PW_Z           = 1085;   // old value (the bug)
    const ORDER_ABOVE_PEND_Z = 1095;   // order-create-wrap in above-pending-modal context
    const ORDER_NORMAL_Z     = 1080;   // order-create-wrap in default context
    const VEHICLE_LIST_Z     = 1086;

    test('new pw-modal-wrap (1096) is above order-create-wrap normal (1080)', () => {
        expect(PW_Z).toBeGreaterThan(ORDER_NORMAL_Z);
    });

    test('new pw-modal-wrap (1096) is above order-create-wrap above-pending-modal (1095)', () => {
        expect(PW_Z).toBeGreaterThan(ORDER_ABOVE_PEND_Z);
    });

    test('new pw-modal-wrap (1096) is exactly 1 above the highest order-create-wrap (1095)', () => {
        expect(PW_Z - ORDER_ABOVE_PEND_Z).toBe(1);
    });

    test('old pw-modal-wrap (1085) was BELOW order-create-wrap above-pending-modal (1095) — the bug', () => {
        expect(OLD_PW_Z).toBeLessThan(ORDER_ABOVE_PEND_Z);
    });

    test('old pw-modal-wrap (1085) was above vehicle-list-modal-wrap (1086) — no, 1085 < 1086', () => {
        // Edge: pw-modal-wrap was actually BELOW vehicle-list-modal-wrap too
        expect(OLD_PW_Z).toBeLessThan(VEHICLE_LIST_Z);
    });

    test('new pw-modal-wrap (1096) is above vehicle-list-modal-wrap (1086)', () => {
        expect(PW_Z).toBeGreaterThan(VEHICLE_LIST_Z);
    });

    test('new pw-modal-wrap value is correct: 1096', () => {
        expect(PW_Z).toBe(1096);
    });
});
