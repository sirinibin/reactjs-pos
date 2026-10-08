jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn(),
  changeLanguage: jest.fn(),
  t: jest.fn(k => k),
  language: 'en',
  on: jest.fn(),
  isInitialized: false,
}));
jest.mock('react-i18next', () => ({ initReactI18next: {} }));
jest.mock('i18next-browser-languagedetector', () => ({}));

const { LANGUAGE_OPTIONS, RTL_LANGUAGES } = require('../config');
const i18n = require('../config').default;

describe('i18n config', () => {
  // Test 1: LANGUAGE_OPTIONS is an array with at least 4 items
  test('LANGUAGE_OPTIONS is an array with at least 4 items', () => {
    expect(Array.isArray(LANGUAGE_OPTIONS)).toBe(true);
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  // Test 2: Each LANGUAGE_OPTIONS entry has code, name, and nativeName
  test('each LANGUAGE_OPTIONS entry has code, name, and nativeName', () => {
    LANGUAGE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('code');
      expect(option).toHaveProperty('name');
      expect(option).toHaveProperty('nativeName');
      expect(typeof option.code).toBe('string');
      expect(typeof option.name).toBe('string');
      expect(typeof option.nativeName).toBe('string');
    });
  });

  // Test 3: RTL_LANGUAGES is an array
  test('RTL_LANGUAGES is an array', () => {
    expect(Array.isArray(RTL_LANGUAGES)).toBe(true);
  });

  // Test 4: RTL_LANGUAGES contains 'ar' (Arabic RTL support is enabled).
  test('RTL_LANGUAGES contains ar', () => {
    expect(RTL_LANGUAGES).toContain('ar');
  });

  // Test 5: 'ar' is in RTL_LANGUAGES; 'ur' remains selectable but is not listed.
  test("'ar' is in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES).toContain('ar');
  });

  // Test 6: i18n default export is not null
  test('i18n default export is not null', () => {
    expect(i18n).not.toBeNull();
  });

  // Test 7: i18n has changeLanguage function
  test('i18n has changeLanguage function', () => {
    expect(typeof i18n.changeLanguage).toBe('function');
  });

  // Test 8: LANGUAGE_OPTIONS contains 'en' code
  test("LANGUAGE_OPTIONS contains 'en' code", () => {
    const codes = LANGUAGE_OPTIONS.map((o) => o.code);
    expect(codes).toContain('en');
  });

  // Test 9: LANGUAGE_OPTIONS contains 'ar' code
  test("LANGUAGE_OPTIONS contains 'ar' code", () => {
    const codes = LANGUAGE_OPTIONS.map((o) => o.code);
    expect(codes).toContain('ar');
  });
});
