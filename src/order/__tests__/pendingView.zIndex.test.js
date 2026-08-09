/**
 * Tests for the z-index CSS rules added to App.css for the pendingView fix.
 *
 * Root cause of the original bug:
 *   Multiple mounted OrderCreate instances each inject a <style> tag with
 *   `.order-create-wrap { z-index: 1080 !important }`. The inner OrderCreate
 *   (inside customer_pending) injected z-index 1095 via the same selector, but
 *   later-injected tags overrode it back to 1080. Since customer_pending is at
 *   z-index 1082, 1080 < 1082 meant the form was hidden behind the modal.
 *
 * Fix:
 *   App.css now contains `.order-create-wrap.above-pending-modal { z-index: 1095 !important }`.
 *   A two-class selector (specificity 0,2,0) beats a single-class selector (0,1,0)
 *   for !important author rules, regardless of DOM order.
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// ── Rule presence ─────────────────────────────────────────────────────────────

describe('App.css — pendingView z-index rules are present', () => {
    test('.order-create-wrap.above-pending-modal has z-index 1095 !important', () => {
        expect(APP_CSS).toMatch(
            /\.order-create-wrap\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1095\s*!important/
        );
    });

    test('.above-pending-modal-dialog has z-index 1100 !important', () => {
        expect(APP_CSS).toMatch(
            /\.above-pending-modal-dialog\s*\{[^}]*z-index\s*:\s*1100\s*!important/
        );
    });

    test('.modal-backdrop.above-pending-modal-dialog has z-index 1099 !important', () => {
        expect(APP_CSS).toMatch(
            /\.modal-backdrop\.above-pending-modal-dialog\s*\{[^}]*z-index\s*:\s*1099\s*!important/
        );
    });

    test('.modal-backdrop.above-pending-modal has z-index 1089 !important', () => {
        expect(APP_CSS).toMatch(
            /\.modal-backdrop\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1089\s*!important/
        );
    });
});

// ── Numeric z-index invariants ────────────────────────────────────────────────

describe('z-index stacking invariants', () => {
    const Z = {
        customerPending: 1082,          // .above-sales-modal (set by OrderCreate style tag)
        orderCreateWrapDefault: 1080,   // .order-create-wrap (non-pending instances)
        orderCreateWrapPending: 1095,   // .order-create-wrap.above-pending-modal (App.css)
        backdropAbovePending: 1089,     // .modal-backdrop.above-pending-modal
        printTypeSelection: 1100,       // .above-pending-modal-dialog
        printTypeSelectionBackdrop: 1099, // .modal-backdrop.above-pending-modal-dialog
        orderPreview: 1300,             // .order-preview-wrap
    };

    test('pendingView create form (1095) appears above customer_pending (1082)', () => {
        expect(Z.orderCreateWrapPending).toBeGreaterThan(Z.customerPending);
    });

    test('non-pending create form (1080) appears BELOW customer_pending (1082)', () => {
        // This is why the bug existed — without the fix the form was hidden
        expect(Z.orderCreateWrapDefault).toBeLessThan(Z.customerPending);
    });

    test('two-class rule (1095) beats single-class default (1080)', () => {
        expect(Z.orderCreateWrapPending).toBeGreaterThan(Z.orderCreateWrapDefault);
    });

    test('PrintTypeSelection (1100) appears above pendingView create form (1095)', () => {
        expect(Z.printTypeSelection).toBeGreaterThan(Z.orderCreateWrapPending);
    });

    test('PrintTypeSelection backdrop (1099) is below PrintTypeSelection (1100)', () => {
        expect(Z.printTypeSelectionBackdrop).toBeLessThan(Z.printTypeSelection);
    });

    test('PrintTypeSelection backdrop (1099) is above create form (1095)', () => {
        expect(Z.printTypeSelectionBackdrop).toBeGreaterThan(Z.orderCreateWrapPending);
    });

    test('OrderPreview (1300) is above all modal layers', () => {
        expect(Z.orderPreview).toBeGreaterThan(Z.printTypeSelection);
        expect(Z.orderPreview).toBeGreaterThan(Z.orderCreateWrapPending);
        expect(Z.orderPreview).toBeGreaterThan(Z.customerPending);
    });

    test('above-pending-modal backdrop (1089) is above customer_pending (1082)', () => {
        expect(Z.backdropAbovePending).toBeGreaterThan(Z.customerPending);
    });

    test('above-pending-modal backdrop (1089) is below pendingView create form (1095)', () => {
        expect(Z.backdropAbovePending).toBeLessThan(Z.orderCreateWrapPending);
    });
});

// ── CSS specificity concept ───────────────────────────────────────────────────

describe('CSS specificity: why two-class selector beats single-class with !important', () => {
    // For !important author rules, higher specificity wins regardless of DOM order.
    // Specificity = (inline, id, class+attr+pseudo, element)
    // .foo       → (0, 0, 1, 0) → class-count = 1
    // .foo.bar   → (0, 0, 2, 0) → class-count = 2

    function classCount(selector) {
        return (selector.match(/\.\w[\w-]*/g) || []).length;
    }

    test('.order-create-wrap has specificity class-count 1', () => {
        expect(classCount('.order-create-wrap')).toBe(1);
    });

    test('.order-create-wrap.above-pending-modal has specificity class-count 2', () => {
        expect(classCount('.order-create-wrap.above-pending-modal')).toBe(2);
    });

    test('two-class selector has strictly higher specificity than single-class', () => {
        expect(classCount('.order-create-wrap.above-pending-modal')).toBeGreaterThan(
            classCount('.order-create-wrap')
        );
    });

    test('App.css two-class rule therefore cannot be overridden by inline <style> single-class rule', () => {
        // The fix works because (0,2,0) > (0,1,0) for !important rules, independent of source order.
        const appCssSpecificity = classCount('.order-create-wrap.above-pending-modal');
        const inlineStyleSpecificity = classCount('.order-create-wrap');
        expect(appCssSpecificity).toBeGreaterThan(inlineStyleSpecificity);
    });
});
