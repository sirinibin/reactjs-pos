import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enMessages from './locales/en/messages.json';
import enValidation from './locales/en/validation.json';
import enModules from './locales/en/modules.json';

import arCommon from './locales/ar/common.json';
import arMessages from './locales/ar/messages.json';
import arValidation from './locales/ar/validation.json';
import arModules from './locales/ar/modules.json';

import bnCommon from './locales/bn/common.json';
import bnMessages from './locales/bn/messages.json';
import bnValidation from './locales/bn/validation.json';
import bnModules from './locales/bn/modules.json';

import urCommon from './locales/ur/common.json';
import urMessages from './locales/ur/messages.json';
import urValidation from './locales/ur/validation.json';
import urModules from './locales/ur/modules.json';

import mlCommon from './locales/ml/common.json';
import mlMessages from './locales/ml/messages.json';
import mlValidation from './locales/ml/validation.json';
import mlModules from './locales/ml/modules.json';

import hnCommon from './locales/hn/common.json';
import hnMessages from './locales/hn/messages.json';
import hnValidation from './locales/hn/validation.json';
import hnModules from './locales/hn/modules.json';


import ruCommon from './locales/ru/common.json';
import ruMessages from './locales/ru/messages.json';
import ruValidation from './locales/ru/validation.json';
import ruModules from './locales/ru/modules.json';
// Language resources
const resources = {
  en: {
    common: enCommon,
    messages: enMessages,
    validation: enValidation,
    modules: enModules
  },
  ar: {
    common: arCommon,
    messages: arMessages,
    validation: arValidation,
    modules: arModules
  },
  bn: {
    common: bnCommon,
    messages: bnMessages,
    validation: bnValidation,
    modules: bnModules
  },
  ur: {
    common: urCommon,
    messages: urMessages,
    validation: urValidation,
    modules: urModules
  },
  ml: {
    common: mlCommon,
    messages: mlMessages,
    validation: mlValidation,
    modules: mlModules
  },
  hn: {
    common: hnCommon,
    messages: hnMessages,
    validation: hnValidation,
    modules: hnModules
  },
  ru: {
    common: ruCommon,
    messages: ruMessages,
    validation: ruValidation,
    modules: ruModules
  },
};

// RTL languages list
//export const RTL_LANGUAGES = ['ar', 'ur'];
export const RTL_LANGUAGES = [];

// Language options for switcher
export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'hn', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

// Detection options for language detector
const detectionOptions = {
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode']
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'messages', 'validation', 'modules'],
    detection: detectionOptions,
    interpolation: {
      escapeValue: false // React already escapes
    },
    react: {
      useSuspense: false // Disable suspense to avoid loading issues
    }
  });

// Function to set HTML direction
const setDirection = (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
};

// Set initial direction on page load
i18n.on('initialized', () => {
  setDirection(i18n.language);
});

// Set HTML direction on language change
i18n.on('languageChanged', (lng) => {
  setDirection(lng);
});

// Set direction immediately if already initialized
if (i18n.isInitialized) {
  setDirection(i18n.language);
}

export default i18n;
