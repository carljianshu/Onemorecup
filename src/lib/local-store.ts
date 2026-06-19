import { DOUBLE_STAKE, STAKE_PER_PICK, migratePickInputsForMarkets, migratePicksForMarkets, syncMarkets } from "@/data/markets";
import { applyManualPageLock, defaultPageLockSchedule, isPageLocked } from "@/lib/page-lock";
import { assertInviteCodeForRegistration } from "@/lib/invite-code";
import { applyPromotionToSave } from "@/lib/promotion";
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
  picks: Pick[]
): LeaderboardEntry[] {
  const leaderboard = buildLeaderboard(players, markets, picks);
  write(KEYS.leaderboard, leaderboard);
  return leaderboard;
}

function defaultGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    page1Locked: false,
    page2Locked: false,
    page3Locked: false,
    ...defaultPageLockSchedule(),
    answersPage1Public: false,
    answersPage2Public: false,
    answersPage3Public: false,
    answersPage1OpensAt: null,
    answersPage2OpensAt: null,
    answersPage3OpensAt: null,
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
    page3Locked: config?.page3Locked ?? false,
    page1LocksAt: config?.page1LocksAt ?? defaultPageLockSchedule().page1LocksAt,
    page2LocksAt: config?.page2LocksAt ?? defaultPageLockSchedule().page2LocksAt,
    page3LocksAt: config?.page3LocksAt ?? defaultPageLockSchedule().page3LocksAt,
    page1LockOverridden: config?.page1LockOverridden ?? false,
    page2LockOverridden: config?.page2LockOverridden ?? false,
    page3LockOverridden: config?.page3LockOverridden ?? false,
    answersPage1Public: config?.answersPage1Public ?? legacyAnswersPublic,
    answersPage2Public: config?.answersPage2Public ?? legacyAnswersPublic,
    answersPage3Public: config?.answersPage3Public ?? false,
    answersPage1OpensAt: config?.answersPage1OpensAt ?? legacyAnswersOpensAt,
    answersPage2OpensAt: config?.answersPage2OpensAt ?? legacyAnswersOpensAt,
    answersPage3OpensAt: config?.answersPage3OpensAt ?? null
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

export function migrateStoredAnswers(snapshot: GameSnapshot): {
  markets: Market[];
  picks: Pick[];
  changed: boolean;
} {
  const markets = syncMarkets(snapshot.markets);
  const normalizedPicks = normalizePicks(snapshot.picks);
  const picks = migratePicksForMarkets(normalizedPicks, markets);
  const picksChanged = picks.some((pick, index) => pick.team !== normalizedPicks[index]?.team);
  const marketsChanged = markets.some((market) => {
    const previous = snapshot.markets?.find((item) => item.id === market.id);
    return (previous?.winner ?? null) !== (market.winner ?? null);
  });
  return { markets, picks, changed: picksChanged || marketsChanged };
}

export function loadGameState() {
  const rawPlayers = read<Player[]>(KEYS.players, []);
  let markets = read<Market[] | null>(KEYS.markets, null);
  let picks = normalizePicks(read<Pick[]>(KEYS.picks, []));
  const config = normalizeConfig(read<unknown>(KEYS.config, null));
  return hydrateGameState({ players: rawPlayers, markets, picks, config }, { persist: true });
}

export interface GameSnapshot {
  players: Player[];
  markets: Market[] | null;
  picks: Pick[];
  config: GameConfig;
}

export function hydrateGameState(
  snapshot: GameSnapshot,
  options: { persist?: boolean } = {}
) {
  const persist = options.persist ?? false;
  let markets = snapshot.markets;
  markets = syncMarkets(markets);
  if (persist) write(KEYS.markets, markets);

  const normalizedPicks = normalizePicks(snapshot.picks);
  const picks = migratePicksForMarkets(normalizedPicks, markets);
  if (persist) {
    savePicks(picks);
  }

  const players = enrichPlayers(snapshot.players, picks, markets);
  if (persist && snapshot.players.length > 0) {
    savePlayers(players);
  }

  const config = normalizeConfig(snapshot.config);
  if (persist) saveConfig(config);

  const leaderboard = refreshLeaderboard(players, markets, picks);
  if (persist) write(KEYS.leaderboard, leaderboard);

  return { players, markets, picks, config, leaderboard };
}

