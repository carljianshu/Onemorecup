import { roundScore } from "@/lib/score-format";
import { DOUBLE_STAKE, STAKE_PER_PICK } from "@/data/markets";
import { computeMissingItemCount, computePickStats } from "@/lib/pick-stats";
import {
  countPlayerGuessedItems,
  isMainQuestionComplete,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import type { LeaderboardEntry, Market, Pick, Player, SubQuestion } from "@/types";

export { roundScore } from "@/lib/score-format";

function binarySlotsForPick(pick: Pick, winner: string): number[] {
  const value = pick.team === winner ? 1 : 0;
  const count = pick.stake === DOUBLE_STAKE ? 2 : 1;
  return Array.from({ length: count }, () => value);
}

function binarySlotStats(winner: string, groupPicks: Pick[]) {
  const slots: number[] = [];
  for (const pick of groupPicks) {
    for (const value of binarySlotsForPick(pick, winner)) {
      slots.push(value);
    }
  }
  if (slots.length === 0) {
    return { mean: 0, std: 0 };
  }
  const mean = slots.reduce((sum, value) => sum + value, 0) / slots.length;
  const variance =
    slots.reduce((sum, value) => sum + (value - mean) ** 2, 0) / slots.length;
  return { mean, std: Math.sqrt(variance) };
}

/** 假设该选项猜对时，单个「1」计分位（普通下注）的标准化得分 ×10。 */
export function singleCorrectSlotBonus(winner: string, groupPicks: Pick[]): number {
  if (groupPicks.length === 0) return 0;
  const { mean, std } = binarySlotStats(winner, groupPicks);
  if (std === 0) return 0;
  return roundScore(((1 - mean) / std) * 10);
}

/** 单场：0/1 序列标准化后 ×10；Double 为 2 个 0 或 2 个 1。标准差为 0 时该场所有人得 0。 */
export function settlePickGroup(winner: string, groupPicks: Pick[]): Record<string, number> {
  const scores: Record<string, number> = {};
  if (groupPicks.length === 0) return scores;

  const { mean, std } = binarySlotStats(winner, groupPicks);

  for (const pick of groupPicks) {
    scores[pick.playerId] = 0;
  }

  if (std === 0) return scores;

  for (const pick of groupPicks) {
    for (const value of binarySlotsForPick(pick, winner)) {
      const z = roundScore(((value - mean) / std) * 10);
      scores[pick.playerId] = roundScore((scores[pick.playerId] ?? 0) + z);
    }
  }

  for (const pick of groupPicks) {
    scores[pick.playerId] = roundScore(scores[pick.playerId] ?? 0);
  }

  return scores;
}

export function settleSubQuestion(sub: SubQuestion, subPicks: Pick[]) {
  if (!sub.winner) return {};
  return settlePickGroup(sub.winner, subPicks);
}

export function settleMarket(market: Market, marketPicks: Pick[]) {
  if (!market.winner) return {};
  return settlePickGroup(market.winner, marketPicks);
}

export function computePlayerScores(
  players: Player[],
  markets: Market[],
  picks: Pick[]
): Map<string, { totalScore: number; settledCount: number; marketScores: Record<string, number> }> {
  const result = new Map<string, { totalScore: number; settledCount: number; marketScores: Record<string, number> }>();

  for (const player of players) {
    result.set(player.id, { totalScore: 0, settledCount: 0, marketScores: {} });
  }

  for (const market of markets) {
    if (market.page === 1) {
      if (!market.winner) continue;
      const marketPicks = picks.filter((p) => p.marketId === market.id);
      const settled = settlePickGroup(market.winner, marketPicks);

      for (const player of players) {
        const score = settled[player.id];
        if (score === undefined) continue;
        const entry = result.get(player.id)!;
        entry.marketScores[market.id] = roundScore(score);
        entry.totalScore = roundScore(entry.totalScore + score);
        entry.settledCount += 1;
      }
      continue;
    }

    for (const sub of market.subQuestions ?? []) {
      if (sub.deleted || !sub.winner) continue;

      const subPicks = picks.filter(
        (p) =>
          p.marketId === sub.id &&
          isMainQuestionComplete(
            market,
            playerAnswersFromPicks(picks.filter((pick) => pick.playerId === p.playerId))
          )
      );
      const settled = settlePickGroup(sub.winner, subPicks);

      for (const player of players) {
        const score = settled[player.id];
        if (score === undefined) continue;
        const entry = result.get(player.id)!;
        entry.marketScores[sub.id] = roundScore(score);
        entry.totalScore = roundScore(entry.totalScore + score);
        entry.settledCount += 1;
      }
    }
  }

  return result;
}

export function buildLeaderboard(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  page2Locked = false
): LeaderboardEntry[] {
  const scores = computePlayerScores(players, markets, picks);

  const entries = players.map((player) => {
    const computed = scores.get(player.id) ?? { totalScore: 0, settledCount: 0, marketScores: {} };
    const pickStats =
      player.pickStats ??
      computePickStats(
        picks.filter((pick) => pick.playerId === player.id),
        markets
      );
    let totalScore = roundScore(computed.totalScore);
    if (page2Locked) {
      const missing = computeMissingItemCount(pickStats);
      if (missing > 0) {
        totalScore = roundScore(totalScore - missing * STAKE_PER_PICK);
      }
    }
    const marketScores = Object.fromEntries(
      Object.entries(computed.marketScores).map(([id, score]) => [id, roundScore(score)])
    );
    return {
      playerId: player.id,
      name: player.name,
      totalScore,
      settledCount: computed.settledCount,
      guessedCount: countPlayerGuessedItems(player.id, picks, markets),
      pickStats,
      marketScores,
      createdAt: player.createdAt
    };
  });

  entries.sort((a, b) => b.totalScore - a.totalScore || a.createdAt.localeCompare(b.createdAt));

  let lastScore: number | null = null;
  let lastRank = 0;

  return entries.map((entry, i) => {
    const rank = entry.totalScore === lastScore ? lastRank : i + 1;
    lastScore = entry.totalScore;
    lastRank = rank;
    return {
      rank,
      playerId: entry.playerId,
      name: entry.name,
      totalScore: entry.totalScore,
      settledCount: entry.settledCount,
      guessedCount: entry.guessedCount,
      pickStats: entry.pickStats,
      marketScores: entry.marketScores
    };
  });
}

export function settledMarketCount(markets: Market[]) {
  let count = 0;
  for (const market of markets) {
    if (market.page === 1) {
      if (market.winner) count += 1;
      continue;
    }
    count += (market.subQuestions ?? []).filter((s) => !s.deleted && s.winner).length;
  }
  return count;
}
