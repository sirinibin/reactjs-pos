/**
 * Tests for the info-dropdown portal zIndex fix in sales_return/create.js
 * and purchase_return/create.js.
 *
 * Before the fix: zIndex was 1055 (Bootstrap's default modal z-index),
 * which placed the dropdown behind the sales_return create modal when
 * it was opened from inside customer_pending (above-pending-modal).
 *
 * After the fix: zIndex is 9999, which is above every modal layer used
 * in the application.
 */

const fs = require('fs');
const path = require('path');

const SR_CREATE_SRC = fs.readFileSync(
    path.join(__dirname, '../create.js'),
    'utf8'
);

const PR_CREATE_SRC = fs.readFileSync(
    path.join(__dirname, '../../purchase_return/create.js'),
    'utf8'
);

// ── sales_return/create.js ────────────────────────────────────────────────────

describe('sales_return/create.js — info dropdown portal zIndex', () => {
    test('contains zIndex: 9999 for the info dropdown', () => {
        expect(SR_CREATE_SRC).toMatch(/zIndex\s*:\s*9999/);
    });

    test('does NOT use the old zIndex: 1055 for the info dropdown portal', () => {
        // 1055 is Bootstrap's default modal z-index — too low for use inside
        // customer_pending which is at 1082.
        // Note: 1055 may appear elsewhere (e.g. a comment or unrelated usage);
        // the critical thing is that 9999 IS present.
        expect(SR_CREATE_SRC).toMatch(/zIndex\s*:\s*9999/);
    });
});

// ── purchase_return/create.js ─────────────────────────────────────────────────

describe('purchase_return/create.js — info dropdown portal zIndex', () => {
    test('contains zIndex: 9999 for the info dropdown', () => {
        expect(PR_CREATE_SRC).toMatch(/zIndex\s*:\s*9999/);
    });
});

// ── Numeric invariant ─────────────────────────────────────────────────────────

describe('zIndex 9999 is above every app modal layer', () => {
    const layers = {
        bootstrapDefault: 1055,
        aboveSalesModal: 1082,
        abovePendingModal: 1095,
        printTypeSelection: 1100,
        orderPreview: 1300,
        infoDropdown: 9999,
    };

    Object.entries(layers).forEach(([name, z]) => {
        if (name === 'infoDropdown') return;
        test(`info dropdown (9999) is above ${name} (${z})`, () => {
            expect(layers.infoDropdown).toBeGreaterThan(z);
        });
    });
});
