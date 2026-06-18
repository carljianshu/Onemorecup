import type { AnswersPageFeature } from "@/lib/public-features";
import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
  version: number;
  storage?: "blob" | "file";
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let stateVersion = 0;

function setStateVersion(version: number) {
  stateVersion = version;
}

function versionHeaders(): Record<string, string> {
  return stateVersion > 0 ? { "If-Match": String(stateVersion) } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new ApiError(data.error ?? "REQUEST_FAILED", data.message ?? "请求失败。", response.status);
  }
  return data;
}

function applyVersion(data: LeaderboardResponse) {
  setStateVersion(data.version);
  return data;
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const response = await fetch("/api/leaderboard", { cache: "no-store" });
  return applyVersion(await parseResponse<LeaderboardResponse>(response));
}

export async function registerPlayer(body: {
  name: string;
  playerId?: string | null;
  inviteCode?: string;
  pickInputs: PlayerPickInput[];
  page: PlayPage;
  pagePickInputs: PlayerPickInput[];
}) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...versionHeaders() },
    body: JSON.stringify(body)
  });
  const data = await parseResponse<
    LeaderboardResponse & {
      player: Player;
      pickStats: PickStats;
      isUpdate: boolean;
    }
  >(response);
  setStateVersion(data.version);
  return data;
}

export async function adminLogin(password: string) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  return parseResponse<{ token: string; expiresAt: string }>(response);
}

function adminHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...versionHeaders()
  };
}

export async function patchMarketWinnerApi(token: string, marketId: string, winner: string | null) {
  const response = await fetch(`/api/admin/markets/${encodeURIComponent(marketId)}`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ winner })
  });
  return applyVersion(await parseResponse<LeaderboardResponse>(response));
}

export async function patchAdminConfigApi(
  token: string,
  body: {
    page?: PlayPage;
    locked?: boolean;
    feature?: AnswersPageFeature;
    public?: boolean;
    opensAt?: string | null;
  }
) {
  const response = await fetch("/api/admin/config", {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify(body)
  });
  return applyVersion(await parseResponse<LeaderboardResponse>(response));
}

export async function deletePlayerApi(token: string, playerId: string) {
  const response = await fetch(`/api/admin/players/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
    headers: adminHeaders(token)
  });
  return applyVersion(await parseResponse<LeaderboardResponse>(response));
}
