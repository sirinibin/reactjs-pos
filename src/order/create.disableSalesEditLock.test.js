/**
 * Source-level tests for the "Disable Sales Edit once Reported to ZATCA"
 * feature in order/create.js.
 *
 * These tests verify that the correct React state, useEffect, and checkbox
 * toggling logic are present in the source — without rendering the full
 * component (which requires a live API).
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'create.js'),
    'utf8'
);

// ── 1. orderZatcaReported state ───────────────────────────────────────────────

describe('order/create.js — orderZatcaReported state', () => {
    test('1.1  orderZatcaReported state is declared', () => {
        expect(SRC).toMatch(/orderZatcaReported/);
    });

    test('1.2  useState(false) is used to initialise orderZatcaReported', () => {
        expect(SRC).toMatch(/orderZatcaReported.*useState\(false\)|useState\(false\).*orderZatcaReported/);
    });

    test('1.3  setOrderZatcaReported is declared alongside orderZatcaReported', () => {
        expect(SRC).toMatch(/\[orderZatcaReported\s*,\s*setOrderZatcaReported\]/);
    });
});

// ── 2. useEffect re-evaluation when store settings load ──────────────────────

describe('order/create.js — useEffect re-evaluates lock on store load', () => {
    test('2.1  useEffect references orderZatcaReported in its guard', () => {
        expect(SRC).toMatch(/if\s*\(!\s*orderZatcaReported\)/);
    });

    test('2.2  useEffect reads disable_sales_edit_once_reported_to_zatca from store.settings', () => {
        expect(SRC).toMatch(/store\.settings\?\.disable_sales_edit_once_reported_to_zatca/);
    });

    test('2.3  lock evaluated as !== false (nil/undefined treated as true/locked)', () => {
        // The expression must be !== false, not === true, so that undefined (store not yet
        // loaded) correctly defaults to locked.
        expect(SRC).toMatch(/disable_sales_edit_once_reported_to_zatca\s*!==\s*false/);
    });

    test('2.4  setIsZatcaLocked is called inside the useEffect', () => {
        expect(SRC).toMatch(/setIsZatcaLocked\(/);
    });

    test('2.5  useEffect dependency includes store.settings disable key', () => {
        expect(SRC).toMatch(
            /store\.settings\?\.disable_sales_edit_once_reported_to_zatca.*orderZatcaReported|orderZatcaReported.*store\.settings\?\.disable_sales_edit_once_reported_to_zatca/
        );
    });
});

// ── 3. ZATCA-reported order sets orderZatcaReported true ─────────────────────

describe('order/create.js — order load sets orderZatcaReported', () => {
    test('3.1  reporting_passed is checked on order load', () => {
        expect(SRC).toMatch(/reporting_passed/);
    });

    test('3.2  setOrderZatcaReported(true) is called when reporting_passed', () => {
        expect(SRC).toMatch(/setOrderZatcaReported\(\s*true\s*\)/);
    });

    test('3.3  setIsZatcaLocked is also called inside the reporting_passed branch', () => {
        // Both the immediate lock and the useEffect path must be covered.
        const matches = SRC.match(/setIsZatcaLocked\(/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ── 4. orderZatcaReported is reset on form clear ─────────────────────────────

describe('order/create.js — orderZatcaReported resets on form clear', () => {
    test('4.1  setOrderZatcaReported(false) appears at least twice (multiple reset paths)', () => {
        const matches = SRC.match(/setOrderZatcaReported\(\s*false\s*\)/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('4.2  setOrderZatcaReported(false) is always paired near setIsZatcaLocked(false)', () => {
        // Each reset of isZatcaLocked must also reset orderZatcaReported so the
        // useEffect does not re-lock after a new (unreported) order is loaded.
        const lockResets = [];
        let idx = 0;
        while ((idx = SRC.indexOf('setIsZatcaLocked(false)', idx)) !== -1) {
            // Check within 300 chars around this reset for the companion call.
            const window = SRC.slice(Math.max(0, idx - 50), idx + 300);
            lockResets.push({ idx, hasCompanion: window.includes('setOrderZatcaReported(false)') });
            idx += 1;
        }
        expect(lockResets.length).toBeGreaterThan(0);
        const missing = lockResets.filter(r => !r.hasCompanion);
        if (missing.length > 0) {
            throw new Error(
                `${missing.length} setIsZatcaLocked(false) call(s) at char offset(s) ` +
                `[${missing.map(r => r.idx).join(', ')}] ` +
                `have no nearby setOrderZatcaReported(false)`
            );
        }
    });
});

// ── 5. Checkbox semantics: !== false pattern ──────────────────────────────────

describe('order/create.js — disable_sales_edit_once_reported_to_zatca checked expression', () => {
    test('5.1  uses !== false to treat undefined/null as locked', () => {
        // Must NOT use === true (that would default to unlocked for undefined/null).
        expect(SRC).toMatch(/disable_sales_edit_once_reported_to_zatca\s*!==\s*false/);
        expect(SRC).not.toMatch(/disable_sales_edit_once_reported_to_zatca\s*===\s*true/);
    });
});
