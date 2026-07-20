import { PAGE3_CANYON_MARKET_IDS, PAGE3_SEQUOIA_MARKET_IDS } from "@/data/markets";
import { isPageLocked } from "@/lib/page-lock";
import { isRankLockApplied } from "@/lib/rank-lock";
import { buildLeaderboard } from "@/lib/scoring";
import type { GameConfig, Market, Pick, Player } from "@/types";

const PHASE3_MARKET_IDS = [...PAGE3_CANYON_MARKET_IDS, ...PAGE3_SEQUOIA_MARKET_IDS] as const;
const PHASE3_SCENARIO_COUNT = 1 << PHASE3_MARKET_IDS.length;

export interface TopTierBestRankResult {
  /** 上档玩家 ID → 剩余赛果组合下可达的最佳（最小）排名；仅含上档玩家。 */
  bestRankByPlayerId: ReadonlyMap<string, number>;
  /** 与当前已结算结果一致的淘汰赛路径数（初始 128，随赛果录入递减）。 */
  remainingScenarioCount: number;
}

export function shouldComputeTopTierBestRank(config: GameConfig | null | undefined): boolean {
  return Boolean(config && isPageLocked(config, 3) && isRankLockApplied(config));
}

function phase3MarketsFrom(markets: Market[]): Market[] {
  const byId = new Map(markets.map((market) => [market.id, market]));
  return PHASE3_MARKET_IDS.map((id) => byId.get(id)).filter((market): market is Market => Boolean(market));
}

/**
 * 将 7 位掩码解码为淘汰赛路径；与已录入赛果冲突时返回 null。
 * 位 0–3：四场 1/4 决赛；位 4–5：两场半决赛；位 6：决赛。
 */
export function phase3WinnersForScenarioMask(
  markets: Market[],
  mask: number
): Record<string, string> | null {
  const byId = new Map(phase3MarketsFrom(markets).map((market) => [market.id, market]));
  const pick = (id: string, bit: number) => {
    const market = byId.get(id);
    if (!market)
      return null;
    const candidates = market.candidates ?? [];
    if (candidates.length < 2)
      return null;
    const winner = market.winner ?? candidates[(mask >> bit) & 1]!;
    if (market.winner && market.winner !== winner)
      return null;
    return winner;
  };

  const qf0 = pick("m3-1", 0);
  const qf1 = pick("m3-2", 1);
  const qf2 = pick("m3-3", 2);
  const qf3 = pick("m3-4", 3);
  if (!qf0 || !qf1 || !qf2 || !qf3)
    return null;

  const m35 = byId.get("m3-5");
  const m36 = byId.get("m3-6");
  const m37 = byId.get("m3-7");
  if (!m35 || !m36 || !m37)
    return null;

  let sf0 = m35.winner ?? (((mask >> 4) & 1) ? qf1 : qf0);
  if (m35.winner && m35.winner !== sf0)
    return null;
  if (!m35.winner && sf0 !== qf0 && sf0 !== qf1)
    return null;

  let sf1 = m36.winner ?? (((mask >> 5) & 1) ? qf3 : qf2);
  if (m36.winner && m36.winner !== sf1)
    return null;
  if (!m36.winner && sf1 !== qf2 && sf1 !== qf3)
    return null;

  let champion = m37.winner ?? (((mask >> 6) & 1) ? sf1 : sf0);
  if (m37.winner && m37.winner !== champion)
    return null;
  if (!m37.winner && champion !== sf0 && champion !== sf1)
    return null;

  return {
    "m3-1": qf0,
    "m3-2": qf1,
    "m3-3": qf2,
    "m3-4": qf3,
    "m3-5": sf0,
    "m3-6": sf1,
    "m3-7": champion
  };
}

function scenarioKey(winners: Record<string, string>): string {
  return PHASE3_MARKET_IDS.map((id) => winners[id]).join("\0");
}

export function countRemainingPhase3Scenarios(markets: Market[]): number {
  const seen = new Set<string>();
  for (let mask = 0; mask < PHASE3_SCENARIO_COUNT; mask++) {
    const winners = phase3WinnersForScenarioMask(markets, mask);
    if (!winners)
      continue;
    seen.add(scenarioKey(winners));
  }
  return seen.size;
}

function marketsWithPhase3Scenario(markets: Market[], winners: Record<string, string>): Market[] {
  return markets.map((market) => {
    const winner = winners[market.id];
    if (!winner)
      return market;
    return { ...market, winner };
  });
}

/**
 * 第三页锁定且排名锁定后：遍历剩余淘汰赛路径，求各上档玩家的理论最佳排名。
 */
export function computeTopTierBestRank(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config: GameConfig | null | undefined
): TopTierBestRankResult | null {
  if (!shouldComputeTopTierBestRank(config))
    return null;

  const topIds = config!.rankLockTopPlayerIds ?? [];
  if (topIds.length === 0)
    return null;

  const bestRank = new Map<string, number>();
  for (const playerId of topIds)
    bestRank.set(playerId, Number.POSITIVE_INFINITY);

  const seen = new Set<string>();
  let remainingScenarioCount = 0;

  for (let mask = 0; mask < PHASE3_SCENARIO_COUNT; mask++) {
    const winners = phase3WinnersForScenarioMask(markets, mask);
    if (!winners)
      continue;
    const key = scenarioKey(winners);
    if (seen.has(key))
      continue;
    seen.add(key);
    remainingScenarioCount++;

    const scenarioMarkets = marketsWithPhase3Scenario(markets, winners);
    const leaderboard = buildLeaderboard(players, scenarioMarkets, picks, config ?? undefined);
    const rankByPlayerId = new Map(leaderboard.map((entry) => [entry.playerId, entry.rank]));

    for (const playerId of topIds) {
      const rank = rankByPlayerId.get(playerId);
      if (rank === undefined)
        continue;
      const current = bestRank.get(playerId)!;
      if (rank < current)
        bestRank.set(playerId, rank);
    }
  }

  const bestRankByPlayerId = new Map<string, number>();
  for (const [playerId, rank] of bestRank) {
    if (Number.isFinite(rank))
      bestRankByPlayerId.set(playerId, rank);
  }

  return { bestRankByPlayerId, remainingScenarioCount };
}
