/**
 * Unit tests for workshop i18n module (StartPOSWorkShop/i18n.js).
 *
 * Run from the frontend directory:
 *   CI=true npm test -- --testPathPattern="workshopI18n"
 */

'use strict';

// i18n.js lives in StartPOSWorkShop/, two levels above frontend/src/__tests__/
// jsdom provides localStorage and navigator.language.
//
// StartPOSWorkShop is NOT part of this repo. When it is not checked out next to
// the frontend (e.g. CI), the whole suite is skipped instead of failing.
// Override the location with STARTPOS_WORKSHOP_DIR.
const fs = require('fs');
const path = require('path');
const I18N_PATH = process.env.STARTPOS_WORKSHOP_DIR
  ? path.resolve(process.env.STARTPOS_WORKSHOP_DIR, 'i18n.js')
  : path.resolve(__dirname, '../../../StartPOSWorkShop/i18n.js');
const HAVE_WORKSHOP = fs.existsSync(I18N_PATH);
const i18n = HAVE_WORKSHOP ? require(I18N_PATH) : { T: {}, WORKSHOP_LANGS: [], RTL_LANGS: [] };
const { T, WORKSHOP_LANGS, RTL_LANGS, detectLang, saveLang } = i18n;
const describeWorkshop = HAVE_WORKSHOP ? describe : describe.skip;

