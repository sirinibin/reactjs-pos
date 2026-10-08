/**
 * Source-level tests for the Customer Pendings modal scroll fix.
 *
 * Root cause: each index table div uses a ref callback that sets
 *   el.style.height = window.innerHeight - top - 16
 * pinning the table to the full viewport height. Inside the scrollable
 * fullscreen Customer Pendings modal this prevents the modal body from
 * scrolling. The fix is `if (pendingView) return;` before that calculation.
 */

const fs   = require('fs');
const path = require('path');

const FILES = {
    order:                  path.join(__dirname, '../../order/index.js'),
    sales_return:           path.join(__dirname, '../../sales_return/index.js'),
    quotation:              path.join(__dirname, '../../quotation/index.js'),
    quotation_sales_return: path.join(__dirname, '../../quotation_sales_return/index.js'),
    purchase:               path.join(__dirname, '../../purchase/index.js'),
    purchase_return:        path.join(__dirname, '../../purchase_return/index.js'),
};

describe('Customer Pendings modal — table height fix (pendingView)', () => {
    for (const [name, filePath] of Object.entries(FILES)) {
        const src = fs.readFileSync(filePath, 'utf8');

        test(`${name}/index.js: skips height-fit when pendingView is true`, () => {
            // The guard must appear before the window.innerHeight call in the ref callback
            const guardIdx    = src.indexOf('if (pendingView) return;');
            const heightIdx   = src.indexOf('window.innerHeight - top - 16');
            expect(guardIdx).toBeGreaterThan(-1);
            expect(heightIdx).toBeGreaterThan(-1);
            expect(guardIdx).toBeLessThan(heightIdx);
        });

        test(`${name}/index.js: has pendingView state and reads props.pendingView`, () => {
            expect(src).toMatch(/useState\([^)]*pendingView|pendingView[^;]*useState/);
            expect(src).toMatch(/props\.pendingView/);
        });
    }
});
