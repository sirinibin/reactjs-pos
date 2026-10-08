/**
 * Tests for the fix: ProductCreate/ServiceCreate appearing behind the Sales form
 * when opened from within a pending-mode OrderCreate (CustomerPending → Sales → Edit
 * → Product Edit button).
 *
 * Root cause:
 *   OrderCreate with modalClass="above-pending-modal" has z-index 1095
 *   (.order-create-wrap.above-pending-modal, two-class App.css rule).
 *   ProductCreate/ServiceCreate use .pw-modal-wrap which is also 1095 (App.css).
 *   Same z-index → DOM order determines visual stacking: ProductCreate's portal
 *   is added to body BEFORE the Sales form's portal (declared first in OrderCreate's
 *   return), so ProductCreate appeared BEHIND the Sales form.
 *
 * Fix:
 *   1. product/create.js and service/create.js: modal className now appends
 *      props.modalClass when provided.
 *   2. order/create.js: passes modalClass="above-pending-modal" to ProductCreate
 *      and ServiceCreate when props.modalClass === "above-pending-modal".
 *   3. App.css: .pw-modal-wrap.above-pending-modal { z-index: 1098 !important }
 *      Two-class specificity (0,2,0) beats any single-class !important (0,1,0),
 *      ensuring 1098 > 1095 regardless of injected styles.
 */

const fs   = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(
    path.join(__dirname, '../../App.css'), 'utf8'
);
const ORDER_CREATE = fs.readFileSync(
    path.join(__dirname, '../create.js'), 'utf8'
);
const PRODUCT_CREATE = fs.readFileSync(
    path.join(__dirname, '../../product/create.js'), 'utf8'
);
const SERVICE_CREATE = fs.readFileSync(
    path.join(__dirname, '../../service/create.js'), 'utf8'
);


// ── 1. App.css — two-class rule for pw-modal-wrap above-pending-modal ─────────

describe('App.css — .pw-modal-wrap.above-pending-modal z-index rule', () => {
    test('1.1  two-class rule is present', () => {
        expect(APP_CSS).toMatch(/\.pw-modal-wrap\.above-pending-modal/);
    });

    test('1.2  the rule sets z-index to 1098 !important', () => {
        expect(APP_CSS).toMatch(
            /\.pw-modal-wrap\.above-pending-modal\s*\{[^}]*z-index\s*:\s*1098\s*!important/
        );
    });

    test('1.3  base .pw-modal-wrap rule (1095) still exists', () => {
        expect(APP_CSS).toMatch(
            /\.pw-modal-wrap\s*\{[^}]*z-index\s*:\s*1095\s*!important/
        );
    });
});


// ── 2. product/create.js — supports modalClass prop ──────────────────────────

describe('product/create.js — Modal className appends props.modalClass', () => {
    test('2.1  className uses template literal with props.modalClass', () => {
        expect(PRODUCT_CREATE).toMatch(
            /className=\{`pw-modal-wrap\$\{props\.modalClass/
        );
    });
});


// ── 3. service/create.js — supports modalClass prop ──────────────────────────

describe('service/create.js — Modal className appends props.modalClass', () => {
    test('3.1  className uses template literal with props.modalClass', () => {
        expect(SERVICE_CREATE).toMatch(
            /className=\{`pw-modal-wrap\$\{props\.modalClass/
        );
    });
});


// ── 4. order/create.js — passes above-pending-modal to ProductCreate/ServiceCreate

describe('order/create.js — passes modalClass to ProductCreate and ServiceCreate', () => {
    test('4.1  ProductCreate receives modalClass when props.modalClass === above-pending-modal', () => {
        expect(ORDER_CREATE).toMatch(
            /ProductCreate[^/\n]*modalClass=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?\s*['"]above-pending-modal['"]/
        );
    });

    test('4.2  ServiceCreate receives modalClass when props.modalClass === above-pending-modal', () => {
        expect(ORDER_CREATE).toMatch(
            /ServiceCreate[^/\n]*modalClass=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?\s*['"]above-pending-modal['"]/
        );
    });
});


// ── 5. z-index stacking invariants ────────────────────────────────────────────

describe('z-index stacking invariants — CustomerPending → Sales → Product Edit', () => {
    const Z = {
        salesFormPending: 1095,        // .order-create-wrap.above-pending-modal (App.css)
        pwModalBase: 1095,             // .pw-modal-wrap (App.css, before fix same as salesFormPending)
        pwModalPending: 1098,          // .pw-modal-wrap.above-pending-modal (App.css, two-class)
    };

    test('BUG: base pw-modal-wrap (1095) was equal to Sales form (1095) — DOM order loses', () => {
        expect(Z.pwModalBase).toEqual(Z.salesFormPending);
    });

    test('FIX: pw-modal-wrap.above-pending-modal (1098) is above Sales form (1095)', () => {
        expect(Z.pwModalPending).toBeGreaterThan(Z.salesFormPending);
    });

    test('FIX: pw-modal-wrap.above-pending-modal (1098) is above base pw-modal-wrap (1095)', () => {
        expect(Z.pwModalPending).toBeGreaterThan(Z.pwModalBase);
    });
});


// ── 6. CSS specificity — two-class beats single-class ────────────────────────

describe('CSS specificity — .pw-modal-wrap.above-pending-modal beats .pw-modal-wrap', () => {
    function classCount(selector) {
        return (selector.match(/\.\w[\w-]*/g) || []).length;
    }

    test('.pw-modal-wrap has specificity class-count 1', () => {
        expect(classCount('.pw-modal-wrap')).toBe(1);
    });

    test('.pw-modal-wrap.above-pending-modal has specificity class-count 2', () => {
        expect(classCount('.pw-modal-wrap.above-pending-modal')).toBe(2);
    });

    test('two-class (0,2,0) beats single-class (0,1,0) for !important author rules', () => {
        expect(classCount('.pw-modal-wrap.above-pending-modal')).toBeGreaterThan(
            classCount('.pw-modal-wrap')
        );
    });

    test('.pw-modal-wrap.above-pending-modal (0,2,0) beats injected .pw-modal-wrap (0,1,0)', () => {
        const twoClass = classCount('.pw-modal-wrap.above-pending-modal');
        const injected = classCount('.pw-modal-wrap');
        expect(twoClass).toBeGreaterThan(injected);
    });
});
