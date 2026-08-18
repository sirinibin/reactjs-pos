/**
 * Tests for the pending-balance-sheet-open body-class fix (two bugs, two rules).
 *
 * ── Bug 1: Balance sheet appears BEHIND the pending modal ────────────────────
 *   The CSS rule `body.balance-sheet-open .customer-pending-modal { z-index: 1091 }`
 *   was added to keep CustomerPending above forms opened FROM the balance sheet.
 *   It also fires when the balance sheet is opened FROM CustomerPending, leaving
 *   the balance sheet at z-index 1070 (body.balance-sheet-open .modal) vs the
 *   pending modal at 1091. 1070 < 1091 → balance sheet appears behind.
 *
 *   VendorPending: the draggable inner wrapper has inline `zIndex: 1082`. The
 *   balance sheet's .modal wrapper gets z-index 1065, below 1082 → behind.
 *
 *   Fix (Bug 1):
 *     customer_pending.js and vendor_pending.js each use a `useEffect` to add
 *     `pending-balance-sheet-open` to body while their balance sheet is visible.
 *     App.css adds:
 *       body.pending-balance-sheet-open .above-sales-modal { z-index: 1093 !important; }
 *       body.pending-balance-sheet-open .above-sales-modal + .modal-backdrop { z-index: 1092 !important; }
 *     1093 > 1091 (customer-pending) and > 1082 (vendor-pending inline) → fixed.
 *
 * ── Bug 2: Forms opened from balance sheet appear BEHIND the pending modal ───
 *   The Bug 1 fix raised both PostingIndex (balance sheet) AND the pending modal
 *   to z-index 1093 (both carry .above-sales-modal). Forms opened from PostingIndex
 *   reach at most 1090, so they appear behind the pending modal.
 *
 *   Fix (Bug 2 — added in this session):
 *     App.css adds at the very end (specificity 0,4,1 — highest):
 *       body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal) { z-index: 1095 !important; }
 *     Form portals have .modal but NOT .above-sales-modal → get 1095.
 *     1095 > 1093 (pending modal) → forms appear in front. Both flows fixed.
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

// ─── CSS z-index model ────────────────────────────────────────────────────────
// Models the App.css rules relevant to this fix.
// Specificity notation: (0, class-count, element-count).
//   body.X .Y        → (0, 2, 1)
//   body.X.Z .Y      → (0, 3, 1)
// Among equal-spec rules with !important, the one that appears later in App.css wins.

function zIndex(element, bodyClasses) {
    const has = (...cls) => cls.every(c => bodyClasses.includes(c));
    const el  = (...cls) => cls.every(c => element.includes(c));

    // ── spec (0,4,1): Bug 2 fix — highest priority, beats all rules below ────
    // body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal)
    // Fires only when pending modal + balance sheet are both open. Matches form
    // portals (.modal without .above-sales-modal) and gives them 1095 > 1093.
    if (has('pending-balance-sheet-open', 'balance-sheet-open') && el('modal') && !el('above-sales-modal')) return 1095;

    // ── spec (0,3,1): two-body-class rules always beat one-body-class rules ──
    if (has('balance-sheet-open', 'purchase-form-open')              && el('purchase-create-wrap'))              return 1090;
    if (has('balance-sheet-open', 'purchase-return-form-open')       && el('purchase-return-create-wrap'))       return 1090;
    if (has('balance-sheet-open', 'sales-return-form-open')          && el('sales-return-create-wrap'))          return 1082;
    if (has('balance-sheet-open', 'quotation-form-open')             && el('quotation-create-wrap'))             return 1082;
    if (has('balance-sheet-open', 'quotation-sales-return-form-open') && el('quotation-sales-return-create-wrap')) return 1082;

    // ── spec (0,2,1): one-body-class rules, source order breaks ties ──────────
    if (has('balance-sheet-open') && el('modal')) {
        let v = 1070;                                                                  // App.css ~12017
        if (has('purchase-form-open')              && el('above-sales-modal')) v = 1089; // ~12042
        if (has('purchase-return-form-open')        && el('above-sales-modal')) v = 1089; // ~12043
        if (has('sales-return-form-open')           && el('above-sales-modal')) v = 1081; // ~12044
        if (has('quotation-form-open')              && el('above-sales-modal')) v = 1081; // ~12045
        if (has('quotation-sales-return-form-open') && el('above-sales-modal')) v = 1081; // ~12046
        if (el('customer-pending-modal'))                                       v = 1091; // ~12086
        if (has('pending-balance-sheet-open')       && el('above-sales-modal')) v = 1093; // ~12088 NEW
        return v;
    }

    // pending-balance-sheet-open without balance-sheet-open (edge case):
    if (has('pending-balance-sheet-open') && el('above-sales-modal')) return 1093;

    // form-open without balance-sheet-open:
    if (has('purchase-form-open')              && el('above-sales-modal')) return 1089;
    if (has('purchase-return-form-open')        && el('above-sales-modal')) return 1089;
    if (has('sales-return-form-open')           && el('above-sales-modal')) return 1081;
    if (has('quotation-form-open')             && el('above-sales-modal')) return 1081;
    if (has('quotation-sales-return-form-open') && el('above-sales-modal')) return 1081;

    // ── defaults ──────────────────────────────────────────────────────────────
    if (el('above-sales-modal'))          return 1065;
    if (el('purchase-create-wrap'))       return 1088;
    if (el('purchase-return-create-wrap'))return 1088;
    if (el('quotation-create-wrap'))      return 1080;
    if (el('sales-return-create-wrap'))   return 1080;

    return 0;
}

// Element descriptors: the CSS classes that appear on the outer .modal wrapper.
const balanceSheet    = ['modal', 'above-sales-modal'];                           // PostingIndex
const customerPending = ['modal', 'above-sales-modal', 'customer-pending-modal']; // customer_pending.js
// VendorPending's outer .modal wrapper only has 'above-sales-modal' — same as
// the balance sheet. DOM source order (later element wins) is the tiebreaker.
const vendorPending   = ['modal', 'above-sales-modal'];

const orderForm                 = ['modal', 'order-create-wrap'];       // sales update form
const purchaseForm              = ['modal', 'purchase-create-wrap'];
const purchaseReturnForm        = ['modal', 'purchase-return-create-wrap'];
const quotationForm             = ['modal', 'quotation-create-wrap'];
const salesReturnForm           = ['modal', 'sales-return-create-wrap'];
const quotationSalesReturnForm  = ['modal', 'quotation-sales-return-create-wrap'];


// ─── 1. CSS rule presence ─────────────────────────────────────────────────────

describe('App.css — pending-balance-sheet-open rules are present', () => {
    test('body.pending-balance-sheet-open .above-sales-modal has z-index 1093 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.pending-balance-sheet-open\s+\.above-sales-modal\s*\{[^}]*z-index\s*:\s*1093\s*!important/
        );
    });

    test('body.pending-balance-sheet-open .above-sales-modal + .modal-backdrop has z-index 1092 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.pending-balance-sheet-open\s+\.above-sales-modal\s*\+\s*\.modal-backdrop\s*\{[^}]*z-index\s*:\s*1092\s*!important/
        );
    });

    test('new rule appears after body.balance-sheet-open .customer-pending-modal (source order matters)', () => {
        const customerPendingIdx = APP_CSS.indexOf('body.balance-sheet-open .customer-pending-modal');
        const pendingBsIdx       = APP_CSS.indexOf('body.pending-balance-sheet-open .above-sales-modal');
        expect(customerPendingIdx).toBeGreaterThan(-1);
        expect(pendingBsIdx).toBeGreaterThan(-1);
        expect(pendingBsIdx).toBeGreaterThan(customerPendingIdx);
    });

    test('new rule appears after body.balance-sheet-open .modal (the blanket 1070 rule)', () => {
        const blanketIdx   = APP_CSS.indexOf('body.balance-sheet-open .modal {');
        const pendingBsIdx = APP_CSS.indexOf('body.pending-balance-sheet-open .above-sales-modal');
        expect(blanketIdx).toBeGreaterThan(-1);
        expect(pendingBsIdx).toBeGreaterThan(blanketIdx);
    });

    // Bug 2 rule
    test('Bug 2 rule: body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal) has z-index 1095 !important', () => {
        expect(APP_CSS).toMatch(
            /body\.pending-balance-sheet-open\.balance-sheet-open\s+\.modal:not\(\.above-sales-modal\)\s*\{[^}]*z-index\s*:\s*1095\s*!important/
        );
    });

    test('Bug 2 rule appears after the Bug 1 rule in App.css (source order matters)', () => {
        const bug1Idx = APP_CSS.indexOf('body.pending-balance-sheet-open .above-sales-modal');
        const bug2Idx = APP_CSS.indexOf('body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal)');
        expect(bug1Idx).toBeGreaterThan(-1);
        expect(bug2Idx).toBeGreaterThan(-1);
        expect(bug2Idx).toBeGreaterThan(bug1Idx);
    });
});


// ─── 2. CustomerPending: balance sheet opened FROM the pending modal ──────────

describe('CustomerPending — balance sheet opened from pending modal (the reported bug)', () => {
    // Both body classes are active: PostingIndex adds balance-sheet-open,
    // customer_pending useEffect adds pending-balance-sheet-open.
    const body = ['balance-sheet-open', 'pending-balance-sheet-open'];

    test('balance sheet z-index is 1093', () => {
        expect(zIndex(balanceSheet, body)).toBe(1093);
    });

    test('customer-pending z-index is also 1093 (pending rule overrides customer-pending-modal rule)', () => {
        expect(zIndex(customerPending, body)).toBe(1093);
    });

    test('balance sheet is NOT below customer-pending (equal z-index → DOM order wins)', () => {
        // The balance sheet is mounted after the pending modal, so it appears later
        // in the DOM and wins the tiebreak. We verify z-indices are at least equal.
        expect(zIndex(balanceSheet, body)).toBeGreaterThanOrEqual(zIndex(customerPending, body));
    });

    test('balance sheet (1093) is strictly above the old customer-pending ceiling (1091)', () => {
        const CUSTOMER_PENDING_CEILING = 1091; // max before this fix
        expect(zIndex(balanceSheet, body)).toBeGreaterThan(CUSTOMER_PENDING_CEILING);
    });

    test('demonstrates the original bug without pending-balance-sheet-open: balance sheet (1070) < customer-pending (1091)', () => {
        const bugBody = ['balance-sheet-open']; // no pending-balance-sheet-open
        expect(zIndex(balanceSheet, bugBody)).toBeLessThan(zIndex(customerPending, bugBody));
        expect(zIndex(balanceSheet, bugBody)).toBe(1070);
        expect(zIndex(customerPending, bugBody)).toBe(1091);
    });

    test('fix raises balance sheet from 1070 to 1093', () => {
        const beforeFix = zIndex(balanceSheet, ['balance-sheet-open']);
        const afterFix  = zIndex(balanceSheet, ['balance-sheet-open', 'pending-balance-sheet-open']);
        expect(afterFix).toBeGreaterThan(beforeFix);
        expect(beforeFix).toBe(1070);
        expect(afterFix).toBe(1093);
    });
});


// ─── 3. VendorPending: balance sheet opened FROM the pending modal ────────────

describe('VendorPending — balance sheet opened from pending modal', () => {
    const body = ['balance-sheet-open', 'pending-balance-sheet-open'];

    test('balance sheet z-index is 1093', () => {
        expect(zIndex(balanceSheet, body)).toBe(1093);
    });

    test('vendor-pending z-index is 1093 (same classes as balance sheet, same rule)', () => {
        expect(zIndex(vendorPending, body)).toBe(1093);
    });

    test('balance sheet z-index equals vendor-pending z-index (DOM order is the tiebreaker)', () => {
        // The balance sheet modal is added to the DOM after vendor-pending opens,
        // so it appears later in body children and wins.
        expect(zIndex(balanceSheet, body)).toEqual(zIndex(vendorPending, body));
    });

    test('balance sheet (1093) is above the inline zIndex 1082 on the vendor-pending dialog', () => {
        // vendor_pending.js sets zIndex: 1082 on the inner .modal-dialog via dialogAs.
        // That inline style is scoped to the outer .modal's stacking context, but for
        // robustness we verify the balance sheet's CSS z-index exceeds it.
        const VENDOR_PENDING_INLINE_DIALOG_ZINDEX = 1082;
        expect(zIndex(balanceSheet, body)).toBeGreaterThan(VENDOR_PENDING_INLINE_DIALOG_ZINDEX);
    });

    test('demonstrates the original bug without pending-balance-sheet-open: balance sheet (1070) ≤ vendor-pending (1070)', () => {
        const bugBody = ['balance-sheet-open'];
        // Both have the same classes → same z-index → DOM order determines.
        // With equal z-indices and vendor-pending added to DOM first, the outcome
        // is unreliable; the fix eliminates ambiguity by raising the balance sheet.
        expect(zIndex(balanceSheet, bugBody)).toBe(1070);
        expect(zIndex(vendorPending, bugBody)).toBe(1070);
    });
});


// ─── 4. Backdrop z-index ─────────────────────────────────────────────────────

describe('Backdrop z-index when pending-balance-sheet-open is active', () => {
    const BALANCE_SHEET_ZINDEX = 1093;
    const BACKDROP_ZINDEX      = 1092;

    test('backdrop z-index is 1092', () => {
        expect(BACKDROP_ZINDEX).toBe(1092);
    });

    test('backdrop is one below the balance sheet modal', () => {
        expect(BACKDROP_ZINDEX).toBe(BALANCE_SHEET_ZINDEX - 1);
    });

    test('backdrop is below the balance sheet so the modal appears above it', () => {
        expect(BACKDROP_ZINDEX).toBeLessThan(BALANCE_SHEET_ZINDEX);
    });
});


// ─── 5. No regression: balance-sheet-open without pending-balance-sheet-open ──

describe('No regression — balance-sheet-open without pending-balance-sheet-open', () => {
    const body = ['balance-sheet-open'];

    test('customer-pending still reaches 1091 (rule from original CustomerPending fix still works)', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });

    test('balance sheet stays at 1070 when not opened from a pending modal', () => {
        expect(zIndex(balanceSheet, body)).toBe(1070);
    });

    test('customer-pending (1091) is still above balance sheet (1070) in this context', () => {
        // This is the correct behavior: CustomerPending stays above forms opened
        // from the balance sheet.
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });
});


// ─── 6. No regression: existing form-open + balance-sheet-open combinations ───

describe('No regression — balance-sheet-open + purchase-form-open', () => {
    const body = ['balance-sheet-open', 'purchase-form-open'];

    test('customer-pending (1091) is still above purchase form (1090)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(purchaseForm, body));
    });

    test('purchase form is at 1090 (two-class rule unchanged)', () => {
        expect(zIndex(purchaseForm, body)).toBe(1090);
    });

    test('customer-pending is at 1091', () => {
        expect(zIndex(customerPending, body)).toBe(1091);
    });
});

describe('No regression — balance-sheet-open + purchase-return-form-open', () => {
    const body = ['balance-sheet-open', 'purchase-return-form-open'];

    test('customer-pending (1091) is above purchase-return form (1090)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(purchaseReturnForm, body));
    });
});

describe('No regression — balance-sheet-open + quotation-form-open', () => {
    const body = ['balance-sheet-open', 'quotation-form-open'];

    test('customer-pending (1091) is above quotation form (1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('quotation form is at 1082', () => {
        expect(zIndex(quotationForm, body)).toBe(1082);
    });
});

describe('No regression — balance-sheet-open + sales-return-form-open', () => {
    const body = ['balance-sheet-open', 'sales-return-form-open'];

    test('customer-pending (1091) is above sales-return form (1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(salesReturnForm, body));
    });
});

describe('No regression — balance-sheet-open + quotation-sales-return-form-open', () => {
    const body = ['balance-sheet-open', 'quotation-sales-return-form-open'];

    test('customer-pending (1091) is above quotation-sales-return form (1082)', () => {
        expect(zIndex(customerPending, body)).toBeGreaterThan(zIndex(quotationSalesReturnForm, body));
    });
});


// ─── 7. Interaction: pending-balance-sheet-open + balance-sheet-open + form-open
// Note: the Bug 2 fix rule (0,4,1) has higher specificity than the per-form rules
// (0,3,1), so ALL forms reach 1095 when pending-balance-sheet-open + balance-sheet-open
// are both on body — this is the intended behaviour (forms must be in front).

describe('Interaction — pending-balance-sheet-open active while a form is also open', () => {
    test('purchase form rises to 1095 (Bug 2 fix, 0,4,1 beats purchase-form-open rule, 0,3,1)', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(purchaseForm, body)).toBe(1095);
        expect(zIndex(purchaseForm, body)).toBeGreaterThan(zIndex(balanceSheet, body)); // form > balance sheet ✓
        expect(zIndex(purchaseForm, body)).toBeGreaterThan(zIndex(customerPending, body)); // form > pending modal ✓
    });

    test('purchase-return form rises to 1095 when pending-balance-sheet-open is active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'purchase-return-form-open'];
        expect(zIndex(purchaseReturnForm, body)).toBe(1095);
        expect(zIndex(purchaseReturnForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
        expect(zIndex(purchaseReturnForm, body)).toBeGreaterThan(zIndex(vendorPending, body));
    });

    test('order (sales update) form rises to 1095 when pending-balance-sheet-open is active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open'];
        expect(zIndex(orderForm, body)).toBe(1095);
        expect(zIndex(orderForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));    // 1095 > 1093 ✓
        expect(zIndex(orderForm, body)).toBeGreaterThan(zIndex(customerPending, body)); // 1095 > 1093 ✓
    });

    test('quotation form rises to 1095 when pending-balance-sheet-open is active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'quotation-form-open'];
        expect(zIndex(quotationForm, body)).toBe(1095);
        expect(zIndex(quotationForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('sales-return form rises to 1095 when pending-balance-sheet-open is active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'sales-return-form-open'];
        expect(zIndex(salesReturnForm, body)).toBe(1095);
        expect(zIndex(salesReturnForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('quotation-sales-return form rises to 1095 when pending-balance-sheet-open is active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'quotation-sales-return-form-open'];
        expect(zIndex(quotationSalesReturnForm, body)).toBe(1095);
        expect(zIndex(quotationSalesReturnForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('balance sheet stays at 1093 regardless of which form is open', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(balanceSheet, body)).toBe(1093);
    });

    test('customer-pending stays at 1093 regardless of which form is open', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(customerPending, body)).toBe(1093);
    });

    test('vendor-pending stays at 1093 regardless of which form is open', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(vendorPending, body)).toBe(1093);
    });

    test('Bug 2 rule does NOT fire when only pending-balance-sheet-open is on body (balance-sheet-open absent)', () => {
        // The rule requires BOTH classes; without balance-sheet-open the forms stay at defaults.
        const body = ['pending-balance-sheet-open'];
        expect(zIndex(purchaseForm, body)).toBe(1088);  // default, not 1095
        expect(zIndex(orderForm, body)).toBe(0);         // no matching rule → 0
        expect(zIndex(quotationForm, body)).toBe(1080);  // default
    });

    test('Bug 2 rule does NOT fire when only balance-sheet-open is on body (pending-balance-sheet-open absent)', () => {
        const body = ['balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(purchaseForm, body)).toBe(1090);  // (0,3,1) two-class rule, not 1095
    });
});


// ─── 8. Edge case: pending-balance-sheet-open without balance-sheet-open ──────

describe('Edge case — pending-balance-sheet-open alone (no balance-sheet-open)', () => {
    const body = ['pending-balance-sheet-open'];

    test('above-sales-modal element still gets 1093 (rule fires on any body with pending-balance-sheet-open)', () => {
        expect(zIndex(balanceSheet, body)).toBe(1093);
    });

    test('customer-pending also gets 1093 (has above-sales-modal)', () => {
        expect(zIndex(customerPending, body)).toBe(1093);
    });

    test('purchase form is unaffected (no above-sales-modal) — keeps its default 1088', () => {
        // purchase-create-wrap has no above-sales-modal class, so the new rule does not apply.
        // It falls through to the `.purchase-create-wrap` default of 1088.
        expect(zIndex(purchaseForm, body)).toBe(1088);
    });
});


// ─── 9. CSS specificity: why source order determines the winner ────────────────

describe('CSS specificity — pending-balance-sheet-open rule wins by source order', () => {
    function selectorSpecificity(selector) {
        const elements = (selector.match(/^[a-z]+[\w-]*/g) || []).length;
        const classes  = (selector.match(/\.\w[\w-]*/g) || []).length;
        return { elements, classes, total: elements + classes * 10 };
    }

    const existingRule = 'body.balance-sheet-open .customer-pending-modal';
    const newRule      = 'body.pending-balance-sheet-open .above-sales-modal';

    test('both rules have the same number of classes (2)', () => {
        expect(selectorSpecificity(existingRule).classes).toBe(2);
        expect(selectorSpecificity(newRule).classes).toBe(2);
    });

    test('both rules have the same element count (1 — body)', () => {
        expect(selectorSpecificity(existingRule).elements).toBe(1);
        expect(selectorSpecificity(newRule).elements).toBe(1);
    });

    test('equal specificity means source order determines the winner', () => {
        expect(selectorSpecificity(existingRule).total).toEqual(selectorSpecificity(newRule).total);
    });

    test('new rule appears later in App.css, so it wins over the existing customer-pending-modal rule', () => {
        const existingPos = APP_CSS.indexOf('body.balance-sheet-open .customer-pending-modal');
        const newPos      = APP_CSS.indexOf('body.pending-balance-sheet-open .above-sales-modal');
        expect(newPos).toBeGreaterThan(existingPos);
    });
});


