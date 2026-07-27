import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS, runtime } from '../i18n/strings';

const PrefsContext = createContext(null);

const KEY_THEME = 'iraqstore.theme.v1';
const KEY_LANG = 'iraqstore.lang.v1';

function initial(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Site-wide preferences: colour theme (light/dark) and language (ar/en).
 * Both persist to localStorage and drive the <html> element's attributes —
 * `dir`/`lang` for language, `data-theme` for the CSS theme override.
 */
export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(() => initial(KEY_THEME, 'light'));
  const [lang, setLang] = useState(() => initial(KEY_LANG, 'ar'));

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-theme', theme);
    el.style.colorScheme = theme;
    try {
      localStorage.setItem(KEY_THEME, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    runtime.lang = lang;
    const el = document.documentElement;
    el.setAttribute('lang', lang);
    el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    try {
      localStorage.setItem(KEY_LANG, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  const toggleLang = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);

  // Missing keys fall back to Arabic, then to the key itself, so a partial
  // translation never renders a blank string.
  const t = useCallback(
    (key) => STRINGS[lang]?.[key] ?? STRINGS.ar[key] ?? key,
    [lang]
  );

  /** Pick the right field from a bilingual data object (e.g. product.name / product.nameEn). */
  const tf = useCallback(
    (obj, base) => {
      if (!obj) return '';
      if (lang === 'en') return obj[`${base}En`] ?? obj[base] ?? '';
      return obj[base] ?? obj[`${base}En`] ?? '';
    },
    [lang]
  );

  const value = useMemo(
    () => ({ theme, lang, toggleTheme, toggleLang, setTheme, setLang, t, tf, isRTL: lang === 'ar' }),
    [theme, lang, toggleTheme, toggleLang, t, tf]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
