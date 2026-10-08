/**
 * Source-level tests for the CustomerPending Edit/View button z-index fix.
 *
 * Problem:
 *   When a form (e.g. SalesReturnCreate, QuotationCreate, QuotationSalesReturnCreate)
 *   opens inside CustomerPending with modalClass="above-pending-modal", it adds a
 *   body class (*-form-pending-open). App.css rules like:
 *
 *     body.quotation-form-pending-open .above-sales-modal { z-index: 1096 }
 *     body.sales-return-form-pending-open .above-sales-modal { z-index: 1096 }
 *
 *   were raising ALL .above-sales-modal elements — including CustomerPending itself
 *   (z-index 1096) — ABOVE the edit/view forms (z-index 1090). This made the forms
 *   invisible behind CustomerPending.
 *
 * Fix:
 *   Added :not(.customer-pending-modal) to both rules so CustomerPending is excluded
 *   from the z-index boost. Products modal and Quotations wrapper still get 1096.
 *   CustomerPending stays at 1065 (base) or 1081 (from non-pending body class rules),
 *   both of which are below the forms at 1090.
 */

const fs   = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'), 'utf8'
);

const CUSTOMER_PENDING_JS = fs.readFileSync(
    path.join(__dirname, '../customer_pending.js'), 'utf8'
);


// ── 1. CustomerPending uses customer-pending-modal class ──────────────────────

describe('customer_pending.js — has customer-pending-modal class for CSS targeting', () => {
    test('Modal has customer-pending-modal CSS class', () => {
        expect(CUSTOMER_PENDING_JS).toMatch(/className=["'][^"']*customer-pending-modal[^"']*["']/);
    });

    test('Modal also has above-sales-modal class (so :not(.customer-pending-modal) is meaningful)', () => {
        expect(CUSTOMER_PENDING_JS).toMatch(/className=["'][^"']*above-sales-modal[^"']*["']/);
    });

    test('Both classes are on the same modal element', () => {
        expect(CUSTOMER_PENDING_JS).toMatch(
            /className=["'][^"']*above-sales-modal[^"']*customer-pending-modal[^"']*["']/
        );
    });
});


// ── 2. App.css — quotation-form-pending-open rule excludes CustomerPending ────

describe('App.css — body.quotation-form-pending-open .above-sales-modal excludes CustomerPending', () => {
    test('rule uses :not(.customer-pending-modal) to exclude CustomerPending', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-form-pending-open\s+\.above-sales-modal:not\(\.customer-pending-modal\)\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('Products modal (above-sales-modal only, no customer-pending-modal) still matches rule', () => {
        function matchesRule(classes) {
            const hasAboveSalesModal = classes.includes('above-sales-modal');
            const hasCustomerPending = classes.includes('customer-pending-modal');
            return hasAboveSalesModal && !hasCustomerPending;
        }
        expect(matchesRule('products-modal-wrap above-sales-modal')).toBe(true);
        expect(matchesRule('above-sales-modal customer-pending-modal')).toBe(false);
    });

    test('Quotations wrapper (above-sales-modal only) still matches rule', () => {
        function matchesRule(classes) {
            const hasAboveSalesModal = classes.includes('above-sales-modal');
            const hasCustomerPending = classes.includes('customer-pending-modal');
            return hasAboveSalesModal && !hasCustomerPending;
        }
        expect(matchesRule('modal show above-sales-modal')).toBe(true);
    });

    test('CustomerPending (above-sales-modal + customer-pending-modal) does NOT match rule', () => {
        function matchesRule(classes) {
            const hasAboveSalesModal = classes.includes('above-sales-modal');
            const hasCustomerPending = classes.includes('customer-pending-modal');
            return hasAboveSalesModal && !hasCustomerPending;
        }
        expect(matchesRule('modal show above-sales-modal customer-pending-modal')).toBe(false);
    });
});


// ── 3. App.css — sales-return-form-pending-open rule excludes CustomerPending ─

describe('App.css — body.sales-return-form-pending-open .above-sales-modal excludes CustomerPending', () => {
    test('rule uses :not(.customer-pending-modal) to exclude CustomerPending', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-pending-open\s+\.above-sales-modal:not\(\.customer-pending-modal\)\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('above-pending-form-sub rule is unchanged (still without :not)', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-pending-open\s+\.above-pending-form-sub\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });
});


// ── 4. z-index stacking after fix — forms remain above CustomerPending ────────

describe('z-index stacking after fix — edit/view forms above CustomerPending', () => {
    const CUSTOMER_PENDING_BASE     = 1065; // .above-sales-modal base
    const CUSTOMER_PENDING_FORM_OPEN = 1081; // body.quotation-form-open .above-sales-modal (non-pending rule)
    const FORM_PENDING_Z            = 1090; // .above-pending-modal (forms with above-pending-modal)
    const SUB_MODAL_PENDING_Z       = 1096; // above-sales-modal:not(.customer-pending-modal) when pending

    test('CustomerPending base (1065) is below any edit/view form (1090)', () => {
        expect(FORM_PENDING_Z).toBeGreaterThan(CUSTOMER_PENDING_BASE);
    });

    test('CustomerPending with quotation-form-open body class (1081) is still below form (1090)', () => {
        expect(FORM_PENDING_Z).toBeGreaterThan(CUSTOMER_PENDING_FORM_OPEN);
    });

    test('CustomerPending does NOT reach 1096 — forms (1090) remain above it', () => {
        expect(FORM_PENDING_Z).toBeGreaterThan(CUSTOMER_PENDING_FORM_OPEN);
        expect(CUSTOMER_PENDING_FORM_OPEN).toBeLessThan(FORM_PENDING_Z);
    });

    test('Products/Quotations wrapper (1096) is above edit form (1090) — sub-modal flow intact', () => {
        expect(SUB_MODAL_PENDING_Z).toBeGreaterThan(FORM_PENDING_Z);
    });
});


// ── 5. App.css — above-pending-form-sub rules are unchanged ──────────────────

describe('App.css — above-pending-form-sub rules unchanged by fix', () => {
    test('quotation-form-pending-open .above-pending-form-sub still at 1096', () => {
        expect(APP_CSS).toMatch(
            /body\.quotation-form-pending-open\s+\.above-pending-form-sub\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('sales-return-form-pending-open .above-pending-form-sub still at 1096', () => {
        expect(APP_CSS).toMatch(
            /body\.sales-return-form-pending-open\s+\.above-pending-form-sub\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });
});