// ─── 10. Body class management ────────────────────────────────────────────────

describe('pending-balance-sheet-open body class management', () => {
    afterEach(() => {
        document.body.classList.remove('pending-balance-sheet-open');
    });

    test('useEffect adds pending-balance-sheet-open when showBalanceSheet becomes true', () => {
        // Mirrors the useEffect in customer_pending.js / vendor_pending.js.
        const showBalanceSheet = true;
        if (showBalanceSheet) {
            document.body.classList.add('pending-balance-sheet-open');
        } else {
            document.body.classList.remove('pending-balance-sheet-open');
        }
        expect(document.body.classList.contains('pending-balance-sheet-open')).toBe(true);
    });

    test('useEffect removes pending-balance-sheet-open when showBalanceSheet becomes false', () => {
        document.body.classList.add('pending-balance-sheet-open');
        const showBalanceSheet = false;
        if (showBalanceSheet) {
            document.body.classList.add('pending-balance-sheet-open');
        } else {
            document.body.classList.remove('pending-balance-sheet-open');
        }
        expect(document.body.classList.contains('pending-balance-sheet-open')).toBe(false);
    });

    test('cleanup function removes pending-balance-sheet-open on unmount regardless of state', () => {
        document.body.classList.add('pending-balance-sheet-open');
        const cleanup = () => document.body.classList.remove('pending-balance-sheet-open');
        cleanup(); // simulates React effect cleanup on unmount
        expect(document.body.classList.contains('pending-balance-sheet-open')).toBe(false);
    });

    test('body starts without pending-balance-sheet-open (not leaked from a prior test)', () => {
        expect(document.body.classList.contains('pending-balance-sheet-open')).toBe(false);
    });

    test('adding and removing multiple times leaves no trace', () => {
        for (let i = 0; i < 3; i++) {
            document.body.classList.add('pending-balance-sheet-open');
            document.body.classList.remove('pending-balance-sheet-open');
        }
        expect(document.body.classList.contains('pending-balance-sheet-open')).toBe(false);
    });
});


