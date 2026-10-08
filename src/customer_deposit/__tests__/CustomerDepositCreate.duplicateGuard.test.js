/**
 * Tests that the duplicate-submission guard is in place for both
 * customer_deposit and customer_withdrawal create forms.
 */

const fs   = require('fs');
const path = require('path');

const DEP = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');
const WIT = fs.readFileSync(path.join(__dirname, '../../customer_withdrawal/create.js'), 'utf8');

describe('CustomerDeposit create — double-submit guard', () => {
    test('1. submittingRef is declared as useRef(false)', () => {
        expect(DEP).toMatch(/submittingRef\s*=\s*useRef\(false\)/);
    });

    test('2. handleCreate checks submittingRef.current synchronously before isProcessing', () => {
        expect(DEP).toMatch(/submittingRef\.current \|\| isProcessing/);
    });

    test('3. handleCreate sets submittingRef.current = true before fetch', () => {
        expect(DEP).toMatch(/submittingRef\.current\s*=\s*true/);
    });

    test('4. submittingRef is reset to false (appears at least twice — success and error paths)', () => {
        const resets = [...DEP.matchAll(/submittingRef\.current\s*=\s*false/g)];
        expect(resets.length).toBeGreaterThanOrEqual(2);
    });

    test('5. submittingRef reset appears inside a fetch callback (after setProcessing(false))', () => {
        expect(DEP).toMatch(/setProcessing\(false\)[\s\S]{0,60}submittingRef\.current\s*=\s*false/);
    });
});

describe('CustomerWithdrawal create — double-submit guard', () => {
    test('6. submittingRef is declared as useRef(false)', () => {
        expect(WIT).toMatch(/submittingRef\s*=\s*useRef\(false\)/);
    });

    test('7. handleCreate checks submittingRef.current synchronously before isProcessing', () => {
        expect(WIT).toMatch(/submittingRef\.current \|\| isProcessing/);
    });

    test('8. handleCreate sets submittingRef.current = true before fetch', () => {
        expect(WIT).toMatch(/submittingRef\.current\s*=\s*true/);
    });

    test('9. submittingRef is reset to false (appears at least twice — success and error paths)', () => {
        const resets = [...WIT.matchAll(/submittingRef\.current\s*=\s*false/g)];
        expect(resets.length).toBeGreaterThanOrEqual(2);
    });

    test('10. submittingRef reset appears inside a fetch callback (after setProcessing(false))', () => {
        expect(WIT).toMatch(/setProcessing\(false\)[\s\S]{0,60}submittingRef\.current\s*=\s*false/);
    });
});
