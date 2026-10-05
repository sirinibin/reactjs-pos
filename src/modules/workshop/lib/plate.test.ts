import { describe, expect, it } from 'vitest';
import { parsePlate } from './plate';

describe('Saudi plate parsing', () => {
  it('parses Latin plates into digits + Latin + Arabic letters', () => {
    expect(parsePlate('RSJ 4821')).toEqual({ digits: '4821', latin: 'R S J', arabic: 'ر س ح', arabicDigits: '٤٨٢١' });
    expect(parsePlate('4821-rsj')).toMatchObject({ latin: 'R S J' });
  });
  it('parses Arabic plates (letters and Arabic-Indic digits)', () => {
    expect(parsePlate('ب ط ع ١١٨٧')).toMatchObject({ digits: '1187', latin: 'B T E', arabic: 'ب ط ع' });
  });
  it('rejects non-plate text so the raw value is shown', () => {
    expect(parsePlate('ABC 1234')).toBeNull(); // C is not a Saudi plate letter
    expect(parsePlate('12345 AB')).toBeNull();
    expect(parsePlate('')).toBeNull();
    expect(parsePlate('ABCD 1')).toBeNull();
  });
});
