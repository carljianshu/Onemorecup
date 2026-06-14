import { MIN_PAGE1_PICKS, MIN_PAGE2_PICKS, MIN_TOTAL_PICKS } from "@/data/markets";
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

/** 保存当页前的题量下限校验；通过返回 null */
export function validatePageSave(
  page: PlayPage,
  mergedPickInputs: PlayerPickInput[],
  markets: Market[],
  pagePickInputs: PlayerPickInput[]
): string | null {
  if (page === 1) {
    const stats = pickStatsFromPickInputs(pagePickInputs, markets);
    if (stats.page1Count < MIN_PAGE1_PICKS) {
      return `第一页至少需答满 ${MIN_PAGE1_PICKS} 题才能保存（当前 ${stats.page1Count} 题）。`;
    }
    return null;
  }

  const stats = pickStatsFromPickInputs(mergedPickInputs, markets);
  if (stats.page2Count < MIN_PAGE2_PICKS) {
    return `第二页至少需答完 ${MIN_PAGE2_PICKS} 道大题才能保存（当前 ${stats.page2Count} 道）。`;
  }
  if (stats.totalCount < MIN_TOTAL_PICKS) {
    return `总计至少需答满 ${MIN_TOTAL_PICKS} 题才能保存第二页（当前 ${stats.totalCount} 题）。`;
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

/** max(max(16 − 总计, 4 − 第二页大题数), 0) */
export function computeMissingItemCount(stats: PickStats): number {
  return Math.max(
    Math.max(MIN_TOTAL_PICKS - stats.totalCount, MIN_PAGE2_PICKS - stats.page2Count),
    0
  );
}
