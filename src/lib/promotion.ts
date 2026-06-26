import { isPageLocked } from "@/lib/page-lock";
import type { GameConfig, LeaderboardEntry, Market, PlayerPickInput, PlayPage } from "@/types";

export function promotionCutoffCount(playerCount: number): number {
  if (playerCount <= 0) return 0;
  return Math.ceil((playerCount * 2) / 3);
}

export function showPromotionCutoffLine(playerCount: number): boolean {
  return promotionCutoffCount(playerCount) < playerCount;
}

export function isPromotionLocked(config: GameConfig | null | undefined): boolean {
  return Boolean(config?.promotionLockedAt && config.promotedPlayerIds?.length);
}

export function shouldSnapshotPromotion(config: GameConfig): boolean {
  return isPageLocked(config, 3) && !isPromotionLocked(config);
}

/** 旧逻辑在 1/8 锁定时定格；若第 3 页尚未锁定则清除快照，待 1/4 锁定时再定格。 */
export function migratePromotionSnapshotTiming(config: GameConfig): {
  config: GameConfig;
  changed: boolean;
} {
  if (!isPromotionLocked(config)) return { config, changed: false };
  if (isPageLocked(config, 3)) return { config, changed: false };
  return {
    config: {
      ...config,
      promotionLockedAt: null,
      promotedPlayerIds: null,
      eliminatedPlayerIds: null
    },
    changed: true
  };
}

export function computePromotionSnapshot(leaderboard: LeaderboardEntry[]): Pick<
  GameConfig,
  "promotionLockedAt" | "promotedPlayerIds" | "eliminatedPlayerIds"
> {
  const cutoff = promotionCutoffCount(leaderboard.length);
  return {
    promotionLockedAt: new Date().toISOString(),
    promotedPlayerIds: leaderboard.slice(0, cutoff).map((entry) => entry.playerId),
    eliminatedPlayerIds: leaderboard.slice(cutoff).map((entry) => entry.playerId)
  };
}

export function maybeLockPromotion(
  config: GameConfig,
  leaderboard: LeaderboardEntry[]
): { config: GameConfig; changed: boolean } {
  if (!shouldSnapshotPromotion(config)) {
    return { config, changed: false };
  }
  return {
    config: { ...config, ...computePromotionSnapshot(leaderboard) },
    changed: true
  };
}

function compareLeaderboardEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.netEarnings - a.netEarnings || a.playerId.localeCompare(b.playerId);
}

/** 定格后：晋级区按当前 netEarnings 排序；淘汰区保持定格时顺序。 */
export function applyPromotionTierRanking(
  entries: LeaderboardEntry[],
  config: GameConfig
): LeaderboardEntry[] {
  if (!isPromotionLocked(config)) return entries;

  const byId = new Map(entries.map((entry) => [entry.playerId, entry]));
  const promotedIds = config.promotedPlayerIds ?? [];
  const eliminatedIds = config.eliminatedPlayerIds ?? [];

  const promoted = promotedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is LeaderboardEntry => entry !== undefined)
    .sort(compareLeaderboardEntries);

  const eliminated = eliminatedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is LeaderboardEntry => entry !== undefined);

  const placed = new Set([...promotedIds, ...eliminatedIds]);
  const extras = entries.filter((entry) => !placed.has(entry.playerId)).sort(compareLeaderboardEntries);

  const ordered = [...promoted, ...eliminated, ...extras];

  let lastScore: number | null = null;
  let lastRank = 0;

  return ordered.map((entry, index) => {
    const rank = entry.netEarnings === lastScore ? lastRank : index + 1;
    lastScore = entry.netEarnings;
    lastRank = rank;
    return { ...entry, rank };
  });
}

export function removePlayerFromPromotionSnapshot(
  config: GameConfig,
  playerId: string
): GameConfig {
  if (!isPromotionLocked(config)) return config;
  const promotedPlayerIds = config.promotedPlayerIds?.filter((id) => id !== playerId) ?? null;
  const eliminatedPlayerIds = config.eliminatedPlayerIds?.filter((id) => id !== playerId) ?? null;
  return { ...config, promotedPlayerIds, eliminatedPlayerIds };
}

export function playerLeaderboardIndex(
  leaderboard: LeaderboardEntry[],
  playerId: string
): number {
  return leaderboard.findIndex((entry) => entry.playerId === playerId);
}

export function isPlayerPromoted(
  leaderboard: LeaderboardEntry[],
  playerId: string | null | undefined,
  config?: GameConfig | null
): boolean {
  if (!playerId) return false;
  if (isPromotionLocked(config)) {
    return config!.promotedPlayerIds!.includes(playerId);
  }
  if (leaderboard.length === 0) return false;
  const index = playerLeaderboardIndex(leaderboard, playerId);
  if (index < 0) return false;
  return index < promotionCutoffCount(leaderboard.length);
}

export function stripPage3PickInputs(
  pickInputs: PlayerPickInput[],
  markets: Market[]
): PlayerPickInput[] {
  return pickInputs.filter((input) => {
    const market = markets.find((m) => m.id === input.marketId);
    return market?.page !== 3;
  });
}

/** 非晋级玩家不可保存第三页；保存其他页时自动剔除第三页竞猜。 */
export function applyPromotionToSave(
  pickInputs: PlayerPickInput[],
  markets: Market[],
  leaderboard: LeaderboardEntry[],
  playerId: string | null | undefined,
  page: PlayPage,
  config?: GameConfig | null
): PlayerPickInput[] {
  if (isPlayerPromoted(leaderboard, playerId, config)) {
    return pickInputs;
  }
  if (page === 3) {
    throw new Error("PAGE3_NOT_PROMOTED");
  }
  return stripPage3PickInputs(pickInputs, markets);
}
