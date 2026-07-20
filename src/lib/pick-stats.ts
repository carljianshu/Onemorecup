import {
  MIN_PAGE1_CACTUS_PICKS,
  MIN_PAGE1_MAPLE_PICKS,
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_PAGE3_PICKS,
  MIN_PAGE3_SEQUOIA_PICKS,
  MIN_TOTAL_PICKS
} from "@/data/markets";
import type { PageSaveError } from "@/i18n/validation";
import {
  page1CactusCompletedCount,
  page1CompletedCount,
  page1MapleCompletedCount,
  page2CompletedCount,
  page3CompletedCount,
  page3SequoiaCompletedCount,
  playerAnswersFromPicks
} from "@/lib/market-helpers";
import type { GameConfig, Market, Pick, PickStats, PlayerPickInput, PlayPage } from "@/types";

export function computePickStats(playerPicks: Pick[], markets: Market[]): PickStats {
  const answers = playerAnswersFromPicks(playerPicks);
  const page1Count = page1CompletedCount(markets, answers);
  const page2Count = page2CompletedCount(markets, answers);
  const page3Count = page3CompletedCount(markets, answers);
  return { page1Count, page2Count, page3Count, totalCount: page1Count + page2Count + page3Count };
}

export function countSelections(
  selections: Record<string, string | null>,
  markets: Market[]
): PickStats {
  const page1Count = page1CompletedCount(markets, selections);
  const page2Count = page2CompletedCount(markets, selections);
  const page3Count = page3CompletedCount(markets, selections);
  return { page1Count, page2Count, page3Count, totalCount: page1Count + page2Count + page3Count };
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

/** 保存当页前的题量下限校验；通过返回 null。 */
export function validatePageSave(
  page: PlayPage,
  mergedPickInputs: PlayerPickInput[],
  markets: Market[],
  pagePickInputs: PlayerPickInput[],
  _options?: { playerId?: string | null; config?: GameConfig | null }
): PageSaveError | null {
  if (page === 1) {
    const answers: Record<string, string | null> = {};
    for (const input of pagePickInputs) {
      answers[input.marketId] = input.team;
    }
    const cactusCount = page1CactusCompletedCount(markets, answers);
    if (cactusCount < MIN_PAGE1_CACTUS_PICKS) {
      return { code: "page1_cactus_min", count: cactusCount, min: MIN_PAGE1_CACTUS_PICKS };
    }
    const mapleCount = page1MapleCompletedCount(markets, answers);
    if (mapleCount < MIN_PAGE1_MAPLE_PICKS) {
      return { code: "page1_maple_min", count: mapleCount, min: MIN_PAGE1_MAPLE_PICKS };
    }
    const stats = pickStatsFromPickInputs(pagePickInputs, markets);
    if (stats.page1Count < MIN_PAGE1_PICKS) {
      return { code: "page1_min", count: stats.page1Count, min: MIN_PAGE1_PICKS };
    }
    return null;
  }

  if (page === 2) {
    const stats = pickStatsFromPickInputs(mergedPickInputs, markets);
    if (stats.page2Count < MIN_PAGE2_PICKS) {
      return { code: "page2_min", count: stats.page2Count, min: MIN_PAGE2_PICKS };
    }
    const phase12Count = stats.page1Count + stats.page2Count;
    if (phase12Count < MIN_TOTAL_PICKS) {
      return { code: "total_min", count: phase12Count, min: MIN_TOTAL_PICKS };
    }
    return null;
  }

  if (page === 3) {
    const answers: Record<string, string | null> = {};
    for (const input of pagePickInputs) {
      answers[input.marketId] = input.team;
    }
    const sequoiaCount = page3SequoiaCompletedCount(markets, answers);
    if (sequoiaCount < MIN_PAGE3_SEQUOIA_PICKS) {
      return { code: "page3_sequoia_min", count: sequoiaCount, min: MIN_PAGE3_SEQUOIA_PICKS };
    }
    const stats = pickStatsFromPickInputs(pagePickInputs, markets);
    if (stats.page3Count < MIN_PAGE3_PICKS) {
      return { code: "page3_min", count: stats.page3Count, min: MIN_PAGE3_PICKS };
    }
    return null;
  }

  return null;
}

export const EMPTY_PICK_STATS: PickStats = {
  page1Count: 0,
  page2Count: 0,
  page3Count: 0,
  totalCount: 0
};

export function formatPickStats(stats: PickStats) {
  return `1/16决赛 ${stats.page1Count}/${MIN_PAGE1_PICKS}，1/8决赛 ${stats.page2Count}/${MIN_PAGE2_PICKS}，1/4决赛及以后 ${stats.page3Count}/${MIN_PAGE3_PICKS}，总计 ${stats.totalCount}/${MIN_TOTAL_PICKS}`;
}
