import { DOUBLE_STAKE } from "@/data/markets";
import { allPickColumns, type PickColumn } from "@/lib/market-helpers";
import { translate, type Locale } from "@/i18n";
import { playerDisplayName } from "@/lib/player-display";
import {
  filterPicksForPage3MarketResultsDisplay,
  filterPicksForParimutuelPool,
  type ParimutuelPoolOptions
} from "@/lib/rank-lock";
import { formatScore, roundScore } from "@/lib/score-format";
import { computeParimutuelBreakdown, settlePickGroup, type AdjustmentSequenceSummary } from "@/lib/scoring";
import type { GameConfig, Market, Pick, Player, PlayPage } from "@/types";

export interface MarketResultPick {
  playerId: string;
  playerName: string;
  isDouble: boolean;
  ifCorrectPayout: number;
  actualPayout: number | null;
}

export interface MarketOptionResult {
  option: string;
  picks: MarketResultPick[];
  playerCount: number;
  doubleCount: number;
  stdDev: number;
  stakePerSlot: number;
  doubleStake: number;
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
  adjustment: number | null;
  adjustmentSequence: AdjustmentSequenceSummary | null;
  stakePerSlot: number | null;
  isVoid: boolean;
  actualScores: MarketResultPlayerScore[];
}

export { formatScore };

function candidatesForColumn(markets: Market[], col: PickColumn): string[] {
  return markets.find((m) => m.id === col.id)?.candidates ?? [];
}

function winnerForColumn(markets: Market[], col: PickColumn): string | null {
  return markets.find((m) => m.id === col.id)?.winner ?? null;
}

export function buildMarketResultSections(
  markets: Market[],
  picks: Pick[],
  players: Player[],
  publicMarketIds: Set<string>,
  locale: Locale = "zh",
  config?: GameConfig | null
): MarketResultSection[] {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const unknownPlayer = translate(locale, "common.unknownPlayer");
  const columns = allPickColumns(markets).filter((col) => publicMarketIds.has(col.id));

  return columns.map((col) => {
    const candidates = candidatesForColumn(markets, col);
    const winner = winnerForColumn(markets, col);
    const market = markets.find((item) => item.id === col.id);
    const poolOptions: ParimutuelPoolOptions = {
      config,
      market: market ? { id: market.id, page: market.page } : { id: col.id, page: col.page }
    };
    let questionPicks = picks.filter((pick) => pick.marketId === col.id);
    if (col.page === 3)
      questionPicks = filterPicksForPage3MarketResultsDisplay(questionPicks, config);
    const displayPicks = filterPicksForParimutuelPool(questionPicks, {
      ...poolOptions,
      viewerPlayerId: null
    });
    const slotCount = displayPicks.reduce(
      (sum, pick) => sum + (pick.stake === DOUBLE_STAKE ? 2 : 1),
      0
    );

    const actualBreakdown =
      winner !== null ? computeParimutuelBreakdown(winner, displayPicks, col.id, poolOptions) : null;

    const settledScores =
      winner !== null
        ? settlePickGroup(winner, questionPicks, col.id, poolOptions)
        : {};

    const actualScores: MarketResultPlayerScore[] = questionPicks
      .map((pick) => ({
        playerId: pick.playerId,
        playerName: playerDisplayName(playerById.get(pick.playerId), unknownPlayer),
        team: pick.team,
        isDouble: pick.stake === DOUBLE_STAKE,
        score: roundScore(settledScores[pick.playerId] ?? 0)
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName, "zh-CN"));

    const options: MarketOptionResult[] = candidates.map((option) => {
      const breakdown = computeParimutuelBreakdown(option, displayPicks, col.id, poolOptions);
      const hypotheticalScores = breakdown?.scores ?? {};

      const optionQuestionPicks = displayPicks.filter((pick) => pick.team === option);

      return {
        option,
        playerCount: optionQuestionPicks.length,
        doubleCount: optionQuestionPicks.filter((pick) => pick.stake === DOUBLE_STAKE).length,
        stdDev: breakdown?.std ?? 0,
        stakePerSlot: breakdown?.stakePerSlot ?? 0,
        doubleStake: breakdown?.doubleStake ?? 0,
        gainPerWinningSlot: breakdown?.gainPerWinningSlot ?? 0,
        isVoid: breakdown?.isVoid ?? true,
        picks: optionQuestionPicks
          .map((pick) => ({
            playerId: pick.playerId,
            playerName: playerDisplayName(playerById.get(pick.playerId), unknownPlayer),
            isDouble: pick.stake === DOUBLE_STAKE,
            ifCorrectPayout: roundScore(
              computeParimutuelBreakdown(option, questionPicks, col.id, {
                ...poolOptions,
                viewerPlayerId: pick.playerId
              })?.scores[pick.playerId] ?? hypotheticalScores[pick.playerId] ?? 0
            ),
            actualPayout:
              winner !== null && option === winner
                ? roundScore(settledScores[pick.playerId] ?? 0)
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
      totalPicks: displayPicks.length,
      slotCount,
      winner,
      settled: winner !== null,
      stdDev: actualBreakdown?.std ?? null,
      adjustment: actualBreakdown?.adjustment ?? null,
      adjustmentSequence: actualBreakdown?.adjustmentSequence ?? null,
      stakePerSlot: actualBreakdown?.stakePerSlot ?? null,
      isVoid: actualBreakdown?.isVoid ?? false,
      actualScores
    };
  });
}
