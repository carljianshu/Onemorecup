"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  formatOpensAtLocale,
  pageLabel,
  translate,
  type Locale,
  type TranslationValues
} from "@/i18n";
import type { PlayPage } from "@/types";

const STORAGE_KEY = "onemorecup:locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
  pageLabel: (page: PlayPage) => string;
  formatOpensAt: (iso: string | null) => string | null;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "zh";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "zh" : readStoredLocale()
  );

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => translate(locale, key, values),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      pageLabel: (page: PlayPage) => pageLabel(locale, page),
      formatOpensAt: (iso: string | null) => formatOpensAtLocale(iso, locale)
    }),
    [locale, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
