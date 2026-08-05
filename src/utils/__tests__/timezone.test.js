import {
    getCountryTimezoneOffset,
    toStoreLocalDate,
    fromStoreLocalDate,
} from '../timezone';

// ---------------------------------------------------------------------------
// getCountryTimezoneOffset
// ---------------------------------------------------------------------------
describe('getCountryTimezoneOffset', () => {
    // Sign convention: east-of-UTC countries carry a NEGATIVE offset.
    // The offset is subtracted from UTC to reach store-local time
    // (UTC = local + offsetHours on the backend).

    test('SA returns -3 (Saudi Arabia UTC+3)', () => {
        expect(getCountryTimezoneOffset('SA')).toBe(-3);
    });

    test('AE returns -4 (UAE UTC+4)', () => {
        expect(getCountryTimezoneOffset('AE')).toBe(-4);
    });

    test('IN returns -5.5 (India UTC+5:30)', () => {
        expect(getCountryTimezoneOffset('IN')).toBe(-5.5);
    });

    test('NP returns -5.75 (Nepal UTC+5:45)', () => {
        expect(getCountryTimezoneOffset('NP')).toBe(-5.75);
    });

    test('GB returns 0 (UK UTC)', () => {
        expect(getCountryTimezoneOffset('GB')).toBe(0);
    });

    test('US returns 5 (Eastern US UTC-5)', () => {
        expect(getCountryTimezoneOffset('US')).toBe(5);
    });

    test('AU returns -10 (Australia UTC+10)', () => {
        expect(getCountryTimezoneOffset('AU')).toBe(-10);
    });

    test('unknown country code returns 0 (fallback UTC)', () => {
        expect(getCountryTimezoneOffset('XX')).toBe(0);
    });

    test('null returns 0', () => {
        expect(getCountryTimezoneOffset(null)).toBe(0);
    });

    test('undefined returns 0', () => {
        expect(getCountryTimezoneOffset(undefined)).toBe(0);
    });

    test('empty string returns 0', () => {
        expect(getCountryTimezoneOffset('')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// toStoreLocalDate
// ---------------------------------------------------------------------------
// The function creates a "fake-local" Date whose native getters (getHours,
// etc.) reflect the store's country timezone, regardless of the browser's own
// timezone.  The returned object is always built with the local Date
// constructor so getHours() is stable across any machine timezone.
// ---------------------------------------------------------------------------
describe('toStoreLocalDate', () => {
    test('null input returns null', () => {
        expect(toStoreLocalDate(null, 'SA')).toBeNull();
    });

    test('undefined input returns null', () => {
        expect(toStoreLocalDate(undefined, 'SA')).toBeNull();
    });

    test('invalid date string returns null', () => {
        expect(toStoreLocalDate('not-a-date', 'SA')).toBeNull();
    });

    // SA offset = -3  →  shifted = UTC + 3h
    test('SA: 09:00Z becomes getHours()===12 (UTC+3 store time)', () => {
        const result = toStoreLocalDate('2024-01-15T09:00:00Z', 'SA');
        expect(result).not.toBeNull();
        expect(result.getHours()).toBe(12);
    });

    // AE offset = -4  →  shifted = UTC + 4h
    test('AE: 08:00Z becomes getHours()===12 (UTC+4 store time)', () => {
        const result = toStoreLocalDate('2024-01-15T08:00:00Z', 'AE');
        expect(result).not.toBeNull();
        expect(result.getHours()).toBe(12);
    });

    // GB offset = 0  →  no shift
    test('GB: 14:30Z stays getHours()===14, getMinutes()===30 (UTC+0)', () => {
        const result = toStoreLocalDate('2024-06-01T14:30:00Z', 'GB');
        expect(result).not.toBeNull();
        expect(result.getHours()).toBe(14);
        expect(result.getMinutes()).toBe(30);
    });

    // US offset = 5  →  shifted = UTC - 5h
    test('US: 10:00Z becomes getHours()===5 (UTC-5 store time)', () => {
        const result = toStoreLocalDate('2024-01-15T10:00:00Z', 'US');
        expect(result).not.toBeNull();
        expect(result.getHours()).toBe(5);
    });

    test('unknown country: no hour shift (treats store as UTC)', () => {
        const utcHour = 17;
        const result = toStoreLocalDate(`2024-03-10T${String(utcHour).padStart(2, '0')}:00:00Z`, 'ZZ');
        expect(result).not.toBeNull();
        expect(result.getHours()).toBe(utcHour);
    });

    test('returns a plain Date object', () => {
        const result = toStoreLocalDate('2024-01-15T09:00:00Z', 'SA');
        expect(result).toBeInstanceOf(Date);
    });

    test('preserves date component (year, month, day) correctly for SA', () => {
        // 2024-01-15 at 01:00Z  →  SA local = 04:00 on same day
        const result = toStoreLocalDate('2024-01-15T01:00:00Z', 'SA');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0);   // January = 0
        expect(result.getDate()).toBe(15);
    });

    test('handles midnight boundary: SA 22:00Z rolls to next day 01:00 local', () => {
        // offset = -3  →  22:00 UTC + 3h = 01:00 on 2024-01-16
        const result = toStoreLocalDate('2024-01-15T22:00:00Z', 'SA');
        expect(result.getHours()).toBe(1);
        expect(result.getDate()).toBe(16);
    });
});

// ---------------------------------------------------------------------------
// fromStoreLocalDate
// ---------------------------------------------------------------------------
// Reverses toStoreLocalDate: takes a "fake-local" Date whose native getters
// reflect store-local wall clock, and returns the corresponding UTC ISO string.
// ---------------------------------------------------------------------------
describe('fromStoreLocalDate', () => {
    test('null returns null', () => {
        expect(fromStoreLocalDate(null, 'SA')).toBeNull();
    });

    test('undefined returns null', () => {
        expect(fromStoreLocalDate(undefined, 'SA')).toBeNull();
    });

    // Roundtrip: fromStoreLocalDate(toStoreLocalDate(utc, code), code) === utc
    test('SA roundtrip recovers original UTC timestamp', () => {
        const originalUtc = '2024-01-15T09:00:00Z';
        const storeLocal = toStoreLocalDate(originalUtc, 'SA');
        const recovered = fromStoreLocalDate(storeLocal, 'SA');
        // Compare as milliseconds to allow ".000Z" vs "Z" formatting differences
        expect(new Date(recovered).getTime()).toBe(new Date(originalUtc).getTime());
    });

    // SA offset = -3: store-local noon → 09:00Z
    // localAsUtcMs = Date.UTC(2024,0,15,12,...) then +(-3)*3600000 = 09:00 UTC
    test('SA: fake-local noon Date → ISO shows 09:00Z', () => {
        const localNoon = new Date(2024, 0, 15, 12, 0, 0);  // getHours()===12
        const iso = fromStoreLocalDate(localNoon, 'SA');
        expect(iso).toBe('2024-01-15T09:00:00.000Z');
    });

    // GB offset = 0: store-local time === UTC
    test('GB: local 14:30 → ISO shows 14:30Z (no shift)', () => {
        const localTime = new Date(2024, 0, 15, 14, 30, 0);
        const iso = fromStoreLocalDate(localTime, 'GB');
        expect(iso).toBe('2024-01-15T14:30:00.000Z');
    });

    // US offset = 5: store-local 05:00 → UTC + 5h = 10:00Z
    // localAsUtcMs = Date.UTC(2024,0,15,5,...) + 5*3600000 = 10:00 UTC
    test('US: fake-local 05:00 AM Date → ISO shows 10:00Z', () => {
        const localMorning = new Date(2024, 0, 15, 5, 0, 0);
        const iso = fromStoreLocalDate(localMorning, 'US');
        expect(iso).toBe('2024-01-15T10:00:00.000Z');
    });

    test('IN roundtrip recovers original UTC timestamp (half-hour offset)', () => {
        const originalUtc = '2024-03-20T06:30:00Z';
        const storeLocal = toStoreLocalDate(originalUtc, 'IN');
        const recovered = fromStoreLocalDate(storeLocal, 'IN');
        expect(new Date(recovered).getTime()).toBe(new Date(originalUtc).getTime());
    });

    test('NP roundtrip recovers original UTC timestamp (45-minute offset)', () => {
        const originalUtc = '2024-03-20T06:15:00Z';
        const storeLocal = toStoreLocalDate(originalUtc, 'NP');
        const recovered = fromStoreLocalDate(storeLocal, 'NP');
        expect(new Date(recovered).getTime()).toBe(new Date(originalUtc).getTime());
    });

    test('returns a string', () => {
        const result = fromStoreLocalDate(new Date(2024, 0, 15, 12, 0, 0), 'SA');
        expect(typeof result).toBe('string');
    });

    test('returned string is a valid ISO 8601 UTC date', () => {
        const result = fromStoreLocalDate(new Date(2024, 0, 15, 12, 0, 0), 'SA');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});
