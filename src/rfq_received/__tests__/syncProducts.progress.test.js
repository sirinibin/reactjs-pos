/**
 * Source-level tests for the Syncing products… progress indicator in the RFQ form.
 *
 * Verifies:
 *  1. syncProgress state is declared
 *  2. syncProductListToDB accepts an onProgress callback parameter
 *  3. onProgress is called once per product inside the loop
 *  4. autoSyncProducts initialises syncProgress before calling syncProductListToDB
 *  5. autoSyncProducts resets syncProgress to { done:0, total:0 } after completion
 *  6. The on-save path (needsSync branch) also calls setSyncProgress and resets it
 *  7. The UI renders the done/total and percentage when syncProgress.total > 0
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

describe('RFQ form — Syncing products progress indicator', () => {
    test('1. syncProgress state is declared', () => {
        expect(src).toMatch(/syncProgress.*setSyncProgress.*useState\s*\(\s*\{.*done.*total/s);
    });

    test('2. syncProductListToDB accepts an onProgress parameter', () => {
        expect(src).toMatch(/syncProductListToDB\s*=\s*async\s*\([^)]*onProgress/);
    });

    test('3. onProgress is called with (done, total) after each product', () => {
        expect(src).toMatch(/onProgress\s*&&\s*onProgress\(done,\s*total\)/);
    });

    test('4. autoSyncProducts initialises syncProgress with total before syncing', () => {
        expect(src).toMatch(/setSyncProgress\(\s*\{\s*done\s*:\s*0\s*,\s*total\s*:\s*productList\.length/);
    });

    test('5. autoSyncProducts resets syncProgress to { done:0, total:0 } after completion', () => {
        const resets = [...src.matchAll(/setSyncProgress\(\s*\{\s*done\s*:\s*0\s*,\s*total\s*:\s*0\s*\}\)/g)];
        expect(resets.length).toBeGreaterThanOrEqual(2);
    });

    test('6. on-save (needsSync) path passes onProgress to syncProductListToDB', () => {
        expect(src).toMatch(/setSyncProgress\(\s*\{\s*done\s*:\s*0\s*,\s*total\s*:\s*currentProducts\.length/);
    });

    test('7. UI shows done/total count and percentage when syncProgress.total > 0', () => {
        expect(src).toMatch(/syncProgress\.total\s*>\s*0/);
        expect(src).toMatch(/syncProgress\.done\s*\/\s*syncProgress\.total\s*\*\s*100/);
        expect(src).toMatch(/syncProgress\.done.*syncProgress\.total/s);
    });
});
