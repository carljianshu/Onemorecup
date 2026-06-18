import { roundScore } from "@/lib/score-format";
import { DOUBLE_STAKE, PARIMUTUEL_STAKE_PER_SLOT, STAKE_PER_PICK } from "@/data/markets";
import { computeMissingItemCount, computePickStats } from "@/lib/pick-stats";
import {
  countPlayerGuessedItems,
  isMainQuestionComplete,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import type { LeaderboardEntry, Market, Pick, Player, SubQuestion } from "@/types";

export { roundScore } from "@/lib/score-format";

const SLOT_CORRECT = 10;
const SLOT_WRONG = 0;

function binarySlotsForPick(pick: Pick, winner: string): number[] {
  const value = pick.team === winner ? SLOT_CORRECT : SLOT_WRONG;
  const count = pick.stake === DOUBLE_STAKE ? 2 : 1;
  return Array.from({ length: count }, () => value);
}

/** 所有参与者都猜对，或都猜错（含无人猜对正确选项）。 */
function isAllCorrectOrAllWrong(winner: string, groupPicks: Pick[]): boolean {
  if (groupPicks.length === 0) return false;
  const allCorrect = groupPicks.every((pick) => pick.team === winner);
  const allWrong = groupPicks.every((pick) => pick.team !== winner);
  return allCorrect || allWrong;
}

function zeroScoresForParticipants(groupPicks: Pick[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const pick of groupPicks) {
    scores[pick.playerId] = 0;
  }
  return scores;
}

function slotStd(winner: string, groupPicks: Pick[]): number {
  const slots: number[] = [];
  for (const pick of groupPicks) {
    for (const value of binarySlotsForPick(pick, winner)) {
      slots.push(value);
    }
  }
  if (slots.length === 0) return 0;
  const mean = slots.reduce((sum, value) => sum + value, 0) / slots.length;
  const variance =
    slots.reduce((sum, value) => sum + (value - mean) ** 2, 0) / slots.length;
  return Math.sqrt(variance);
}

interface ParimutuelSettlement {
  scores: Record<string, number>;
  gainPerWinningSlot: number;
  stakePerSlot: number;
  std: number;
  isVoid: boolean;
}

export interface ParimutuelBreakdown {
  std: number;
  stakePerSlot: number;
  doubleStake: number;
  gainPerWinningSlot: number;
  scores: Record<string, number>;
  isVoid: boolean;
}

/** 猜对/猜错为 10/0；本金 100÷σ（Double 两计分位共 200÷σ）；赢家平分输家本金。 */
function settleParimutuel(winner: string, groupPicks: Pick[]): ParimutuelSettlement | null {
  if (groupPicks.length === 0) return null;

  const std = slotStd(winner, groupPicks);

  if (isAllCorrectOrAllWrong(winner, groupPicks)) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: 0,
      std,
      isVoid: true
    };
  }

  if (std === 0) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: 0,
      std: 0,
      isVoid: true
    };
  }

  const stakePerSlot = PARIMUTUEL_STAKE_PER_SLOT / std;
  let totalLoss = 0;
  let winningSlotCount = 0;

  for (const pick of groupPicks) {
    for (const value of binarySlotsForPick(pick, winner)) {
      if (value === SLOT_CORRECT) {
        winningSlotCount += 1;
      } else {
        totalLoss += stakePerSlot;
      }
    }
  }

  if (winningSlotCount === 0 || totalLoss === 0) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: roundScore(stakePerSlot),
      std,
      isVoid: true
    };
  }

  const gainPerWinningSlot = totalLoss / winningSlotCount;
  const scores: Record<string, number> = {};
  for (const pick of groupPicks) {
    scores[pick.playerId] = 0;
  }

  for (const pick of groupPicks) {
    for (const value of binarySlotsForPick(pick, winner)) {
      if (value === SLOT_CORRECT) {
        scores[pick.playerId] = roundScore((scores[pick.playerId] ?? 0) + gainPerWinningSlot);
      } else {
        scores[pick.playerId] = roundScore((scores[pick.playerId] ?? 0) - stakePerSlot);
      }
    }
  }

  return {
    scores,
    gainPerWinningSlot: roundScore(gainPerWinningSlot),
    stakePerSlot: roundScore(stakePerSlot),
    std: roundScore(std),
    isVoid: false
  };
}

export function computeParimutuelBreakdown(
  winner: string,
  groupPicks: Pick[]
): ParimutuelBreakdown | null {
  const result = settleParimutuel(winner, groupPicks);
  if (!result) return null;
  return {
    std: result.std,
    stakePerSlot: result.stakePerSlot,
    doubleStake: roundScore(result.stakePerSlot * 2),
    gainPerWinningSlot: result.gainPerWinningSlot,
    scores: result.scores,
    isVoid: result.isVoid
  };
}

export interface OptionPayoutHints {
  gainPerSlot: number;
  lossPerSlot: number;
  isVoid: boolean;
}

function slotCountForTeam(team: string, groupPicks: Pick[]): number {
  return groupPicks
    .filter((pick) => pick.team === team)
    .reduce((sum, pick) => sum + (pick.stake === DOUBLE_STAKE ? 2 : 1), 0);
}

/** 选该选项但猜错时，按最可能胜出的其他选项结算的本金扣除。 */
function lossStakeIfWrong(option: string, candidates: string[], groupPicks: Pick[]): number {
  const others = candidates.filter((candidate) => candidate !== option);
  if (others.length === 0) return 0;

  let rival = others[0]!;
  let rivalSlots = slotCountForTeam(rival, groupPicks);

  for (const other of others.slice(1)) {
    const slots = slotCountForTeam(other, groupPicks);
    if (slots > rivalSlots) {
      rival = other;
      rivalSlots = slots;
    }
  }

  return computeParimutuelBreakdown(rival, groupPicks)?.stakePerSlot ?? 0;
}

/** 每个竞猜选项旁展示：猜对每计分位得分、猜错每计分位扣分。 */
export function computeOptionPayoutHints(
  option: string,
  candidates: string[],
  groupPicks: Pick[]
): OptionPayoutHints {
  if (groupPicks.length === 0) {
    return { gainPerSlot: 0, lossPerSlot: 0, isVoid: true };
  }

  const correct = computeParimutuelBreakdown(option, groupPicks);
  if (!correct || correct.isVoid) {
    return { gainPerSlot: 0, lossPerSlot: 0, isVoid: true };
  }

  return {
    gainPerSlot: correct.gainPerWinningSlot,
    lossPerSlot: roundScore(lossStakeIfWrong(option, candidates, groupPicks)),
    isVoid: false
  };
}

/** 假设该选项猜对时，单个计分位（普通下注）可赢得的奖金。 */
export function singleCorrectSlotBonus(winner: string, groupPicks: Pick[]): number {
  return settleParimutuel(winner, groupPicks)?.gainPerWinningSlot ?? 0;
}

export function settlePickGroup(winner: string, groupPicks: Pick[]): Record<string, number> {
  return settleParimutuel(winner, groupPicks)?.scores ?? {};
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
