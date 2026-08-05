// `t` must be a stable function reference across renders/calls, just like the
// real react-i18next hook, otherwise components that memoize on `t` (e.g.
// useMemo(..., [t]) feeding a useEffect) can be pushed into infinite
// render loops that would never happen with the real library.
const t = (key, opts) => {
  if (opts && typeof opts === 'object') {
    return key.replace(/\{\{(\w+)\}\}/g, (_, k) => opts[k] ?? k);
  }
  return key;
};
const i18n = { changeLanguage: () => Promise.resolve() };

const useMock = () => ({ t, i18n });

module.exports = {
  useTranslation: useMock,
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => { } },
};
