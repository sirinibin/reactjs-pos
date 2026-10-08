/**
 * Source-level tests for the "Show Created By in Invoice/Receivables Preview"
 * checkbox added to the store settings form (store/create.js).
 *
 * Invariants verified:
 *  - The field name appears in source (both layout variants).
 *  - The checkbox uses !!formData.settings.show_created_by_in_invoice_preview for checked=
 *  - The toggle flips the field and calls setFormData.
 *  - Human-readable label is present in both variants.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

// ── 1. Field presence ─────────────────────────────────────────────────────────

describe('store/create.js — show_created_by_in_invoice_preview field', () => {
    test('1.1  field name appears in source', () => {
        expect(SRC).toMatch(/show_created_by_in_invoice_preview/);
    });

    test('1.2  field name appears at least twice (both layout variants)', () => {
        const matches = SRC.match(/show_created_by_in_invoice_preview/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('1.3  human-readable label is present', () => {
        expect(SRC).toMatch(/Show Created By in Invoice\/Receivables Preview/);
    });
});

// ── 2. checked= expression ────────────────────────────────────────────────────

describe('store/create.js — checked= uses !! to safely coerce the boolean', () => {
    test('2.1  compact variant uses !!formData.settings.show_created_by_in_invoice_preview', () => {
        expect(SRC).toMatch(/!!formData\.settings\.show_created_by_in_invoice_preview/);
    });

    test('2.2  no occurrence uses === true which would wrongly reject undefined', () => {
        expect(SRC).not.toMatch(/show_created_by_in_invoice_preview\s*===\s*true/);
    });
});

// ── 3. Toggle / onChange ──────────────────────────────────────────────────────

describe('store/create.js — checkbox onChange toggles the field', () => {
    test('3.1  onChange uses ! to flip the field value', () => {
        expect(SRC).toMatch(
            /show_created_by_in_invoice_preview\s*=\s*!formData\.settings\.show_created_by_in_invoice_preview/
        );
    });

    test('3.2  setFormData is called after the toggle', () => {
        // At least one occurrence of setFormData({ ...formData }) following the toggle.
        const toggleIdx = SRC.indexOf('show_created_by_in_invoice_preview = !formData.settings.show_created_by_in_invoice_preview');
        expect(toggleIdx).toBeGreaterThan(-1);
        const afterToggle = SRC.slice(toggleIdx);
        expect(afterToggle).toMatch(/setFormData\(\s*\{[^}]*\.\.\.\s*formData/);
    });
});

// ── 4. Both layout variants are present ──────────────────────────────────────

describe('store/create.js — both layout variants contain the checkbox', () => {
    test('4.1  compact pw-check label variant is present', () => {
        expect(SRC).toMatch(
            /pw-check[\s\S]{0,300}show_created_by_in_invoice_preview|show_created_by_in_invoice_preview[\s\S]{0,300}pw-check/
        );
    });

    test('4.2  verbose col-md-2 div variant is present', () => {
        // The col-md-2 variant has the field and a human-readable label text.
        expect(SRC).toMatch(/col-md-2[\s\S]{0,500}show_created_by_in_invoice_preview/);
    });

    test('4.3  human-readable label appears at least twice (one per layout)', () => {
        const matches = SRC.match(/Show Created By in Invoice\/Receivables Preview/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 5. Toggle logic unit test (pure JS, no React) ─────────────────────────────

describe('show_created_by_in_invoice_preview toggle logic', () => {
    function toggle(settings) {
        settings.show_created_by_in_invoice_preview = !settings.show_created_by_in_invoice_preview;
        return settings;
    }

    test('5.1  undefined → true after toggle', () => {
        const s = {};
        toggle(s);
        expect(s.show_created_by_in_invoice_preview).toBe(true);
    });

    test('5.2  false → true after toggle', () => {
        const s = { show_created_by_in_invoice_preview: false };
        toggle(s);
        expect(s.show_created_by_in_invoice_preview).toBe(true);
    });

    test('5.3  true → false after toggle', () => {
        const s = { show_created_by_in_invoice_preview: true };
        toggle(s);
        expect(s.show_created_by_in_invoice_preview).toBe(false);
    });

    test('5.4  double toggle restores the original value (true → false → true)', () => {
        const s = { show_created_by_in_invoice_preview: true };
        toggle(s);
        expect(s.show_created_by_in_invoice_preview).toBe(false);
        toggle(s);
        expect(s.show_created_by_in_invoice_preview).toBe(true);
    });

    test('5.5  !! coercion: undefined reads as false (default off)', () => {
        const settings = {};
        expect(!!settings.show_created_by_in_invoice_preview).toBe(false);
    });

    test('5.6  !! coercion: true reads as true', () => {
        expect(!!true).toBe(true);
    });

    test('5.7  toggle does not affect other settings fields', () => {
        const s = { show_received_by_footer_in_invoice: true, show_created_by_in_invoice_preview: false };
        toggle(s);
        expect(s.show_received_by_footer_in_invoice).toBe(true);
        expect(s.show_created_by_in_invoice_preview).toBe(true);
    });
});
