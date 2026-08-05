import { enUS, arSA, bn, hi, ru } from 'date-fns/locale';
import { getDateLocale, getDatePickerLocale } from '../dateLocales';

// The locale object shape that date-fns exports in v2.
// Each locale has these top-level keys — we use them to verify consistency.
const LOCALE_SHAPE_KEYS = ['code', 'formatLong', 'formatRelative', 'formatDistance', 'localize', 'match', 'options'];

// ─── getDateLocale ────────────────────────────────────────────────────────────

describe('getDateLocale', () => {
    // 1. English → enUS
    it('returns the enUS locale object for "en"', () => {
        const result = getDateLocale('en');
        expect(result).toBe(enUS);
        expect(result.code).toBe('en-US');
    });

    // 2. Arabic → arSA
    it('returns the arSA locale object for "ar"', () => {
        const result = getDateLocale('ar');
        expect(result).toBe(arSA);
        expect(result.code).toBe('ar-SA');
    });

    // 3. Bengali → bn
    it('returns the Bengali locale object for "bn"', () => {
        const result = getDateLocale('bn');
        expect(result).toBe(bn);
        expect(result.code).toBe('bn');
    });

    // 4. Hindi ("hn" key) → hi
    it('returns the Hindi locale object for "hn"', () => {
        const result = getDateLocale('hn');
        expect(result).toBe(hi);
        expect(result.code).toBe('hi');
    });

    // 5. Russian → ru
    it('returns the Russian locale object for "ru"', () => {
        const result = getDateLocale('ru');
        expect(result).toBe(ru);
        expect(result.code).toBe('ru');
    });

    // 6. Malayalam — not in date-fns, falls back to enUS
    it('returns a valid locale object for "ml" (Malayalam falls back to enUS)', () => {
        const result = getDateLocale('ml');
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
        // The implementation falls back to enUS for Malayalam
        expect(result).toBe(enUS);
        expect(result.code).toBe('en-US');
    });

    // 7. Urdu — not in date-fns, falls back to enUS
    it('returns a valid locale object for "ur" (Urdu falls back to enUS)', () => {
        const result = getDateLocale('ur');
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
        // The implementation falls back to enUS for Urdu
        expect(result).toBe(enUS);
        expect(result.code).toBe('en-US');
    });

    // 8. Unknown code → fallback (enUS)
    it('returns the default fallback locale for an unknown language code', () => {
        const result = getDateLocale('unknown');
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
        expect(result).toBe(enUS);
    });

    // 9. null → does not crash, returns fallback
    it('does not throw and returns a fallback when called with null', () => {
        expect(() => getDateLocale(null)).not.toThrow();
        const result = getDateLocale(null);
        expect(result).toBe(enUS);
    });

    // 10. undefined → does not crash, returns fallback
    it('does not throw and returns a fallback when called with undefined', () => {
        expect(() => getDateLocale(undefined)).not.toThrow();
        const result = getDateLocale(undefined);
        expect(result).toBe(enUS);
    });

    // 14. Return values are not null/undefined for all supported codes
    it('returns a non-null, non-undefined locale for every supported language code', () => {
        const supportedCodes = ['en', 'ar', 'bn', 'hn', 'ml', 'ru', 'ur'];
        supportedCodes.forEach((code) => {
            const result = getDateLocale(code);
            expect(result).not.toBeNull();
            expect(result).not.toBeUndefined();
        });
    });

    // 15. All returned locales share the same date-fns v2 object shape
    it('all returned locale objects have the consistent date-fns v2 shape', () => {
        const supportedCodes = ['en', 'ar', 'bn', 'hn', 'ml', 'ru', 'ur'];
        supportedCodes.forEach((code) => {
            const result = getDateLocale(code);
            LOCALE_SHAPE_KEYS.forEach((key) => {
                expect(result).toHaveProperty(key);
            });
        });
    });

    // Bonus: empty string is also treated as unknown → fallback
    it('returns fallback for an empty string language code', () => {
        const result = getDateLocale('');
        expect(result).toBe(enUS);
    });
});

// ─── getDatePickerLocale ──────────────────────────────────────────────────────

describe('getDatePickerLocale', () => {
    // 11. English
    it('returns "en" for language code "en"', () => {
        expect(getDatePickerLocale('en')).toBe('en');
    });

    // 12. Arabic
    it('returns "ar" for language code "ar"', () => {
        expect(getDatePickerLocale('ar')).toBe('ar');
    });

    // Bengali
    it('returns "bn" for language code "bn"', () => {
        expect(getDatePickerLocale('bn')).toBe('bn');
    });

    // Hindi ("hn" key maps to "hi")
    it('returns "hi" for language code "hn"', () => {
        expect(getDatePickerLocale('hn')).toBe('hi');
    });

    // Malayalam
    it('returns "ml" for language code "ml"', () => {
        expect(getDatePickerLocale('ml')).toBe('ml');
    });

    // Russian
    it('returns "ru" for language code "ru"', () => {
        expect(getDatePickerLocale('ru')).toBe('ru');
    });

    // Urdu
    it('returns "ur" for language code "ur"', () => {
        expect(getDatePickerLocale('ur')).toBe('ur');
    });

    // 13. Unknown → fallback "en"
    it('returns the fallback "en" for an unknown language code', () => {
        expect(getDatePickerLocale('unknown')).toBe('en');
    });

    // null → does not crash, returns fallback
    it('does not throw and returns fallback when called with null', () => {
        expect(() => getDatePickerLocale(null)).not.toThrow();
        expect(getDatePickerLocale(null)).toBe('en');
    });

    // undefined → does not crash, returns fallback
    it('does not throw and returns fallback when called with undefined', () => {
        expect(() => getDatePickerLocale(undefined)).not.toThrow();
        expect(getDatePickerLocale(undefined)).toBe('en');
    });

    // 14. Return values are not null/undefined for all supported codes
    it('returns a non-null, non-undefined string for every supported language code', () => {
        const supportedCodes = ['en', 'ar', 'bn', 'hn', 'ml', 'ru', 'ur'];
        supportedCodes.forEach((code) => {
            const result = getDatePickerLocale(code);
            expect(result).not.toBeNull();
            expect(result).not.toBeUndefined();
            expect(typeof result).toBe('string');
        });
    });

    // 15. All returned values are non-empty strings (consistent shape)
    it('all returned values are non-empty strings (consistent API shape)', () => {
        const supportedCodes = ['en', 'ar', 'bn', 'hn', 'ml', 'ru', 'ur'];
        supportedCodes.forEach((code) => {
            const result = getDatePickerLocale(code);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    // Bonus: empty string → fallback "en"
    it('returns fallback "en" for an empty string language code', () => {
        expect(getDatePickerLocale('')).toBe('en');
    });
});
