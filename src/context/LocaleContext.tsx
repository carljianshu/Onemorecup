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
  playPageLabel,
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
  playPageLabel: (page: PlayPage) => string;
  formatOpensAt: (iso: string | null) => string | null;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "zh";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // 首屏固定 zh，与 SSR 一致；挂载后再读 localStorage，避免 hydration mismatch。
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    document.documentElement.lang = stored === "zh" ? "zh-CN" : "en";
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(STORAGE_KEY, next);
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
      playPageLabel: (page: PlayPage) => playPageLabel(locale, page),
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
