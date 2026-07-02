/** 积分走势：Boss 玩家固定名单（按展示顺序）。 */
export const TIMELINE_BOSS_PLAYER_NAMES = [
  "Quagmire",
  "Boss Crab",
  "胡老板",
  "皓",
  "倪嘉涛",
  "枫铃",
  "Placebo",
  "Aguachile",
  "Elnauy",
  "liv073",
  "中华小当家",
  "补水啦",
  "高翔"
] as const;

export const TIMELINE_TOP_PLAYER_COUNT = 10;

export type TimelinePlayerViewMode = "top10" | "boss";

export function resolveTopTimelinePlayerIds(
  series: readonly { playerId: string }[]
): Set<string> {
  return new Set(
    series.slice(0, TIMELINE_TOP_PLAYER_COUNT).map((row) => row.playerId)
  );
}

export function resolveBossTimelinePlayerIds(
  players: readonly { id: string; name: string }[]
): Set<string> {
  const nameToId = new Map(players.map((player) => [player.name, player.id]));
  const ids = new Set<string>();
  for (const name of TIMELINE_BOSS_PLAYER_NAMES) {
    const id = nameToId.get(name);
    if (id)
      ids.add(id);
  }
  return ids;
}

export function resolveTimelinePlayerIds(
  mode: TimelinePlayerViewMode,
  series: readonly { playerId: string }[],
  players: readonly { id: string; name: string }[]
): Set<string> {
  if (mode === "boss")
    return resolveBossTimelinePlayerIds(players);
  return resolveTopTimelinePlayerIds(series);
}
