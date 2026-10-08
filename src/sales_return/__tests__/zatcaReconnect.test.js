/**
 * Source-level tests for the ZATCA reconnect-required error handling fix in
 * sales_return/index.js.
 *
 * Mirrors the fix applied to order/index.js: when the backend returns
 * errors.zatca_reconnect, open the ZatcaConnect dialog instead of the error
 * modal, and refresh the store state first.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'index.js'),
    'utf8'
);

function getCatchBlock() {
    const fnStart  = SRC.indexOf('function ReportInvoiceToZatca');
    const catchIdx = SRC.indexOf('.catch((error) =>', fnStart);
    const fnEnd    = SRC.indexOf('\n    }', catchIdx + 1);
    return SRC.slice(catchIdx, fnEnd + 10);
}

// ── 1. zatca_reconnect detection ──────────────────────────────────────────────

describe('sales_return/index.js — zatca_reconnect error detection', () => {
    test('1.1  error?.zatca_reconnect is checked in the catch block', () => {
        expect(SRC).toMatch(/error\?\.zatca_reconnect/);
    });

    test('1.2  the check is inside the ReportInvoiceToZatca catch block', () => {
        const catchBlock = getCatchBlock();
        expect(catchBlock).toMatch(/zatca_reconnect/);
    });
});

// ── 2. Reconnect dialog opened ────────────────────────────────────────────────

describe('sales_return/index.js — reconnect dialog on zatca_reconnect', () => {
    test('2.1  zatcaConnectRef.current?.open is called with reconnect=true', () => {
        expect(SRC).toMatch(/zatcaConnectRef\.current\?\.open\([^)]+,\s*true\)/);
    });

    test('2.2  getStore is called before opening the dialog', () => {
        const catchBlock  = getCatchBlock();
        const getStoreIdx = catchBlock.indexOf('getStore(store.id)');
        const openIdx     = catchBlock.indexOf('zatcaConnectRef.current?.open');
        expect(getStoreIdx).toBeGreaterThan(-1);
        expect(openIdx).toBeGreaterThan(getStoreIdx);
    });

    test('2.3  open is inside the zatca_reconnect if-branch', () => {
        const catchBlock = getCatchBlock();
        const ifIdx      = catchBlock.indexOf('if (error?.zatca_reconnect)');
        const openIdx    = catchBlock.indexOf('zatcaConnectRef.current?.open', ifIdx);
        expect(ifIdx).toBeGreaterThan(-1);
        expect(openIdx).toBeGreaterThan(ifIdx);
    });
});

// ── 3. Error modal bypassed ───────────────────────────────────────────────────

describe('sales_return/index.js — error modal bypassed on zatca_reconnect', () => {
    test('3.1  setShowErrors(true) is in the else branch', () => {
        const catchBlock    = getCatchBlock();
        const elseIdx       = catchBlock.indexOf('} else {');
        const setShowErrIdx = catchBlock.indexOf('setShowErrors(true)', elseIdx);
        expect(elseIdx).toBeGreaterThan(-1);
        expect(setShowErrIdx).toBeGreaterThan(elseIdx);
    });

    test('3.2  toast error message is in the else branch', () => {
        const catchBlock  = getCatchBlock();
        const elseIdx     = catchBlock.indexOf('} else {');
        const toastIdx    = catchBlock.indexOf('Invoice reporting to Zatca failed', elseIdx);
        expect(elseIdx).toBeGreaterThan(-1);
        expect(toastIdx).toBeGreaterThan(elseIdx);
    });
});

// ── 4. ZatcaConnect infrastructure ───────────────────────────────────────────

describe('sales_return/index.js — ZatcaConnect is rendered', () => {
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
