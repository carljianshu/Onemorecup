import type { LeaderboardEntry, Market, PlayerPickInput, PlayPage } from "@/types";

export function promotionCutoffCount(playerCount: number): number {
  if (playerCount <= 0) return 0;
  return Math.ceil((playerCount * 2) / 3);
}

export function showPromotionCutoffLine(playerCount: number): boolean {
  return promotionCutoffCount(playerCount) < playerCount;
}

export function playerLeaderboardIndex(
  leaderboard: LeaderboardEntry[],
  playerId: string
): number {
  return leaderboard.findIndex((entry) => entry.playerId === playerId);
}

export function isPlayerPromoted(
  leaderboard: LeaderboardEntry[],
  playerId: string | null | undefined
): boolean {
  if (!playerId) return false;
  if (leaderboard.length === 0) return false;
  const index = playerLeaderboardIndex(leaderboard, playerId);
  if (index < 0) return false;
  return index < promotionCutoffCount(leaderboard.length);
}

export function stripPage3PickInputs(
  pickInputs: PlayerPickInput[],
  markets: Market[]
): PlayerPickInput[] {
  return pickInputs.filter((input) => {
    const market = markets.find((m) => m.id === input.marketId);
    return market?.page !== 3;
  });
}

/** 非晋级玩家不可保存第三页；保存其他页时自动剔除第三页竞猜。 */
export function applyPromotionToSave(
  pickInputs: PlayerPickInput[],
  markets: Market[],
  leaderboard: LeaderboardEntry[],
  playerId: string | null | undefined,
  page: PlayPage
): PlayerPickInput[] {
  if (isPlayerPromoted(leaderboard, playerId)) {
    return pickInputs;
  }
  if (page === 3) {
    throw new Error("PAGE3_NOT_PROMOTED");
  }
  return stripPage3PickInputs(pickInputs, markets);
}
