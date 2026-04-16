import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

/** All languages the app supports. Keep in sync with the locales/ directory. */
export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "en",
  interpolation: {
    // React already escapes all interpolated values in JSX; disabling i18next's
    // own escaping prevents double-encoding of characters like & → &amp;amp;
    escapeValue: false,
  },
});

export default i18n;
