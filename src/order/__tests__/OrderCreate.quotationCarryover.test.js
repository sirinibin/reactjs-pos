/**
 * Tests that quotation_id / quotation_ids are always cleared when opening
 * the sales form for a new sale, so they don't carry over from a previous
 * quotation-based sale.
 *
 * Root cause: useImperativeHandle.open() was missing the quotation-clear block,
 * causing every subsequent sale (opened via the external ref) to inherit the
 * quotation_id from the previous import.
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

// Find the two clearing locations.
// Both must appear BEFORE the linkModel assignment (line ~4068).
const linkIdx   = src.indexOf('formData.quotation_id = modelID');
const clears    = [...src.matchAll(/formData\.quotation_id\s*=\s*""/g)];
const clearIdxs = clears.map(m => m.index);

describe('Order create — quotation ID carry-over prevention', () => {
    test('1. formData.quotation_id is cleared in at least two places (both open paths)', () => {
        expect(clearIdxs.length).toBeGreaterThanOrEqual(2);
    });

    test('2. at least one clear is inside the useImperativeHandle open() before ResetForm()', () => {
        // The useImperativeHandle block contains "formData.quotation_id = \"\"" then "ResetForm()"
        // within a few hundred characters.
        expect(src).toMatch(/formData\.quotation_id\s*=\s*""[\s\S]{0,300}ResetForm\(\)/);
    });

    test('3. all quotation-clear blocks also clear quotation_code, quotation_ids, quotation_codes', () => {
        clearIdxs.forEach(idx => {
            const slice = src.slice(idx, idx + 200);
            expect(slice).toMatch(/quotation_code\s*=\s*""/);
            expect(slice).toMatch(/quotation_ids\s*=\s*\[\]/);
            expect(slice).toMatch(/quotation_codes\s*=\s*\[\]/);
        });
    });

    test('4. all quotation-clear blocks appear before the linkModel assignment', () => {
        clearIdxs.forEach(idx => {
            expect(idx).toBeLessThan(linkIdx);
        });
    });
});
