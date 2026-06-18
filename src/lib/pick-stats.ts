import { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_TOTAL_PICKS } from "@/data/markets";
import type { PageSaveError } from "@/i18n/validation";
import {
  page1CompletedCount,
  page2CompletedCount,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import type { Market, Pick, PickStats, PlayerPickInput, PlayPage } from "@/types";

export function computePickStats(playerPicks: Pick[], markets: Market[]): PickStats {
  const answers = playerAnswersFromPicks(playerPicks);
  const page1Count = page1CompletedCount(markets, answers);
  const page2Count = page2CompletedCount(markets, answers);
  return { page1Count, page2Count, totalCount: page1Count + page2Count };
}

export function countSelections(
  selections: Record<string, string | null>,
  markets: Market[]
): PickStats {
  const page1Count = page1CompletedCount(markets, selections);
  const page2Count = page2CompletedCount(markets, selections);
  return { page1Count, page2Count, totalCount: page1Count + page2Count };
}

export function pickStatsFromPickInputs(
  pickInputs: PlayerPickInput[],
  markets: Market[]
): PickStats {
  const answers: Record<string, string | null> = {};
  for (const input of pickInputs) {
    answers[input.marketId] = input.team;
  }
  return countSelections(answers, markets);
}

/** 保存当页前的题量下限校验；通过返回 null。第二页未达建议题量仍可保存。 */
export function validatePageSave(
  page: PlayPage,
  mergedPickInputs: PlayerPickInput[],
  markets: Market[],
  pagePickInputs: PlayerPickInput[]
): PageSaveError | null {
  if (page === 1) {
    const stats = pickStatsFromPickInputs(pagePickInputs, markets);
    if (stats.page1Count < MIN_PAGE1_PICKS) {
      return { code: "page1_min", count: stats.page1Count, min: MIN_PAGE1_PICKS };
    }
    return null;
  }

  return null;
}

export const EMPTY_PICK_STATS: PickStats = {
  page1Count: 0,
  page2Count: 0,
  totalCount: 0
};

export function formatPickStats(stats: PickStats) {
  return `第一页 ${stats.page1Count}/${MIN_PAGE1_PICKS}，第二页 ${stats.page2Count}/${MIN_PAGE2_PICKS}，总计 ${stats.totalCount}/${MIN_TOTAL_PICKS}`;
}

/** max(max(16 − 总计, 4 − 第二页大题数), 0)；用于第二页锁定后的扣分题数。 */
export function computeMissingItemCount(stats: PickStats): number {
  return Math.max(
    Math.max(MIN_TOTAL_PICKS - stats.totalCount, MIN_PAGE2_PICKS - stats.page2Count),
    0
  );
}

export function describePickShortfall(stats: PickStats) {
  const page2Short = Math.max(0, MIN_PAGE2_PICKS - stats.page2Count);
  const totalShort = Math.max(0, MIN_TOTAL_PICKS - stats.totalCount);
  const penaltyItems = computeMissingItemCount(stats);
  return {
    page2Short,
    totalShort,
    penaltyItems,
    hasShortfall: penaltyItems > 0
  };
}
