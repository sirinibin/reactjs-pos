// Number, money and date formatting shared by every screen.
// Numbers always use Latin digits (the legacy app does the same) so amounts
// line up in tables regardless of UI language.

export type Lang = 'en' | 'ar' | 'ur' | 'hn' | 'ml' | 'bn' | 'ru';

let currentLang: Lang = 'en';
export const setFormatLang = (l: Lang) => {
  currentLang = l;
};

const DATE_LOCALES: Record<Lang, string> = { en: 'en-GB', ar: 'ar-SA-u-nu-latn-ca-gregory', ur: 'ur-PK-u-nu-latn', hn: 'hi-IN-u-nu-latn', ml: 'ml-IN-u-nu-latn', bn: 'bn-IN-u-nu-latn', ru: 'ru-RU' };
// Amounts always use Latin digits and en-US grouping so tables stay aligned and unambiguous.
const numberLocale = () => (currentLang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
const dateLocale = () => DATE_LOCALES[currentLang] || 'en-GB';

/** Round half away from zero to `dp` decimals, avoiding binary float drift (1.005 → 1.01). */
export function round(value: number, dp = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** dp;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * f + Number.EPSILON * f)) / f;
}

export function fmtNumber(value: number | null | undefined, dp = 2): string {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return '—';
  return round(v, dp).toLocaleString(numberLocale(), { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export const fmtMoney = (value: number | null | undefined, dp = 2) => fmtNumber(value, dp);

/** Signed accounting style: negatives in parentheses. */
export function fmtAccounting(value: number | null | undefined, dp = 2): string {
  const v = Number(value ?? 0);
  return v < 0 ? `(${fmtNumber(-v, dp)})` : fmtNumber(v, dp);
}

/** Compact axis/label format: 1.25M, 84K, 950. */
export function fmtShort(value: number): string {
  const a = Math.abs(value);
  if (a >= 1e6) return `${round(value / 1e6, 2)}M`;
  if (a >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(Math.round(value));
}

export function fmtPercent(value: number | null | undefined, dp = 1): string {
  return `${fmtNumber(value ?? 0, dp)}%`;
}

const toDate = (d: string | number | Date | null | undefined): Date | null => {
  if (d === null || d === undefined || d === '') return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

export function fmtDate(d: string | number | Date | null | undefined): string {
  const x = toDate(d);
  return x ? x.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function fmtTime(d: string | number | Date | null | undefined): string {
  const x = toDate(d);
  return x ? x.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : '';
}

export function fmtDateTime(d: string | number | Date | null | undefined): string {
  const x = toDate(d);
  return x ? `${fmtDate(x)} ${fmtTime(x)}` : '—';
}

/** "3 min ago" style relative time. */
export function fmtRelative(d: string | number | Date | null | undefined, now: Date = new Date()): string {
  const x = toDate(d);
  if (!x) return '—';
  const s = Math.round((now.getTime() - x.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(currentLang === 'hn' ? 'hi' : currentLang, { numeric: 'auto' });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(-s, 'second');
  if (abs < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(-Math.round(s / 86400), 'day');
  return fmtDate(x);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 02 2006" — the format the API's date filters (search[from_date] etc.) parse, in store-local days. */
export function toApiDate(d: Date): string {
  return `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
}

/** yyyy-MM-dd (native <input type="date"> value). */
export function toInputDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Convert an <input type="date"> value (yyyy-MM-dd) to the API filter format. */
export function inputDateToApi(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? toApiDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : v;
}

/** RFC3339 with local offset — required by date_str on create/update. */
export function toRfc3339(d: Date): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}

/** Parse user-typed numbers: accepts "1,234.50", Arabic-Indic digits, blanks. */
export function parseNumber(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (input === null || input === undefined) return 0;
  const s = String(input)
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/٫/g, '.')
    .replace(/[,\s٬]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
