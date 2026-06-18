import type { GameConfig, PlayPage } from "@/types";

/** 各页默认自动锁定时间（UTC ISO）。 */
export const DEFAULT_PAGE_LOCKS_AT: Record<PlayPage, string> = {
  1: "2026-06-28T17:30:00.000Z",
  2: "2026-07-04T15:30:00.000Z",
  3: "2026-07-09T18:30:00.000Z"
};

function lockFields(page: PlayPage) {
  if (page === 1) {
    return {
      manualLocked: "page1Locked" as const,
      locksAt: "page1LocksAt" as const,
      overridden: "page1LockOverridden" as const
    };
  }
  if (page === 2) {
    return {
      manualLocked: "page2Locked" as const,
      locksAt: "page2LocksAt" as const,
      overridden: "page2LockOverridden" as const
    };
  }
  return {
    manualLocked: "page3Locked" as const,
    locksAt: "page3LocksAt" as const,
    overridden: "page3LockOverridden" as const
  };
}

export function pageLocksAt(config: GameConfig, page: PlayPage): string | null {
  return config[lockFields(page).locksAt];
}

function isScheduleLocked(config: GameConfig, page: PlayPage, now = Date.now()): boolean {
  const { locksAt, overridden } = lockFields(page);
  if (config[overridden]) return false;
  const at = config[locksAt];
  if (!at) return false;
  return now >= new Date(at).getTime();
}

/** 管理员手动锁定，或已到自动锁定时间（除非管理员已手动解锁）。 */
export function isPageLocked(config: GameConfig, page: PlayPage, now = Date.now()): boolean {
  const { manualLocked } = lockFields(page);
  if (config[manualLocked]) return true;
  return isScheduleLocked(config, page, now);
}

export function isPageManuallyLocked(config: GameConfig, page: PlayPage): boolean {
  return config[lockFields(page).manualLocked];
}

export function isPageAutoLocked(config: GameConfig, page: PlayPage, now = Date.now()): boolean {
  if (config[lockFields(page).manualLocked]) return false;
  return isScheduleLocked(config, page, now);
}

export function applyManualPageLock(
  config: GameConfig,
  page: PlayPage,
  locked: boolean
): GameConfig {
  const fields = lockFields(page);
  if (locked) {
    return {
      ...config,
      [fields.manualLocked]: true,
      [fields.overridden]: false
    };
  }
  return {
    ...config,
    [fields.manualLocked]: false,
    [fields.overridden]: true
  };
}

export function defaultPageLockSchedule(): Pick<
  GameConfig,
  | "page1LocksAt"
  | "page2LocksAt"
  | "page3LocksAt"
  | "page1LockOverridden"
  | "page2LockOverridden"
  | "page3LockOverridden"
> {
  return {
    page1LocksAt: DEFAULT_PAGE_LOCKS_AT[1],
    page2LocksAt: DEFAULT_PAGE_LOCKS_AT[2],
    page3LocksAt: DEFAULT_PAGE_LOCKS_AT[3],
    page1LockOverridden: false,
    page2LockOverridden: false,
    page3LockOverridden: false
  };
}

export function formatPageLockUtc(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
