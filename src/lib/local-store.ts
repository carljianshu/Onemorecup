import { DOUBLE_STAKE, STAKE_PER_PICK, syncMarkets } from "@/data/markets";
import { findSubQuestion } from "@/lib/market-helpers";
import { computePickStats } from "@/lib/pick-stats";
import { buildLeaderboard } from "@/lib/scoring";
import type { GameConfig, LeaderboardEntry, Market, Pick, Player, PlayerPickInput, PlayPage } from "@/types";
import type { AnswersPageFeature } from "@/lib/public-features";

const KEYS = {
  players: "onemorecup:players",
  markets: "onemorecup:markets",
  picks: "onemorecup:picks",
  config: "onemorecup:config",
  leaderboard: "onemorecup:leaderboard",
  currentPlayerId: "onemorecup:currentPlayerId"
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function refreshLeaderboard(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  page2Locked?: boolean
): LeaderboardEntry[] {
  const locked =
    page2Locked ??
    (isBrowser() ? normalizeConfig(read<unknown>(KEYS.config, null)).page2Locked : false);
  const leaderboard = buildLeaderboard(players, markets, picks, locked);
  write(KEYS.leaderboard, leaderboard);
  return leaderboard;
}

function defaultGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    page1Locked: false,
    page2Locked: false,
    answersPage1Public: false,
    answersPage2Public: false,
    answersPage1OpensAt: null,
    answersPage2OpensAt: null,
    ...overrides
  };
}

function normalizeConfig(raw: unknown): GameConfig {
  if (raw && typeof raw === "object" && "locked" in raw && typeof (raw as { locked: unknown }).locked === "boolean") {
    const locked = (raw as { locked: boolean }).locked;
    return defaultGameConfig({ page1Locked: locked, page2Locked: locked });
  }
  const config = raw as Partial<GameConfig> & {
    answersPublic?: boolean;
    answersOpensAt?: string | null;
  } | null;
  const legacyAnswersPublic = config?.answersPublic ?? false;
  const legacyAnswersOpensAt = config?.answersOpensAt ?? null;
  return defaultGameConfig({
    page1Locked: config?.page1Locked ?? false,
    page2Locked: config?.page2Locked ?? false,
    answersPage1Public: config?.answersPage1Public ?? legacyAnswersPublic,
    answersPage2Public: config?.answersPage2Public ?? legacyAnswersPublic,
    answersPage1OpensAt: config?.answersPage1OpensAt ?? legacyAnswersOpensAt,
    answersPage2OpensAt: config?.answersPage2OpensAt ?? legacyAnswersOpensAt
  });
}

function enrichPlayers(players: Player[], picks: Pick[], markets: Market[]): Player[] {
  return players.map((player) => ({
    ...player,
    pickStats: computePickStats(
      picks.filter((pick) => pick.playerId === player.id),
      markets
    )
  }));
}

function normalizePicks(picks: Pick[]): Pick[] {
  return picks
    .map((pick) => {
      const legacy = pick as Pick & { teamId?: string };
      const team = pick.team ?? legacy.teamId;
      if (!team) return null;
      const stake = pick.stake === DOUBLE_STAKE ? DOUBLE_STAKE : STAKE_PER_PICK;
      return { playerId: pick.playerId, marketId: pick.marketId, team, stake };
    })
    .filter((p): p is Pick => p !== null);
}

export function loadGameState() {
  const rawPlayers = read<Player[]>(KEYS.players, []);
  let markets = read<Market[] | null>(KEYS.markets, null);
  markets = syncMarkets(markets);
  write(KEYS.markets, markets);
  let picks = normalizePicks(read<Pick[]>(KEYS.picks, []));
  if (picks.length !== read<Pick[]>(KEYS.picks, []).length) {
    savePicks(picks);
  }
  const players = enrichPlayers(rawPlayers, picks, markets);
  if (rawPlayers.length > 0) {
    savePlayers(players);
  }
  const config = normalizeConfig(read<unknown>(KEYS.config, null));
  saveConfig(config);
  const leaderboard = refreshLeaderboard(players, markets, picks, config.page2Locked);
  return { players, markets, picks, config, leaderboard };
}

export function savePlayers(players: Player[]) {
  write(KEYS.players, players);
}

