import { DOUBLE_STAKE } from "@/data/markets";
import { PAGE1_REAL_WORLD_RATES, type Page1RealWorldRate } from "@/data/page1-real-world-rates";
import { roundScore } from "@/lib/score-format";
import { computeParimutuelBreakdown, computeProjectedStakeBreakdown } from "@/lib/scoring";
import type { Market, Pick, Player } from "@/types";

function pickSlotWeight(stake: number): number {
  return stake === DOUBLE_STAKE ? 2 : 1;
}

export function teamSlotCountsForMarket(
  market: Market,
  picks: Pick[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const team of market.candidates ?? []) {
    counts.set(team, 0);
  }
  for (const pick of picks.filter((item) => item.marketId === market.id)) {
    if (!counts.has(pick.team))
      continue;
    counts.set(pick.team, (counts.get(pick.team) ?? 0) + pickSlotWeight(pick.stake));
  }
  return counts;
}

/** 各队支持率（百分数）；无作答返回 null。 */
export function teamSupportRatesForMarket(
  market: Market,
  picks: Pick[]
): Map<string, number> | null {
  const slotCounts = teamSlotCountsForMarket(market, picks);
  const total = [...slotCounts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0)
    return null;

  const rates = new Map<string, number>();
  for (const [team, count] of slotCounts) {
    rates.set(team, (100 * count) / total);
  }
  return rates;
}

function findPage1MarketByTeams(
  markets: Market[],
  teamA: string,
  teamB: string
): Market | undefined {
  return markets.find(
    (market) =>
      market.page === 1 &&
      market.candidates?.includes(teamA) &&
      market.candidates?.includes(teamB)
  );
}

export interface Page1RealWorldComparisonRow {
  marketId: string;
  favoriteTeam: string;
  underdogTeam: string;
  realFavoriteRate: number;
  realUnderdogRate: number;
  playerFavoriteRate: number;
  playerUnderdogRate: number;
  maxDeviation: number;
  pattern: string;
  totalSlots: number;
}

export interface Page1RealWorldComparisonStats {
  rows: Page1RealWorldComparisonRow[];
  topGapRows: Page1RealWorldComparisonRow[];
  bottomGapRows: Page1RealWorldComparisonRow[];
}

/** 取计分前 N 档（含并列）：按 distinct 分值取前三档，返回该档及以上所有项。 */
export function topTierByScore<T>(
  rows: T[],
  scoreOf: (row: T) => number,
  tierCount = 3
): T[] {
  const distinct = [...new Set(rows.map(scoreOf))].sort((a, b) => b - a);
  if (distinct.length === 0 || distinct[0] === 0)
    return [];

  const cutoff = distinct[Math.min(tierCount, distinct.length) - 1]!;
  return rows.filter((row) => scoreOf(row) >= cutoff);
}

export function computePage1RealWorldComparison(
  markets: Market[],
  picks: Pick[],
  benchmarks: Page1RealWorldRate[] = PAGE1_REAL_WORLD_RATES
): Page1RealWorldComparisonStats {
  const rows: Page1RealWorldComparisonRow[] = [];

  for (const benchmark of benchmarks) {
    const market = findPage1MarketByTeams(
      markets,
      benchmark.favoriteTeam,
      benchmark.underdogTeam
    );
    if (!market)
      continue;

    const slotCounts = teamSlotCountsForMarket(market, picks);
    const totalSlots = [...slotCounts.values()].reduce((sum, count) => sum + count, 0);
    const playerRates = teamSupportRatesForMarket(market, picks);
    if (!playerRates || totalSlots === 0)
      continue;

    const playerFavoriteRate = playerRates.get(benchmark.favoriteTeam) ?? 0;
    const playerUnderdogRate = playerRates.get(benchmark.underdogTeam) ?? 0;
    const maxDeviation = Math.max(
      Math.abs(playerFavoriteRate - benchmark.favoriteRate),
      Math.abs(playerUnderdogRate - benchmark.underdogRate)
    );

    rows.push({
      marketId: market.id,
      favoriteTeam: benchmark.favoriteTeam,
      underdogTeam: benchmark.underdogTeam,
      realFavoriteRate: benchmark.favoriteRate,
      realUnderdogRate: benchmark.underdogRate,
      playerFavoriteRate,
      playerUnderdogRate,
      maxDeviation,
      pattern: benchmark.pattern,
      totalSlots
    });
  }

  rows.sort((a, b) => b.maxDeviation - a.maxDeviation);

  return {
    rows,
    topGapRows: topTierByScore(rows, (row) => row.maxDeviation, 3),
    bottomGapRows: bottomTierByScore(rows, (row) => row.maxDeviation, 3).sort(
      (a, b) =>
        a.maxDeviation - b.maxDeviation ||
        a.marketId.localeCompare(b.marketId, undefined, { numeric: true })
    )
  };
}

