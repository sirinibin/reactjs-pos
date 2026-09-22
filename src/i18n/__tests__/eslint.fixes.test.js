/**
 * Tests for ESLint warning fixes applied during this session.
 *
 * 1. vendor_category/create.js — removed unused `useRef` import
 * 2. vendor_category/index.js  — removed unused `useEffect` import
 * 3. store/WhatsAppConnect.js  — added `t` to useCallback dependency array
 */

const fs   = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../');
function read(rel) { return fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8'); }

// ── 1. vendor_category/create.js ─────────────────────────────────────────────

describe('vendor_category/create.js — ESLint fix: no unused useRef', () => {
    const src = read('vendor_category/create.js');

    test('1.1  imports useEffect (still needed)', () => {
        expect(src).toMatch(/\buseEffect\b/);
    });

    test('1.2  does not import useRef (was unused, removed)', () => {
        // useRef should not appear in the import list
        const importLine = src.match(/^import React.*$/m)?.[0] ?? '';
        expect(importLine).not.toContain('useRef');
    });

    test('1.3  file still compiles — forwardRef is imported', () => {
        expect(src).toMatch(/\bforwardRef\b/);
    });
});

// ── 2. vendor_category/index.js ──────────────────────────────────────────────

describe('vendor_category/index.js — ESLint fix: no unused useEffect', () => {
    const src = read('vendor_category/index.js');

    test('2.1  imports useRef (still needed for CreateFormRef)', () => {
        expect(src).toMatch(/\buseRef\b/);
    });

    test('2.2  does not import useEffect (was unused, removed)', () => {
        const importLine = src.match(/^import React.*$/m)?.[0] ?? '';
        expect(importLine).not.toContain('useEffect');
    });

    test('2.3  forwardRef is still imported', () => {
        expect(src).toMatch(/\bforwardRef\b/);
    });
});

// ── 3. store/WhatsAppConnect.js ───────────────────────────────────────────────

describe('store/WhatsAppConnect.js — ESLint fix: t in useCallback deps', () => {
    const src = read('store/WhatsAppConnect.js');

    test('3.1  t is listed in a useCallback dependency array', () => {
        // The dependency array that was missing t should now include it
        expect(src).toMatch(/\[.*\bt\b.*\]/);
    });

    test('3.2  useTranslation is imported', () => {
        expect(src).toMatch(/useTranslation/);
    });

    test('3.3  useCallback is used', () => {
        expect(src).toMatch(/\buseCallback\b/);
    });
});
