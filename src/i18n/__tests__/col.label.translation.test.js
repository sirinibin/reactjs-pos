/**
 * Tests that {col.label} in JSX table headers is wrapped with t().
 *
 * These files drive dynamically-configured column lists. Before the fix,
 * col.label was rendered as a bare string regardless of language. The fix
 * replaces every JSX occurrence of {col.label} with {t(col.label)}.
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');

function read(rel) {
    return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
}

// Files that were patched in this session
const PATCHED_FILES = [
    'customer/index.js',
    'delivery_note/create.js',
    'delivery_note/index.js',
    'product/index.js',
    'purchase/create.js',
    'purchase/index.js',
    'purchase_return/create.js',
    'purchase_return/index.js',
    'quotation/create.js',
    'quotation/index.js',
    'quotation_sales_return/create.js',
    'quotation_sales_return/index.js',
    'sales_return/create.js',
    'sales_return/index.js',
    'service/index.js',
    'stock_transfer/create.js',
    'vendor/index.js',
];

PATCHED_FILES.forEach(rel => {
    describe(`${rel} — col.label wrapped with t()`, () => {
        const src = read(rel);

        test('does not render bare {col.label} in JSX (between tags)', () => {
            // Match >{col.label}< — the JSX child form between opening/closing tags
            expect(src).not.toMatch(/>\{col\.label\}</);
        });

        test('uses t(col.label) where column labels are displayed', () => {
            expect(src).toMatch(/t\(col\.label\)/);
        });

        test('has useTranslation imported', () => {
            expect(src).toMatch(/useTranslation/);
        });
    });
});
