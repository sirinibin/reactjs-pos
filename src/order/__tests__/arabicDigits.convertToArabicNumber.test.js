/**
 * Unit tests for the convertToArabicNumber Arabic-digit fix.
 *
 * Problem: persianDigits was a mixed string of Extended Arabic-Indic (U+06F0-U+06F9,
 * "Persian") and Standard Arabic-Indic (U+0660-U+0669, "Arabic-Indic") digits.
 * For example "۰۱۲۳٤۵۶۷۸۹" maps '4' → ٤ (correct) but '6' → ۶ (wrong — Extended).
 * The Saudi-riyal-font and print engines render Extended Arabic-Indic glyphs
 * incorrectly in some contexts, causing garbled output.
 *
 * Fix: normalize persianDigits to pure Standard Arabic-Indic "٠١٢٣٤٥٦٧٨٩"
 * (U+0660-U+0669) in all previewContent files.
 *
 * Standard Arabic-Indic code points (U+0660-U+0669):
 *   ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩
 *
 * Extended Arabic-Indic / Persian code points (U+06F0-U+06F9):
 *   ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹  ← these caused the bug
 */

// ── Mirror of convertToArabicNumber as it should work after the fix ────────────

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arabicMap     = ARABIC_DIGITS.split("");

function convertToArabicNumber(input) {
    if (Number.isInteger(input)) {
        input = input.toString();
    }
    return input.replace(/\d/g, (m) => arabicMap[parseInt(m)]);
}

// Standard Arabic-Indic code points (U+0660-U+0669)
const ARABIC_INDIC = {
    0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
    5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩',
};

// Extended Arabic-Indic (Persian) code points (U+06F0-U+06F9) — the old wrong values
const EXTENDED_ARABIC_INDIC = {
    0: '۰', 1: '۱', 2: '۲', 3: '۳', 4: '۴',
    5: '۵', 6: '۶', 7: '۷', 8: '۸', 9: '۹',
};


// ─── 1. Source file — persianDigits string normalised to Standard Arabic-Indic ──

const fs   = require('fs');
const path = require('path');

const ORDER_PREVIEW = fs.readFileSync(
    path.join(__dirname, '../previewContent.js'), 'utf8'
);

describe('order/previewContent.js — persianDigits uses Standard Arabic-Indic', () => {
    test('persianDigits string contains the correct Standard Arabic-Indic digits', () => {
        // The fixed string "٠١٢٣٤٥٦٧٨٩" must appear in source
        expect(ORDER_PREVIEW).toContain('"٠١٢٣٤٥٦٧٨٩"');
    });

    test('persianDigits does NOT contain Extended Arabic-Indic 6 (U+06F6 ۶)', () => {
        // Old string had ۶ (U+06F6) at position 6 — it must be gone
        const badSix = '۶';
        // Ensure the bad character is not in the persianDigits line
        const persianDigitsLine = ORDER_PREVIEW.split('\n').find(l => l.includes('persianDigits'));
        expect(persianDigitsLine).toBeDefined();
        expect(persianDigitsLine).not.toContain(badSix);
    });

    test('persianDigits does NOT contain Extended Arabic-Indic 0 (U+06F0 ۰)', () => {
        const badZero = '۰';
        const persianDigitsLine = ORDER_PREVIEW.split('\n').find(l => l.includes('persianDigits'));
        expect(persianDigitsLine).not.toContain(badZero);
    });

    test('persianDigits digit for "6" is Standard Arabic-Indic ٦ (U+0666)', () => {
        const persianDigitsLine = ORDER_PREVIEW.split('\n').find(l => l.includes('persianDigits'));
        expect(persianDigitsLine).toContain('٦');   // ٦ — correct
        expect(persianDigitsLine).not.toContain('۶'); // ۶ — wrong
    });
});


// ─── 2. convertToArabicNumber — digit-by-digit correctness ────────────────────

