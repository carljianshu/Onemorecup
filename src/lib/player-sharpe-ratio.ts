import { findPlayerPick } from "@/lib/market-helpers";
import { roundScore } from "@/lib/score-format";
import type { Market, Pick } from "@/types";

function populationStd(values: number[]): number {
  if (values.length === 0)
    return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export interface SharpeRatioScope {
  /** 仅统计 page ≤ maxPage 的场次（下档玩家为 2，即 1/16 + 1/8）。 */
  maxPage?: 1 | 2 | 3;
}

/** 每场已结算题目的收益；未猜该场记 0。 */
export function settledMarketEarningsSeries(
  playerId: string,
  markets: Market[],
  picks: Pick[],
  marketScores: Record<string, number>,
  scope?: SharpeRatioScope
): number[] {
  return markets
    .filter((market) => {
      if (!market.winner)
        return false;
      if (scope?.maxPage != null && market.page > scope.maxPage)
        return false;
      return true;
    })
    .map((market) => {
      if (!findPlayerPick(picks, playerId, market.id))
        return 0;
      return marketScores[market.id] ?? 0;
    });
}

/** 夏普比率 = 各场收益之和 ÷ 各场收益标准差；标准差为 0 时返回 null。 */
export function sharpeRatioFromEarningsSeries(values: number[]): number | null {
  if (values.length === 0)
    return null;
  const sum = values.reduce((total, value) => total + value, 0);
  const std = populationStd(values);
  if (std === 0)
    return null;
  return roundScore(sum / std);
}

export function computePlayerSharpeRatio(
  playerId: string,
  markets: Market[],
  picks: Pick[],
  marketScores: Record<string, number>,
  scope?: SharpeRatioScope
): number | null {
  return sharpeRatioFromEarningsSeries(
    settledMarketEarningsSeries(playerId, markets, picks, marketScores, scope)
  );
}