export function saveMarkets(markets: Market[]) {
  write(KEYS.markets, markets);
}

export function savePicks(picks: Pick[]) {
  write(KEYS.picks, picks);
}

export function saveConfig(config: GameConfig) {
  write(KEYS.config, config);
}

export function getLeaderboard(): LeaderboardEntry[] {
  return read<LeaderboardEntry[]>(KEYS.leaderboard, []);
}

export function getCurrentPlayerId(): string | null {
  return read<string | null>(KEYS.currentPlayerId, null);
}

export function setCurrentPlayerId(playerId: string | null) {
  if (playerId) write(KEYS.currentPlayerId, playerId);
  else if (isBrowser()) localStorage.removeItem(KEYS.currentPlayerId);
}

export function getPicksForPlayer(playerId: string, picks: Pick[]) {
  return picks.filter((pick) => pick.playerId === playerId);
}

function validatePickInputs(pickInputs: PlayerPickInput[], markets: Market[]) {
  const seen = new Set<string>();
  let page1Doubles = 0;
  const page2DoubleParents = new Set<string>();

  for (const input of pickInputs) {
    if (seen.has(input.marketId)) throw new Error("DUPLICATE_MARKET");
    seen.add(input.marketId);

    if (input.double) {
      const subMatch = findSubQuestion(markets, input.marketId);
      if (subMatch) {
        page2DoubleParents.add(subMatch.market.id);
      } else {
        const market = markets.find((m) => m.id === input.marketId);
        if (!market || market.page !== 1) throw new Error("INVALID_MARKET");
        page1Doubles += 1;
      }
    }

    const subMatch = findSubQuestion(markets, input.marketId);
    if (subMatch) {
      const { sub } = subMatch;
      if (sub.deleted) throw new Error("INVALID_MARKET");
      if (!sub.candidates.includes(input.team as (typeof sub.candidates)[number])) {
        throw new Error("INVALID_TEAM");
      }
      continue;
    }

    const market = markets.find((m) => m.id === input.marketId);
    if (!market || market.page !== 1) throw new Error("INVALID_MARKET");
    if (!market.candidates?.includes(input.team)) throw new Error("INVALID_TEAM");
  }

  if (page1Doubles > 1 || page2DoubleParents.size > 1) throw new Error("TOO_MANY_DOUBLES");
}

function buildPicksForPlayer(playerId: string, pickInputs: PlayerPickInput[]): Pick[] {
  return pickInputs.map((input) => ({
    playerId,
    marketId: input.marketId,
    team: input.team,
    stake: input.double ? DOUBLE_STAKE : STAKE_PER_PICK
  }));
}

/** Create a new player or update an existing one (by playerId or matching name). */
export function savePlayerPicks(
  name: string,
  pickInputs: PlayerPickInput[],
  state: { players: Player[]; markets: Market[]; picks: Pick[] },
  playerId?: string | null
): { player: Player; picks: Pick[]; leaderboard: LeaderboardEntry[]; isUpdate: boolean } {
  validatePickInputs(pickInputs, state.markets);

  const trimmedName = name.trim();
  let existing =
    (playerId ? state.players.find((p) => p.id === playerId) : undefined) ??
    state.players.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());

  if (existing) {
    const nameTaken = state.players.some(
      (p) => p.id !== existing!.id && p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameTaken) throw new Error("DUPLICATE_NAME");

    const otherPicks = state.picks.filter((pick) => pick.playerId !== existing!.id);
    const newPicks = buildPicksForPlayer(existing.id, pickInputs);
    const pickStats = computePickStats(newPicks, state.markets);
    const player: Player = {
      ...existing,
      name: trimmedName,
      pickStats
    };
    const players = state.players.map((p) => (p.id === player.id ? player : p));
    const picks = [...otherPicks, ...newPicks];

    savePlayers(players);
    savePicks(picks);
    setCurrentPlayerId(player.id);
    const leaderboard = refreshLeaderboard(players, state.markets, picks);

    return { player, picks: newPicks, leaderboard, isUpdate: true };
  }

  if (state.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error("DUPLICATE_NAME");
  }

  const newPlayerId = crypto.randomUUID();
  const newPicks = buildPicksForPlayer(newPlayerId, pickInputs);
  const pickStats = computePickStats(newPicks, state.markets);
  const player: Player = {
    id: newPlayerId,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    pickStats
  };
  const players = [...state.players, player];
  const picks = [...state.picks, ...newPicks];

  savePlayers(players);
  savePicks(picks);
  setCurrentPlayerId(player.id);
  const leaderboard = refreshLeaderboard(players, state.markets, picks);

  return { player, picks: newPicks, leaderboard, isUpdate: false };
}