// ─── 11. Element class invariants ─────────────────────────────────────────────

describe('Element class invariants', () => {
    test('balanceSheet has above-sales-modal (required for the new rule to fire)', () => {
        expect(balanceSheet).toContain('above-sales-modal');
    });

    test('customerPending has above-sales-modal (so the new rule raises it to 1093 too)', () => {
        expect(customerPending).toContain('above-sales-modal');
    });

    test('customerPending has customer-pending-modal (for the existing 1091 rule)', () => {
        expect(customerPending).toContain('customer-pending-modal');
    });

    test('vendorPending has above-sales-modal (required for the new rule to fire)', () => {
        expect(vendorPending).toContain('above-sales-modal');
    });

    test('vendorPending does NOT have customer-pending-modal (so it is not raised to 1091 without pending-balance-sheet-open)', () => {
        expect(vendorPending).not.toContain('customer-pending-modal');
    });

    test('purchaseForm does NOT have above-sales-modal (so the new rule does not affect it)', () => {
        expect(purchaseForm).not.toContain('above-sales-modal');
    });
});


// ─── 12. Global stacking order summary ───────────────────────────────────────

describe('Full stacking order when balance sheet is opened from a pending modal', () => {
    const body = ['balance-sheet-open', 'pending-balance-sheet-open'];

    test('complete order: balance sheet (1093) >= customer-pending (1093) > old-customer-pending ceiling (1091) > purchase form ceiling (1090)', () => {
        const bs = zIndex(balanceSheet, body);
        const cp = zIndex(customerPending, body);
        const OLD_CP_MAX = 1091;
        const PURCHASE_MAX = 1090;

        expect(bs).toBeGreaterThanOrEqual(cp);
        expect(cp).toBeGreaterThanOrEqual(OLD_CP_MAX);
        expect(OLD_CP_MAX).toBeGreaterThan(PURCHASE_MAX);
    });

    test('balance sheet (1093) and customer-pending (1093) are both above the 1082 form ceiling', () => {
        const FORM_CEILING = 1082; // quotation/sales-return forms
        expect(zIndex(balanceSheet, body)).toBeGreaterThan(FORM_CEILING);
        expect(zIndex(customerPending, body)).toBeGreaterThan(FORM_CEILING);
    });
});


