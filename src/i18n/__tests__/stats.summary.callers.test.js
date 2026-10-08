/**
 * Tests that every StatsSummary caller passes a pre-translated title prop.
 *
 * StatsSummary composes its Show/Hide button as `${t('Show')} ${title}`,
 * so callers must translate the title themselves via title={t("X Summary")}.
 * Passing a hardcoded string like title="Sales Summary" would result in
 * the Arabic button reading "إظهار Sales Summary" (mixed language).
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');

function read(rel) {
    return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
}

// Each entry: [file, hardcoded title that must NOT appear]
const CASES = [
    ['employee/index.js',        'title="Employees Summary"'],
    ['employee/salaryIndex.js',  'title="Salaries Summary"'],
    ['purchase/index.js',        'title="Purchase Summary"'],
    ['sales_return/index.js',    'title="Sales Return Summary"'],
    ['purchase_order/index.js',  'title="Purchase Order Summary"'],
    ['customer/index.js',        'title="Customer Stats Summary"'],
    ['order/index.js',           "title={'Sales Summary'}"],
];

CASES.forEach(([rel, hardcoded]) => {
    describe(`${rel} — StatsSummary title prop`, () => {
        const src = read(rel);

        test(`does not pass hardcoded ${hardcoded}`, () => {
            expect(src).not.toContain(hardcoded);
        });

        test('passes title through t()', () => {
            // title prop must use t("...") or t('...')
            expect(src).toMatch(/title=\{t\(['"]/);
        });
    });
});
