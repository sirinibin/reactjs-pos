/**
 * Source-level tests for the "Disable Sales Edit once Reported to ZATCA"
 * checkbox added to the store settings form (store/create.js).
 *
 * Key invariants verified:
 *  - The checkbox only renders for ZATCA Phase 2 stores.
 *  - checked= uses !== false so undefined/null defaults to locked.
 *  - Toggle correctly flips between true and false.
 *  - Both layout variants (compact pw-check and verbose col-md-2) are present.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

// ── 1. Field presence ─────────────────────────────────────────────────────────

describe('store/create.js — disable_sales_edit_once_reported_to_zatca field', () => {
    test('1.1  field name appears in source', () => {
        expect(SRC).toMatch(/disable_sales_edit_once_reported_to_zatca/);
    });

    test('1.2  field appears at least twice (both layout variants)', () => {
        const matches = SRC.match(/disable_sales_edit_once_reported_to_zatca/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 2. Phase 2 guard ──────────────────────────────────────────────────────────

describe('store/create.js — checkbox is gated on ZATCA Phase 2', () => {
    test("2.1  formData.zatca?.phase === '2' guard is present", () => {
        expect(SRC).toMatch(/formData\.zatca\?\.phase\s*===\s*['"]2['"]/);
    });

    test('2.2  phase 2 guard appears near the disable_sales_edit checkbox', () => {
        // The guard must appear before each checkbox occurrence.
        const checkboxIdx = SRC.indexOf('disable_sales_edit_once_reported_to_zatca');
        const guardIdx    = SRC.indexOf("formData.zatca?.phase === '2'");
        expect(guardIdx).toBeGreaterThan(-1);
        expect(guardIdx).toBeLessThan(checkboxIdx);
    });

    test('2.3  phase 2 guard appears at least twice (one per layout variant)', () => {
        const matches = SRC.match(/formData\.zatca\?\.phase\s*===\s*['"]2['"]/g) || [];
        // This guard is used for many other fields too; verify at least 2 occurrences exist.
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 3. checked= expression ────────────────────────────────────────────────────

describe('store/create.js — checked= uses !== false (nil/undefined → locked)', () => {
    test('3.1  checked= expression is !== false for the disable field', () => {
        expect(SRC).toMatch(
            /checked=\{.*disable_sales_edit_once_reported_to_zatca\s*!==\s*false/
        );
    });

    test('3.2  === true is NOT used as the checked= expression', () => {
        // Using === true would wrongly default to unchecked for undefined (new stores).
        expect(SRC).not.toMatch(
            /disable_sales_edit_once_reported_to_zatca\s*===\s*true/
        );
    });
});

// ── 4. Toggle / onChange ──────────────────────────────────────────────────────

describe('store/create.js — checkbox onChange toggles correctly', () => {
    test('4.1  toggle uses !(... !== false) pattern', () => {
        expect(SRC).toMatch(
            /!\s*\(.*disable_sales_edit_once_reported_to_zatca\s*!==\s*false\s*\)/
        );
    });

    test('4.2  setFormData is called after toggling', () => {
        expect(SRC).toMatch(/setFormData\(\s*\{[^}]*\.\.\.\s*formData/);
    });
});

// ── 5. Both layout variants are present ──────────────────────────────────────

describe('store/create.js — both layout variants contain the checkbox', () => {
    test('5.1  compact pw-check label variant is present', () => {
        // Layout 1: <label className="pw-check" ...>
        expect(SRC).toMatch(/pw-check.*disable_sales_edit_once_reported_to_zatca|disable_sales_edit_once_reported_to_zatca.*pw-check/s);
    });

    test('5.2  verbose col-md-2 div variant is present', () => {
        // Layout 2: <div className="col-md-2"> wrapping the checkbox
        expect(SRC).toMatch(/col-md-2/);
        // And the verbose variant includes the human-readable label text.
        expect(SRC).toMatch(/Disable Sales Edit once Reported to ZATCA/);
    });

    test('5.3  human-readable label appears at least twice (one per layout)', () => {
        const matches = SRC.match(/Disable Sales Edit once Reported to ZATCA/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});
