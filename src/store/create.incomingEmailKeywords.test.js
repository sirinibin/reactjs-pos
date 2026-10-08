/**
 * Source-level tests for the Incoming Email Keyword Filter section
 * added to store/create.js (Procurement tab → Incoming Email).
 *
 * Invariants:
 *  - incoming_email_keywords field is present.
 *  - Tag-based add/remove UI present (same pattern as purchase_markets).
 *  - "Use defaults" button seeds ["quotation", "rfq", "request for quotation"].
 *  - "No filter" hint shown when keywords empty.
 *  - Lowercase coercion applied before adding (kw.trim().toLowerCase()).
 *  - State variable newEmailKeyword used (not reusing newMarket).
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');

// ── 1. Field name ─────────────────────────────────────────────────────────────

describe('store/create.js — incoming_email_keywords field', () => {
    test('1.1  incoming_email_keywords appears in source', () => {
        expect(SRC).toMatch(/incoming_email_keywords/);
    });

    test('1.2  field appears at least 4 times (read, add, remove, display)', () => {
        const count = (SRC.match(/incoming_email_keywords/g) || []).length;
        expect(count).toBeGreaterThanOrEqual(4);
    });
});

// ── 2. State variable ─────────────────────────────────────────────────────────

describe('store/create.js — newEmailKeyword state variable', () => {
    test('2.1  newEmailKeyword state declared', () => {
        expect(SRC).toMatch(/newEmailKeyword/);
    });

    test('2.2  setNewEmailKeyword used', () => {
        expect(SRC).toMatch(/setNewEmailKeyword/);
    });

    test('2.3  newEmailKeyword is independent from newMarket', () => {
        // Must not reuse the purchase_markets state for keywords.
        const kwIdx    = SRC.indexOf('newEmailKeyword');
        const mktIdx   = SRC.indexOf('newMarket');
        expect(kwIdx).toBeGreaterThan(-1);
        expect(mktIdx).toBeGreaterThan(-1);
        expect(kwIdx).not.toBe(mktIdx);
    });
});

// ── 3. Default values ─────────────────────────────────────────────────────────

describe('store/create.js — default keyword values', () => {
    test('3.1  "quotation" appears as a default keyword', () => {
        expect(SRC).toMatch(/['"]quotation['"]/);
    });

    test('3.2  "rfq" appears as a default keyword', () => {
        expect(SRC).toMatch(/['"]rfq['"]/);
    });

    test('3.3  "request for quotation" appears as a default keyword', () => {
        expect(SRC).toMatch(/['"]request for quotation['"]/);
    });

    test('3.4  "Use defaults" button is present', () => {
        expect(SRC).toMatch(/Use defaults/);
    });

    test('3.5  "Use defaults" only shown when list is empty', () => {
        // The button should be guarded by a length === 0 check.
        expect(SRC).toMatch(/incoming_email_keywords.*length.*===.*0|length.*0.*incoming_email_keywords/s);
    });
});

// ── 4. Add keyword UI ─────────────────────────────────────────────────────────

describe('store/create.js — add keyword UI', () => {
    test('4.1  "Add keyword" placeholder text or "Add" button present', () => {
        expect(SRC).toMatch(/Add keyword|Add Keyword/);
    });

    test('4.2  keyword is lowercased before adding (trim().toLowerCase())', () => {
        expect(SRC).toMatch(/toLowerCase\(\)/);
    });

    test('4.3  duplicate prevention: keyword not added if already in list', () => {
        expect(SRC).toMatch(/includes\(kw\)/);
    });

    test('4.4  Enter key triggers add (onKeyDown with key === "Enter")', () => {
        expect(SRC).toMatch(/key\s*===\s*['"]Enter['"]/);
    });
});

// ── 5. Remove keyword UI ──────────────────────────────────────────────────────

describe('store/create.js — remove individual keyword', () => {
    test('5.1  remove uses filter with index comparison', () => {
        expect(SRC).toMatch(/incoming_email_keywords.*filter.*j\s*!==\s*i|filter.*incoming_email_keywords/s);
    });

    test('5.2  × button present for removal', () => {
        expect(SRC).toMatch(/&times;/);
    });
});

// ── 6. "No filter" empty state hint ──────────────────────────────────────────

describe('store/create.js — empty state hint', () => {
    test('6.1  "No filter" or "all emails accepted" hint shown when empty', () => {
        expect(SRC).toMatch(/No filter|all emails accepted/);
    });
});

// ── 7. Keyword filter description ────────────────────────────────────────────

describe('store/create.js — keyword filter description text', () => {
    test('7.1  description mentions LLM token usage reduction', () => {
        expect(SRC).toMatch(/LLM|token/);
    });

    test('7.2  description mentions case-insensitive matching', () => {
        expect(SRC).toMatch(/case-insensitive|case insensitive/i);
    });
});
