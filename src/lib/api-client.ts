import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
  version: number;
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
