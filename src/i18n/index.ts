import { en } from "./messages/en";
import { zh, type Messages } from "./messages/zh";
import {
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_TOTAL_PICKS,
  PAGE1_COUNT,
  PAGE2_COUNT,
  SUBS_PER_PAGE2_QUESTION
} from "@/data/markets";
import type { PlayPage } from "@/types";

export type Locale = "zh" | "en";

export const LOCALES: { id: Locale; labelKey: "common.langZh" | "common.langEn" }[] = [
  { id: "zh", labelKey: "common.langZh" },
  { id: "en", labelKey: "common.langEn" }
];

const catalogs: Record<Locale, Messages> = { zh, en };

export type TranslationValues = Record<string, string | number>;

function getByPath(messages: Messages, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
  return typeof value === "string" ? value : undefined;
}

export function translate(locale: Locale, key: string, values?: TranslationValues): string {
  const template = getByPath(catalogs[locale], key) ?? getByPath(catalogs.zh, key) ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] !== undefined ? String(values[name]) : `{${name}}`
  );
}

export function pageLabel(locale: Locale, page: PlayPage): string {
  return page === 1
    ? translate(locale, "markets.page1", { count: PAGE1_COUNT })
    : translate(locale, "markets.page2", {
        count: PAGE2_COUNT,
        subs: SUBS_PER_PAGE2_QUESTION
      });
}

export function answersFeatureLabelKey(feature: "answersPage1" | "answersPage2") {
  return feature === "answersPage1" ? "admin.featureAnswersP1" : "admin.featureAnswersP2";
}

export function translateMarketName(locale: Locale, name: string) {
  if (name === "谁会晋级？") return translate(locale, "markets.whoAdvances");
  return name;
}

export function homeRuleValues() {
  return {
    page1: PAGE1_COUNT,
    page2: PAGE2_COUNT,
    total: PAGE1_COUNT + PAGE2_COUNT,
    page1Min: MIN_PAGE1_PICKS,
    page2Min: MIN_PAGE2_PICKS,
    totalMin: MIN_TOTAL_PICKS
  };
}

export function formatOpensAtLocale(iso: string | null, locale: Locale) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
