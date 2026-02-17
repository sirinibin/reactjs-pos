import { enUS, arSA, bn, hi, ru } from "date-fns/locale";

/**
 * Maps i18n language codes to date-fns locale objects
 */
export const getDateLocale = (languageCode) => {
    const localeMap = {
        en: enUS,
        ar: arSA,
        bn: bn,
        hn: hi,
        ml: enUS, // Malayalam not available in date-fns, fallback to English
        ru: ru,
        ur: enUS, // Urdu not available in date-fns, fallback to English
    };

    return localeMap[languageCode] || enUS;
};

/**
 * Maps i18n language codes to react-datepicker language strings
 */
export const getDatePickerLocale = (languageCode) => {
    const datePickerLocaleMap = {
        en: "en",
        ar: "ar",
        bn: "bn",
        hn: "hi",
        ml: "ml",
        ru: "ru",
        ur: "ur",
    };

    return datePickerLocaleMap[languageCode] || "en";
};
