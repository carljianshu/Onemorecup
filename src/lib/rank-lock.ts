import { isPage3Market } from "@/data/markets";
import { promotionCutoffCount } from "@/lib/promotion";
import type { GameConfig, LeaderboardEntry, Market, Pick, PlayPage } from "@/types";

export type ParimutuelMarketRef = Pick<Market, "id" | "page">;

export interface ParimutuelPoolOptions {
  config?: GameConfig | null;
  market?: ParimutuelMarketRef | null;
  viewerPlayerId?: string | null;
}

export function marketRefFromId(marketId: string, page?: PlayPage): ParimutuelMarketRef {
  if (page != null)
    return { id: marketId, page };
  if (isPage3Market(marketId))
    return { id: marketId, page: 3 };
  if (marketId.startsWith("m2-"))
    return { id: marketId, page: 2 };
  return { id: marketId, page: 1 };
}

export function usesRankLockPage3Pool(
  config: GameConfig | null | undefined,
  market: ParimutuelMarketRef | null | undefined
): boolean {
  return Boolean(isRankLockApplied(config) && market && market.page === 3);
}

export function parimutuelPoolUsesTopTierOnly(
  config: GameConfig | null | undefined,
  market: ParimutuelMarketRef | null | undefined,
  viewerPlayerId?: string | null
): boolean {
  if (!usesRankLockPage3Pool(config, market))
    return false;
  if (!viewerPlayerId)
    return true;
  return (config!.rankLockTopPlayerIds ?? []).includes(viewerPlayerId);
}

export function filterPicksForParimutuelPool(
  groupPicks: Pick[],
  options?: ParimutuelPoolOptions
): Pick[] {
  if (!parimutuelPoolUsesTopTierOnly(options?.config, options?.market, options?.viewerPlayerId))
    return groupPicks;
  const topIds = new Set(options!.config!.rankLockTopPlayerIds ?? []);
  return groupPicks.filter((pick) => topIds.has(pick.playerId));
}

export function resolveParimutuelPoolOptions(
  marketId: string | undefined,
  options?: ParimutuelPoolOptions,
  page?: PlayPage
): ParimutuelPoolOptions {
  if (!marketId)
    return options ?? {};
  return {
    ...options,
    market: options?.market ?? marketRefFromId(marketId, page)
  };
}

export function isRankLockApplied(config: GameConfig | null | undefined): boolean {
  return Boolean(config?.rankLockApplied && config.rankLockTopPlayerIds?.length);
}

export function isPlayerInRankLockBottomTier(
  config: GameConfig | null | undefined,
  playerId: string | null | undefined
): boolean {
  if (!isRankLockApplied(config) || !playerId)
    return false;
  return (config!.rankLockBottomPlayerIds ?? []).includes(playerId);
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