/** 某题按计分位统计后，人数较多的一方；平局则无数。 */
export function majorityTeamForMarket(
  market: Market,
  picks: Pick[]
): string | null {
  const marketPicks = picks.filter((pick) => pick.marketId === market.id);
  if (marketPicks.length === 0)
    return null;

  const slotCounts = new Map<string, number>();
  for (const pick of marketPicks) {
    const weight = pickSlotWeight(pick.stake);
    slotCounts.set(pick.team, (slotCounts.get(pick.team) ?? 0) + weight);
  }

  const candidates = market.candidates ?? [];
  if (candidates.length === 2) {
    const [left, right] = candidates;
    const leftCount = slotCounts.get(left) ?? 0;
    const rightCount = slotCounts.get(right) ?? 0;
    if (leftCount > rightCount)
      return left;
    if (rightCount > leftCount)
      return right;
    return null;
  }

  let leader: string | null = null;
  let leaderCount = -1;
  let tied = false;
  for (const [team, count] of slotCounts) {
    if (count > leaderCount) {
      leader = team;
      leaderCount = count;
      tied = false;
    }
    else if (count === leaderCount) {
      tied = true;
    }
  }
  return tied ? null : leader;
}

/** 某题按计分位统计后，人数较少的一方；平局则无数。 */
export function minorityTeamForMarket(
  market: Market,
  picks: Pick[]
): string | null {
  const majorityTeam = majorityTeamForMarket(market, picks);
  if (!majorityTeam)
    return null;

  const candidates = market.candidates ?? [];
  if (candidates.length === 2) {
    return candidates.find((team) => team !== majorityTeam) ?? null;
  }

  const marketPicks = picks.filter((pick) => pick.marketId === market.id);
  const slotCounts = new Map<string, number>();
  for (const pick of marketPicks) {
    const weight = pickSlotWeight(pick.stake);
    slotCounts.set(pick.team, (slotCounts.get(pick.team) ?? 0) + weight);
  }

  let minority: string | null = null;
  let minorityCount = Number.POSITIVE_INFINITY;
  let tied = false;
  for (const [team, count] of slotCounts) {
    if (count < minorityCount) {
      minority = team;
      minorityCount = count;
      tied = false;
    }
    else if (count === minorityCount) {
      tied = true;
    }
  }
  return tied ? null : minority;
}

export interface Page1SidePickRow {
  playerId: string;
  playerName: string;
  matchCount: number;
}

export interface Page1SidePickStats {
  rows: Page1SidePickRow[];
  maxCount: number;
  topRows: Page1SidePickRow[];
}

function buildPage1SidePickStats(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  sideTeamForMarket: (market: Market, picks: Pick[]) => string | null
): Page1SidePickStats {
  const page1Markets = markets.filter((market) => market.page === 1);
  const matchCountByPlayer = new Map<string, number>();

  for (const player of players) {
    matchCountByPlayer.set(player.id, 0);
  }

  for (const market of page1Markets) {
    const sideTeam = sideTeamForMarket(market, picks);
    if (!sideTeam)
      continue;

    for (const pick of picks.filter((item) => item.marketId === market.id)) {
      if (pick.team !== sideTeam)
        continue;
      matchCountByPlayer.set(
        pick.playerId,
        (matchCountByPlayer.get(pick.playerId) ?? 0) + 1
      );
    }
  }

  const rows: Page1SidePickRow[] = players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      matchCount: matchCountByPlayer.get(player.id) ?? 0
    }))
    .sort(
      (a, b) =>
        b.matchCount - a.matchCount ||
        a.playerName.localeCompare(b.playerName, "zh-CN")
    );

  const maxCount = rows[0]?.matchCount ?? 0;
  const topRows = topTierByScore(rows, (row) => row.matchCount, 3);

  return { rows, maxCount, topRows };
}

