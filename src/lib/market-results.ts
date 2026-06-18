import { DOUBLE_STAKE } from "@/data/markets";
import { activeSubQuestions, allPickColumns, type PickColumn } from "@/lib/market-helpers";
import { formatScore, roundScore } from "@/lib/score-format";
import { computeParimutuelBreakdown } from "@/lib/scoring";
import type { Market, Pick, Player, PlayPage } from "@/types";

export interface MarketResultPick {
  playerId: string;
  playerName: string;
  isDouble: boolean;
  /** 假设该选项猜对时，该玩家本题净得分 */
  ifCorrectPayout: number;
  /** 已录入赛果时的实际净得分 */
  actualPayout: number | null;
}

export interface MarketOptionResult {
  option: string;
  picks: MarketResultPick[];
  stdDev: number;
  stakePerSlot: number;
  doubleStake: number;
  /** 假设该选项猜对时，每个猜对计分位可赢得的奖金 */
  gainPerWinningSlot: number;
  isVoid: boolean;
  isWinner: boolean;
}

export interface MarketResultPlayerScore {
  playerId: string;
  playerName: string;
  team: string;
  isDouble: boolean;
  score: number;
}

export interface MarketResultSection {
  id: string;
  page: PlayPage;
  title: string;
  options: MarketOptionResult[];
  totalPicks: number;
  slotCount: number;
  winner: string | null;
  settled: boolean;
  stdDev: number | null;
  stakePerSlot: number | null;
  isVoid: boolean;
  actualScores: MarketResultPlayerScore[];
}

export { formatScore };

function candidatesForColumn(markets: Market[], col: PickColumn): string[] {
  if (col.page === 1) {
    const market = markets.find((m) => m.id === col.id);
    return market?.candidates ?? [];
  }
  for (const market of markets.filter((m) => m.page === 2)) {
    const sub = activeSubQuestions(market).find((s) => s.id === col.id);
    if (sub) return [...sub.candidates];
  }
  return [];
}

function winnerForColumn(markets: Market[], col: PickColumn): string | null {
  if (col.page === 1) {
    return markets.find((m) => m.id === col.id)?.winner ?? null;
  }
  for (const market of markets.filter((m) => m.page === 2)) {
    const sub = market.subQuestions?.find((s) => s.id === col.id);
    if (sub) return sub.winner;
  }
  return null;
}

export function buildMarketResultSections(
  markets: Market[],
  picks: Pick[],
  players: Player[],
  visiblePages: PlayPage[]
): MarketResultSection[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const columns = allPickColumns(markets).filter((col) => visiblePages.includes(col.page));

  return columns.map((col) => {
    const candidates = candidatesForColumn(markets, col);
    const winner = winnerForColumn(markets, col);
    const questionPicks = picks.filter((pick) => pick.marketId === col.id);
    const slotCount = questionPicks.reduce(
      (sum, pick) => sum + (pick.stake === DOUBLE_STAKE ? 2 : 1),
      0
    );

    const actualBreakdown =
      winner !== null ? computeParimutuelBreakdown(winner, questionPicks) : null;

    const actualScores: MarketResultPlayerScore[] = questionPicks
      .map((pick) => ({
        playerId: pick.playerId,
        playerName: playerById.get(pick.playerId)?.name ?? "未知玩家",
        team: pick.team,
        isDouble: pick.stake === DOUBLE_STAKE,
        score: roundScore(actualBreakdown?.scores[pick.playerId] ?? 0)
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName, "zh-CN"));

    const options: MarketOptionResult[] = candidates.map((option) => {
      const breakdown = computeParimutuelBreakdown(option, questionPicks);
      const hypotheticalScores = breakdown?.scores ?? {};

      return {
        option,
        stdDev: breakdown?.std ?? 0,
        stakePerSlot: breakdown?.stakePerSlot ?? 0,
        doubleStake: breakdown?.doubleStake ?? 0,
        gainPerWinningSlot: breakdown?.gainPerWinningSlot ?? 0,
        isVoid: breakdown?.isVoid ?? true,
        picks: questionPicks
          .filter((pick) => pick.team === option)
          .map((pick) => ({
            playerId: pick.playerId,
            playerName: playerById.get(pick.playerId)?.name ?? "未知玩家",
            isDouble: pick.stake === DOUBLE_STAKE,
            ifCorrectPayout: roundScore(hypotheticalScores[pick.playerId] ?? 0),
            actualPayout:
              winner !== null && option === winner
                ? roundScore(actualBreakdown?.scores[pick.playerId] ?? 0)
                : null
          }))
          .sort((a, b) => a.playerName.localeCompare(b.playerName, "zh-CN")),
        isWinner: winner !== null && option === winner
      };
    });

    return {
      id: col.id,
      page: col.page,
      title: col.fullLabel,
      options,
      totalPicks: questionPicks.length,
      slotCount,
      winner,
      settled: winner !== null,
      stdDev: actualBreakdown?.std ?? null,
      stakePerSlot: actualBreakdown?.stakePerSlot ?? null,
      isVoid: actualBreakdown?.isVoid ?? false,
      actualScores
    };
  });
}
