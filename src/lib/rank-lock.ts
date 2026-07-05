import { promotionCutoffCount } from "@/lib/promotion";
import type { GameConfig, LeaderboardEntry } from "@/types";

export function isRankLockApplied(config: GameConfig | null | undefined): boolean {
  return Boolean(config?.rankLockApplied && config.rankLockTopPlayerIds?.length);
}

export function computeRankLockSnapshot(
  leaderboard: LeaderboardEntry[]
): Pick<GameConfig, "rankLockAppliedAt" | "rankLockTopPlayerIds" | "rankLockBottomPlayerIds"> {
  const cutoff = promotionCutoffCount(leaderboard.length);
  return {
    rankLockAppliedAt: new Date().toISOString(),
    rankLockTopPlayerIds: leaderboard.slice(0, cutoff).map((entry) => entry.playerId),
    rankLockBottomPlayerIds: leaderboard.slice(cutoff).map((entry) => entry.playerId)
  };
}

/** 排名锁定：上档永远占据 1…N 名，下档永远在其后（下档最高只能排 N+1）。 */
export function applyRankLockTierSort<T extends {
  playerId: string;
  netEarnings: number;
  createdAt: string;
}>(entries: T[], config: GameConfig): T[] {
  if (!isRankLockApplied(config))
    return entries;

  const topIds = new Set(config.rankLockTopPlayerIds ?? []);
  const bottomIds = new Set(config.rankLockBottomPlayerIds ?? []);
  const top: T[] = [];
  const bottom: T[] = [];
  const unassigned: T[] = [];

  for (const entry of entries) {
    if (topIds.has(entry.playerId))
      top.push(entry);
    else if (bottomIds.has(entry.playerId))
      bottom.push(entry);
    else
      unassigned.push(entry);
  }

  const byScore = (a: T, b: T) =>
    b.netEarnings - a.netEarnings || a.createdAt.localeCompare(b.createdAt);
  top.sort(byScore);
  bottom.sort(byScore);
  unassigned.sort(byScore);

  return [...top, ...bottom, ...unassigned];
}

export function removePlayerFromRankLockSnapshot(
  config: GameConfig,
  playerId: string
): GameConfig {
  if (!isRankLockApplied(config))
    return config;
  return {
    ...config,
    rankLockTopPlayerIds: config.rankLockTopPlayerIds?.filter((id) => id !== playerId) ?? null,
    rankLockBottomPlayerIds: config.rankLockBottomPlayerIds?.filter((id) => id !== playerId) ?? null
  };
}
