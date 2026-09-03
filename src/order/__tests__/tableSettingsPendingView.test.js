/**
 * Source-level tests verifying that TableSettingsModal receives
 * className="above-pending-modal" when pendingView is true in all 4 index
 * files that render inside CustomerPending.
 *
 * Without this prop the TableSettings modal (Bootstrap default z-index ~1055)
 * renders behind CustomerPending (1082) and is inaccessible.
 *
 * Fix: className={props.pendingView ? "above-pending-modal" : ""}
 * The CSS rule .above-pending-modal { z-index: 1090 } (App.css) lifts it
 * above CustomerPending.
 */

const fs   = require('fs');
const path = require('path');

const ORDER_IDX = fs.readFileSync(
    path.join(__dirname, '../index.js'), 'utf8'
);
const SR_IDX = fs.readFileSync(
    path.join(__dirname, '../../sales_return/index.js'), 'utf8'
);
const Q_IDX = fs.readFileSync(
    path.join(__dirname, '../../quotation/index.js'), 'utf8'
);
const QSR_IDX = fs.readFileSync(
    path.join(__dirname, '../../quotation_sales_return/index.js'), 'utf8'
);

const PATTERN = /className=\{props\.pendingView\s*\?\s*["']above-pending-modal["']\s*:\s*["']["']\}/;

// ── 1. order/index.js ─────────────────────────────────────────────────────────

describe('order/index.js — TableSettingsModal receives className for pendingView', () => {
    test('TableSettingsModal has className ternary with above-pending-modal', () => {
        expect(ORDER_IDX).toMatch(PATTERN);
    });

    test('className is empty string when pendingView is false', () => {
        expect(ORDER_IDX).toMatch(/className=\{props\.pendingView\s*\?[^}]*:\s*["']["']\}/);
    });

    test('above-pending-modal value is set for pendingView=true case', () => {
        expect(ORDER_IDX).toMatch(/className=\{props\.pendingView\s*\?\s*["']above-pending-modal["']/);
    });
});


// ── 2. sales_return/index.js ──────────────────────────────────────────────────

describe('sales_return/index.js — TableSettingsModal receives className for pendingView', () => {
    test('TableSettingsModal has className ternary with above-pending-modal', () => {
        expect(SR_IDX).toMatch(PATTERN);
    });

    test('className is empty string when pendingView is false', () => {
        expect(SR_IDX).toMatch(/className=\{props\.pendingView\s*\?[^}]*:\s*["']["']\}/);
    });

    test('above-pending-modal value is set for pendingView=true case', () => {
        expect(SR_IDX).toMatch(/className=\{props\.pendingView\s*\?\s*["']above-pending-modal["']/);
    });
});


// ── 3. quotation/index.js ─────────────────────────────────────────────────────

describe('quotation/index.js — TableSettingsModal receives className for pendingView OR enableSelection', () => {
    test('TableSettingsModal has className with above-pending-modal for pendingView', () => {
        expect(Q_IDX).toMatch(/className=\{.*pendingView.*["']above-pending-modal["']/);
    });

    test('TableSettingsModal also raises z-index when enableSelection is true (inside Quotations wrapper)', () => {
        expect(Q_IDX).toMatch(/className=\{.*enableSelection.*["']above-pending-modal["']/);
    });

    test('className is empty string when neither pendingView nor enableSelection', () => {
        expect(Q_IDX).toMatch(/className=\{.*pendingView.*enableSelection.*:\s*["']["']\}/);
    });

    test('above-pending-modal is the raised class value', () => {
        expect(Q_IDX).toMatch(
            /className=\{\(props\.pendingView\s*\|\|\s*props\.enableSelection\)\s*\?\s*["']above-pending-modal["']\s*:\s*["']["']\}/
        );
    });
});


// ── 4. quotation_sales_return/index.js ────────────────────────────────────────

describe('quotation_sales_return/index.js — TableSettingsModal receives className for pendingView', () => {
    test('TableSettingsModal has className ternary with above-pending-modal', () => {
        expect(QSR_IDX).toMatch(PATTERN);
    });

    test('className is empty string when pendingView is false', () => {
        expect(QSR_IDX).toMatch(/className=\{props\.pendingView\s*\?[^}]*:\s*["']["']\}/);
    });

    test('above-pending-modal value is set for pendingView=true case', () => {
        expect(QSR_IDX).toMatch(/className=\{props\.pendingView\s*\?\s*["']above-pending-modal["']/);
    });
});


// ── 5. Stacking correctness ───────────────────────────────────────────────────

describe('TableSettings z-index stacking correctness', () => {
    const TABLE_SETTINGS_PENDING_Z = 1090; // .above-pending-modal
    const CUSTOMER_PENDING_Z       = 1082; // CustomerPending modal

    test('above-pending-modal (1090) is above CustomerPending (1082)', () => {
        expect(TABLE_SETTINGS_PENDING_Z).toBeGreaterThan(CUSTOMER_PENDING_Z);
    });

    test('gap is at least 1 so stacking is unambiguous', () => {
        expect(TABLE_SETTINGS_PENDING_Z - CUSTOMER_PENDING_Z).toBeGreaterThanOrEqual(1);
    });
});
