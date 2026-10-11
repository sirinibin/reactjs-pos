import { sourceShortageWarning, stockShortageMessage } from '../stockShortage.js';

describe('sourceShortageWarning', () => {
  test.each([
    ['plenty of stock', 10, 3, ''],
    ['exactly the stock', 5, 5, ''],
    ['short by one', 5, 6, 'Warning: Available stock in main_store is 5 (stock will go negative)'],
    ['nothing in stock', 0, 1, 'Warning: Available stock in main_store is 0 (stock will go negative)'],
    ['already negative', -2, 1, 'Warning: Available stock in main_store is -2 (stock will go negative)'],
    ['quantity typed as text', '4', '4.5', 'Warning: Available stock in main_store is 4 (stock will go negative)'],
    ['missing stock counts as zero', undefined, 2, 'Warning: Available stock in main_store is 0 (stock will go negative)'],
    ['fractions within stock', 0.3, 0.3, ''],
    ['zero quantity', 0, 0, ''],
    ['empty quantity', 0, '', ''],
    ['negative quantity is an error elsewhere, not a shortage', 0, -1, ''],
  ])('%s', (_, available, quantity, want) => {
    expect(sourceShortageWarning(available, quantity, 'main_store')).toBe(want);
  });

  test('names the source warehouse and translates', () => {
    const t = (s) => `[${s}]`;
    expect(sourceShortageWarning(1, 2, 'WH3', t)).toBe('[Warning: Available stock in ]WH3[ is ]1[ (stock will go negative)]');
  });
});

describe('stockShortageMessage', () => {
  const products = [{ name: 'Bearing' }, { name: 'Gasket' }, { name: 'Bearing' }];

  test('no warnings, no message', () => {
    expect(stockShortageMessage(undefined, products)).toBe('');
    expect(stockShortageMessage(null, products)).toBe('');
    expect(stockShortageMessage({}, products)).toBe('');
  });

  test('ignores warnings that are not about a line quantity', () => {
    expect(stockShortageMessage({ unit_price_0: 'x', quantity_x: 'y' }, products)).toBe('');
  });

  test('names each short product once, in line order', () => {
    const msg = stockShortageMessage({ quantity_2: 'a', quantity_1: 'b', quantity_0: 'c' }, products);
    expect(msg).toBe('Saved with a stock shortage, the source stock went negative for: Bearing, Gasket');
  });

  test('falls back to the line number when the product is unknown', () => {
    expect(stockShortageMessage({ quantity_4: 'a' }, products)).toBe('Saved with a stock shortage, the source stock went negative for: line 5');
    expect(stockShortageMessage({ quantity_0: 'a' }, undefined)).toBe('Saved with a stock shortage, the source stock went negative for: line 1');
  });
});

describe('translation keys', () => {
  // i18next reads "." and ":" in a key as key and namespace separators, so a
  // key holding them comes back mangled.
  test.each([
    ' (stock will go negative)',
    'Saved with a stock shortage, the source stock went negative for',
    'line',
  ])('%s is a plain key in every locale', (key) => {
    expect(key).not.toMatch(/[.:]/);
    ['ar', 'bn', 'en', 'hn', 'ml', 'ru', 'ur'].forEach((lang) => {
      const messages = require(`../../i18n/locales/${lang}/common.json`);
      expect(typeof messages[key]).toBe('string');
      expect(messages[key].trim()).not.toBe('');
    });
  });
});
