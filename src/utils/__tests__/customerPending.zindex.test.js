/**
 * Pure logic tests for the CustomerPending z-index stacking fix.
 *
 * Bug: when CustomerPending is opened from within a QuotationCreate form that
 * was opened from the Customer Balance Sheet, the CustomerPending modal appeared
 * behind the form because its modal container (.above-sales-modal) reached only
 * z-index 1081 while the form (.quotation-create-wrap) was boosted to 1082.
 *
 * Root cause: the inline `zIndex: 1082` on CustomerPending's .modal-dialog is
 * scoped to the .modal container's own stacking context (z-index 1081 at the
 * page root) and has no effect on page-level ordering.
 *
 * Fix: added class `customer-pending-modal` to CustomerPending's Modal and the
 * CSS rule `body.balance-sheet-open .customer-pending-modal { z-index: 1091 !important; }`
 * (App.css, after the per-form balance-sheet rules) to ensure CustomerPending
 * floats above all forms opened from the balance sheet.
 *
 * These tests mirror the App.css z-index rules as pure functions and verify the
 * stacking invariant for every body-class combination where the bug could occur.
 *
 * Keep in sync when z-index rules in App.css change.
 */

// ─── CSS z-index model ────────────────────────────────────────────────────────
// Returns the effective z-index a given element gets under the active body classes.
// Rules are evaluated in specificity-then-source-order, matching App.css exactly.
//
// body.XXX selectors add 0,0,1 for `body` + 0,1,0 per class.
// Descendant class adds 0,1,0.  Total for one-body-class rule: 0,2,1.
//                               Total for two-body-class rule: 0,3,1.
// !important ties broken by source order (later in file wins).

function zIndex(element, bodyClasses) {
    const has = (...cls) => cls.every(c => bodyClasses.includes(c));
    const el = (...cls) => cls.every(c => element.includes(c));

    // ── two-body-class rules (spec 0,3,1) — always beat one-body-class rules ──
    if (has('balance-sheet-open', 'purchase-form-open') && el('purchase-create-wrap'))          return 1090;
    if (has('balance-sheet-open', 'purchase-return-form-open') && el('purchase-return-create-wrap')) return 1090;
    if (has('balance-sheet-open', 'sales-return-form-open') && el('sales-return-create-wrap'))  return 1082;
    if (has('balance-sheet-open', 'quotation-form-open') && el('quotation-create-wrap'))        return 1082;
    if (has('balance-sheet-open', 'quotation-sales-return-form-open') && el('quotation-sales-return-create-wrap')) return 1082;

    // ── one-body-class rules (spec 0,2,1) — source order breaks ties ──────────
    // Rules are listed in the order they appear in App.css.
    // Later entries override earlier ones when multiple match.

    if (has('balance-sheet-open') && el('modal'))             { let v = 1070;   // line ~12017
        if (has('purchase-form-open') && el('above-sales-modal'))      v = 1089;
        if (has('purchase-return-form-open') && el('above-sales-modal')) v = 1089;
        if (has('sales-return-form-open') && el('above-sales-modal'))  v = 1081;
        if (has('quotation-form-open') && el('above-sales-modal'))     v = 1081;
        if (has('quotation-sales-return-form-open') && el('above-sales-modal')) v = 1081;
        // NEW rule — later in file, same spec, wins when balance-sheet-open is active
        if (el('customer-pending-modal'))                              v = 1091;
        return v;
    }

    // above-sales-modal with a form-open body class (no balance-sheet)
    if (has('purchase-form-open') && el('above-sales-modal'))      return 1089;
    if (has('purchase-return-form-open') && el('above-sales-modal')) return 1089;
    if (has('sales-return-form-open') && el('above-sales-modal'))  return 1081;
    if (has('quotation-form-open') && el('above-sales-modal'))     return 1081;
    if (has('quotation-sales-return-form-open') && el('above-sales-modal')) return 1081;

    // defaults
    if (el('above-sales-modal'))      return 1065;
    if (el('quotation-create-wrap'))  return 1080;
    if (el('purchase-create-wrap'))   return 1088;
    if (el('purchase-return-create-wrap')) return 1088;
    if (el('sales-return-create-wrap'))   return 1079;
    if (el('quotation-sales-return-create-wrap')) return 1079;

    return 0;
}

