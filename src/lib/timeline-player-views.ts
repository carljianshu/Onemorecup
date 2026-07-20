import { isPlayerInRankLockBottomTier, isRankLockApplied } from "@/lib/rank-lock";
import type { GameConfig } from "@/types";

export interface TimelinePlayerComputeOptions {
  maxPage: 1 | 2 | 3;
  skipPenalty: boolean;
}

const TIMELINE_BOSS_PHASE1_ONLY_NAMES = new Set(["Aguachile", "补水啦"]);
const TIMELINE_BOSS_PHASE12_ONLY_NAMES = new Set(["Quagmire"]);
const TIMELINE_BOSS_NO_PENALTY_NAMES = new Set(["Aguachile", "补水啦"]);

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

export function eligibleTopTimelineSeries<T extends { playerId: string }>(
  series: readonly T[],
  config?: GameConfig | null
): T[] {
  if (!isRankLockApplied(config))
    return [...series];
  return series.filter((row) => !isPlayerInRankLockBottomTier(config, row.playerId));
}

export function resolveTopTimelinePlayerIds(
  series: readonly { playerId: string }[],
  config?: GameConfig | null
): Set<string> {
  return new Set(
    eligibleTopTimelineSeries(series, config)
      .slice(0, TIMELINE_TOP_PLAYER_COUNT)
      .map((row) => row.playerId)
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
  players: readonly { id: string; name: string }[],
  config?: GameConfig | null
): Set<string> {
  if (mode === "boss")
    return resolveBossTimelinePlayerIds(players);
  return resolveTopTimelinePlayerIds(series, config);
}

export function resolveTimelinePlayerComputeOptions(
  mode: TimelinePlayerViewMode,
  playerName: string
): TimelinePlayerComputeOptions {
  if (mode !== "boss")
    return { maxPage: 3, skipPenalty: false };
  if (TIMELINE_BOSS_PHASE1_ONLY_NAMES.has(playerName))
    return { maxPage: 1, skipPenalty: TIMELINE_BOSS_NO_PENALTY_NAMES.has(playerName) };
  if (TIMELINE_BOSS_PHASE12_ONLY_NAMES.has(playerName))
    return { maxPage: 2, skipPenalty: false };
  return { maxPage: 3, skipPenalty: false };
}

export function buildTimelinePlayerOptionsById(
  mode: TimelinePlayerViewMode,
  players: readonly { id: string; name: string }[]
): Map<string, TimelinePlayerComputeOptions> {
  const options = new Map<string, TimelinePlayerComputeOptions>();
  for (const player of players) {
    options.set(player.id, resolveTimelinePlayerComputeOptions(mode, player.name));
  }
  return options;
}
