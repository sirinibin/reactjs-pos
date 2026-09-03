/**
 * Source-level tests for the ZATCA reconnect-required error handling fix in
 * order/index.js (Sales index).
 *
 * Before this fix, when the backend returned errors.zatca_reconnect the
 * component showed a generic error modal. After the fix, it opens the
 * ZatcaConnect reconnect dialog and refreshes the store state instead.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'index.js'),
    'utf8'
);

// Helper: find the catch block of ReportInvoiceToZatca
function getCatchBlock() {
    const fnStart   = SRC.indexOf('function ReportInvoiceToZatca');
    const catchIdx  = SRC.indexOf('.catch((error) =>', fnStart);
    const fnEnd     = SRC.indexOf('\n    }', catchIdx + 1); // closing brace of function
    return SRC.slice(catchIdx, fnEnd + 10);
}

// ── 1. zatca_reconnect detection in catch ─────────────────────────────────────

describe('order/index.js — zatca_reconnect error detection', () => {
    test('1.1  error.zatca_reconnect is checked in the ReportInvoiceToZatca catch', () => {
        expect(SRC).toMatch(/error\?\.zatca_reconnect/);
    });

    test('1.2  the check uses optional chaining (handles null/undefined error safely)', () => {
        // error?.zatca_reconnect — the ?. ensures no crash when error is null
        expect(SRC).toMatch(/error\?\.zatca_reconnect/);
    });

    test('1.3  zatca_reconnect check is inside the ReportInvoiceToZatca catch block', () => {
        const catchBlock = getCatchBlock();
        expect(catchBlock).toMatch(/zatca_reconnect/);
    });
});

// ── 2. Reconnect dialog opened on zatca_reconnect error ───────────────────────

describe('order/index.js — reconnect dialog on zatca_reconnect error', () => {
    test('2.1  zatcaConnectRef.current?.open is called in the reconnect branch', () => {
        expect(SRC).toMatch(/zatcaConnectRef\.current\?\.open\(store\.id,\s*true\)/);
    });

    test('2.2  open is called with reconnect=true (second argument)', () => {
        // Ensure the second arg is `true` (activates reconnect mode in ZatcaConnect)
        expect(SRC).toMatch(/zatcaConnectRef\.current\?\.open\([^)]+,\s*true\)/);
    });

    test('2.3  getStore is called to refresh store state before opening the dialog', () => {
        const catchBlock = getCatchBlock();
        const getStoreIdx = catchBlock.indexOf('getStore(store.id)');
        const openIdx     = catchBlock.indexOf('zatcaConnectRef.current?.open');
        expect(getStoreIdx).toBeGreaterThan(-1);
        expect(openIdx).toBeGreaterThan(getStoreIdx);
    });

    test('2.4  reconnect branch is guarded by the zatca_reconnect check', () => {
        const catchBlock  = getCatchBlock();
        const ifIdx       = catchBlock.indexOf('if (error?.zatca_reconnect)');
        const openIdx     = catchBlock.indexOf('zatcaConnectRef.current?.open', ifIdx);
        expect(ifIdx).toBeGreaterThan(-1);
        expect(openIdx).toBeGreaterThan(ifIdx);
    });
});

// ── 3. Error modal NOT shown when zatca_reconnect error ───────────────────────

describe('order/index.js — error modal bypassed on zatca_reconnect error', () => {
    test('3.1  setShowErrors(true) is inside an else branch (not always called)', () => {
        const catchBlock = getCatchBlock();
        // setShowErrors(true) must come after an `else {`
        const elseIdx        = catchBlock.indexOf('} else {');
        const setShowErrIdx  = catchBlock.indexOf('setShowErrors(true)', elseIdx);
        expect(elseIdx).toBeGreaterThan(-1);
        expect(setShowErrIdx).toBeGreaterThan(elseIdx);
    });

    test('3.2  setShowErrors(true) appears AFTER the zatca_reconnect if-else block', () => {
        const catchBlock  = getCatchBlock();
        const ifIdx       = catchBlock.indexOf('if (error?.zatca_reconnect)');
        const showErrIdx  = catchBlock.indexOf('setShowErrors(true)');
        expect(ifIdx).toBeGreaterThan(-1);
        expect(showErrIdx).toBeGreaterThan(ifIdx);
    });

    test('3.3  toast failure message is inside the else branch (not shown on reconnect)', () => {
        const catchBlock   = getCatchBlock();
        const elseIdx      = catchBlock.indexOf('} else {');
        const toastErrIdx  = catchBlock.indexOf('Invoice reporting to Zatca failed', elseIdx);
        expect(elseIdx).toBeGreaterThan(-1);
        expect(toastErrIdx).toBeGreaterThan(elseIdx);
    });
});

// ── 4. ZatcaConnect component is mounted ─────────────────────────────────────

describe('order/index.js — ZatcaConnect is rendered', () => {
    test('4.1  ZatcaConnect component is imported', () => {
        expect(SRC).toMatch(/import ZatcaConnect/);
    });

    test('4.2  zatcaConnectRef is created with useRef', () => {
        expect(SRC).toMatch(/zatcaConnectRef\s*=\s*useRef\(\)/);
    });

    test('4.3  ZatcaConnect is rendered with the zatcaConnectRef ref', () => {
        expect(SRC).toMatch(/<ZatcaConnect\s+ref=\{zatcaConnectRef\}/);
    });
});
