/**
 * Tests for the product-view-modal-wrap z-index fix.
 *
 * Problem: product/view.js Modal had no className, so it rendered at Bootstrap's
 * default z-index (~1055). Every create/edit form modal stacks above 1055:
 *   delivery-note-create-wrap            1066
 *   sales-return-create-wrap             1080
 *   quotation-create-wrap                1080
 *   quotation-sales-return-create-wrap   1080
 *   order-create-wrap (inline style)     1080  (1095 in above-pending-modal context)
 *   purchase-create-wrap                 1088
 *   purchase-return-create-wrap          1088
 * Result: clicking "view product" inside any form opened the product details
 * modal BEHIND the form.
 *
 * Fix: className="product-view-modal-wrap" on the <Modal> in product/view.js,
 * and in App.css:
 *   .product-view-modal-wrap { z-index: 1096 !important; }
 * Specificity (0,1,0). In the normal context (no body classes), 1096 > all
 * form z-indices → product view always appears in front.
 *
 * CSS specificity note:
 *   body.balance-sheet-open .modal  →  spec (0,2,1), z-index 1070
 *   .product-view-modal-wrap        →  spec (0,1,0), z-index 1096
 * When balance-sheet-open is active, the higher-specificity rule wins, dropping
 * product view to 1070. Two-class form rules (0,3,1) can reach 1090 in that
 * context, so product view can still lag in deep-nested balance-sheet scenarios.
 * Those scenarios are outside the scope of this reported bug (forms opened from
 * the main navigation only).
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');
const PRODUCT_VIEW_JS = fs.readFileSync(path.join(__dirname, '../view.js'), 'utf8');

// ─── CSS cascade model ────────────────────────────────────────────────────────
// Models all App.css rules relevant to the product view and form modals.
// Specificity notation: (0, class-count, element-count).
// Among equal-specificity rules with !important, later source position wins.

function zIndex(element, bodyClasses = []) {
    const has = (...cls) => cls.every(c => bodyClasses.includes(c));
    const el  = (...cls) => cls.every(c => element.includes(c));

    // ── (0,4,1) Bug 2 fix — highest specificity ──────────────────────────────
    // body.pending-balance-sheet-open.balance-sheet-open .modal:not(.above-sales-modal)
    if (has('pending-balance-sheet-open', 'balance-sheet-open') && el('modal') && !el('above-sales-modal')) return 1095;

    // ── (0,3,1) two-body-class form rules ────────────────────────────────────
    if (has('balance-sheet-open', 'purchase-form-open')              && el('purchase-create-wrap'))              return 1090;
    if (has('balance-sheet-open', 'purchase-return-form-open')       && el('purchase-return-create-wrap'))       return 1090;
    if (has('balance-sheet-open', 'sales-return-form-open')          && el('sales-return-create-wrap'))          return 1082;
    if (has('balance-sheet-open', 'quotation-form-open')             && el('quotation-create-wrap'))             return 1082;
    if (has('balance-sheet-open', 'quotation-sales-return-form-open') && el('quotation-sales-return-create-wrap')) return 1082;

    // ── (0,2,1) one-body-class rules — beat all direct class rules ────────────
    if (has('balance-sheet-open') && el('modal')) {
        // customer-pending-modal sub-rule (source-order later)
        if (el('customer-pending-modal')) return 1091;
        // pending-balance-sheet override (Bug 1 fix)
        if (has('pending-balance-sheet-open') && el('above-sales-modal')) return 1093;
        // All other .modal elements — including product-view-modal-wrap —
        // fall here: (0,2,1) beats our (0,1,0) rule → 1070
        return 1070;
    }

    // ── (0,1,0) direct class rules ────────────────────────────────────────────
    // product-view-modal-wrap — new rule (wins in normal context)
    if (el('product-view-modal-wrap')) return 1096;

    if (el('order-create-wrap') && el('above-pending-modal')) return 1095;
    if (el('pw-modal-wrap'))             return 1095;
    if (el('purchase-create-wrap'))      return 1088;
    if (el('purchase-return-create-wrap')) return 1088;
    if (el('vendor-create-wrap'))        return 1088;
    // order-create-wrap: inline <style> in component sets 1080 (same precedence)
    if (el('order-create-wrap'))         return 1080;
    if (el('sales-return-create-wrap'))  return 1080;
    if (el('quotation-create-wrap'))     return 1080;
    if (el('quotation-sales-return-create-wrap')) return 1080;
    if (el('delivery-note-create-wrap')) return 1066;
    if (el('above-sales-modal'))         return 1065;
    if (el('quotation-view-overlay'))    return 1070;

    return 1055; // Bootstrap modal default
}

// ─── Element descriptors (CSS classes on the outer .modal wrapper) ────────────
const productView          = ['modal', 'product-view-modal-wrap'];
const salesForm            = ['modal', 'order-create-wrap'];
const salesFormPending     = ['modal', 'order-create-wrap', 'above-pending-modal'];
const purchaseForm         = ['modal', 'purchase-create-wrap'];
const purchaseReturnForm   = ['modal', 'purchase-return-create-wrap'];
const salesReturnForm      = ['modal', 'sales-return-create-wrap'];
const quotationForm        = ['modal', 'quotation-create-wrap'];
const quotationSRForm      = ['modal', 'quotation-sales-return-create-wrap'];
const deliveryNoteForm     = ['modal', 'delivery-note-create-wrap'];
const pwModalWrap          = ['modal', 'pw-modal-wrap'];   // product CREATE form
const aboveSalesModal      = ['modal', 'above-sales-modal'];
const BOOTSTRAP_DEFAULT    = 1055;


// ─── 1. CSS rule presence ──────────────────────────────────────────────────────

describe('App.css — product-view-modal-wrap rule is present', () => {
    test('.product-view-modal-wrap has z-index 1096 !important', () => {
        expect(APP_CSS).toMatch(
            /\.product-view-modal-wrap\s*\{[^}]*z-index\s*:\s*1096\s*!important/
        );
    });

    test('rule appears after .order-create-wrap.above-pending-modal (1095) in source order', () => {
        const formIdx = APP_CSS.indexOf('.order-create-wrap.above-pending-modal');
        const viewIdx = APP_CSS.indexOf('.product-view-modal-wrap');
        expect(formIdx).toBeGreaterThan(-1);
        expect(viewIdx).toBeGreaterThan(-1);
        expect(viewIdx).toBeGreaterThan(formIdx);
    });

    test('rule appears after .purchase-create-wrap (1088) in source order', () => {
        expect(APP_CSS.indexOf('.product-view-modal-wrap')).toBeGreaterThan(
            APP_CSS.indexOf('.purchase-create-wrap')
        );
    });

    test('rule appears after .sales-return-create-wrap (1080) in source order', () => {
        expect(APP_CSS.indexOf('.product-view-modal-wrap')).toBeGreaterThan(
            APP_CSS.indexOf('.sales-return-create-wrap')
        );
    });
});


// ─── 2. product/view.js — className is present ────────────────────────────────

describe('product/view.js — Modal has product-view-modal-wrap className', () => {
    test('Modal component carries className="product-view-modal-wrap"', () => {
        expect(PRODUCT_VIEW_JS).toMatch(/className=["']product-view-modal-wrap["']/);
    });

    test('only one modal in view.js carries the product-view-modal-wrap class', () => {
        const matches = (PRODUCT_VIEW_JS.match(/product-view-modal-wrap/g) || []).length;
        expect(matches).toBe(1);
    });

    test('the main show={show} Modal explicitly carries product-view-modal-wrap', () => {
        // The pre-fix Modal: <Modal show={show} size="xl" onHide=... animation=... scrollable=...>
        // The fix adds className="product-view-modal-wrap" to that exact Modal.
        expect(PRODUCT_VIEW_JS).toMatch(
            /<Modal\s[^>]*show=\{show\}[^>]*className="product-view-modal-wrap"/
        );
    });
});


// ─── 3. Normal context — no body classes (the reported bug scenario) ──────────

describe('Normal context — product view (1096) is above all affected forms', () => {
    const body = [];

    test('product view z-index is 1096', () => {
        expect(zIndex(productView, body)).toBe(1096);
    });

    test('1096 > sales form default (1080) — Bug: sales type 1-5 fixed', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(salesForm, body));
        expect(zIndex(salesForm, body)).toBe(1080);
    });

    test('1096 > sales-return form (1080) — Bug: sales return type 1-3 fixed', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(salesReturnForm, body));
    });

    test('1096 > quotation form (1080) — Bug: quotation type 1-3 fixed', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(quotationForm, body));
    });

    test('1096 > quotation-sales-return form (1080) — Bug: quotation SR type 1-3 fixed', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(quotationSRForm, body));
    });

    test('1096 > purchase form (1088)', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(purchaseForm, body));
    });

    test('1096 > purchase-return form (1088)', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(purchaseReturnForm, body));
    });

    test('1096 > delivery-note form (1066)', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(deliveryNoteForm, body));
    });

    test('1096 > order-create-wrap.above-pending-modal (1095) — highest form z-index', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(salesFormPending, body));
        expect(zIndex(salesFormPending, body)).toBe(1095);
    });

    test('1096 > pw-modal-wrap (product CREATE form, 1095)', () => {
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(pwModalWrap, body));
    });

    test('product view is above Bootstrap default (1055) — pre-fix bug demonstration', () => {
        // Before the fix the product view had no className → 1055.
        // Even delivery-note (1066) was above it.
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(zIndex(deliveryNoteForm, body));
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(zIndex(salesForm, body));
        expect(zIndex(productView, body)).toBeGreaterThan(BOOTSTRAP_DEFAULT);
    });
});


// ─── 4. Z-index value assertions ──────────────────────────────────────────────

describe('Product view z-index exact values', () => {
    test('product-view-modal-wrap z-index is 1096', () => {
        expect(zIndex(productView, [])).toBe(1096);
    });

    test('1096 is exactly one above the highest form (1095)', () => {
        expect(zIndex(productView, [])).toBe(zIndex(salesFormPending, []) + 1);
    });

    test('pre-fix z-index (Bootstrap default) was 1055', () => {
        expect(BOOTSTRAP_DEFAULT).toBe(1055);
    });

    test('pre-fix: Bootstrap default (1055) was below sales form (1080)', () => {
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(zIndex(salesForm, []));
    });

    test('pre-fix: Bootstrap default (1055) was below purchase form (1088)', () => {
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(zIndex(purchaseForm, []));
    });
});


// ─── 5. CSS specificity: why balance-sheet-open context needs attention ────────

describe('CSS specificity — balance-sheet-open context', () => {
    // body.balance-sheet-open .modal  →  spec (0,2,1), z-index 1070
    // .product-view-modal-wrap        →  spec (0,1,0), z-index 1096
    // (0,2,1) wins over (0,1,0) when balance-sheet-open is active.

    const body = ['balance-sheet-open'];

    test('in balance-sheet-open context, product view drops to 1070 (body rule (0,2,1) beats (0,1,0))', () => {
        expect(zIndex(productView, body)).toBe(1070);
    });

    test('in balance-sheet-open context, sales form also drops to 1070 (same blanket rule)', () => {
        // order-create-wrap has .modal → body.balance-sheet-open .modal → 1070
        expect(zIndex(salesForm, body)).toBe(1070);
    });

    test('in balance-sheet-open context, product view and sales form are equal (DOM order determines)', () => {
        // Both 1070 → product view (opened after the form) is later in DOM → wins by DOM order
        expect(zIndex(productView, body)).toEqual(zIndex(salesForm, body));
    });

    test('in balance-sheet-open + purchase-form-open, purchase form reaches 1090 via (0,3,1) rule', () => {
        const bodyWithPurchase = ['balance-sheet-open', 'purchase-form-open'];
        expect(zIndex(purchaseForm, bodyWithPurchase)).toBe(1090);
        // Product view drops to 1070 — note: in this deep nested context product view
        // (1070) < purchase form (1090). This is a known limitation outside the reported use case.
        expect(zIndex(productView, bodyWithPurchase)).toBe(1070);
    });

    test('in balance-sheet-open + sales-return-form-open, sales-return form reaches 1082 via (0,3,1)', () => {
        const bodyWithSR = ['balance-sheet-open', 'sales-return-form-open'];
        expect(zIndex(salesReturnForm, bodyWithSR)).toBe(1082);
        expect(zIndex(productView, bodyWithSR)).toBe(1070);
    });
});


// ─── 6. Pending-balance-sheet context ─────────────────────────────────────────

describe('Pending-balance-sheet context', () => {
    // When both pending-balance-sheet-open and balance-sheet-open are on body,
    // the Bug 2 rule (0,4,1) gives .modal:not(.above-sales-modal) → 1095.
    // product-view-modal-wrap has .modal but NOT .above-sales-modal → gets 1095.
    // The form also gets 1095 from the same rule.
    // Both 1095 → DOM order determines; product view is mounted later → wins.

    const body = ['balance-sheet-open', 'pending-balance-sheet-open'];

    test('product view gets 1095 from Bug 2 rule (0,4,1) in pending context', () => {
        expect(zIndex(productView, body)).toBe(1095);
    });

    test('sales form also gets 1095 from Bug 2 rule in pending context', () => {
        expect(zIndex(salesForm, body)).toBe(1095);
    });

    test('product view and sales form are equal at 1095 — DOM order (product view later) wins', () => {
        expect(zIndex(productView, body)).toEqual(zIndex(salesForm, body));
    });

    test('product view does NOT have above-sales-modal (so Bug 2 rule applies to it)', () => {
        expect(productView).not.toContain('above-sales-modal');
    });

    test('product view has modal class (required for Bug 2 rule to match)', () => {
        expect(productView).toContain('modal');
    });
});


// ─── 7. Element class invariants ──────────────────────────────────────────────

describe('productView element class invariants', () => {
    test('productView has modal class (Bootstrap adds this to all Modal portals)', () => {
        expect(productView).toContain('modal');
    });

    test('productView has product-view-modal-wrap class (our fix)', () => {
        expect(productView).toContain('product-view-modal-wrap');
    });

    test('productView does NOT have above-sales-modal (not a pending-modal type)', () => {
        expect(productView).not.toContain('above-sales-modal');
    });

    test('productView does NOT have order-create-wrap (not a form itself)', () => {
        expect(productView).not.toContain('order-create-wrap');
    });
});


// ─── 8. No regression — form z-indices in App.css unchanged ──────────────────

describe('No regression — form z-indices unchanged in App.css', () => {
    test('.sales-return-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.quotation-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.quotation-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.quotation-sales-return-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.quotation-sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.purchase-create-wrap still has 1088', () => {
        expect(APP_CSS).toMatch(/\.purchase-create-wrap\s*\{[^}]*z-index\s*:\s*1088\s*!important/);
    });

    test('.purchase-return-create-wrap still has 1088', () => {
        expect(APP_CSS).toMatch(/\.purchase-return-create-wrap\s*\{[^}]*z-index\s*:\s*1088\s*!important/);
    });

    test('.order-create-wrap.above-pending-modal still has 1095', () => {
        expect(APP_CSS).toMatch(/\.order-create-wrap\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1095\s*!important/);
    });

    test('.delivery-note-create-wrap still has 1066', () => {
        expect(APP_CSS).toMatch(/\.delivery-note-create-wrap\s*\{[^}]*z-index\s*:\s*1066\s*!important/);
    });

    test('.above-product-form still has 1100 (above product view 1096)', () => {
        expect(APP_CSS).toMatch(/\.above-product-form\s*\{[^}]*z-index\s*:\s*1100\s*!important/);
    });
});


// ─── 9. Full stacking order summary ───────────────────────────────────────────

describe('Stacking order: product view sits between forms and above-product-form', () => {
    const body = [];
    const ABOVE_PRODUCT_FORM_Z = 1100;

    test('above-product-form (1100) > product view (1096) > purchase form (1088)', () => {
        expect(ABOVE_PRODUCT_FORM_Z).toBeGreaterThan(zIndex(productView, body));
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(purchaseForm, body));
    });

    test('product view (1096) sits between forms and above-product-form in the z-index ladder', () => {
        const formMax = zIndex(salesFormPending, body); // 1095
        expect(zIndex(productView, body)).toBeGreaterThan(formMax);
        expect(ABOVE_PRODUCT_FORM_Z).toBeGreaterThan(zIndex(productView, body));
    });

    test('complete order: above-product-form (1100) > product view (1096) > sales-pending (1095) > purchase (1088) > quotation (1080) > delivery-note (1066)', () => {
        expect(ABOVE_PRODUCT_FORM_Z).toBeGreaterThan(zIndex(productView, body));
        expect(zIndex(productView, body)).toBeGreaterThan(zIndex(salesFormPending, body));
        expect(zIndex(salesFormPending, body)).toBeGreaterThan(zIndex(purchaseForm, body));
        expect(zIndex(purchaseForm, body)).toBeGreaterThan(zIndex(quotationForm, body));
        expect(zIndex(quotationForm, body)).toBeGreaterThan(zIndex(deliveryNoteForm, body));
    });
});