/**
 * 1/16 决赛：每位玩家猜中「多数派（热门）」的场数。
 * 多数派按计分位判定（Double 计 2）；玩家累加时每场 +1，Double 不额外加倍。
 */
export function computePage1PopularPickStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): Page1SidePickStats {
  return buildPage1SidePickStats(players, markets, picks, majorityTeamForMarket);
}

/**
 * 1/16 决赛：每位玩家猜中「少数派（冷门）」的场数。
 * 少数派按计分位判定（Double 计 2）；玩家累加时每场 +1，Double 不额外加倍。
 */
export function computePage1UnpopularPickStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): Page1SidePickStats {
  return buildPage1SidePickStats(players, markets, picks, minorityTeamForMarket);
}

function buildPage1SettledResultStats(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  mode: "correct" | "incorrect"
): Page1SidePickStats {
  const marketById = new Map(
    markets
      .filter((market) => market.page === 1 && market.winner !== null)
      .map((market) => [market.id, market])
  );
  const matchCountByPlayer = new Map<string, number>();

  for (const player of players) {
    matchCountByPlayer.set(player.id, 0);
  }

  for (const pick of picks) {
    const market = marketById.get(pick.marketId);
    if (!market?.winner)
      continue;

    const isCorrect = pick.team === market.winner;
    if ((mode === "correct" && !isCorrect) || (mode === "incorrect" && isCorrect))
      continue;

    matchCountByPlayer.set(
      pick.playerId,
      (matchCountByPlayer.get(pick.playerId) ?? 0) + 1
    );
  }

  const rows: Page1SidePickRow[] = players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      matchCount: matchCountByPlayer.get(player.id) ?? 0
    }))
    .sort(
      (a, b) =>
        b.matchCount - a.matchCount ||
        a.playerName.localeCompare(b.playerName, "zh-CN")
    );

  const maxCount = rows[0]?.matchCount ?? 0;
  const topRows = topTierByScore(rows, (row) => row.matchCount, 1);

  return { rows, maxCount, topRows };
}

/** 1/16 决赛：已结算场次中猜对场数最多的玩家（每场计 1，不含 Double 加权）。 */
export function computePage1CorrectPickStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): Page1SidePickStats {
  return buildPage1SettledResultStats(players, markets, picks, "correct");
}

/** 1/16 决赛：已结算场次中猜错场数最多的玩家（每场计 1，不含 Double 加权）。 */
export function computePage1IncorrectPickStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): Page1SidePickStats {
  return buildPage1SettledResultStats(players, markets, picks, "incorrect");
}

/**
 * 已结算场次中，单次 Double 猜对且净得分 > 0 的最高记录（含并列）。
 */
export function computeMaxDoubleSingleMatchWinStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): MaxSingleMatchWinStats {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const records: MaxSingleMatchWinRow[] = [];

  for (const pick of picks) {
    if (pick.stake !== DOUBLE_STAKE)
      continue;

    const market = marketById.get(pick.marketId);
    if (!market || market.winner === null || pick.team !== market.winner)
      continue;

    const questionPicks = picks.filter((item) => item.marketId === pick.marketId);
    const breakdown = computeParimutuelBreakdown(market.winner, questionPicks, pick.marketId);
    if (!breakdown || breakdown.isVoid)
      continue;

    const winAmount = roundScore(breakdown.scores[pick.playerId] ?? 0);
    if (winAmount <= 0)
      continue;

    records.push({
      playerId: pick.playerId,
      playerName: playerById.get(pick.playerId)?.name ?? pick.playerId,
      marketId: pick.marketId,
      team: pick.team,
      winAmount,
      isDouble: true
    });
  }

  const topRows = topTierByScore(records, (row) => row.winAmount, 1).sort(
    (a, b) =>
      b.winAmount - a.winAmount ||
      a.playerName.localeCompare(b.playerName, "zh-CN")
  );

  return { topRows };
}

export interface MaxSingleMatchWinRow {
  playerId: string;
  playerName: string;
  marketId: string;
  team: string;
  winAmount: number;
  isDouble: boolean;
}

export interface MaxSingleMatchWinStats {
  topRows: MaxSingleMatchWinRow[];
}

