import { roundScore } from "@/lib/score-format";
import { playerDisplayName } from "@/lib/player-display";
import { settlePickGroup } from "@/lib/scoring";
import type { TimelinePlayerComputeOptions } from "@/lib/timeline-player-views";
import type { GameConfig, Market, Pick, Player } from "@/types";

export interface EarningsTimelineStep {
  stepIndex: number;
  marketId: string | null;
  labelKey: "start" | "match";
  teamA?: string;
  teamB?: string;
  page?: 1 | 2 | 3;
}

export interface EarningsTimelineSeries {
  playerId: string;
  playerName: string;
  values: number[];
  /** 每场结算的本场得分（未参与或无结算则为 0）。 */
  deltas: number[];
  /** 含起始点；折线只画到该步（含）。 */
  lastStepIndex: number;
  finalNet: number;
}

export interface EarningsTimelineData {
  steps: EarningsTimelineStep[];
  series: EarningsTimelineSeries[];
}

export interface EarningsTimelineComputeOptions {
  config?: GameConfig | null;
  playerOptionsById?: Map<string, TimelinePlayerComputeOptions>;
}

const DEFAULT_PLAYER_OPTIONS: TimelinePlayerComputeOptions = {
  maxPage: 3,
  skipPenalty: false
};

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
  "m1-5",
  "m1-15"
] as const;

/** 1/8 决赛实际结算顺序（与题号顺序无关；未列出的场次排在已知顺序之后）。 */
export const PAGE2_SETTLEMENT_ORDER = [
  "m2-2",
  "m2-1",
  "m2-5",
  "m2-6",
  "m2-3",
  "m2-4"
] as const;

function page1SettlementIndex(marketId: string): number {
  const index = PAGE1_SETTLEMENT_ORDER.indexOf(
    marketId as (typeof PAGE1_SETTLEMENT_ORDER)[number]
  );
  if (index >= 0)
    return index;
  return PAGE1_SETTLEMENT_ORDER.length + parseMarketSortKey(marketId);
}

function page2SettlementIndex(marketId: string): number {
  const index = PAGE2_SETTLEMENT_ORDER.indexOf(
    marketId as (typeof PAGE2_SETTLEMENT_ORDER)[number]
  );
  if (index >= 0)
    return index;
  return PAGE2_SETTLEMENT_ORDER.length + parseMarketSortKey(marketId);
}

/** 1/4 决赛及以后实际结算顺序。 */
export const PAGE3_SETTLEMENT_ORDER = [
  "m3-1",
  "m3-2",
  "m3-3",
  "m3-4",
  "m3-5",
  "m3-6",
  "m3-7"
] as const;

function page3SettlementIndex(marketId: string): number {
  const index = PAGE3_SETTLEMENT_ORDER.indexOf(
    marketId as (typeof PAGE3_SETTLEMENT_ORDER)[number]
  );
  if (index >= 0)
    return index;
  return PAGE3_SETTLEMENT_ORDER.length + parseMarketSortKey(marketId);
}

/** 已结算场次排序：M1/M2/M3 各有固定结算顺序，其余按 page + settledAt / 题号。 */
export function sortMarketsBySettlementOrder(markets: Market[]): Market[] {
  return [...markets]
    .filter((market) => market.winner !== null)
    .sort((a, b) => {
      if (a.page === 1 && b.page === 1)
        return page1SettlementIndex(a.id) - page1SettlementIndex(b.id);
      if (a.page === 2 && b.page === 2)
        return page2SettlementIndex(a.id) - page2SettlementIndex(b.id);
      if (a.page === 3 && b.page === 3)
        return page3SettlementIndex(a.id) - page3SettlementIndex(b.id);
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

function playerPenalty(player: Player, skipPenalty: boolean): number {
  if (skipPenalty)
    return 0;
  return roundScore((player.pickPenalty ?? 0) + (player.pickPenaltyPage3 ?? 0));
}

function resolvePlayerOptions(
  playerId: string,
  options?: EarningsTimelineComputeOptions
): TimelinePlayerComputeOptions {
  return options?.playerOptionsById?.get(playerId) ?? DEFAULT_PLAYER_OPTIONS;
}

/**
 * 从第一场结算起，逐场累计每位玩家的净收益（parimutuel 得分 − 固定 pick 惩罚）。
 * 支持按玩家限制展示阶段（maxPage）与免扣分（skipPenalty）。
 */
export function computeEarningsTimeline(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  options?: EarningsTimelineComputeOptions
): EarningsTimelineData {
  const settledMarkets = sortMarketsBySettlementOrder(
    markets.filter((market) => market.page === 1 || market.page === 2 || market.page === 3)
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
      teamB: candidates[1],
      page: market.page
    });
  }

  const series: EarningsTimelineSeries[] = players.map((player) => {
    const playerOptions = resolvePlayerOptions(player.id, options);
    const penalty = playerPenalty(player, playerOptions.skipPenalty);
    const values: number[] = [roundScore(0 - penalty)];
    const deltas: number[] = [];
    let cumulative = 0;
    let lastStepIndex = 0;

    for (const market of settledMarkets) {
      if (market.page > playerOptions.maxPage) {
        deltas.push(0);
        values.push(roundScore(cumulative - penalty));
        continue;
      }

      const marketPicks = picks.filter((pick) => pick.marketId === market.id);
      const scores = settlePickGroup(market.winner!, marketPicks, market.id, {
        config: options?.config,
        market: { id: market.id, page: market.page }
      });
      const delta = roundScore(scores[player.id] ?? 0);
      deltas.push(delta);
      cumulative = roundScore(cumulative + delta);
      values.push(roundScore(cumulative - penalty));
      lastStepIndex = values.length - 1;
    }

    return {
      playerId: player.id,
      playerName: playerDisplayName(player, player.name),
      values,
      deltas,
      lastStepIndex,
      finalNet: values[lastStepIndex] ?? roundScore(0 - penalty)
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
  lastStepIndex: number;
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
  picks: Pick[],
  options?: EarningsTimelineComputeOptions
): RankingTimelineData {
  const earnings = computeEarningsTimeline(players, markets, picks, options);
  const createdAtById = new Map(players.map((player) => [player.id, player.createdAt]));
  const stepCount = earnings.steps.length;

  const series: RankingTimelineSeries[] = earnings.series.map((row) => ({
    playerId: row.playerId,
    playerName: row.playerName,
    ranks: [],
    lastStepIndex: row.lastStepIndex,
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
    row.finalRank = row.ranks[row.lastStepIndex] ?? players.length;
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
