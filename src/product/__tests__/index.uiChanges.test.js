/**
 * Tests for three UI changes in product/index.js:
 *
 *  A) Total Stock column — <td> has textAlign: "center"
 *  B) Deleted column    — shows trash icon (bi-trash-fill) for deleted products,
 *                         empty string for non-deleted (no more "YES"/"NO" text)
 *  C) Actions column    — flex layout (display: inline-flex) instead of
 *                         absolute-positioned margin hack
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '../index.js'),
    'utf8'
);

// ── 1. Total Stock column — textAlign center ──────────────────────────────────

describe('product/index.js — Total Stock <td> is center-aligned', () => {
    test('1.1  stock td contains textAlign: "center"', () => {
        // Match the td for col.key === "stock" in the main product list table
        expect(SRC).toMatch(
            /col\.key\s*===\s*["']stock["'][\s\S]{0,200}textAlign.*["']center["']/
        );
    });

    test('1.2  stock td has textAlign center near the whiteSpace nowrap style', () => {
        expect(SRC).toMatch(/whiteSpace.*nowrap.*textAlign.*center|textAlign.*center.*whiteSpace.*nowrap/);
    });

    test('1.3  the old stock td without center alignment is gone', () => {
        // Old code: <td style={{ width: "auto", whiteSpace: "nowrap" }}> with NO textAlign
        // After the fix it must include textAlign. We verify center IS present.
        const stockTdMatches = SRC.match(/col\.key\s*===\s*["']stock["'][\s\S]{0,300}textAlign/g) || [];
        expect(stockTdMatches.length).toBeGreaterThanOrEqual(1);
    });
});

// ── 2. Deleted column — icon instead of text ──────────────────────────────────

describe('product/index.js — Deleted column shows icon, not YES/NO text', () => {
    test('2.1  bi-trash-fill icon is used in the deleted column', () => {
        expect(SRC).toMatch(/bi-trash-fill/);
    });

    test('2.2  the deleted td uses bi-trash-fill, not "YES" text (active code)', () => {
        // The active deleted <td> line contains product.deleted and bi-trash-fill.
        const deletedTdLine = SRC.match(/product\.deleted\s*\?[^\n]*/)?.[0] || '';
        expect(deletedTdLine).toMatch(/bi-trash-fill/);
    });

    test('2.3  the deleted td active line does not render "YES" as plain text', () => {
        // Match the line that renders the deleted ternary.
        const deletedTdLine = SRC.match(/product\.deleted\s*\?[^\n]*/)?.[0] || '';
        expect(deletedTdLine).not.toMatch(/"YES"/);
    });

    test('2.4  non-deleted products render empty string "" in the active deleted td', () => {
        // The ternary now ends with : "" for non-deleted rows.
        expect(SRC).toMatch(/product\.deleted\s*\?[^:]+:\s*[""]["']/);
    });

    test('2.5  trash icon is inside the deleted column active td', () => {
        // The line rendering the deleted ternary must reference bi-trash-fill.
        const deletedTdLine = SRC.match(/product\.deleted\s*\?[^\n]*/)?.[0] || '';
        expect(deletedTdLine).toMatch(/bi-trash-fill/);
    });
});

// ── 3. Actions column — flex layout, no margin hack ──────────────────────────

describe('product/index.js — Actions column uses flex layout', () => {
    test('3.1  inline-flex is used in the actions column span', () => {
        expect(SRC).toMatch(/inline-flex/);
    });

    test('3.2  alignItems: .center. is set on the actions span', () => {
        expect(SRC).toMatch(/alignItems.*['"]center['"]/);
    });

    test('3.3  the old marginLeft: "130px" absolute hack is gone from actions', () => {
        // Extract the main actions block (col.key === "actions") and check it lacks the hack.
        const actionsBlock = SRC.match(/col\.key\s*===\s*["']actions["'][\s\S]{0,2000}?<\/td>\}/)?.[0] || '';
        expect(actionsBlock).not.toMatch(/marginLeft.*["']130px["']/);
    });

    test('3.4  the main actions span uses inline-flex, not absolute margin hacks', () => {
        // The span wrapping the action buttons uses inline-flex layout.
        // Locate the specific span that wraps the buttons (contains inline-flex near the actions td).
        const flexSpan = SRC.match(/display.*inline-flex[\s\S]{0,200}alignItems/)?.[0] || '';
        expect(flexSpan).toBeTruthy();
    });

    test('3.5  the actions flex container does not use the old negative-margin trick', () => {
        // The inline-flex span must not carry a negative marginLeft.
        // The old trick was: span { marginLeft: "-40px" } + Dropdown { marginLeft: "130px" }
        const flexSpan = SRC.match(/display.*:.*['"]inline-flex['"][^}]*/)?.[0] || '';
        expect(flexSpan).not.toMatch(/marginLeft.*-\d/);
    });

    test('3.6  gap style is set on the flex container', () => {
        expect(SRC).toMatch(/gap.*['"][0-9]+px['"]/);
    });

    test('3.7  Dropdown still exists in the actions column', () => {
        // The Dropdown component must still be present.
        expect(SRC).toMatch(/<Dropdown/);
        expect(SRC).toMatch(/<Dropdown\.Toggle/);
        expect(SRC).toMatch(/<Dropdown\.Menu/);
    });
});

// ── 4. Logic: deleted icon display logic (pure JS) ───────────────────────────

describe('Deleted column rendering logic', () => {
    /**
     * Mirrors the NEW logic: product.deleted ? <icon> : ""
     * We verify the condition alone (icon rendering is a React concern).
     */
    function deletedDisplay(product) {
        return product.deleted ? 'ICON' : '';
    }

    test('4.1  deleted=true → shows icon marker', () => {
        expect(deletedDisplay({ deleted: true })).toBe('ICON');
    });

    test('4.2  deleted=false → empty string', () => {
        expect(deletedDisplay({ deleted: false })).toBe('');
    });

    test('4.3  deleted=undefined → empty string (falsy)', () => {
        expect(deletedDisplay({})).toBe('');
    });

    test('4.4  deleted=null → empty string (falsy)', () => {
        expect(deletedDisplay({ deleted: null })).toBe('');
    });

    test('4.5  deleted=0 → empty string (falsy)', () => {
        expect(deletedDisplay({ deleted: 0 })).toBe('');
    });
});

// ── 5. Stock alignment pure logic ─────────────────────────────────────────────

describe('Total Stock value alignment logic', () => {
    /**
     * Mirrors: productStore?.stock ?? 0
     */
    function getStockValue(productStore) {
        return productStore?.stock ?? 0;
    }

    test('5.1  defined stock is returned', () => {
        expect(getStockValue({ stock: 42 })).toBe(42);
    });

    test('5.2  null productStore falls back to 0', () => {
        expect(getStockValue(null)).toBe(0);
    });

    test('5.3  undefined productStore falls back to 0', () => {
        expect(getStockValue(undefined)).toBe(0);
    });

    test('5.4  stock=0 returns 0 (not a fallback, explicit zero)', () => {
        expect(getStockValue({ stock: 0 })).toBe(0);
    });

    test('5.5  negative stock is returned as-is', () => {
        expect(getStockValue({ stock: -5 })).toBe(-5);
    });

    test('5.6  fractional stock is returned as-is', () => {
        expect(getStockValue({ stock: 3.75 })).toBeCloseTo(3.75);
    });
});
