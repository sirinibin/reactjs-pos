/** ISO-3166 alpha-2 codes; names come from Intl so they follow the UI language. */
const CODES = (
  'SA AE BH KW OM QA YE JO EG IQ LB SY PS TR IR PK IN BD LK NP CN HK TW JP KR TH VN MY SG ID PH AU NZ ' +
  'DE FR IT ES PT GB IE NL BE LU CH AT SE NO DK FI PL CZ SK HU RO BG GR SI HR RS UA RU BY LT LV EE ' +
  'US CA MX BR AR CL CO PE VE ZA NG KE ET MA DZ TN LY SD GH CI SN TZ UG'
).split(' ');

export function countryOptions(lang = 'en'): { value: string; label: string }[] {
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch { dn = null; }
  return CODES.map((c) => ({ value: c, label: dn?.of(c) || c })).sort((a, b) => a.label.localeCompare(b.label));
}

export function countryName(code: string, lang = 'en'): string {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch { return code; }
}
