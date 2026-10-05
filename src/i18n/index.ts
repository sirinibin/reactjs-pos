import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { core as arCore } from './ar';
import { setFormatLang, type Lang } from '@/lib/format';
import { KEYS, session } from '@/api/session';

/** Languages offered (same set as the legacy app). `hn` is the legacy code for Hindi. */
export const LANGUAGES: { code: Lang; name: string; native: string; rtl?: boolean }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'hn', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
];
export const isRtl = (l: Lang) => !!LANGUAGES.find((x) => x.code === l)?.rtl;

// Translations ported from the legacy locale files (English text → translation), loaded on demand.
const legacy = import.meta.glob<{ default: Record<string, string> }>('./legacy/*.json');
const loaded = new Set<string>();
async function loadLegacy(lang: Lang) {
  if (lang === 'en' || loaded.has(lang)) return;
  const mod = legacy[`./legacy/${lang}.json`];
  if (!mod) return;
  const dict = (await mod()).default;
  // Module/core dictionaries registered later must win over legacy wording.
  i18next.addResourceBundle(lang, 'translation', dict, true, false);
  loaded.add(lang);
}

const known = (v: string | null): Lang => (LANGUAGES.some((l) => l.code === v) ? (v as Lang) : v?.startsWith('ar') ? 'ar' : 'en');
const initial = known(session.get(KEYS.lang));

// English source strings are the keys (keySeparator/nsSeparator disabled), so any
// missing translation gracefully falls back to English.
i18next.use(initReactI18next).init({
  lng: initial,
  fallbackLng: 'en',
  resources: { en: { translation: {} }, ar: { translation: arCore } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  partialBundledLanguages: true,
});

export function applyDocumentLang(lang: Lang) {
  setFormatLang(lang);
  document.documentElement.lang = lang === 'hn' ? 'hi' : lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
}
applyDocumentLang(initial);
void loadLegacy(initial).then(() => i18next.changeLanguage(initial));

export async function setLanguage(lang: Lang) {
  session.set(KEYS.lang, lang);
  await loadLegacy(lang);
  applyDocumentLang(lang);
  return i18next.changeLanguage(lang);
}

/** Modules register their own Arabic strings so features stay self-contained. */
export function registerArabic(dict: Record<string, string>) {
  i18next.addResourceBundle('ar', 'translation', dict, true, true);
}
/** Register strings for any language (used for languages beyond Arabic). */
export function registerTranslations(lang: Lang, dict: Record<string, string>) {
  i18next.addResourceBundle(lang, 'translation', dict, true, true);
}

export const currentLang = (): Lang => known(i18next.language);
export const t = (key: string, opts?: Record<string, unknown>) => i18next.t(key, opts) as string;
export { useTranslation };
export default i18next;
