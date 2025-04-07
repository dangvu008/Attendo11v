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

// Thêm các chuỗi dịch cho cảnh báo thời tiết vào translations.vi
translations.vi = {
  ...translations.vi,

  // Chuỗi chung cho cảnh báo thời tiết
  weatherAlert: "Cảnh báo thời tiết",
  understood: "Đã hiểu",
  additionallyAlert: "Ngoài ra,",
  prepareAccordingly: "Hãy chuẩn bị phù hợng",

  // Chuỗi dịch cho các loại cảnh báo lúc đi làm
  heavyRainAlert:
    "Dự báo có mưa to lúc đi làm (khoảng {{time}}), hãy mang theo áo mưa/ô.",
  coldWeatherAlert:
    "Dự báo nhiệt độ thấp (dưới 10°C) lúc đi làm (khoảng {{time}}), nên mặc ấm.",
  hotWeatherAlert:
    "Dự báo nắng nóng (trên 35°C) lúc đi làm (khoảng {{time}}), nên che chắn cẩn thận.",
  stormWarningAlert:
    "Dự báo có bão/dông lúc đi làm (khoảng {{time}}), cần thận trọng khi di chuyển.",

  // Chuỗi dịch cho các loại cảnh báo lúc tan làm
  heavyRainReturnAlert:
    "Dự báo có mưa to lúc tan làm (khoảng {{time}}), hãy mang theo áo mưa/ô.",
  coldWeatherReturnAlert:
    "Dự báo nhiệt độ thấp (dưới 10°C) lúc tan làm (khoảng {{time}}), nên mặc ấm.",
  hotWeatherReturnAlert:
    "Dự báo nắng nóng (trên 35°C) lúc tan làm (khoảng {{time}}), nên che chắn cẩn thận.",
  stormWarningReturnAlert:
    "Dự báo có bão/dông lúc tan làm (khoảng {{time}}), cần thận trọng khi di chuyển.",

  // Cài đặt thời tiết
  soundEnabled: "Bật âm thanh cảnh báo",
  testSound: "Kiểm tra âm thanh",
};