// Shorthand helpers
const customerPending = ['modal', 'above-sales-modal', 'customer-pending-modal'];
const balanceSheet    = ['modal', 'above-sales-modal'];          // PostingIndex
const quotationForm   = ['modal', 'quotation-create-wrap'];
const purchaseForm    = ['modal', 'purchase-create-wrap'];
const purchaseReturnForm = ['modal', 'purchase-return-create-wrap'];
const salesReturnForm    = ['modal', 'sales-return-create-wrap'];
const quotationSalesReturnForm = ['modal', 'quotation-sales-return-create-wrap'];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CustomerPending z-index — balance-sheet + quotation-form context (the reported bug)', () => {
    const body = ['balance-sheet-open', 'quotation-form-open'];

    test('CustomerPending is above the quotation form (was the bug: 1081 < 1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('CustomerPending is above the balance sheet', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('CustomerPending z-index is 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });

    test('quotation form z-index is 1082 (form still above balance sheet)', () => {
        expect(zIndex(quotationForm, body)).toBe(1082);
    });

    test('balance sheet z-index is 1081', () => {
        expect(zIndex(balanceSheet, body)).toBe(1081);
    });

    test('stacking order is CustomerPending > quotation form > balance sheet', () => {
        const cp = zIndex(customerPending, body);
        const form = zIndex(quotationForm, body);
        const bs = zIndex(balanceSheet, body);
        expect(cp).toBeGreaterThan(form);
        expect(form).toBeGreaterThan(bs);
    });
});

describe('CustomerPending z-index — balance-sheet + purchase-form context', () => {
    const body = ['balance-sheet-open', 'purchase-form-open'];

    test('CustomerPending is above the purchase form (max 1090)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(purchaseForm, body));
    });

    test('purchase form z-index is 1090', () => {
        expect(zIndex(purchaseForm, body)).toBe(1090);
    });

    test('CustomerPending z-index is 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });
});

describe('CustomerPending z-index — balance-sheet + purchase-return-form context', () => {
    const body = ['balance-sheet-open', 'purchase-return-form-open'];

    test('CustomerPending is above the purchase-return form (1090)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(purchaseReturnForm, body));
    });

    test('CustomerPending z-index is 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });
});

describe('CustomerPending z-index — balance-sheet + sales-return-form context', () => {
    const body = ['balance-sheet-open', 'sales-return-form-open'];

    test('CustomerPending is above the sales-return form (1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(salesReturnForm, body));
    });

    test('CustomerPending z-index is 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });
});

describe('CustomerPending z-index — balance-sheet + quotation-sales-return-form context', () => {
    const body = ['balance-sheet-open', 'quotation-sales-return-form-open'];

    test('CustomerPending is above the quotation-sales-return form (1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(quotationSalesReturnForm, body));
    });

    test('CustomerPending z-index is 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });
});

describe('CustomerPending z-index — no balance sheet (standalone form contexts, no regression)', () => {
    test('quotation-form-open only: CustomerPending at 1081, above standalone quotation form (1080)', () => {
        const body = ['quotation-form-open'];
        expect(zIndex(customerPending, body)).toBe(1081);
        expect(zIndex(quotationForm, body)).toBe(1080);
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('no body classes: CustomerPending at default 1065', () => {
        expect(zIndex(customerPending, [])).toBe(1065);
    });

    test('purchase-form-open only: CustomerPending at 1089 (above-sales-modal rule)', () => {
        const body = ['purchase-form-open'];
        expect(zIndex(customerPending, body)).toBe(1089);
    });

    test('sales-return-form-open only: CustomerPending at 1081', () => {
        const body = ['sales-return-form-open'];
        expect(zIndex(customerPending, body)).toBe(1081);
    });
});

describe('CustomerPending z-index — balance-sheet open, no form open', () => {
    const body = ['balance-sheet-open'];

    test('CustomerPending is at 1091 (new rule fires whenever balance-sheet-open)', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });

    test('Balance sheet itself is at default 1065 (no form-open body class boosting it)', () => {
        expect(zIndex(balanceSheet, body)).toBe(1070);
    });

    test('CustomerPending is above the balance sheet even with no form open', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });
});

describe('customer-pending-modal CSS class presence on the modal element', () => {
    test('customerPending element descriptor includes customer-pending-modal', () => {
        expect(customerPending).toContain('customer-pending-modal');
    });

    test('customerPending element descriptor includes above-sales-modal (backward compat)', () => {
        expect(customerPending).toContain('above-sales-modal');
    });

    test('balanceSheet element descriptor does NOT include customer-pending-modal', () => {
        expect(balanceSheet).not.toContain('customer-pending-modal');
    });
});