export function snapshotFromState(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}): GameSnapshot {
  return {
    players: state.players,
    markets: state.markets,
    picks: state.picks,
    config: state.config
  };
}

export function persistSnapshotLocally(snapshot: GameSnapshot) {
  const state = hydrateGameState(snapshot, { persist: true });
  return state;
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
  let page2Doubles = 0;
  let page3Doubles = 0;

  for (const input of pickInputs) {
    if (seen.has(input.marketId)) throw new Error("DUPLICATE_MARKET");
    seen.add(input.marketId);

    const market = markets.find((m) => m.id === input.marketId);
    if (!market) throw new Error("INVALID_MARKET");
    if (!market.candidates?.includes(input.team)) throw new Error("INVALID_TEAM");

    if (input.double) {
      if (market.page === 1) page1Doubles += 1;
      else if (market.page === 2) page2Doubles += 1;
      else page3Doubles += 1;
    }
  }

  if (page1Doubles > 1 || page2Doubles > 1 || page3Doubles > 1) {
    throw new Error("TOO_MANY_DOUBLES");
  }
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
  playerId?: string | null,
  page?: PlayPage,
  leaderboardForPromotion?: LeaderboardEntry[],
  inviteCode?: string
): { player: Player; picks: Pick[]; leaderboard: LeaderboardEntry[]; isUpdate: boolean } {
  const trimmedName = name.trim();
  let existing =
    (playerId ? state.players.find((p) => p.id === playerId) : undefined) ??
    state.players.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());

  assertInviteCodeForRegistration(trimmedName, playerId, state.players, inviteCode);

  const promotionLeaderboard =
    leaderboardForPromotion ??
    refreshLeaderboard(state.players, state.markets, state.picks);
  const effectivePlayerId = playerId ?? existing?.id ?? null;
  const finalPickInputs =
    page !== undefined
      ? applyPromotionToSave(
          pickInputs,
          state.markets,
          promotionLeaderboard,
          effectivePlayerId,
          page
        )
      : pickInputs;

  const migratedPickInputs = migratePickInputsForMarkets(finalPickInputs, state.markets);
  validatePickInputs(migratedPickInputs, state.markets);

  if (existing) {
    const nameTaken = state.players.some(
      (p) => p.id !== existing!.id && p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameTaken) throw new Error("DUPLICATE_NAME");

    const otherPicks = state.picks.filter((pick) => pick.playerId !== existing!.id);
    const newPicks = buildPicksForPlayer(existing.id, migratedPickInputs);
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
  const newPicks = buildPicksForPlayer(newPlayerId, migratedPickInputs);
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

export function deletePlayer(
  playerId: string,
  state: { players: Player[]; markets: Market[]; picks: Pick[]; config?: GameConfig }
) {
  const players = state.players.filter((p) => p.id !== playerId);
  const picks = state.picks.filter((p) => p.playerId !== playerId);
  savePlayers(players);
  savePicks(picks);
  const leaderboard = refreshLeaderboard(players, state.markets, picks);
  return { players, picks, leaderboard };
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
  const config = applyManualPageLock(state.config, page, locked);
  saveConfig(config);
  const leaderboard = refreshLeaderboard(state.players, state.markets, state.picks);
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
  } else if (feature === "answersPage2") {
    if (patch.public !== undefined) config.answersPage2Public = patch.public;
    if (patch.opensAt !== undefined) config.answersPage2OpensAt = patch.opensAt;
  } else {
    if (patch.public !== undefined) config.answersPage3Public = patch.public;
    if (patch.opensAt !== undefined) config.answersPage3OpensAt = patch.opensAt;
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
  return refreshLeaderboard(state.players, state.markets, state.picks);
}
