import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { resources, LANGUAGES, NAMESPACES, type AppLanguage } from './resources';

export const LANGUAGE_STORAGE_KEY = 'terrabyte.lang';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function setHtmlLang(lng: string | undefined) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = isAppLanguage(lng) ? lng : 'en';
  }
}

i18n.on('languageChanged', setHtmlLang);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: [...NAMESPACES],
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: [...LANGUAGES],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

setHtmlLang(i18n.resolvedLanguage);

export default i18n;
