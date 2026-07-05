/** 玩家因未答满要求题数而被扣收益（Forfeit）。 */

export function hasForfeitPenalty(player: {
  pickPenalty?: number;
  pickPenaltyPage3?: number;
}): boolean {
  return (player.pickPenalty ?? 0) > 0 || (player.pickPenaltyPage3 ?? 0) > 0;
}

export function formatPlayerDisplayName(
  name: string,
  playerOrForfeit?: { pickPenalty?: number; pickPenaltyPage3?: number } | boolean
): string {
  const forfeit =
    typeof playerOrForfeit === "boolean"
      ? playerOrForfeit
      : playerOrForfeit
        ? hasForfeitPenalty(playerOrForfeit)
        : false;
  return forfeit ? `${name} (W)` : name;
}

export function playerDisplayName(
  player: { name: string; pickPenalty?: number; pickPenaltyPage3?: number } | undefined,
  fallback: string
): string {
  if (!player)
    return fallback;
  return formatPlayerDisplayName(player.name, player);
}
