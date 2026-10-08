/**
 * Source-level tests verifying that all 4 create forms pass
 * pendingView={props.modalClass === 'above-pending-modal'} to <Products>
 * and modalClassName={...'above-pending-form-sub'...} to <ImageViewerModal>
 * when opened from inside CustomerPending.
 *
 * Without the pendingView prop, products.js sets the selection modal
 * z-index to 1085 which is below the edit form (1095), hiding it.
 *
 * Without the modalClassName, ImageViewerModal renders at default z-index
 * and is hidden behind the edit form.
 */

const fs   = require('fs');
const path = require('path');

const ORDER_CREATE   = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');
const SR_CREATE      = fs.readFileSync(path.join(__dirname, '../../sales_return/create.js'), 'utf8');
const Q_CREATE       = fs.readFileSync(path.join(__dirname, '../../quotation/create.js'), 'utf8');
const QSR_CREATE     = fs.readFileSync(path.join(__dirname, '../../quotation_sales_return/create.js'), 'utf8');

const PENDING_VIEW_PROP = /pendingView=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\}/;
const IMAGE_MODAL_CLASS  = /modalClassName=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?\s*['"]above-pending-form-sub['"]\s*:\s*['"]['"]}/;


// ── 1. order/create.js ────────────────────────────────────────────────────────

describe('order/create.js — Products receives pendingView from modalClass', () => {
    test('<Products> has pendingView conditional on above-pending-modal', () => {
        expect(ORDER_CREATE).toMatch(PENDING_VIEW_PROP);
    });

    test('pendingView is true when modalClass is above-pending-modal', () => {
        expect(ORDER_CREATE).toMatch(
            /pendingView=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\}/
        );
    });

    test('pendingView prop is not hardcoded true or false', () => {
        expect(ORDER_CREATE).not.toMatch(/pendingView=\{true\}/);
        expect(ORDER_CREATE).not.toMatch(/pendingView=\{false\}/);
    });
});


// ── 2. sales_return/create.js ─────────────────────────────────────────────────

describe('sales_return/create.js — Products receives pendingView from modalClass', () => {
    test('<Products> has pendingView conditional on above-pending-modal', () => {
        expect(SR_CREATE).toMatch(PENDING_VIEW_PROP);
    });

    test('pendingView is not hardcoded', () => {
        expect(SR_CREATE).not.toMatch(/pendingView=\{true\}/);
        expect(SR_CREATE).not.toMatch(/pendingView=\{false\}/);
    });
});

describe('sales_return/create.js — ImageViewerModal receives modalClassName for pendingView', () => {
    test('<ImageViewerModal> has modalClassName set to above-pending-form-sub when pending', () => {
        expect(SR_CREATE).toMatch(IMAGE_MODAL_CLASS);
    });

    test('modalClassName is empty string when not in pending mode', () => {
        expect(SR_CREATE).toMatch(
            /modalClassName=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?[^}]*:\s*['"]['"]}/
        );
    });
});


// ── 3. quotation/create.js ────────────────────────────────────────────────────

describe('quotation/create.js — Products receives pendingView from modalClass', () => {
    test('<Products> has pendingView conditional on above-pending-modal', () => {
        expect(Q_CREATE).toMatch(PENDING_VIEW_PROP);
    });

    test('pendingView is not hardcoded', () => {
        expect(Q_CREATE).not.toMatch(/pendingView=\{true\}/);
        expect(Q_CREATE).not.toMatch(/pendingView=\{false\}/);
    });
});

describe('quotation/create.js — ImageViewerModal receives modalClassName for pendingView', () => {
    test('<ImageViewerModal> has modalClassName set to above-pending-form-sub when pending', () => {
        expect(Q_CREATE).toMatch(IMAGE_MODAL_CLASS);
    });

    test('modalClassName is empty string when not in pending mode', () => {
        expect(Q_CREATE).toMatch(
            /modalClassName=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?[^}]*:\s*['"]['"]}/
        );
    });
});


// ── 4. quotation_sales_return/create.js ───────────────────────────────────────

describe('quotation_sales_return/create.js — Products receives pendingView from modalClass', () => {
    test('<Products> has pendingView conditional on above-pending-modal', () => {
        expect(QSR_CREATE).toMatch(PENDING_VIEW_PROP);
    });

    test('pendingView is not hardcoded', () => {
        expect(QSR_CREATE).not.toMatch(/pendingView=\{true\}/);
        expect(QSR_CREATE).not.toMatch(/pendingView=\{false\}/);
    });
});

describe('quotation_sales_return/create.js — ImageViewerModal receives modalClassName for pendingView', () => {
    test('<ImageViewerModal> has modalClassName set to above-pending-form-sub when pending', () => {
        expect(QSR_CREATE).toMatch(IMAGE_MODAL_CLASS);
    });

    test('modalClassName is empty string when not in pending mode', () => {
        expect(QSR_CREATE).toMatch(
            /modalClassName=\{props\.modalClass\s*===\s*['"]above-pending-modal['"]\s*\?[^}]*:\s*['"]['"]}/
        );
    });
});


// ── 5. Stacking correctness ───────────────────────────────────────────────────

describe('Products selection modal z-index stacking in pending mode', () => {
    const PRODUCTS_NORMAL_Z  = 1085; // z-index when pendingView=false
    const PRODUCTS_PENDING_Z = 1096; // z-index when pendingView=true
    const EDIT_FORM_Z        = 1095; // .order-create-wrap.above-pending-modal

    test('products modal normal (1085) is below edit form in pending context (1095) — the old bug', () => {
        expect(PRODUCTS_NORMAL_Z).toBeLessThan(EDIT_FORM_Z);
    });

    test('products modal in pending mode (1096) is above edit form (1095)', () => {
        expect(PRODUCTS_PENDING_Z).toBeGreaterThan(EDIT_FORM_Z);
    });

    test('gap between pending products modal (1096) and edit form (1095) is exactly 1', () => {
        expect(PRODUCTS_PENDING_Z - EDIT_FORM_Z).toBe(1);
    });
});
