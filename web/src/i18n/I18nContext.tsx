import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ru from './locales/ru.json';
import en from './locales/en.json';
import catalogRu from './catalog.ru.json';
import catalogEn from './catalog.en.json';
import type { Category } from '@/lib/types';

export type Locale = 'ru' | 'en';
export const LOCALES: Locale[] = ['ru', 'en'];

const STRINGS: Record<Locale, Record<string, unknown>> = {
  ru: ru as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const CATALOG: Record<Locale, {
  categories: Record<string, { name: string; description: string }>;
  scenes: Record<string, Record<string, string>>;
}> = {
  ru: catalogRu as { categories: Record<string, { name: string; description: string }>; scenes: Record<string, Record<string, string>> },
  en: catalogEn as { categories: Record<string, { name: string; description: string }>; scenes: Record<string, Record<string, string>> },
};

const STORAGE_KEY = 'ambienttv.locale';

/** Resolve dotted key with fallback: ru → en → raw key */
function resolve(locale: Locale, key: string): string {
  const parts = key.split('.');
  const tryLocale = (loc: Locale) => {
    let cur: unknown = STRINGS[loc];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  return tryLocale(locale) ?? tryLocale('en') ?? key;
}

/** Substitute {name} placeholders */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Localize a category's name/description using the active locale, fallback to raw. */
  localizeCategory: (c: Category) => Category;
  /** Localize a scene title using the active locale (categoryId+index) or fallback to raw. */
  localizeSceneTitle: (title: string, categoryId: string, index: number) => string;
  /** Whether the current locale is right-to-left (none for now). */
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.includes(stored)) return stored;
  } catch { /* noop */ }
  const browser = (navigator.language || 'ru').toLowerCase();
  if (browser.startsWith('en')) return 'en';
  return 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch { /* noop */ }
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (l) => setLocaleState(l),
      t: (key, vars) => interpolate(resolve(locale, key), vars),
      localizeCategory: (c) => {
        const localized = CATALOG[locale]?.categories?.[c.id];
        if (!localized) return c;
        return { ...c, name: localized.name, description: localized.description };
      },
      localizeSceneTitle: (title, categoryId, index) => {
        const localized = CATALOG[locale]?.scenes?.[categoryId]?.[String(index)];
        return localized ?? title;
      },
      dir: 'ltr',
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Shorthand hook for static strings */
export function useT() {
  return useI18n().t;
}
