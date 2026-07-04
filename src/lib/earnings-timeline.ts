import { roundScore } from "@/lib/score-format";
import { settlePickGroup } from "@/lib/scoring";
import type { Market, Pick, Player } from "@/types";

export interface EarningsTimelineStep {
  stepIndex: number;
  marketId: string | null;
  labelKey: "start" | "match";
  teamA?: string;
  teamB?: string;
}

export interface EarningsTimelineSeries {
  playerId: string;
  playerName: string;
  values: number[];
  /** 每场结算的本场得分（未参与或无结算则为 0）。 */
  deltas: number[];
  finalNet: number;
}

export interface EarningsTimelineData {
  steps: EarningsTimelineStep[];
  series: EarningsTimelineSeries[];
}

function parseMarketSortKey(marketId: string): number {
  const match = marketId.match(/^m(\d+)-(\d+)$/);
  if (!match)
    return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 1000 + Number(match[2]);
}

/** 1/16 决赛实际结算顺序（与题号顺序无关）。 */
export const PAGE1_SETTLEMENT_ORDER = [
  "m1-1",
  "m1-2",
  "m1-12",
  "m1-3",
  "m1-7",
  "m1-14",
  "m1-9",
  "m1-16",
  "m1-13",
  "m1-11",
  "m1-4",
  "m1-8",
  "m1-10",
  "m1-6",
  "m1-15"
] as const;

function page1SettlementIndex(marketId: string): number {
  const index = PAGE1_SETTLEMENT_ORDER.indexOf(
    marketId as (typeof PAGE1_SETTLEMENT_ORDER)[number]
  );
  if (index >= 0)
    return index;
  return PAGE1_SETTLEMENT_ORDER.length + parseMarketSortKey(marketId);
}

/** 已结算场次排序：M1 用固定结算顺序，其余按 page + settledAt / 题号。 */
export function sortMarketsBySettlementOrder(markets: Market[]): Market[] {
  return [...markets]
    .filter((market) => market.winner !== null)
    .sort((a, b) => {
      if (a.page === 1 && b.page === 1)
        return page1SettlementIndex(a.id) - page1SettlementIndex(b.id);
      if (a.page !== b.page)
        return a.page - b.page;

      const aTime = a.settledAt ? Date.parse(a.settledAt) : Number.NaN;
      const bTime = b.settledAt ? Date.parse(b.settledAt) : Number.NaN;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime))
        return aTime - bTime || parseMarketSortKey(a.id) - parseMarketSortKey(b.id);
      if (!Number.isNaN(aTime))
        return -1;
      if (!Number.isNaN(bTime))
        return 1;
      return parseMarketSortKey(a.id) - parseMarketSortKey(b.id);
    });
}

function playerPenalty(player: Player): number {
  return roundScore((player.pickPenalty ?? 0) + (player.pickPenaltyPage3 ?? 0));
}

/**
 * 从第一场结算起，逐场累计每位玩家的净收益（parimutuel 得分 − 固定 pick 惩罚）。
 */
export function computeEarningsTimeline(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): EarningsTimelineData {
  const settledMarkets = sortMarketsBySettlementOrder(
    markets.filter((market) => market.page === 1)
  );

  const steps: EarningsTimelineStep[] = [
    { stepIndex: 0, marketId: null, labelKey: "start" }
  ];

  for (const market of settledMarkets) {
    const candidates = market.candidates ?? [];
    steps.push({
      stepIndex: steps.length,
      marketId: market.id,
      labelKey: "match",
      teamA: candidates[0],
      teamB: candidates[1]
    });
  }

  const series: EarningsTimelineSeries[] = players.map((player) => {
    const penalty = playerPenalty(player);
    const values: number[] = [roundScore(0 - penalty)];
    const deltas: number[] = [];
    let cumulative = 0;

    for (const market of settledMarkets) {
      const marketPicks = picks.filter((pick) => pick.marketId === market.id);
      const scores = settlePickGroup(market.winner!, marketPicks, market.id);
      const delta = roundScore(scores[player.id] ?? 0);
      deltas.push(delta);
      cumulative = roundScore(cumulative + delta);
      values.push(roundScore(cumulative - penalty));
    }

    return {
      playerId: player.id,
      playerName: player.name,
      values,
      deltas,
      finalNet: values[values.length - 1] ?? roundScore(0 - penalty)
    };
  });

  series.sort(
    (a, b) =>
      b.finalNet - a.finalNet ||
      a.playerName.localeCompare(b.playerName, "zh-CN")
  );

  return { steps, series };
}

export interface RankingTimelineSeries {
  playerId: string;
  playerName: string;
  ranks: number[];
  finalRank: number;
}

export interface RankingTimelineData {
  steps: EarningsTimelineStep[];
  series: RankingTimelineSeries[];
  playerCount: number;
}

function rankPlayersByScore(
  entries: { playerId: string; score: number; createdAt: string }[]
): Map<string, number> {
  const sorted = [...entries].sort(
    (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt)
  );
  const ranks = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;

  sorted.forEach((entry, index) => {
    const rank = entry.score === lastScore ? lastRank : index + 1;
    lastScore = entry.score;
    lastRank = rank;
    ranks.set(entry.playerId, rank);
  });

  return ranks;
}

/** 逐场结算后的排行榜名次（1 为最高）。 */
export function computeRankingTimeline(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): RankingTimelineData {
  const earnings = computeEarningsTimeline(players, markets, picks);
  const createdAtById = new Map(players.map((player) => [player.id, player.createdAt]));
  const stepCount = earnings.steps.length;

  const series: RankingTimelineSeries[] = earnings.series.map((row) => ({
    playerId: row.playerId,
    playerName: row.playerName,
    ranks: [],
    finalRank: players.length
  }));

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
    const ranks = rankPlayersByScore(
      earnings.series.map((row) => ({
        playerId: row.playerId,
        score: row.values[stepIndex] ?? 0,
        createdAt: createdAtById.get(row.playerId) ?? ""
      }))
    );

    for (const row of series) {
      row.ranks.push(ranks.get(row.playerId) ?? players.length);
    }
  }

  for (const row of series) {
    row.finalRank = row.ranks[row.ranks.length - 1] ?? players.length;
  }

  series.sort(
    (a, b) =>
      a.finalRank - b.finalRank ||
      a.playerName.localeCompare(b.playerName, "zh-CN")
  );

  return {
    steps: earnings.steps,
    series,
    playerCount: players.length
  };
}
