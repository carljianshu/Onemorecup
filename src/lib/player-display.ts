import type { PromotionFateTag } from "@/lib/promotion-fate";

/** 玩家因未答满要求题数而被扣收益（Forfeit）。 */

let activePromotionFateByPlayerId: ReadonlyMap<string, PromotionFateTag> | null = null;

/** GameContext 同步铁定晋级/淘汰标记，供各处显示名自动读取。 */
export function syncPromotionFateByPlayerId(
  map: ReadonlyMap<string, PromotionFateTag> | null
): void {
  activePromotionFateByPlayerId = map;
}

export function hasForfeitPenalty(player: {
  pickPenalty?: number;
  pickPenaltyPage3?: number;
}): boolean {
  return (player.pickPenalty ?? 0) > 0 || (player.pickPenaltyPage3 ?? 0) > 0;
}

function playerIdFromArg(
  playerOrForfeit?: { id?: string; playerId?: string; pickPenalty?: number; pickPenaltyPage3?: number } | boolean
): string | undefined {
  if (!playerOrForfeit || typeof playerOrForfeit === "boolean")
    return undefined;
  return playerOrForfeit.id ?? playerOrForfeit.playerId;
}

function resolvePromotionFate(
  playerOrForfeit?: { id?: string; playerId?: string; pickPenalty?: number; pickPenaltyPage3?: number } | boolean,
  promotionFate?: PromotionFateTag | null
): PromotionFateTag | undefined {
  if (promotionFate)
    return promotionFate;
  const playerId = playerIdFromArg(playerOrForfeit);
  if (!playerId)
    return undefined;
  return activePromotionFateByPlayerId?.get(playerId);
}

function buildDisplaySuffixes(forfeit: boolean, promotionFate?: PromotionFateTag): string {
  const tags: string[] = [];
  if (forfeit)
    tags.push("W");
  if (promotionFate)
    tags.push(promotionFate);
  if (tags.length === 0)
    return "";
  return ` ${tags.map((tag) => `(${tag})`).join(" ")}`;
}

export function formatPlayerDisplayName(
  name: string,
  playerOrForfeit?: { id?: string; playerId?: string; pickPenalty?: number; pickPenaltyPage3?: number } | boolean,
  promotionFate?: PromotionFateTag | null
): string {
  const forfeit =
    typeof playerOrForfeit === "boolean"
      ? playerOrForfeit
      : playerOrForfeit
        ? hasForfeitPenalty(playerOrForfeit)
        : false;
  const fate = resolvePromotionFate(playerOrForfeit, promotionFate ?? undefined);
  const suffixes = buildDisplaySuffixes(forfeit, fate);
  return suffixes ? `${name}${suffixes}` : name;
}

export function playerDisplayName(
  player: { id?: string; name: string; pickPenalty?: number; pickPenaltyPage3?: number } | undefined,
  fallback: string,
  promotionFate?: PromotionFateTag | null
): string {
  if (!player)
    return fallback;
  return formatPlayerDisplayName(player.name, player, promotionFate);
}
