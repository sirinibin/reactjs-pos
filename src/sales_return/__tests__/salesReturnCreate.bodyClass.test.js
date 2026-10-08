/**
 * Source-level tests for the sales-return-form-pending-open body class
 * added to sales_return/create.js.
 *
 * When the sales return form is opened from inside CustomerPending
 * (props.modalClass === 'above-pending-modal'), the body class
 * 'sales-return-form-pending-open' is added so that App.css can target
 * sub-modals (ImageViewerModal, Linked Products) and raise their z-index
 * to 1096, above the edit form at 1095.
 *
 * The base class 'sales-return-form-open' is always added (for non-pending
 * sub-modal rules already in App.css).
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '../create.js'), 'utf8'
);
const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'), 'utf8'
);


// ── 1. Body class added in create.js ─────────────────────────────────────────

describe('sales_return/create.js — sales-return-form-pending-open body class', () => {
    test('body class sales-return-form-pending-open is added when modalClass is above-pending-modal', () => {
        expect(SRC).toMatch(
            /props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\)[\s\S]*?classList\.add\(['"]sales-return-form-pending-open['"]\)/
        );
    });

    test('body class sales-return-form-pending-open is removed on cleanup', () => {
        expect(SRC).toMatch(/classList\.remove\(['"]sales-return-form-pending-open['"]\)/);
    });

    test('body class sales-return-form-open is still added unconditionally for base rules', () => {
        expect(SRC).toMatch(/classList\.add\(['"]sales-return-form-open['"]\)/);
    });

    test('body class sales-return-form-open is removed on cleanup', () => {
        expect(SRC).toMatch(/classList\.remove\(['"]sales-return-form-open['"]\)/);
    });

    test('both classes appear in the same useEffect (same remove block)', () => {
        // Find the remove block — both removes should be close together
        const removeIdx1 = SRC.indexOf("classList.remove('sales-return-form-open')");
        const removeIdx2 = SRC.indexOf("classList.remove('sales-return-form-pending-open')");
        expect(removeIdx1).toBeGreaterThan(-1);
        expect(removeIdx2).toBeGreaterThan(-1);
        // Both removes are within 200 characters of each other (same cleanup block)
        expect(Math.abs(removeIdx2 - removeIdx1)).toBeLessThan(200);
    });
});


// ── 2. App.css rules for sales-return-form-pending-open ──────────────────────

describe('App.css — rules for sales-return-form-pending-open', () => {
    test('above-sales-modal:not(.customer-pending-modal) is raised to 1096 when sales-return-form-pending-open', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-pending-open\s+\.above-sales-modal:not\(\.customer-pending-modal\)\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('CustomerPending is excluded from the 1096 rule via :not(.customer-pending-modal)', () => {
        const rule = APP_CSS.match(
            /body\.sales-return-form-pending-open\s+(\.above-sales-modal[^{]*)\{/
        )?.[1] || '';
        expect(rule).toMatch(/:not\(\.customer-pending-modal\)/);
    });

    test('above-pending-form-sub is raised to 1096 when sales-return-form-pending-open', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-pending-open\s+\.above-pending-form-sub\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });
});


// ── 3. Stacking correctness ───────────────────────────────────────────────────

describe('z-index stacking when sales return edit form is inside CustomerPending', () => {
    const CUSTOMER_PENDING_Z      = 1082;
    const EDIT_FORM_PENDING_Z     = 1095; // .order-create-wrap.above-pending-modal
    const SUB_MODAL_PENDING_Z     = 1096; // body.sales-return-form-pending-open .above-sales-modal

    test('edit form (1095) is above CustomerPending (1082)', () => {
        expect(EDIT_FORM_PENDING_Z).toBeGreaterThan(CUSTOMER_PENDING_Z);
    });

    test('sub-modal (1096) is above edit form (1095)', () => {
        expect(SUB_MODAL_PENDING_Z).toBeGreaterThan(EDIT_FORM_PENDING_Z);
    });

    test('gap is exactly 1 — tight but unambiguous', () => {
        expect(SUB_MODAL_PENDING_Z - EDIT_FORM_PENDING_Z).toBe(1);
    });
});
