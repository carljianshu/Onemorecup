import { isAdminAuthed } from "@/lib/admin-auth";
import { buildLeaderboard } from "@/lib/scoring";
import type { GameConfig, Market, Pick, Player } from "@/types";

export interface AdminBackupSnapshot {
  savedAt: string;
  version: number;
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}

export type AdminBackupPlayerExport = Player & { rank: number };

export interface AdminBackupExport extends Omit<AdminBackupSnapshot, "players"> {
  players: AdminBackupPlayerExport[];
}

const LATEST_KEY = "onemorecup:admin-backup:latest";
const HISTORY_KEY = "onemorecup:admin-backup:history";
const MAX_HISTORY = 50;

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadLatestAdminBackup(): AdminBackupSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(LATEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminBackupSnapshot;
  } catch {
    return null;
  }
}

export function loadAdminBackupHistory(): AdminBackupSnapshot[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminBackupSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminBackup(input: {
  version: number;
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}): boolean {
  if (!isBrowser()) return false;

  const latest = loadLatestAdminBackup();
  if (latest && latest.version === input.version) {
    return false;
  }

  const record: AdminBackupSnapshot = {
    savedAt: new Date().toISOString(),
    version: input.version,
    players: input.players,
    markets: input.markets,
    picks: input.picks,
    config: input.config
  };

  localStorage.setItem(LATEST_KEY, JSON.stringify(record));

  const history = loadAdminBackupHistory().filter((item) => item.version !== record.version);
  history.unshift(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));

  return true;
}

export function buildAdminBackupExport(snapshot: AdminBackupSnapshot): AdminBackupExport {
  const leaderboard = buildLeaderboard(snapshot.players, snapshot.markets, snapshot.picks);
  const rankById = new Map(leaderboard.map((entry) => [entry.playerId, entry.rank]));
  return {
    ...snapshot,
    players: snapshot.players.map((player) => ({
      ...player,
      rank: rankById.get(player.id) ?? snapshot.players.length
    }))
  };
}

export function downloadAdminBackup(snapshot?: AdminBackupSnapshot | null): boolean {
  const data = snapshot ?? loadLatestAdminBackup();
  if (!data) return false;

  const blob = new Blob([JSON.stringify(buildAdminBackupExport(data), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "player_data.json";
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

/** 管理员已登录时，把云端同步结果写入本机备份。 */
export function maybeSaveAdminBackup(input: {
  version: number;
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}): boolean {
  if (!isAdminAuthed()) return false;
  return saveAdminBackup(input);
}