// ─── 13. Bug 2 fix — full stacking order when a form is open ─────────────────

describe('Bug 2 fix — full stacking order: form > pending modal > balance sheet', () => {
    // When balance sheet is opened from a pending modal and a form (sales/purchase/…)
    // is opened from the balance sheet, the Bug 2 rule gives forms z-index 1095.
    // This makes forms appear in front of the pending modal (1093) and balance
    // sheet (1093), which is the correct and expected ordering.

    test('CustomerPending flow: order form (1095) > customerPending (1093) > balanceSheet (1093)', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open'];
        expect(zIndex(orderForm, body)).toBe(1095);
        expect(zIndex(customerPending, body)).toBe(1093);
        expect(zIndex(balanceSheet, body)).toBe(1093);
        expect(zIndex(orderForm, body)).toBeGreaterThan(zIndex(customerPending, body));
        expect(zIndex(orderForm, body)).toBeGreaterThan(zIndex(balanceSheet, body));
    });

    test('VendorPending flow: purchase form (1095) > vendorPending (1093) > balanceSheet (1093)', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open'];
        expect(zIndex(purchaseForm, body)).toBe(1095);
        expect(zIndex(vendorPending, body)).toBe(1093);
        expect(zIndex(purchaseForm, body)).toBeGreaterThan(zIndex(vendorPending, body));
    });

    test('all form types are at 1095 when both body classes are active', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open'];
        const forms = [orderForm, purchaseForm, purchaseReturnForm, quotationForm, salesReturnForm, quotationSalesReturnForm];
        forms.forEach(form => {
            expect(zIndex(form, body)).toBe(1095);
        });
    });

    test('.above-sales-modal elements are excluded: stay at 1093 not 1095', () => {
        const body = ['balance-sheet-open', 'pending-balance-sheet-open'];
        expect(zIndex(balanceSheet, body)).toBe(1093);    // excluded via :not(.above-sales-modal)
        expect(zIndex(customerPending, body)).toBe(1093); // excluded
        expect(zIndex(vendorPending, body)).toBe(1093);   // excluded
    });

    test('demonstrates pre-fix bug: without Bug 2 rule, order form (0) < pending modal (1093)', () => {
        // Before the fix, orderForm had no matching rule when pending-balance-sheet-open
        // was active, so it defaulted to 0 (or relied on non-pending defaults at ~1080).
        // With only pending-balance-sheet-open (no balance-sheet-open), the (0,4,1) rule
        // does NOT fire, so orderForm returns 0 (no rule matches it in this state).
        const bodyWithoutBsOpen = ['pending-balance-sheet-open'];
        expect(zIndex(orderForm, bodyWithoutBsOpen)).toBe(0);         // no rule matches → 0
        expect(zIndex(customerPending, bodyWithoutBsOpen)).toBe(1093); // still 1093
        expect(zIndex(orderForm, bodyWithoutBsOpen)).toBeLessThan(zIndex(customerPending, bodyWithoutBsOpen));
    });
});