/**
 * 1/16 决赛：全员各场作答中，单场实际猜对收益的最高记录（含 Double 双倍计分位）。
 * 仅统计已公布赛果且该玩家猜对的场次。
 */
export function computeMaxSingleMatchWinStats(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): MaxSingleMatchWinStats {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const records: MaxSingleMatchWinRow[] = [];

  for (const pick of picks) {
    const market = marketById.get(pick.marketId);
    if (!market || market.page !== 1)
      continue;
    if (market.winner === null || pick.team !== market.winner)
      continue;

    const questionPicks = picks.filter((item) => item.marketId === pick.marketId);
    const breakdown = computeParimutuelBreakdown(market.winner, questionPicks, pick.marketId);
    if (!breakdown || breakdown.isVoid)
      continue;

    const winAmount = roundScore(breakdown.scores[pick.playerId] ?? 0);
    if (winAmount <= 0)
      continue;

    records.push({
      playerId: pick.playerId,
      playerName: playerById.get(pick.playerId)?.name ?? pick.playerId,
      marketId: pick.marketId,
      team: pick.team,
      winAmount,
      isDouble: pick.stake === DOUBLE_STAKE
    });
  }

  const topRows = topTierByScore(records, (row) => row.winAmount, 1).sort(
    (a, b) =>
      b.winAmount - a.winAmount ||
      a.playerName.localeCompare(b.playerName, "zh-CN")
  );

  return { topRows };
}

export interface Page1MarketPickBalanceRow {
  marketId: string;
  teamA: string;
  teamB: string;
  hotTeam: string;
  coldTeam: string;
  hotSlots: number;
  coldSlots: number;
  gap: number;
  totalSlots: number;
  stakePerSlot: number;
  adjustment: number;
}

export interface ColdSidePickerRow {
  playerId: string;
  playerName: string;
  isDouble: boolean;
}

export function coldSidePickersForMarket(
  marketId: string,
  coldTeam: string,
  players: Player[],
  picks: Pick[]
): ColdSidePickerRow[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  return picks
    .filter((pick) => pick.marketId === marketId && pick.team === coldTeam)
    .map((pick) => ({
      playerId: pick.playerId,
      playerName: playerById.get(pick.playerId)?.name ?? pick.playerId,
      isDouble: pick.stake === DOUBLE_STAKE
    }))
    .sort(
      (a, b) =>
        a.playerName.localeCompare(b.playerName, "zh-CN") ||
        a.playerId.localeCompare(b.playerId)
    );
}

export interface Page1MarketPickBalanceStats {
  rows: Page1MarketPickBalanceRow[];
  mostLopsidedRows: Page1MarketPickBalanceRow[];
  mostBalancedRows: Page1MarketPickBalanceRow[];
}

/** 取计分后 N 档（含并列）：按 distinct 分值取前三档，返回该档及以下所有项。 */
export function bottomTierByScore<T>(
  rows: T[],
  scoreOf: (row: T) => number,
  tierCount = 3
): T[] {
  const distinct = [...new Set(rows.map(scoreOf))].sort((a, b) => a - b);
  if (distinct.length === 0)
    return [];

  const cutoff = distinct[Math.min(tierCount, distinct.length) - 1]!;
  return rows.filter((row) => scoreOf(row) <= cutoff);
}

/**
 * 1/16 决赛：各场热门与冷门计分位差距（Double 计 2）。
 * 最悬殊 = 热门 − 冷门最大；最平均 = 该差最小。
 */
