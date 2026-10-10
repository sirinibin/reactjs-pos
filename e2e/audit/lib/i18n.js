// Bilingual locators: personas work in English and Arabic, so every label they look
// for must match both. The app translates with i18next (src/i18n/locales/<lang>/*.json,
// keys are the English text); this reads those files so the harness never carries its
// own copy of the translations.
const fs = require('fs');
const path = require('path');

/** Flattens one locale namespace: {"Create": "إنشاء", "buttons": {"create": ...}} -> Map(key -> value). */
function flatten(obj, prefix = '', into = new Map()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object') flatten(v, prefix + k + '.', into);
    else if (typeof v === 'string') into.set(prefix + k, v);
  }
  return into;
}

/** Map(English text -> Set(Arabic texts)) from the app's own locale files. */
function loadDictionary(localesDir, lang = 'ar') {
  const dict = new Map();
  const dir = path.join(localesDir, lang);
  if (!fs.existsSync(dir)) return dict;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    let json;
    try { json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
    let en = {};
    try { en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', f), 'utf8')); } catch (_) { /* none */ }
    const enFlat = flatten(en);
    for (const [key, ar] of flatten(json)) {
      if (!/[؀-ۿ]/.test(ar)) continue;
      for (const english of new Set([key.includes('.') ? null : key, enFlat.get(key)].filter(Boolean))) {
        if (!dict.has(english)) dict.set(english, new Set());
        dict.get(english).add(ar);
      }
    }
  }
  return dict;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * T(dict)("Create") -> /^[^\p{L}\p{N}]*(?:Create|إنشاء)/u ; {exact: true} anchors both ends,
 * {anywhere: true} drops the anchors. Extra variants can be passed in `also`.
 */
function makeT(dict) {
  const T = (en, { exact = false, anywhere = false, also = [] } = {}) => {
    const alts = [en, ...(dict.get(en) || []), ...also].map(escapeRe);
    const body = `(?:${[...new Set(alts)].join('|')})`;
    // leading icon glyphs (bootstrap-icons ::before content is part of the accessible name) and "+" are allowed
    const lead = '^[^\\p{L}\\p{N}]*';
    return new RegExp(anywhere ? body : exact ? `${lead}${body}\\s*$` : `${lead}${body}`, 'u');
  };
  /** The exact string the app shows for `en` in `lang` (first translation), for placeholders. */
  T.text = (en, lang) => (lang === 'ar' && dict.get(en) ? [...dict.get(en)][0] : en);
  return T;
}

module.exports = { flatten, loadDictionary, makeT, escapeRe };
