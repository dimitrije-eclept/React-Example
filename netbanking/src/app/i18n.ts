import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import sr from '../locales/sr.json';

export const LANGUAGES = ['sr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'nb.language';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** The language preference is not sensitive, so it may live in localStorage. */
function storedLanguage(): Language | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function storeLanguage(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}

/** Serbian (Latin script) by default. Resources are bundled, so init is synchronous. */
export function initI18n(language: Language = storedLanguage() ?? 'sr') {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { sr: { translation: sr }, en: { translation: en } },
      lng: language,
      fallbackLng: 'sr',
      supportedLngs: LANGUAGES,
      interpolation: { escapeValue: false },
      initAsync: false,
    });
    // Features switch with `i18n.changeLanguage` (profile page); the choice is kept from here.
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
      if (isLanguage(lng)) storeLanguage(lng);
    });
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  document.documentElement.lang = i18n.language;
  return i18n;
}