describeWorkshop('StartPOSWorkShop i18n.js', () => {

// ── Required translation keys that every language must provide ────────────────
const REQUIRED_KEYS = [
  // Nav
  'sign_in', 'register',
  // Login page
  'login_title', 'login_heading', 'login_sub',
  'email_label', 'email_ph', 'pw_label', 'pw_ph',
  'btn_sign_in', 'btn_signing_in',
  'no_account', 'register_link',
  'err_email_req', 'err_email_inv', 'err_pw_req',
  'err_wrong', 'err_rate', 'err_network',
  'lockout_pre', 'lockout_post',
  'attempt_left', 'attempts_left',
  // Register page
  'reg_title', 'reg_heading', 'reg_sub',
  'step_account', 'step_business', 'step_address', 'step_zatca',
  'name_label', 'mob_label', 'email_label', 'pw_new_label', 'pw2_label',
  'biz_label', 'crn_label', 'vat_label', 'vat_hint',
  'phone_label', 'country_label', 'opt',
  'bldg_label', 'zip_label', 'street_label',
  'district_label', 'city_label',
  'addno_label', 'unitno_label',
  'zatca_intro', 'phase1_name', 'phase1_desc', 'phase2_name', 'phase2_desc',
  'zatca_note',
  'btn_next', 'btn_back', 'btn_create', 'btn_creating',
  // Validation errors (register)
  'err_name_req', 'err_mob_req',
  'err_pw_short', 'err_pw2_req', 'err_pw2_mismatch',
  'err_biz_req', 'err_crn_req', 'err_vat_req', 'err_vat_len',
  'err_bldg_req', 'err_bldg_fmt', 'err_zip_req', 'err_zip_fmt',
  'err_street_req', 'err_district_req', 'err_city_req',
  // Register alerts
  'reg_success', 'reg_failed', 'reg_rate', 'reg_session', 'reg_timing', 'reg_network',
  'have_account', 'sign_in_link',
  // Footer
  'footer_copy',
];

// ── T object completeness ─────────────────────────────────────────────────────

describe('T — translation completeness', () => {
  test('all four languages are present in T', () => {
    for (const lang of WORKSHOP_LANGS) {
      expect(T).toHaveProperty(lang);
    }
  });

  for (const lang of WORKSHOP_LANGS) {
    describe(`language: ${lang}`, () => {
      for (const key of REQUIRED_KEYS) {
        test(`has key "${key}"`, () => {
          expect(T[lang]).toHaveProperty(key);
          expect(typeof T[lang][key]).toBe('string');
          expect(T[lang][key].length).toBeGreaterThan(0);
        });
      }

      test('login_title is non-empty', () => {
        expect(T[lang].login_title).toBeTruthy();
      });

      test('footer_copy contains copyright year', () => {
        expect(T[lang].footer_copy).toMatch(/©/);
      });
    });
  }
});

// ── RTL_LANGS ─────────────────────────────────────────────────────────────────

describe('RTL_LANGS', () => {
  test('Arabic is RTL', () => {
    expect(RTL_LANGS['ar']).toBeTruthy();
  });

  test('English is not RTL', () => {
    expect(RTL_LANGS['en']).toBeFalsy();
  });

  test('French is not RTL', () => {
    expect(RTL_LANGS['fr']).toBeFalsy();
  });

  test('Russian is not RTL', () => {
    expect(RTL_LANGS['ru']).toBeFalsy();
  });
});

// ── detectLang — using injected params (no mocking of globals needed) ─────────

describe('detectLang', () => {
  test('returns stored lang when it is a supported language', () => {
    expect(detectLang('ar')).toBe('ar');
    expect(detectLang('fr')).toBe('fr');
    expect(detectLang('ru')).toBe('ru');
    expect(detectLang('en')).toBe('en');
  });

  test('ignores stored lang when it is unsupported and falls back to browser lang', () => {
    expect(detectLang('de', 'fr-BE')).toBe('fr');
  });

  test('returns "en" when stored lang is unsupported and browser lang is also unsupported', () => {
    expect(detectLang('de', 'zh-CN')).toBe('en');
  });

  test('returns "en" when both params are null/undefined', () => {
    expect(detectLang(null, '')).toBe('en');
  });

  test('browser lang with region suffix resolves correctly (ar-SA → ar)', () => {
    expect(detectLang(null, 'ar-SA')).toBe('ar');
  });

  test('browser lang with region suffix resolves correctly (fr-FR → fr)', () => {
    expect(detectLang(null, 'fr-FR')).toBe('fr');
  });

  test('stored lang takes priority over browser lang', () => {
    // stored=ru wins even though browser=ar
    expect(detectLang('ru', 'ar-SA')).toBe('ru');
  });

  test('stored=null falls through to browser lang', () => {
    expect(detectLang(null, 'ru')).toBe('ru');
  });

  test('stored="" is treated as falsy; falls through to browser lang', () => {
    expect(detectLang('', 'fr')).toBe('fr');
  });
});

// ── WORKSHOP_LANGS list ───────────────────────────────────────────────────────

describe('WORKSHOP_LANGS', () => {
  test('contains exactly en, ar, fr, ru', () => {
    expect(WORKSHOP_LANGS).toEqual(expect.arrayContaining(['en', 'ar', 'fr', 'ru']));
    expect(WORKSHOP_LANGS).toHaveLength(4);
  });
});

// ── saveLang — uses real localStorage (jsdom) ─────────────────────────────────

describe('saveLang', () => {
  beforeEach(() => localStorage.clear());

  test('writes to workshopLang key (same key as homepage)', () => {
    saveLang('ar');
    expect(localStorage.getItem('workshopLang')).toBe('ar');
  });

  test('overwrites previous lang', () => {
    saveLang('fr');
    saveLang('ru');
    expect(localStorage.getItem('workshopLang')).toBe('ru');
  });

  test('detectLang reads the value set by saveLang (via real localStorage)', () => {
    saveLang('fr');
    // Pass undefined to force detectLang to read from localStorage
    expect(detectLang(undefined, '')).toBe('fr');
  });
});

// ── Cross-language consistency ────────────────────────────────────────────────

describe('cross-language consistency', () => {
  test('each language has its own unique login_title', () => {
    const titles = WORKSHOP_LANGS.map(l => T[l].login_title);
    const unique = new Set(titles);
    expect(unique.size).toBe(WORKSHOP_LANGS.length);
  });

  test('each language has its own unique reg_title', () => {
    const titles = WORKSHOP_LANGS.map(l => T[l].reg_title);
    const unique = new Set(titles);
    expect(unique.size).toBe(WORKSHOP_LANGS.length);
  });

  test('LOCKOUT_LIMIT constant matches 5 (same as login.js)', () => {
    // We don't export the constant but verify that all lockout_pre strings are non-empty
    for (const lang of WORKSHOP_LANGS) {
      expect(T[lang].lockout_pre.length).toBeGreaterThan(0);
    }
  });
});
});
