/**
 * Source-level tests for the invoice background feature in
 * customer_deposit/preview.js.
 *
 * Verifies that:
 *  - resolveImageUrl is imported
 *  - store.invoice_background is used to set the background
 *  - hardcoded MBDI / LGK store-code fallbacks are REMOVED
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'preview.js'),
    'utf8'
);

// ── 1. Import ─────────────────────────────────────────────────────────────────

describe('customer_deposit/preview.js — resolveImageUrl import', () => {
    test('1.1  resolveImageUrl is imported', () => {
        expect(SRC).toMatch(/import.*resolveImageUrl/);
    });

    test('1.2  import is from imageUtils', () => {
        expect(SRC).toMatch(/from.*imageUtils/);
    });
});

// ── 2. store.invoice_background check ────────────────────────────────────────

describe('customer_deposit/preview.js — invoice_background check', () => {
    test('2.1  store.invoice_background is checked', () => {
        expect(SRC).toMatch(/store\?\.invoice_background|store\.invoice_background/);
    });

    test('2.2  resolveImageUrl is called with invoice_background, store id, and "store" category', () => {
        expect(SRC).toMatch(/resolveImageUrl\([^)]*invoice_background[^)]*['""]store['""]|resolveImageUrl\([^)]*['""]store['""][^)]*invoice_background/);
    });
});

// ── 3. Hardcoded store-code fallbacks are REMOVED ─────────────────────────────

describe('customer_deposit/preview.js — hardcoded fallbacks removed', () => {
    test('3.1  MBDI hardcoded fallback is removed', () => {
        expect(SRC).not.toMatch(/else if.*code.*MBDI|MBDI.*InvoiceBackground/);
    });

    test('3.2  LGK hardcoded fallback is removed', () => {
        expect(SRC).not.toMatch(/else if.*code.*LGK|LGK.*InvoiceBackground/);
    });

    test('3.3  MBDIInvoiceBackground import is removed', () => {
        expect(SRC).not.toMatch(/import.*MBDIInvoiceBackground/);
    });

    test('3.4  LGKInvoiceBackground import is removed', () => {
        expect(SRC).not.toMatch(/import.*LGKInvoiceBackground/);
    });
});
