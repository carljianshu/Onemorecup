import { DOUBLE_STAKE, STAKE_PER_PICK } from "@/data/markets";
import { computeMissingItemCount, computePickStats } from "@/lib/pick-stats";
import {
  countPlayerGuessedItems,
  isMainQuestionComplete,
  pickPersonWeightFromStake,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import type { LeaderboardEntry, Market, Pick, Player, SubQuestion } from "@/types";

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function settlePickGroup(winner: string, groupPicks: Pick[]): Record<string, number> {
  const scores: Record<string, number> = {};
  if (groupPicks.length === 0) return scores;

  const correctPool = groupPicks.filter((p) => p.team === winner);
  const wrongPool = groupPicks.filter((p) => p.team !== winner);

  const allCorrect = wrongPool.length === 0;
  const allWrong = correctPool.length === 0;

  if (allCorrect || allWrong) {
    for (const pick of groupPicks) {
      scores[pick.playerId] = 0;
    }
    return scores;
  }

  const totalPool = groupPicks.reduce((sum, pick) => sum + pick.stake, 0);
  const weightedCorrectCount = correctPool.reduce(
    (sum, pick) => sum + pickPersonWeightFromStake(pick.stake),
    0
  );
  const baseGain = totalPool / weightedCorrectCount - STAKE_PER_PICK;

  for (const pick of wrongPool) {
    scores[pick.playerId] = -pick.stake;
  }
  for (const pick of correctPool) {
    const multiplier = pick.stake === DOUBLE_STAKE ? 2 : 1;
    scores[pick.playerId] = roundScore(baseGain * multiplier);
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
        entry.marketScores[market.id] = score;
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
        entry.marketScores[sub.id] = score;
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
    let totalScore = computed.totalScore;
    if (page2Locked) {
      const missing = computeMissingItemCount(pickStats);
      if (missing > 0) {
        totalScore = roundScore(totalScore - missing * STAKE_PER_PICK);
      }
    }
    return {
      playerId: player.id,
      name: player.name,
      totalScore,
      settledCount: computed.settledCount,
      guessedCount: countPlayerGuessedItems(player.id, picks, markets),
      pickStats,
      marketScores: computed.marketScores,
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
