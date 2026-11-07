import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import am from './locales/am.json';
import amGlossary from './amGlossary';

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

  // Nested key resolver & intelligent Amharic term translator
  const t = (path, fallback = '') => {
    if (path === undefined || path === null || path === '') return fallback || '';

    const pathStr = String(path).trim();

    // 1. If language is Amharic, try resolving nested key first
    if (lang === 'am') {
      const keys = pathStr.split('.');
      let current = dictionaries.am;
      let found = true;
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          found = false;
          break;
        }
      }
      if (found && typeof current === 'string') {
        return current;
      }

      // 2. Direct lookup in amGlossary dictionary (case-insensitive & whitespace trimmed)
      const normalized = pathStr.toLowerCase();
      if (amGlossary[normalized]) {
        return amGlossary[normalized];
      }

      // Trailing punctuation normalization (: or ... or ?)
      if (normalized.endsWith(':')) {
        const base = normalized.slice(0, -1).trim();
        if (amGlossary[base]) return amGlossary[base] + ':';
      }
      if (normalized.endsWith('...')) {
        const base = normalized.slice(0, -3).trim();
        if (amGlossary[base]) return amGlossary[base] + '...';
      }
      if (normalized.endsWith('?')) {
        const base = normalized.slice(0, -1).trim();
        if (amGlossary[base]) return amGlossary[base] + ' ?';
      }

      // Match patterns with parentheses like "Employees (5)" or "Leave (12)"
      const countMatch = normalized.match(/^(.+?)\s*(\(\d+\))$/);
      if (countMatch && amGlossary[countMatch[1]]) {
        return `${amGlossary[countMatch[1]]} ${countMatch[2]}`;
      }

      // If normalized has common prefix like 'status.' or 'nav.', strip and check glossary
      if (normalized.includes('.')) {
        const lastPart = normalized.split('.').pop();
        if (amGlossary[lastPart]) {
          return amGlossary[lastPart];
        }
      }
    }

    // 3. Fallback to English dictionary by nested key
    const keys = pathStr.split('.');
    let fallbackCurrent = dictionaries.en;
    let fallbackFound = true;
    for (const fbKey of keys) {
      if (fallbackCurrent && typeof fallbackCurrent === 'object' && fbKey in fallbackCurrent) {
        fallbackCurrent = fallbackCurrent[fbKey];
      } else {
        fallbackFound = false;
        break;
      }
    }

    if (fallbackFound && typeof fallbackCurrent === 'string') {
      return fallbackCurrent;
    }

    return fallback || pathStr;
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