/** @deprecated Use savePlayerPicks */
export function createPlayerWithPicks(
  name: string,
  pickInputs: PlayerPickInput[],
  state: { players: Player[]; markets: Market[]; picks: Pick[] }
) {
  return savePlayerPicks(name, pickInputs, state);
}

export function updateSubQuestionWinner(
  marketId: string,
  subId: string,
  winner: string | null,
  state: { players: Player[]; markets: Market[]; picks: Pick[] }
) {
  const markets = state.markets.map((m) => {
    if (m.id !== marketId) return m;
    return {
      ...m,
      subQuestions: m.subQuestions?.map((s) =>
        s.id === subId ? { ...s, winner: winner || null } : s
      )
    };
  });
  saveMarkets(markets);
  const leaderboard = refreshLeaderboard(state.players, markets, state.picks);
  return { markets, leaderboard };
}

export function removeSubQuestion(
  marketId: string,
  subId: string,
  state: { players: Player[]; markets: Market[]; picks: Pick[] }
) {
  const markets = state.markets.map((m) => {
    if (m.id !== marketId) return m;
    return {
      ...m,
      subQuestions: m.subQuestions?.map((s) => (s.id === subId ? { ...s, deleted: true } : s))
    };
  });
  const players = enrichPlayers(state.players, state.picks, markets);
  saveMarkets(markets);
  savePlayers(players);
  const leaderboard = refreshLeaderboard(players, markets, state.picks);
  return { markets, picks: state.picks, players, leaderboard };
}

export function restoreSubQuestion(
  marketId: string,
  subId: string,
  state: { players: Player[]; markets: Market[]; picks: Pick[] }
) {
  const markets = state.markets.map((m) => {
    if (m.id !== marketId) return m;
    return {
      ...m,
      subQuestions: m.subQuestions?.map((s) => (s.id === subId ? { ...s, deleted: false } : s))
    };
  });
  const players = enrichPlayers(state.players, state.picks, markets);
  saveMarkets(markets);
  savePlayers(players);
  const leaderboard = refreshLeaderboard(players, markets, state.picks);
  return { markets, picks: state.picks, players, leaderboard };
}

export function updateMarketWinner(
  marketId: string,
  winner: string | null,
  state: { players: Player[]; markets: Market[]; picks: Pick[] }
) {
  const markets = state.markets.map((m) =>
    m.id === marketId ? { ...m, winner: winner || null } : m
  );
  saveMarkets(markets);
  const leaderboard = refreshLeaderboard(state.players, markets, state.picks);
  return { markets, leaderboard };
}

export function setPageLocked(
  page: PlayPage,
  locked: boolean,
  state: ReturnType<typeof loadGameState>
) {
  const config: GameConfig =
    page === 1
      ? { ...state.config, page1Locked: locked }
      : { ...state.config, page2Locked: locked };
  saveConfig(config);
  const leaderboard = refreshLeaderboard(
    state.players,
    state.markets,
    state.picks,
    config.page2Locked
  );
  return { config, leaderboard };
}

export function updatePublicFeature(
  feature: AnswersPageFeature,
  patch: { public?: boolean; opensAt?: string | null },
  state: { config: GameConfig }
) {
  const config = { ...state.config };

  if (feature === "answersPage1") {
    if (patch.public !== undefined) config.answersPage1Public = patch.public;
    if (patch.opensAt !== undefined) config.answersPage1OpensAt = patch.opensAt;
  } else {
    if (patch.public !== undefined) config.answersPage2Public = patch.public;
    if (patch.opensAt !== undefined) config.answersPage2OpensAt = patch.opensAt;
  }

  saveConfig(config);
  return { config };
}

export function recalculateLeaderboard(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config?: GameConfig;
}) {
  return refreshLeaderboard(
    state.players,
    state.markets,
    state.picks,
    state.config?.page2Locked
  );
}
