"use client";

import { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en } from "../locales/en";
import { vi } from "../locales/vi";

// Available languages
const languages = {
  en,
  vi,
};

// Create context
const I18nContext = createContext();

// Language provider component
export function I18nProvider({ children }) {
  const [locale, setLocale] = useState("en");
  const [translations, setTranslations] = useState(languages.en);

  // Load saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem("attendo_language");
        if (savedLocale && languages[savedLocale]) {
          setLocale(savedLocale);
          setTranslations(languages[savedLocale]);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    };

    loadLanguage();
  }, []);

  // Change language
  const changeLanguage = async (newLocale) => {
    if (languages[newLocale]) {
      setLocale(newLocale);
      setTranslations(languages[newLocale]);

      try {
        await AsyncStorage.setItem("attendo_language", newLocale);
      } catch (error) {
        console.error("Failed to save language preference:", error);
      }
    }
  };

  // Translation function
  const t = (key) => {
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// Custom hook for using translations
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