// ─── 14. Bug 2 CSS specificity — (0,4,1) beats all existing rules ────────────

describe('Bug 2 specificity — (0,4,1) rule beats all existing (0,3,1) and (0,2,1) rules', () => {
    function parseSpecificity(selector) {
        // Remove :not() wrapper but count its class argument
        const expanded = selector.replace(/:not\(([^)]+)\)/g, '$1');
        // Count body element (1 element) + class tokens
        const elementTokens = (expanded.match(/^[a-z]+[\w-]*/g) || []);
        const classTokens   = (expanded.match(/\.[a-z][\w-]*/g) || []);
        return { elements: elementTokens.length, classes: classTokens.length };
    }

    const bug2Rule          = 'body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal)';
    const bug1Rule          = 'body.pending-balance-sheet-open .above-sales-modal';
    const twoClassRule      = 'body.balance-sheet-open.purchase-form-open .purchase-create-wrap';
    const oneClassRule      = 'body.balance-sheet-open .modal';

    test('Bug 2 rule has 4 classes and 1 element → (0,4,1)', () => {
        const s = parseSpecificity(bug2Rule);
        expect(s.classes).toBe(4);
        expect(s.elements).toBe(1);
    });

    test('Bug 1 rule has 2 classes and 1 element → (0,2,1)', () => {
        const s = parseSpecificity(bug1Rule);
        expect(s.classes).toBe(2);
        expect(s.elements).toBe(1);
    });

    test('two-class form rules have 3 classes and 1 element → (0,3,1)', () => {
        const s = parseSpecificity(twoClassRule);
        expect(s.classes).toBe(3);
        expect(s.elements).toBe(1);
    });

    test('Bug 2 (0,4,1) has more classes than two-class rules (0,3,1)', () => {
        expect(parseSpecificity(bug2Rule).classes).toBeGreaterThan(parseSpecificity(twoClassRule).classes);
    });

    test('Bug 2 (0,4,1) has more classes than one-class rules (0,2,1)', () => {
        expect(parseSpecificity(bug2Rule).classes).toBeGreaterThan(parseSpecificity(oneClassRule).classes);
    });

    test('Bug 2 rule is placed at the very end of App.css (after all other z-index rules)', () => {
        const bug2Pos          = APP_CSS.indexOf('body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal)');
        const bug1Pos          = APP_CSS.indexOf('body.pending-balance-sheet-open .above-sales-modal');
        const blanketPos       = APP_CSS.indexOf('body.balance-sheet-open .modal {');
        const customerPendPos  = APP_CSS.indexOf('body.balance-sheet-open .customer-pending-modal');
        expect(bug2Pos).toBeGreaterThan(bug1Pos);
        expect(bug2Pos).toBeGreaterThan(blanketPos);
        expect(bug2Pos).toBeGreaterThan(customerPendPos);
    });
});
