import { roundScore } from "@/lib/score-format";
import { DOUBLE_STAKE, STAKE_PER_PICK } from "@/data/markets";
import { computeMissingItemCount, computePickStats } from "@/lib/pick-stats";
import { countPlayerGuessedItems } from "@/lib/market-helpers";
import type { LeaderboardEntry, Market, Pick, Player } from "@/types";

export { roundScore } from "@/lib/score-format";

interface ScoringSlot {
  playerId: string;
  correct: boolean;
}

function slotsForGroup(winner: string, groupPicks: Pick[]): ScoringSlot[] {
  const slots: ScoringSlot[] = [];
  for (const pick of groupPicks) {
    const correct = pick.team === winner;
    const count = pick.stake === DOUBLE_STAKE ? 2 : 1;
    for (let i = 0; i < count; i++) {
      slots.push({ playerId: pick.playerId, correct });
    }
  }
  return slots;
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

function countWinningAndLosingSlots(slots: ScoringSlot[]): {
  winningSlotCount: number;
  losingSlotCount: number;
} {
  let winningSlotCount = 0;
  let losingSlotCount = 0;
  for (const slot of slots) {
    if (slot.correct) winningSlotCount += 1;
    else losingSlotCount += 1;
  }
  return { winningSlotCount, losingSlotCount };
}

/** 按给定对错计分位数量，构造固定本金 parimutuel 的计分位得分序列。 */
function buildFixedStakeSlotScores(
  winningSlotCount: number,
  losingSlotCount: number,
  stakePerSlot: number
): number[] {
  if (winningSlotCount === 0 || losingSlotCount === 0) return [];

  const gainPerWinningSlot = (losingSlotCount * stakePerSlot) / winningSlotCount;
  const scores: number[] = [];
  for (let i = 0; i < winningSlotCount; i++) scores.push(gainPerWinningSlot);
  for (let i = 0; i < losingSlotCount; i++) scores.push(-stakePerSlot);
  return scores;
}

/**
 * 第一遍探测用得分序列：猜对计分位多于猜错时，对调两者数量再构造序列（如 2 对 1 错 → 按 1 对 2 错得 [20,-10,-10]）。
 */
function slotScoresForAdjustment(
  slots: ScoringSlot[],
  pass1SlotScores: number[],
  stakePerSlot: number
): number[] {
  const { winningSlotCount, losingSlotCount } = countWinningAndLosingSlots(slots);
  if (winningSlotCount > losingSlotCount) {
    return buildFixedStakeSlotScores(losingSlotCount, winningSlotCount, stakePerSlot);
  }
  return pass1SlotScores;
}

function populationStd(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

interface FixedStakeSettlement {
  scores: Record<string, number>;
  slotScores: number[];
  gainPerWinningSlot: number;
  stakePerSlot: number;
}

/** 固定本金 parimutuel：猜错扣本金，猜对计分位平分输家本金。 */
function settleAtFixedStake(
  winner: string,
  groupPicks: Pick[],
  stakePerSlot: number
): FixedStakeSettlement | null {
  const slots = slotsForGroup(winner, groupPicks);
  if (slots.length === 0) return null;

  let totalLoss = 0;
  let winningSlotCount = 0;
  for (const slot of slots) {
    if (slot.correct) {
      winningSlotCount += 1;
    } else {
      totalLoss += stakePerSlot;
    }
  }

  if (winningSlotCount === 0 || totalLoss === 0) return null;

  const gainPerWinningSlot = totalLoss / winningSlotCount;
  const slotScores = slots.map((slot) =>
    slot.correct ? gainPerWinningSlot : -stakePerSlot
  );

  const scores: Record<string, number> = {};
  for (const pick of groupPicks) {
    scores[pick.playerId] = 0;
  }
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    scores[slot.playerId] = roundScore((scores[slot.playerId] ?? 0) + slotScores[i]!);
  }

  return {
    scores,
    slotScores,
    gainPerWinningSlot: roundScore(gainPerWinningSlot),
    stakePerSlot: roundScore(stakePerSlot)
  };
}

interface ParimutuelSettlement {
  scores: Record<string, number>;
  gainPerWinningSlot: number;
  stakePerSlot: number;
  scoreStd: number;
  adjustment: number;
  isVoid: boolean;
}

export interface ParimutuelBreakdown {
  std: number;
  stakePerSlot: number;
  doubleStake: number;
  gainPerWinningSlot: number;
  scores: Record<string, number>;
  isVoid: boolean;
  adjustment: number;
}

/**
 * 两阶段对赌：先按 10 分本金结算得探测序列（猜对位多于猜错位时对调数量）→ σ ÷ 10 = 调整值 → 新本金 = 10 ÷ 调整值 → 再结算。
 * Double 视为两个计分位，得失在计分位层面累加。
 */
function settleParimutuel(winner: string, groupPicks: Pick[]): ParimutuelSettlement | null {
  if (groupPicks.length === 0) return null;

  if (isAllCorrectOrAllWrong(winner, groupPicks)) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: 0,
      scoreStd: 0,
      adjustment: 0,
      isVoid: true
    };
  }

  const pass1 = settleAtFixedStake(winner, groupPicks, STAKE_PER_PICK);
  if (!pass1) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: 0,
      scoreStd: 0,
      adjustment: 0,
      isVoid: true
    };
  }

  const slots = slotsForGroup(winner, groupPicks);
  const adjustmentSlotScores = slotScoresForAdjustment(
    slots,
    pass1.slotScores,
    STAKE_PER_PICK
  );
  const scoreStd = populationStd(adjustmentSlotScores);
  if (scoreStd === 0) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: 0,
      scoreStd: 0,
      adjustment: 0,
      isVoid: true
    };
  }

  const adjustment = scoreStd / STAKE_PER_PICK;
  const adjustedStake = STAKE_PER_PICK / adjustment;
  const pass2 = settleAtFixedStake(winner, groupPicks, adjustedStake);
  if (!pass2) {
    return {
      scores: zeroScoresForParticipants(groupPicks),
      gainPerWinningSlot: 0,
      stakePerSlot: roundScore(adjustedStake),
      scoreStd: roundScore(scoreStd),
      adjustment: roundScore(adjustment),
      isVoid: true
    };
  }

  return {
    scores: pass2.scores,
    gainPerWinningSlot: pass2.gainPerWinningSlot,
    stakePerSlot: pass2.stakePerSlot,
    scoreStd: roundScore(scoreStd),
    adjustment: roundScore(adjustment),
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
    std: result.scoreStd,
    adjustment: result.adjustment,
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

/** 每个竞猜选项旁展示：猜对每计分位得分、猜错每计分位扣分（第二遍结算结果）。 */
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
  return markets.filter((market) => market.winner).length;
}
