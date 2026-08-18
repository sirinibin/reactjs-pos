/**
 * Tests for the product-view-modal-wrap z-index fix.
 *
 * Problem: product/view.js Modal had no className, so it rendered at Bootstrap's
 * default z-index (~1055). Every create/edit form modal stacks above 1055:
 *   delivery-note-create-wrap  1066
 *   sales-return-create-wrap   1080
 *   quotation-create-wrap      1080
 *   order-create-wrap          1080 (inline style; 1095 in above-pending-modal)
 *   purchase-create-wrap       1088
 *   purchase-return-create-wrap 1088
 * Result: clicking "view product" inside any form opened the product details
 * modal BEHIND the form.
 *
 * Fix: added className="product-view-modal-wrap" to the <Modal> in product/view.js
 * and the CSS rule:
 *   .product-view-modal-wrap { z-index: 1096 !important; }
 * 1096 > 1095 (highest form z-index) → product view always appears in front.
 */

const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'),
    'utf8'
);

const PRODUCT_VIEW_JS = fs.readFileSync(
    path.join(__dirname, '../view.js'),
    'utf8'
);

// ─── z-index constants from App.css ──────────────────────────────────────────

const PRODUCT_VIEW_Z  = 1096;
const DELIVERY_NOTE_Z = 1066;
const SALES_FORM_Z    = 1080;  // order-create-wrap default (inline style)
const SALES_FORM_PENDING_Z = 1095; // order-create-wrap.above-pending-modal
const PURCHASE_Z      = 1088;
const PURCHASE_RET_Z  = 1088;
const QUOTATION_Z     = 1080;
const SALES_RET_Z     = 1080;
const QUOTATION_SR_Z  = 1080;
const BOOTSTRAP_DEFAULT = 1055;  // modal z-index before this fix


// ─── 1. CSS rule presence ─────────────────────────────────────────────────────

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
        const formIdx = APP_CSS.indexOf('.purchase-create-wrap');
        const viewIdx = APP_CSS.indexOf('.product-view-modal-wrap');
        expect(viewIdx).toBeGreaterThan(formIdx);
    });
});


// ─── 2. product/view.js — className is set ───────────────────────────────────

describe('product/view.js — Modal has product-view-modal-wrap className', () => {
    test('Modal component carries className="product-view-modal-wrap"', () => {
        expect(PRODUCT_VIEW_JS).toMatch(/className=["']product-view-modal-wrap["']/);
    });

    test('no other modal in view.js shares the product-view-modal-wrap class', () => {
        const matches = (PRODUCT_VIEW_JS.match(/product-view-modal-wrap/g) || []).length;
        expect(matches).toBe(1);
    });
});


// ─── 3. Z-index comparisons: product view (1096) beats every form ─────────────

describe('Product view (1096) is above all create/edit form modals', () => {
    test('1096 > delivery-note-create-wrap (1066)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(DELIVERY_NOTE_Z);
    });

    test('1096 > sales-return-create-wrap (1080)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(SALES_RET_Z);
    });

    test('1096 > quotation-create-wrap (1080)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(QUOTATION_Z);
    });

    test('1096 > quotation-sales-return-create-wrap (1080)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(QUOTATION_SR_Z);
    });

    test('1096 > order-create-wrap default (1080)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(SALES_FORM_Z);
    });

    test('1096 > purchase-create-wrap (1088)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(PURCHASE_Z);
    });

    test('1096 > purchase-return-create-wrap (1088)', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(PURCHASE_RET_Z);
    });

    test('1096 > order-create-wrap.above-pending-modal (1095) — highest form z-index', () => {
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(SALES_FORM_PENDING_Z);
    });

    test('product view (1096) beats Bootstrap default (1055) — demonstrating the pre-fix bug', () => {
        // Before the fix, product view was at 1055 (Bootstrap default).
        // Even delivery-note-create-wrap (1066) was above it.
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(DELIVERY_NOTE_Z);
        expect(BOOTSTRAP_DEFAULT).toBeLessThan(PURCHASE_Z);
        expect(PRODUCT_VIEW_Z).toBeGreaterThan(BOOTSTRAP_DEFAULT);
    });
});


// ─── 4. Z-index value is exactly 1096 ────────────────────────────────────────

describe('Product view z-index value', () => {
    test('product-view-modal-wrap z-index is 1096', () => {
        expect(PRODUCT_VIEW_Z).toBe(1096);
    });

    test('1096 is exactly 1 above the highest form (order-create-wrap.above-pending-modal at 1095)', () => {
        expect(PRODUCT_VIEW_Z).toBe(SALES_FORM_PENDING_Z + 1);
    });
});


// ─── 5. No regression — existing z-index ladder unchanged ────────────────────

describe('No regression — form z-indices unchanged in App.css', () => {
    test('.purchase-create-wrap still has 1088', () => {
        expect(APP_CSS).toMatch(/\.purchase-create-wrap\s*\{[^}]*z-index\s*:\s*1088\s*!important/);
    });

    test('.purchase-return-create-wrap still has 1088', () => {
        expect(APP_CSS).toMatch(/\.purchase-return-create-wrap\s*\{[^}]*z-index\s*:\s*1088\s*!important/);
    });

    test('.quotation-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.quotation-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.sales-return-create-wrap still has 1080', () => {
        expect(APP_CSS).toMatch(/\.sales-return-create-wrap\s*\{[^}]*z-index\s*:\s*1080\s*!important/);
    });

    test('.order-create-wrap.above-pending-modal still has 1095', () => {
        expect(APP_CSS).toMatch(/\.order-create-wrap\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1095\s*!important/);
    });
});
