/**
 * Source-level tests for the "RFQ Creation" settings section added to the
 * Procurement tab of store/create.js.
 *
 * Invariants:
 *  - Both disable_auto_rfq_from_email and disable_auto_rfq_from_whatsapp fields present.
 *  - Checkboxes use INVERTED logic (!disable_...) so they appear checked by default.
 *  - Toggle flips the disable field (not a separate enable field).
 *  - Section heading "RFQ Creation" is present.
 *  - Both labels describe "Automatic RFQ creation".
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');

// ── 1. Field names ─────────────────────────────────────────────────────────────

describe('store/create.js — RFQ Creation: field names present', () => {
    test('1.1  disable_auto_rfq_from_email appears in source', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_email/);
    });

    test('1.2  disable_auto_rfq_from_whatsapp appears in source', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_whatsapp/);
    });

    test('1.3  each field appears at least twice (checked= and onChange)', () => {
        const emailMatches    = (SRC.match(/disable_auto_rfq_from_email/g) || []).length;
        const whatsappMatches = (SRC.match(/disable_auto_rfq_from_whatsapp/g) || []).length;
        expect(emailMatches).toBeGreaterThanOrEqual(2);
        expect(whatsappMatches).toBeGreaterThanOrEqual(2);
    });
});

// ── 2. Section heading ────────────────────────────────────────────────────────

describe('store/create.js — RFQ Creation: section heading', () => {
    test('2.1  "RFQ Creation" section heading is present', () => {
        expect(SRC).toMatch(/RFQ Creation/);
    });
});

// ── 3. Inverted checkbox logic (checked = !disable) ───────────────────────────

describe('store/create.js — RFQ Creation: checkboxes are inverted (auto-create ON by default)', () => {
    test('3.1  email checkbox uses !formData.settings.disable_auto_rfq_from_email', () => {
        expect(SRC).toMatch(/!formData\.settings\.disable_auto_rfq_from_email/);
    });

    test('3.2  whatsapp checkbox uses !formData.settings.disable_auto_rfq_from_whatsapp', () => {
        expect(SRC).toMatch(/!formData\.settings\.disable_auto_rfq_from_whatsapp/);
    });

    test('3.3  email checkbox is NOT checked={formData.settings.disable_auto_rfq_from_email} directly (no double-negative)', () => {
        // Direct (non-inverted) binding would show checked when auto-create is OFF.
        expect(SRC).not.toMatch(/checked=\{formData\.settings\.disable_auto_rfq_from_email\}/);
    });

    test('3.4  whatsapp checkbox is NOT checked directly without inversion', () => {
        expect(SRC).not.toMatch(/checked=\{formData\.settings\.disable_auto_rfq_from_whatsapp\}/);
    });
});

// ── 4. Toggle / onChange ──────────────────────────────────────────────────────

describe('store/create.js — RFQ Creation: toggle flips the disable field', () => {
    test('4.1  email onChange flips disable_auto_rfq_from_email', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_email\s*=\s*!formData\.settings\.disable_auto_rfq_from_email/);
    });

    test('4.2  whatsapp onChange flips disable_auto_rfq_from_whatsapp', () => {
        expect(SRC).toMatch(/disable_auto_rfq_from_whatsapp\s*=\s*!formData\.settings\.disable_auto_rfq_from_whatsapp/);
    });

    test('4.3  setFormData called after toggle', () => {
        expect(SRC).toMatch(/setFormData\(\s*\{[^}]*\.\.\.\s*formData/);
    });
});

// ── 5. Human-readable labels ──────────────────────────────────────────────────

describe('store/create.js — RFQ Creation: human-readable labels', () => {
    test('5.1  email label mentions "Automatic RFQ creation" and "Email"', () => {
        expect(SRC).toMatch(/Automatic RFQ creation.*[Ee]mail|[Ee]mail.*Automatic RFQ creation/s);
    });

    test('5.2  WhatsApp label mentions "Automatic RFQ creation" and "WhatsApp"', () => {
        expect(SRC).toMatch(/Automatic RFQ creation.*[Ww]hats[Aa]pp|[Ww]hats[Aa]pp.*Automatic RFQ creation/s);
    });
});