describe('convertToArabicNumber — each digit maps to Standard Arabic-Indic', () => {
    test.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])(
        'digit %s → Standard Arabic-Indic U+066%s',
        (digit) => {
            const result = convertToArabicNumber(digit.toString());
            expect(result).toBe(ARABIC_INDIC[digit]);
            // Must NOT be the Extended Arabic-Indic equivalent
            expect(result).not.toBe(EXTENDED_ARABIC_INDIC[digit]);
        }
    );
});

describe('convertToArabicNumber — the specific "6" bug', () => {
    test('"6" maps to ٦ (U+0666, Standard Arabic-Indic), NOT ۶ (U+06F6, Extended)', () => {
        const result = convertToArabicNumber('6');
        expect(result).toBe('٦');      // ٦ correct
        expect(result).not.toBe('۶'); // ۶ wrong (was the bug)
    });

    test('CR number "4030299062" converts correctly — "6" at index 8 is ٦', () => {
        const result = convertToArabicNumber('4030299062');
        // Digit "6" is at position 8 of the input → index 8 of the output
        expect(result.charAt(8)).toBe('٦'); // ٦ (Standard)
        expect(result.charAt(8)).not.toBe('۶'); // ۶ (Extended — the bug)
    });

    test('full conversion of "4030299062" produces 10 Standard Arabic-Indic chars', () => {
        const result = convertToArabicNumber('4030299062');
        expect(result).toHaveLength(10);
        // Every character must be in U+0660-U+0669
        for (const ch of result) {
            const cp = ch.codePointAt(0);
            expect(cp).toBeGreaterThanOrEqual(0x0660);
            expect(cp).toBeLessThanOrEqual(0x0669);
        }
    });

    test('full expected output for "4030299062" is "٤٠٣٠٢٩٩٠٦٢"', () => {
        expect(convertToArabicNumber('4030299062')).toBe('٤٠٣٠٢٩٩٠٦٢');
    });
});


// ─── 3. convertToArabicNumber — general correctness ──────────────────────────

describe('convertToArabicNumber — general behaviour', () => {
    test('converts a simple single digit string', () => {
        expect(convertToArabicNumber('5')).toBe(ARABIC_INDIC[5]);
    });

    test('converts an integer input (not a string)', () => {
        expect(convertToArabicNumber(42)).toBe('٤٢');
    });

    test('leaves non-digit characters unchanged', () => {
        expect(convertToArabicNumber('1.5')).toBe('١.٥');
    });

    test('empty string returns empty string', () => {
        expect(convertToArabicNumber('')).toBe('');
    });

    test('mixed alphanumeric — only digits converted', () => {
        expect(convertToArabicNumber('CR-1234')).toBe('CR-١٢٣٤');
    });

    test('all zeros', () => {
        expect(convertToArabicNumber('000')).toBe('٠٠٠');
    });

    test('all nines', () => {
        expect(convertToArabicNumber('999')).toBe('٩٩٩');
    });
});


// ─── 4. Standard Arabic-Indic digit constants ─────────────────────────────────

describe('Standard Arabic-Indic code point invariants', () => {
    test('Standard Arabic-Indic digits form a contiguous block U+0660-U+0669', () => {
        for (let i = 0; i <= 9; i++) {
            expect(ARABIC_INDIC[i].codePointAt(0)).toBe(0x0660 + i);
        }
    });

    test('Extended Arabic-Indic digits form a contiguous block U+06F0-U+06F9', () => {
        for (let i = 0; i <= 9; i++) {
            expect(EXTENDED_ARABIC_INDIC[i].codePointAt(0)).toBe(0x06F0 + i);
        }
    });

    test('Standard and Extended are distinct code points for every digit', () => {
        for (let i = 0; i <= 9; i++) {
            expect(ARABIC_INDIC[i]).not.toBe(EXTENDED_ARABIC_INDIC[i]);
        }
    });

    test('Standard Arabic-Indic 6 (٦) is U+0666', () => {
        expect(ARABIC_INDIC[6].codePointAt(0)).toBe(0x0666);
    });

    test('Extended Arabic-Indic 6 (۶) is U+06F6', () => {
        expect(EXTENDED_ARABIC_INDIC[6].codePointAt(0)).toBe(0x06F6);
    });
});
