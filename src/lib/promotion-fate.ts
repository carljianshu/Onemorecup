import { promotionCutoffCount } from "@/lib/promotion";
import { buildLeaderboard } from "@/lib/scoring";
import type { GameConfig, Market, Pick, Player } from "@/types";

export type PromotionFateTag = "A" | "E";

/** 枚举全部未结算场次赛果，找出铁定晋级(A)与铁定淘汰(E)的玩家。 */
export function computePromotionFateByPlayerId(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config?: GameConfig | null
): ReadonlyMap<string, PromotionFateTag> {
  const unsettled = markets.filter((market) => !market.winner);
  const result = new Map<string, PromotionFateTag>();
  if (unsettled.length === 0 || players.length === 0)
    return result;

  const comboCount = 1 << unsettled.length;
  const cutoff = promotionCutoffCount(players.length);
  const promoCounts = new Map<string, number>();
  for (const player of players)
    promoCounts.set(player.id, 0);

  for (let mask = 0; mask < comboCount; mask++) {
    const scenarioMarkets = markets.map((market) => ({ ...market }));
    for (let index = 0; index < unsettled.length; index++) {
      const source = unsettled[index]!;
      const market = scenarioMarkets.find((item) => item.id === source.id);
      const candidates = source.candidates ?? [];
      if (!market || candidates.length < 2)
        continue;
      market.winner = candidates[(mask >> index) & 1]!;
    }

    const leaderboard = buildLeaderboard(players, scenarioMarkets, picks, config ?? undefined);
    leaderboard.forEach((entry, index) => {
      if (index < cutoff) {
        promoCounts.set(entry.playerId, (promoCounts.get(entry.playerId) ?? 0) + 1);
      }
    });
  }

  for (const player of players) {
    const count = promoCounts.get(player.id) ?? 0;
    if (count === comboCount)
      result.set(player.id, "A");
    else if (count === 0)
      result.set(player.id, "E");
  }

  return result;
}
