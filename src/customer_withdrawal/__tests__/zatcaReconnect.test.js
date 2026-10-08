/**
 * Source-level tests for the ZATCA reconnect-required error handling fix in
 * customer_withdrawal/index.js.
 *
 * Mirrors the fix applied to customer_deposit/index.js: when
 * data.errors.zatca_reconnect is set, open the ZatcaConnect reconnect dialog
 * and update local store state instead of showing a toast error.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'index.js'),
    'utf8'
);

function getReportFn() {
    const fnStart = SRC.indexOf('function ReportWithdrawalToZatca');
    const fnEnd   = SRC.indexOf('\n    }', fnStart + 100);
    return SRC.slice(fnStart, fnEnd + 10);
}

// ── 1. zatca_reconnect detection ──────────────────────────────────────────────

describe('customer_withdrawal/index.js — zatca_reconnect error detection', () => {
    test('1.1  data?.errors?.zatca_reconnect is checked', () => {
        expect(SRC).toMatch(/data\?\.errors\?\.zatca_reconnect/);
    });

    test('1.2  the check is inside ReportWithdrawalToZatca', () => {
        const fn = getReportFn();
        expect(fn).toMatch(/zatca_reconnect/);
    });

    test('1.3  the check is inside the !response.ok || !data.status error block', () => {
        const fn          = getReportFn();
        const errBlockIdx = fn.indexOf('!response.ok');
        const reconnIdx   = fn.indexOf('zatca_reconnect', errBlockIdx);
        expect(errBlockIdx).toBeGreaterThan(-1);
        expect(reconnIdx).toBeGreaterThan(errBlockIdx);
    });
});

// ── 2. Reconnect dialog opened ────────────────────────────────────────────────

describe('customer_withdrawal/index.js — reconnect dialog on zatca_reconnect', () => {
    test('2.1  zatcaConnectRef.current?.open is called with reconnect=true', () => {
        expect(SRC).toMatch(/zatcaConnectRef\.current\?\.open\([^)]+,\s*true\)/);
    });

    test('2.2  open is called in the zatca_reconnect if-branch', () => {
        const fn      = getReportFn();
        const ifIdx   = fn.indexOf('data?.errors?.zatca_reconnect');
        const openIdx = fn.indexOf('zatcaConnectRef.current?.open', ifIdx);
        expect(ifIdx).toBeGreaterThan(-1);
        expect(openIdx).toBeGreaterThan(ifIdx);
    });

    test('2.3  localStorage.getItem("store_id") is used as the store id argument', () => {
        const fn = getReportFn();
        expect(fn).toMatch(/zatcaConnectRef\.current\?\.open\(localStorage\.getItem\("store_id"\)/);
    });
});

// ── 3. Local store state updated on zatca_reconnect ──────────────────────────

describe('customer_withdrawal/index.js — store state updated on zatca_reconnect', () => {
    test('3.1  setStore is called in the zatca_reconnect branch', () => {
        const fn = getReportFn();
        expect(fn).toMatch(/setStore/);
    });

    test('3.2  setStore marks zatca_reconnect_required true', () => {
        const fn = getReportFn();
        expect(fn).toMatch(/zatca_reconnect_required:\s*true/);
    });

    test('3.3  setStore uses functional update (prev => …)', () => {
        const fn = getReportFn();
        expect(fn).toMatch(/setStore\(\s*prev\s*=>/);
    });
});

// ── 4. Toast error NOT shown on zatca_reconnect ───────────────────────────────

describe('customer_withdrawal/index.js — toast bypassed on zatca_reconnect', () => {
    test('4.1  toast error message is in the else branch', () => {
        const fn       = getReportFn();
        const ifIdx    = fn.indexOf('data?.errors?.zatca_reconnect');
        const elseIdx  = fn.indexOf('} else {', ifIdx);
        const toastIdx = fn.indexOf('Reporting to Zatca failed', elseIdx);
        expect(elseIdx).toBeGreaterThan(ifIdx);
        expect(toastIdx).toBeGreaterThan(elseIdx);
    });

    test('4.2  showToastMessage is NOT called before the else branch', () => {
        const fn      = getReportFn();
        const ifIdx   = fn.indexOf('data?.errors?.zatca_reconnect');
        const elseIdx = fn.indexOf('} else {', ifIdx);
        const toastBefore = fn.slice(ifIdx, elseIdx).indexOf('showToastMessage');
        expect(toastBefore).toBe(-1);
    });

    test('4.3  _zatcaError annotation is in the else branch (not in reconnect path)', () => {
        const fn       = getReportFn();
        const ifIdx    = fn.indexOf('data?.errors?.zatca_reconnect');
        const elseIdx  = fn.indexOf('} else {', ifIdx);
        const errAnnotIdx = fn.indexOf('_zatcaError', elseIdx);
        expect(elseIdx).toBeGreaterThan(ifIdx);
        expect(errAnnotIdx).toBeGreaterThan(elseIdx);
    });
});

// ── 5. ZatcaConnect infrastructure ───────────────────────────────────────────

describe('customer_withdrawal/index.js — ZatcaConnect is rendered', () => {
    test('5.1  ZatcaConnect is imported', () => {
        expect(SRC).toMatch(/import ZatcaConnect/);
    });

    test('5.2  zatcaConnectRef is created with useRef', () => {
        expect(SRC).toMatch(/zatcaConnectRef\s*=\s*useRef\(\)/);
    });

    test('5.3  ZatcaConnect is rendered with the ref', () => {
        expect(SRC).toMatch(/<ZatcaConnect\s+ref=\{zatcaConnectRef\}/);
    });
});