export function computePage1MarketPickBalanceStats(
  markets: Market[],
  picks: Pick[]
): Page1MarketPickBalanceStats {
  const rows: Page1MarketPickBalanceRow[] = [];

  for (const market of markets.filter((item) => item.page === 1)) {
    const slotCounts = teamSlotCountsForMarket(market, picks);
    const totalSlots = [...slotCounts.values()].reduce((sum, count) => sum + count, 0);
    if (totalSlots === 0)
      continue;

    const candidates = market.candidates ?? [];
    if (candidates.length < 2)
      continue;

    let hotTeam: string | null = null;
    let coldTeam: string | null = null;
    let hotSlots = 0;
    let coldSlots = Number.POSITIVE_INFINITY;

    for (const team of candidates) {
      const count = slotCounts.get(team) ?? 0;
      if (count > hotSlots) {
        hotSlots = count;
        hotTeam = team;
      }
    }

    for (const team of candidates) {
      const count = slotCounts.get(team) ?? 0;
      if (count < coldSlots) {
        coldSlots = count;
        coldTeam = team;
      }
    }

    if (!hotTeam || !coldTeam)
      continue;

    const teamA = candidates[0]!;
    const teamB = candidates[1]!;
    const groupPicks = picks.filter((pick) => pick.marketId === market.id);
    const stakeBreakdown = computeProjectedStakeBreakdown(groupPicks, market.id);

    rows.push({
      marketId: market.id,
      teamA,
      teamB,
      hotTeam,
      coldTeam,
      hotSlots,
      coldSlots,
      gap: hotSlots - coldSlots,
      totalSlots,
      stakePerSlot: stakeBreakdown?.stakePerSlot ?? 0,
      adjustment: stakeBreakdown?.adjustment ?? 0
    });
  }

  rows.sort((a, b) => b.gap - a.gap || a.marketId.localeCompare(b.marketId));

  return {
    rows,
    mostLopsidedRows: topTierByScore(rows, (row) => row.gap, 1),
    mostBalancedRows: bottomTierByScore(rows, (row) => row.gap, 1)
  };
}

export interface MaxColdWinRow {
  marketId: string;
  winnerTeam: string;
  hotTeam: string;
  coldTeam: string;
  hotSlots: number;
  coldSlots: number;
  gap: number;
}

export interface MaxColdWinStats {
  topRows: MaxColdWinRow[];
}

/** 1/16 决赛：少数派实际获胜的场次，按热门−冷门差距取最大（含并列）。 */
export function computeMaxColdWinStats(
  markets: Market[],
  picks: Pick[]
): MaxColdWinStats {
  const balance = computePage1MarketPickBalanceStats(markets, picks);
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const upsets: MaxColdWinRow[] = [];

  for (const row of balance.rows) {
    const market = marketById.get(row.marketId);
    if (!market?.winner || row.gap <= 0)
      continue;
    if (market.winner !== row.coldTeam)
      continue;

    upsets.push({
      marketId: row.marketId,
      winnerTeam: market.winner,
      hotTeam: row.hotTeam,
      coldTeam: row.coldTeam,
      hotSlots: row.hotSlots,
      coldSlots: row.coldSlots,
      gap: row.gap
    });
  }

  const topRows = topTierByScore(upsets, (row) => row.gap, 1).sort(
    (a, b) =>
      b.gap - a.gap ||
      a.marketId.localeCompare(b.marketId, undefined, { numeric: true })
  );

  return { topRows };
}

export interface Page1PickDistributionRow {
  marketId: string;
  hotTeam: string;
  coldTeam: string;
  hotSlots: number;
  coldSlots: number;
  totalSlots: number;
  winner: string | null;
}

/** 1/16 决赛 16 场：各选项计分位分布（Double 计 2）；左热门、右冷门。 */
export function computePage1PickDistribution(
  markets: Market[],
  picks: Pick[]
): Page1PickDistributionRow[] {
  const rows: Page1PickDistributionRow[] = [];

  for (const market of markets.filter((item) => item.page === 1)) {
    const candidates = market.candidates ?? [];
    if (candidates.length < 2)
      continue;

    const slotCounts = teamSlotCountsForMarket(market, picks);
    let hotTeam: string | null = null;
    let coldTeam: string | null = null;
    let hotSlots = 0;
    let coldSlots = Number.POSITIVE_INFINITY;

    for (const team of candidates) {
      const count = slotCounts.get(team) ?? 0;
      if (count > hotSlots) {
        hotSlots = count;
        hotTeam = team;
      }
    }

    for (const team of candidates) {
      const count = slotCounts.get(team) ?? 0;
      if (count < coldSlots) {
        coldSlots = count;
        coldTeam = team;
      }
    }

    if (!hotTeam || !coldTeam)
      continue;

    const totalSlots = hotSlots + coldSlots;
    if (totalSlots === 0)
      continue;

    rows.push({
      marketId: market.id,
      hotTeam,
      coldTeam,
      hotSlots,
      coldSlots,
      totalSlots,
      winner: market.winner
    });
  }

  return rows.sort(
    (a, b) =>
      a.marketId.localeCompare(b.marketId, undefined, { numeric: true })
  );
}
