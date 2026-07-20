"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatOpensAtLocale, pageLabel, playPageLabel, translate, type Locale, type TranslationValues } from "@/i18n";
import { writeLocaleCookies } from "@/lib/locale-cookies";
import { isLocale } from "@/lib/locale-detect";
import { formatDeadlineDisplay, resolveDisplayTimezone } from "@/lib/timezone";
import type { PlayPage } from "@/types";
const STORAGE_KEY = "onemorecup:locale";
interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, values?: TranslationValues) => string;
    pageLabel: (page: PlayPage) => string;
    playPageLabel: (page: PlayPage) => string;
    formatOpensAt: (iso: string | null) => string | null;
    formatDeadline: (iso: string | null) => string | null;
}
const LocaleContext = createContext<LocaleContextValue | null>(null);
function readStoredLocale(): Locale | null {
    if (typeof window === "undefined")
        return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
}
export function LocaleProvider({ children, initialLocale = "zh", initialInferredTimezone = null }: {
    children: ReactNode;
    initialLocale?: Locale;
    initialInferredTimezone?: string | null;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);
    const [displayTimezone, setDisplayTimezone] = useState(() => initialInferredTimezone ?? "UTC");
    useEffect(() => {
        const stored = readStoredLocale();
        const next = stored ?? initialLocale;
        setLocaleState(next);
        document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    }, [initialLocale]);
    useEffect(() => {
        setDisplayTimezone(resolveDisplayTimezone(initialInferredTimezone));
    }, [initialInferredTimezone]);
    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
        window.localStorage.setItem(STORAGE_KEY, next);
        writeLocaleCookies(next, true);
    }, []);
    const t = useCallback((key: string, values?: TranslationValues) => translate(locale, key, values), [locale]);
    const formatDeadline = useCallback((iso: string | null) => formatDeadlineDisplay(iso, locale, displayTimezone), [locale, displayTimezone]);
    const value = useMemo(() => ({
        locale,
        setLocale,
        t,
        pageLabel: (page: PlayPage) => pageLabel(locale, page),
        playPageLabel: (page: PlayPage) => playPageLabel(locale, page),
        formatOpensAt: (iso: string | null) => formatOpensAtLocale(iso, locale),
        formatDeadline
    }), [locale, setLocale, t, formatDeadline]);
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
    const ctx = useContext(LocaleContext);
    if (!ctx)
        throw new Error("useLocale must be used within LocaleProvider");
    return ctx;
}
