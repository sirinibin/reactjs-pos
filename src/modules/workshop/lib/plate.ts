// Saudi number plates: up to 4 digits + up to 3 letters, printed in Latin and Arabic.
// Official Latin↔Arabic letter set (MOI): A B J D R S X T E G K L Z N H U V.

const L2A: Record<string, string> = { A: 'ا', B: 'ب', J: 'ح', D: 'د', R: 'ر', S: 'س', X: 'ص', T: 'ط', E: 'ع', G: 'ق', K: 'ك', L: 'ل', Z: 'م', N: 'ن', H: 'ه', U: 'و', V: 'ى' };
const A2L: Record<string, string> = Object.fromEntries(Object.entries(L2A).map(([l, a]) => [a, l]));
Object.assign(A2L, { 'أ': 'A', 'إ': 'A', 'آ': 'A', 'ي': 'V', 'ة': 'H' });
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export interface Plate { digits: string; latin: string; arabic: string; arabicDigits: string }

export function parsePlate(raw: string | null | undefined): Plate | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const norm = s.replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c)));
  const digits = (norm.match(/\d/g) || []).join('');
  const letters = norm.replace(/[\d\s\-_.]/g, '');
  if (!digits || digits.length > 4 || !letters || [...letters].length > 3) return null;
  let latin = '';
  for (const ch of letters) {
    const up = ch.toUpperCase();
    if (L2A[up]) latin += up;
    else if (A2L[ch]) latin += A2L[ch];
    else return null;
  }
  return {
    digits,
    latin: latin.split('').join(' '),
    arabic: latin.split('').map((c) => L2A[c]).join(' '),
    arabicDigits: digits.replace(/\d/g, (d) => AR_DIGITS[+d]),
  };
}
