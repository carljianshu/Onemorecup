import type { GameConfig, PlayPage } from "@/types";

export type AnswersPageFeature = "answersPage1" | "answersPage2" | "answersPage3";

const FEATURE_LABELS: Record<AnswersPageFeature, string> = {
  answersPage1: "答题总览 · 1/16决赛",
  answersPage2: "答题总览 · 1/8决赛",
  answersPage3: "答题总览 · 1/4决赛及以后"
};

export function answersFeatureLabel(feature: AnswersPageFeature) {
  return FEATURE_LABELS[feature];
}

function answersPageFields(config: GameConfig, page: PlayPage) {
  if (page === 1) {
    return {
      public: config.answersPage1Public,
      opensAt: config.answersPage1OpensAt
    };
  }
  if (page === 2) {
    return {
      public: config.answersPage2Public,
      opensAt: config.answersPage2OpensAt
    };
  }
  return {
    public: config.answersPage3Public,
    opensAt: config.answersPage3OpensAt
  };
}

function answersFeaturePage(feature: AnswersPageFeature): PlayPage {
  if (feature === "answersPage1") return 1;
  if (feature === "answersPage2") return 2;
  return 3;
}

export function canAdminEnableAnswersPage(config: GameConfig, page: PlayPage) {
  const { opensAt } = answersPageFields(config, page);
  if (!opensAt) return true;
  return Date.now() >= new Date(opensAt).getTime();
}

export function isAnswersPagePublic(config: GameConfig, page: PlayPage) {
  const { public: enabled, opensAt } = answersPageFields(config, page);
  if (!enabled) return false;
  if (!opensAt) return true;
  return Date.now() >= new Date(opensAt).getTime();
}

export function isAnswersAnyPublic(config: GameConfig) {
  return (
    isAnswersPagePublic(config, 1) ||
    isAnswersPagePublic(config, 2) ||
    isAnswersPagePublic(config, 3)
  );
}

export function canAdminEnableFeature(config: GameConfig, feature: AnswersPageFeature) {
  return canAdminEnableAnswersPage(config, answersFeaturePage(feature));
}

export function isAnswersFeaturePublic(config: GameConfig, feature: AnswersPageFeature) {
  return isAnswersPagePublic(config, answersFeaturePage(feature));
}

export function formatOpensAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
