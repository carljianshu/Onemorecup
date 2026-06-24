import { en } from "./messages/en";
import { zh, type Messages } from "./messages/zh";
import {
  MIN_PAGE1_CACTUS_PICKS,
  MIN_PAGE1_MAPLE_PICKS,
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_PAGE3_PICKS,
  MIN_TOTAL_PICKS,
  PAGE1_COUNT,
  PAGE2_COUNT,
  PAGE3_COUNT
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
  if (page === 1) {
    return translate(locale, "markets.page1", { count: PAGE1_COUNT });
  }
  if (page === 2) {
    return translate(locale, "markets.page2", { count: PAGE2_COUNT });
  }
  return translate(locale, "markets.page3", { count: PAGE3_COUNT });
}

/** 玩家竞猜页专用：第一页/第二页显示为 1/16、1/8 决赛名称 */
export function playPageLabel(locale: Locale, page: PlayPage): string {
  if (page === 1) {
    return translate(locale, "play.tabPage1", { count: PAGE1_COUNT });
  }
  if (page === 2) {
    return translate(locale, "play.tabPage2", { count: PAGE2_COUNT });
  }
  return translate(locale, "play.tabPage3", { count: PAGE3_COUNT });
}

export function answersFeatureLabelKey(
  feature: "answersPage1" | "answersPage2" | "answersPage3"
) {
  if (feature === "answersPage1") return "admin.featureAnswersP1";
  if (feature === "answersPage2") return "admin.featureAnswersP2";
  return "admin.featureAnswersP3";
}

const MARKET_NAMES_EN: Record<string, string> = {
  "第一场1/4决赛谁会晋级？": "Who advances from QF match 1?",
  "第二场1/4决赛谁会晋级？": "Who advances from QF match 2?",
  "第三场1/4决赛谁会晋级？": "Who advances from QF match 3?",
  "第四场1/4决赛谁会晋级？": "Who advances from QF match 4?",
  "第一场半决赛谁会晋级？": "Who advances from SF match 1?",
  "第二场半决赛谁会晋级？": "Who advances from SF match 2?",
  "谁能夺冠？": "Who wins the title?"
};

export function translateMarketName(locale: Locale, name: string) {
  if (locale === "zh") return name;
  if (name === "谁会晋级？") return translate(locale, "markets.whoAdvances");
  return MARKET_NAMES_EN[name] ?? name;
}

export function translateMarketCandidate(locale: Locale, candidate: string) {
  if (locale === "zh") return candidate;
  let translated = candidate
    .replaceAll("墨西哥", "Mexico")
    .replaceAll("美国", "USA")
    .replaceAll("德国", "Germany")
    .replaceAll("阿根廷", "Argentina")
    .replaceAll("法国", "France")
    .replaceAll("挪威", "Norway");
  const tbd = translated.match(/^待填\s*(\d+)$/);
  if (tbd) return `TBD ${tbd[1]}`;
  if (translated.endsWith("区")) return `${translated.slice(0, -1)} bracket`;
  return translated;
}

const PLAY_CANDIDATE_COUNTRY_FLAGS: Record<Locale, Record<string, string>> = {
  zh: {
    阿根廷: "🇦🇷",
    墨西哥: "🇲🇽",
    德国: "🇩🇪",
    法国: "🇫🇷",
    挪威: "🇳🇴",
    美国: "🇺🇸"
  },
  en: {
    Argentina: "🇦🇷",
    Mexico: "🇲🇽",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Norway: "🇳🇴",
    USA: "🇺🇸"
  }
};

function prefixPlayCandidateCountryFlags(text: string, locale: Locale): string {
  const flags = PLAY_CANDIDATE_COUNTRY_FLAGS[locale];
  const names = Object.keys(flags).sort((a, b) => b.length - a.length);
  let result = text;
  for (const name of names) {
    const flag = flags[name]!;
    const flagged = `${flag}${name}`;
    const placeholder = `\u0000${name}\u0000`;
    result = result.replaceAll(flagged, placeholder);
    result = result.replaceAll(name, flagged);
    result = result.replaceAll(placeholder, flagged);
  }
  return result;
}

/** 竞猜页选项展示：翻译后在国家/地区名左侧加国旗。 */
export function formatPlayMarketCandidate(locale: Locale, candidate: string): string {
  return prefixPlayCandidateCountryFlags(translateMarketCandidate(locale, candidate), locale);
}

export function formatMarketHeading(locale: Locale, marketId: string, name: string) {
  const separator = locale === "zh" ? "：" : ": ";
  return `${marketId.toUpperCase()}${separator}${translateMarketName(locale, name)}`;
}

export function homeRuleValues() {
  return {
    page1: PAGE1_COUNT,
    page2: PAGE2_COUNT,
    page3: PAGE3_COUNT,
    total: PAGE1_COUNT + PAGE2_COUNT + PAGE3_COUNT,
    page1Min: MIN_PAGE1_PICKS,
    page1CactusMin: MIN_PAGE1_CACTUS_PICKS,
    page1MapleMin: MIN_PAGE1_MAPLE_PICKS,
    page2Min: MIN_PAGE2_PICKS,
    page3Min: MIN_PAGE3_PICKS,
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
