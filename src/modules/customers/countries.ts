// ISO 3166-1 alpha-2 codes; names come from Intl.DisplayNames so they follow the UI language.
const CODES = (
  'SA AE BH KW OM QA YE EG JO LB SY IQ PS SD LY TN DZ MA MR SO DJ KM IN PK BD LK NP AF IR TR CN JP KR PH ID MY SG TH VN ' +
  'US CA MX BR AR CL CO PE VE GB IE FR DE IT ES PT NL BE LU CH AT SE NO DK FI IS PL CZ SK HU RO BG GR CY MT HR SI RS BA ME MK AL ' +
  'UA BY RU KZ UZ TM KG TJ AZ GE AM AU NZ ZA NG KE ET GH TZ UG ER SS TD NE ML SN CI CM'
).split(' ');

let cache: { lang: string; list: { value: string; label: string }[] } | null = null;

export function countryOptions(lang: string = 'en'): { value: string; label: string }[] {
  if (cache && cache.lang === lang) return cache.list;
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch { dn = null; }
  const list = CODES.map((c) => ({ value: c, label: dn?.of(c) || c }));
  const [first, ...rest] = list; // keep Saudi Arabia first, sort the rest
  cache = { lang, list: [first, ...rest.sort((a, b) => a.label.localeCompare(b.label, lang))] };
  return cache.list;
}

/** English country name (what the API stores in country_name). */
export function countryName(code: string): string {
  if (!code) return '';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
}
