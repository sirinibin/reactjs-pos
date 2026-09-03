/**
 * Source-level tests for the invoice background feature changes in
 * posting/printPreview.js (Balance Sheet / Account Posting preview).
 *
 * Mirrors the pattern used for customer_deposit/preview.invoiceBg.test.js.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'printPreview.js'),
    'utf8'
);

// ── 1. Import ─────────────────────────────────────────────────────────────────

describe('posting/printPreview.js — resolveImageUrl import', () => {
    test('1.1  resolveImageUrl is imported', () => {
        expect(SRC).toMatch(/import.*resolveImageUrl/);
    });

    test('1.2  import is from imageUtils', () => {
        expect(SRC).toMatch(/from.*imageUtils/);
    });
});

// ── 2. store.invoice_background check ────────────────────────────────────────

describe('posting/printPreview.js — invoice_background check', () => {
    test('2.1  store.invoice_background is checked', () => {
        expect(SRC).toMatch(/store\?\.invoice_background|store\.invoice_background/);
    });

    test('2.2  resolveImageUrl called with invoice_background, store id, and "store" category', () => {
        expect(SRC).toMatch(/resolveImageUrl\([^)]*invoice_background[^)]*['""]store['""]|resolveImageUrl\([^)]*['""]store['""][^)]*invoice_background/);
    });

    test('2.3  invoice_background check comes before the MBDI fallback', () => {
        const bgIdx  = SRC.indexOf('invoice_background');
        const mbdiIdx = SRC.indexOf('"MBDI"');
        expect(bgIdx).toBeGreaterThan(-1);
        expect(mbdiIdx).toBeGreaterThan(-1);
        expect(bgIdx).toBeLessThan(mbdiIdx);
    });
});

// ── 3. Legacy store-code fallbacks are preserved ──────────────────────────────

describe('posting/printPreview.js — legacy store-code fallbacks preserved', () => {
    test('3.1  MBDI fallback is still present', () => {
        expect(SRC).toMatch(/"MBDI"/);
    });

    test('3.2  LGK-SIMULATION fallback is still present', () => {
        expect(SRC).toMatch(/"LGK-SIMULATION"/);
    });

    test('3.3  LGK fallback is still present', () => {
        expect(SRC).toMatch(/"LGK"/);
    });

    test('3.4  PH2 fallback is still present', () => {
        expect(SRC).toMatch(/"PH2"/);
    });

    test('3.5  MBDIInvoiceBackground import is still present', () => {
        expect(SRC).toMatch(/MBDIInvoiceBackground/);
    });

    test('3.6  LGKInvoiceBackground import is still present', () => {
        expect(SRC).toMatch(/LGKInvoiceBackground/);
    });
});

// ── 4. Logic ordering ─────────────────────────────────────────────────────────

describe('posting/printPreview.js — logic ordering', () => {
    test('4.1  invoice_background if-branch precedes MBDI else-if branch', () => {
        const bgIdx   = SRC.indexOf('invoice_background');
        const elseIdx = SRC.indexOf('else if', bgIdx);
        const mbdiIdx = SRC.indexOf('"MBDI"', elseIdx);
        expect(elseIdx).toBeGreaterThan(bgIdx);
        expect(mbdiIdx).toBeGreaterThan(elseIdx);
    });

    test('4.2  InvoiceBackground is reset to empty string before the new check', () => {
        const emptyIdx = SRC.lastIndexOf('InvoiceBackground = ""');
        const bgIdx    = SRC.indexOf('invoice_background');
        expect(emptyIdx).toBeGreaterThan(-1);
        expect(bgIdx).toBeGreaterThan(emptyIdx);
    });
});
