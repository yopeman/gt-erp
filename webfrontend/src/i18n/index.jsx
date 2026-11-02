import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import am from './locales/am.json';

const dictionaries = { en, am };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('gt_lang') || 'en';
  });

  const setLanguage = (newLang) => {
    if (dictionaries[newLang]) {
      setLangState(newLang);
      localStorage.setItem('gt_lang', newLang);
      document.documentElement.lang = newLang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Nested key resolver, e.g., t('nav.dashboard')
  const t = (path, fallback = '') => {
    const keys = path.split('.');
    let current = dictionaries[lang];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English
        let fallbackCurrent = dictionaries.en;
        for (const fbKey of keys) {
          if (fallbackCurrent && typeof fbKey in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[fbKey];
          } else {
            return fallback || path;
          }
        }
        return fallbackCurrent || fallback || path;
      }
    }
    return typeof current === 'string' ? current : fallback || path;
  };

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t, availableLanguages: ['en', 'am'] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
