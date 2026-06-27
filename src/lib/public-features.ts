import type { GameConfig, PlayPage } from "@/types";

/** 各页答题总览默认自动开放时间（UTC ISO），较竞猜截止晚 1 分钟。 */
export const DEFAULT_ANSWERS_PAGE_OPENS_AT: Record<PlayPage, string> = {
  1: "2026-06-29T17:01:00.000Z",
  2: "2026-07-04T17:01:00.000Z",
  3: "2026-07-09T20:01:00.000Z"
};

export function defaultAnswersPageSchedule(): Pick<
  GameConfig,
  | "answersPage1Public"
  | "answersPage2Public"
  | "answersPage3Public"
  | "answersPage1OpensAt"
  | "answersPage2OpensAt"
  | "answersPage3OpensAt"
  | "answersPage1ScheduleOpenApplied"
  | "answersPage2ScheduleOpenApplied"
  | "answersPage3ScheduleOpenApplied"
> {
  return {
    answersPage1Public: true,
    answersPage2Public: true,
    answersPage3Public: true,
    answersPage1OpensAt: DEFAULT_ANSWERS_PAGE_OPENS_AT[1],
    answersPage2OpensAt: DEFAULT_ANSWERS_PAGE_OPENS_AT[2],
    answersPage3OpensAt: DEFAULT_ANSWERS_PAGE_OPENS_AT[3],
    answersPage1ScheduleOpenApplied: false,
    answersPage2ScheduleOpenApplied: false,
    answersPage3ScheduleOpenApplied: false
  };
}

function answersScheduleAppliedField(page: PlayPage) {
  if (page === 1) return "answersPage1ScheduleOpenApplied" as const;
  if (page === 2) return "answersPage2ScheduleOpenApplied" as const;
  return "answersPage3ScheduleOpenApplied" as const;
}

function answersOpensAtField(page: PlayPage) {
  if (page === 1) return "answersPage1OpensAt" as const;
  if (page === 2) return "answersPage2OpensAt" as const;
  return "answersPage3OpensAt" as const;
}

function answersPublicField(page: PlayPage) {
  if (page === 1) return "answersPage1Public" as const;
  if (page === 2) return "answersPage2Public" as const;
  return "answersPage3Public" as const;
}

/** 历史默认答题总览开放时间；线上仍为这些值时会迁移到 {@link DEFAULT_ANSWERS_PAGE_OPENS_AT}。 */
const STALE_ANSWERS_PAGE_OPENS_AT: Record<PlayPage, readonly string[]> = {
  1: ["2026-06-28T19:01:00.000Z"],
  2: ["2026-07-04T17:01:00.000Z", "2026-06-19T13:01:00.000Z"],
  3: []
};

/** 未设置开放时间时写入默认计划，并启用对应答题总览。 */
export function migrateAnswersPageSchedule(config: GameConfig): {
  config: GameConfig;
  changed: boolean;
} {
  let changed = false;
  let next = config;

  (([1, 2, 3] as const) satisfies PlayPage[]).forEach((page) => {
    const opensAtKey = answersOpensAtField(page);
    const publicKey = answersPublicField(page);
    const appliedKey = answersScheduleAppliedField(page);
    const current = config[opensAtKey];
    const target = DEFAULT_ANSWERS_PAGE_OPENS_AT[page];

    if (current === null) {
      if (!changed) next = { ...config };
      next = {
        ...next,
        [opensAtKey]: target,
        [publicKey]: true
      };
      changed = true;
      return;
    }

    if (current !== target && STALE_ANSWERS_PAGE_OPENS_AT[page].includes(current)) {
      if (!changed) next = { ...config };
      next = {
        ...next,
        [opensAtKey]: target,
        [appliedKey]: false
      };
      changed = true;
    }
  });

  return { config: next, changed };
}

/**
 * 旧数据：若预设开放时间已过，视为本轮计划已处理，避免上线后误把管理员手动关闭再次自动打开。
 */
export function migrateAnswersScheduleOpenApplied(
  config: GameConfig,
  now = Date.now()
): { config: GameConfig; changed: boolean } {
  let changed = false;
  let next = config;

  (([1, 2, 3] as const) satisfies PlayPage[]).forEach((page) => {
    const appliedKey = answersScheduleAppliedField(page);
    if (typeof config[appliedKey] === "boolean") return;

    const { opensAt } = answersPageFields(config, page);
    const past = Boolean(opensAt && now >= new Date(opensAt).getTime());

    if (!changed) next = { ...config };
    next = { ...next, [appliedKey]: past };
    changed = true;
  });

  return { config: next, changed };
}

/** 到达 opensAt 后若仍关闭则自动打开；每轮计划仅触发一次。 */
export function applyScheduledAnswersPageOpen(
  config: GameConfig,
  now = Date.now()
): { config: GameConfig; changed: boolean } {
  let changed = false;
  let next = config;

  (([1, 2, 3] as const) satisfies PlayPage[]).forEach((page) => {
    const { opensAt, public: enabled } = answersPageFields(config, page);
    const publicKey = answersPublicField(page);
    const appliedKey = answersScheduleAppliedField(page);

    if (!opensAt) return;
    if (now < new Date(opensAt).getTime()) return;
    if (config[appliedKey]) return;

    if (!changed) next = { ...config };
    next = {
      ...next,
      ...(enabled ? {} : { [publicKey]: true }),
      [appliedKey]: true
    };
    changed = true;
  });

  return { config: next, changed };
}

export type AnswersPageFeature = "answersPage1" | "answersPage2" | "answersPage3";

export function patchAnswersPageSchedule(
  config: GameConfig,
  feature: AnswersPageFeature,
  patch: { public?: boolean; opensAt?: string | null }
): GameConfig {
  const page = answersFeaturePage(feature);
  const publicKey = answersPublicField(page);
  const opensAtKey = answersOpensAtField(page);
  const appliedKey = answersScheduleAppliedField(page);
  const next = { ...config };

  if (patch.public !== undefined) {
    next[publicKey] = patch.public;
  }
  if (patch.opensAt !== undefined) {
    const previous = config[opensAtKey];
    next[opensAtKey] = patch.opensAt;
    if (patch.opensAt !== previous) {
      next[appliedKey] = false;
    }
  }

  return next;
}

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

export function canAdminEnableAnswersPage(_config: GameConfig, _page: PlayPage) {
  return true;
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
