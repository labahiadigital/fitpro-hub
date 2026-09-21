import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import es from "./es.json";
import en from "./en.json";
import it from "./it.json";

export const SUPPORTED_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      it: { translation: it },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "en", "it"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Only use explicitly saved preference. Never auto-detect from browser/navigator
      // to prevent users seeing the app in an unexpected language.
      order: ["localStorage"],
      lookupLocalStorage: "trackfiz-language",
      caches: ["localStorage"],
    },
    // All resources are bundled inline so translations are available immediately.
    // Disable Suspense to avoid the NO_I18NEXT_INSTANCE warning on first render.
    react: {
      useSuspense: false,
    },
  });

/**
 * Programmatically change the app language.
 * Persists to localStorage so it survives reloads.
 */
export function changeLanguage(lng: SupportedLanguage): Promise<unknown> {
  localStorage.setItem("trackfiz-language", lng);
  return i18n.changeLanguage(lng);
}

/**
 * Get the current language code.
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language?.substring(0, 2) as SupportedLanguage) || "es";
}

export default i18n;
