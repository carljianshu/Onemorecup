import type { AnswersPageFeature } from "@/lib/public-features";
import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";

export interface GameStateResponse {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
  leaderboard: LeaderboardEntry[];
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

export function getStateVersion() {
  return stateVersion;
}

function setStateVersion(version: number) {
  stateVersion = version;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new ApiError(data.error ?? "REQUEST_FAILED", data.message ?? "请求失败。", response.status);
  }
  return data;
}

function versionHeaders(): Record<string, string> {
  return stateVersion > 0 ? { "If-Match": String(stateVersion) } : {};
}

export async function fetchGameState(): Promise<GameStateResponse> {
  const response = await fetch("/api/state", { cache: "no-store" });
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
}

export async function putPlayerPicks(
  playerId: string | null,
  body: {
    name: string;
    pickInputs: PlayerPickInput[];
    page: PlayPage;
    pagePickInputs: PlayerPickInput[];
  }
) {
  const id = playerId ?? "new";
  const response = await fetch(`/api/players/${encodeURIComponent(id)}/picks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...versionHeaders() },
    body: JSON.stringify(body)
  });
  const data = await parseResponse<
    GameStateResponse & {
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
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
}

export async function patchSubQuestionWinnerApi(
  token: string,
  marketId: string,
  subId: string,
  winner: string | null
) {
  const response = await fetch(
    `/api/admin/markets/${encodeURIComponent(marketId)}/subs/${encodeURIComponent(subId)}`,
    {
      method: "PATCH",
      headers: adminHeaders(token),
      body: JSON.stringify({ winner })
    }
  );
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
}

export async function deleteSubQuestionApi(token: string, marketId: string, subId: string) {
  const response = await fetch(
    `/api/admin/markets/${encodeURIComponent(marketId)}/subs/${encodeURIComponent(subId)}`,
    {
      method: "DELETE",
      headers: adminHeaders(token)
    }
  );
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
}

export async function restoreSubQuestionApi(token: string, marketId: string, subId: string) {
  const response = await fetch(
    `/api/admin/markets/${encodeURIComponent(marketId)}/subs/${encodeURIComponent(subId)}/restore`,
    {
      method: "POST",
      headers: adminHeaders(token)
    }
  );
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
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
  const data = await parseResponse<GameStateResponse>(response);
  setStateVersion(data.version);
  return data;
}
