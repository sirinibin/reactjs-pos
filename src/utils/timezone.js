// Mirrors backend/models/common.go's CountryTimezoneOffset exactly, so the
// frontend and backend always agree on what "the store's local time" means
// for a given country_code — used whenever we display or pick a date/time
// that should reflect the store's own timezone rather than the browser's.
//
// Sign convention (same as the backend): positive-UTC countries (east of
// UTC) get a NEGATIVE offset here, e.g. Saudi Arabia (UTC+3) -> -3.
const COUNTRY_TZ_OFFSETS = {
    // Middle East
    SA: -3, KW: -3, QA: -3, BH: -3, YE: -3, IQ: -3,
    JO: -3, SY: -3, PS: -3, SD: -3, SO: -3, ER: -3, ET: -3, KE: -3,
    AE: -4, OM: -4,
    IR: -3.5,
    EG: -2, LB: -2, IL: -2, LY: -2,
    TR: -3,
    // South / Southeast Asia
    IN: -5.5, LK: -5.5,
    PK: -5,
    NP: -5.75,
    BD: -6,
    MM: -6.5,
    TH: -7, VN: -7, ID: -7,
    MY: -8, SG: -8, PH: -8, HK: -8, TW: -8, CN: -8,
    JP: -9, KR: -9,
    // Europe (standard / CET; DST months shift by 1 but this is the base)
    GB: 0, IE: 0, PT: 0, IS: 0, GH: 0, MA: 0,
    DE: -1, FR: -1, IT: -1, ES: -1, NL: -1, BE: -1,
    CH: -1, AT: -1, SE: -1, NO: -1, DK: -1, PL: -1,
    NG: -1, TN: -1, DZ: -1,
    FI: -2, GR: -2, ZA: -2, EE: -2, LV: -2, LT: -2, RO: -2, BG: -2,
    // Americas (standard time; eastern US/CA approximation)
    BR: 3, AR: 3, CL: 3, UY: 3,
    BO: 4, PY: 4, VE: 4,
    CO: 5, PE: 5, EC: 5,
    MX: 6,
    US: 5, CA: 5,
    // Oceania
    AU: -10, NZ: -12,
};

export function getCountryTimezoneOffset(countryCode) {
    if (countryCode && Object.prototype.hasOwnProperty.call(COUNTRY_TZ_OFFSETS, countryCode)) {
        return COUNTRY_TZ_OFFSETS[countryCode];
    }
    return 0; // default UTC (UK base), same fallback as the backend
}

// Converts a UTC date value (ISO string or Date) into a plain Date object
// whose LOCAL getters (year/month/day/hours/minutes/seconds) reflect the
// store's own country timezone — regardless of the browser's own timezone.
// This "fake local" Date is safe to hand to date-fns' format() or to a
// <DatePicker>'s `selected` prop: every viewer sees the same store-local
// wall-clock value no matter where they physically are.
export function toStoreLocalDate(value, countryCode) {
    if (!value) return null;
    const utcMs = new Date(value).getTime();
    if (Number.isNaN(utcMs)) return null;
    const offsetHours = getCountryTimezoneOffset(countryCode);
    // local = UTC - offsetHours (matches backend: UTC = local + offsetHours,
    // see ConvertTimeZoneToUTC).
    const shifted = new Date(utcMs - offsetHours * 3600000);
    return new Date(
        shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(),
        shifted.getUTCHours(), shifted.getUTCMinutes(), shifted.getUTCSeconds()
    );
}

// Reverses toStoreLocalDate: takes a "fake local" Date (e.g. straight out of
// a <DatePicker>, whose native getters represent the store's local wall
// clock) and returns the correct UTC ISO string to send to the backend.
export function fromStoreLocalDate(localDate, countryCode) {
    if (!localDate) return null;
    const offsetHours = getCountryTimezoneOffset(countryCode);
    const localAsUtcMs = Date.UTC(
        localDate.getFullYear(), localDate.getMonth(), localDate.getDate(),
        localDate.getHours(), localDate.getMinutes(), localDate.getSeconds()
    );
    const utcMs = localAsUtcMs + offsetHours * 3600000;
    return new Date(utcMs).toISOString();
}
