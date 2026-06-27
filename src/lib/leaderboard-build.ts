import { applyPromotionTierRanking, maybeLockPromotion } from "@/lib/promotion";
import { applyScheduledAnswersPageOpen } from "@/lib/public-features";
import { buildLeaderboard } from "@/lib/scoring";
import type { GameConfig, LeaderboardEntry, Market, Pick, Player } from "@/types";

export function rebuildLeaderboard(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config: GameConfig
): { leaderboard: LeaderboardEntry[]; config: GameConfig; configChanged: boolean } {
  const scheduled = applyScheduledAnswersPageOpen(config);
  const dynamic = buildLeaderboard(players, markets, picks);
  const locked = maybeLockPromotion(scheduled.config, dynamic);
  const leaderboard = applyPromotionTierRanking(dynamic, locked.config);
  return {
    leaderboard,
    config: locked.config,
    configChanged: scheduled.changed || locked.changed
  };
}
