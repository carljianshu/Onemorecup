import {
  MIN_PAGE1_PICKS,
  MIN_PAGE2_PICKS,
  MIN_PAGE3_PICKS,
  MIN_TOTAL_PICKS
} from "@/data/markets";
import { isPlayerInRankLockBottomTier, isRankLockApplied } from "@/lib/rank-lock";
import type { GameConfig, PickStats } from "@/types";

export const PENALTY_PER_MISSING_PICK = 10; // $10 per missing required pick (1/16 + 1/8)
export const PENALTY_PAGE3_PER_MISSING_PICK = 20; // $20 per missing required pick (1/4+)

/**
 * 1/16 + 1/8：再猜多少题才能同时满足各页下限与合计 16 题（取最小值，不重复罚分）。
 */
export function countMissingPhase12Picks(stats: PickStats): number {
  const page1Short = Math.max(0, MIN_PAGE1_PICKS - stats.page1Count);
  const page2Short = Math.max(0, MIN_PAGE2_PICKS - stats.page2Count);
  return Math.max(
    page1Short + page2Short,
    Math.max(0, MIN_TOTAL_PICKS - (stats.page1Count + stats.page2Count))
  );
}

export function calculatePhase12PickPenalty(stats: PickStats): number {
  return countMissingPhase12Picks(stats) * PENALTY_PER_MISSING_PICK;
}

/** @deprecated Use calculatePhase12PickPenalty */
export const calculatePickPenalty = calculatePhase12PickPenalty;

/** 排名锁定后，下档玩家不因 1/4+ 缺题扣收益（仍须猜满 4 题才能保存第三页）。 */
export function isExemptFromPage3PickPenalty(
  playerId: string | null | undefined,
  config?: GameConfig | null
): boolean {
  return isRankLockApplied(config) && isPlayerInRankLockBottomTier(config, playerId);
}

/**
 * 1/4 决赛及以后：晋级区玩家未达最低题数的缺口（仅一条要求线）。
 */
export function countMissingPage3Picks(
  stats: PickStats,
  promoted: boolean,
  playerId?: string | null,
  config?: GameConfig | null
): number {
  if (isExemptFromPage3PickPenalty(playerId, config))
    return 0;
  if (!promoted)
    return 0;
  return Math.max(0, MIN_PAGE3_PICKS - stats.page3Count);
}

export function calculatePage3PickPenalty(
  stats: PickStats,
  promoted: boolean,
  playerId?: string | null,
  config?: GameConfig | null
): number {
  return countMissingPage3Picks(stats, promoted, playerId, config) * PENALTY_PAGE3_PER_MISSING_PICK;
}
