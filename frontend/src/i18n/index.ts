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

i18n
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
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "trackfiz-language",
      caches: ["localStorage"],
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
