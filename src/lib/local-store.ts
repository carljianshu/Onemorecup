import { DOUBLE_STAKE, STAKE_PER_PICK, migratePickInputsForMarkets, migratePicksForMarkets, syncMarkets } from "@/data/markets";
import { applyManualPageLock, defaultPageLockSchedule, isPageLocked, migratePageLockSchedule } from "@/lib/page-lock";
import { defaultAnswersPageSchedule, migrateAnswersPageSchedule } from "@/lib/public-features";
import { assertInviteCodeForRegistration } from "@/lib/invite-code";
import { applyPromotionToSave } from "@/lib/promotion";
import { isPlayerPromoted, migratePromotionSnapshotTiming, removePlayerFromPromotionSnapshot } from "@/lib/promotion";
import { computePickStats } from "@/lib/pick-stats";
import { calculatePhase12PickPenalty, calculatePage3PickPenalty } from "@/lib/pick-penalty";
import { rebuildLeaderboard } from "@/lib/leaderboard-build";
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

function refreshLeaderboardWithConfig(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config: GameConfig
): { leaderboard: LeaderboardEntry[]; config: GameConfig; configChanged: boolean } {
  const rebuilt = rebuildLeaderboard(players, markets, picks, config);
  write(KEYS.leaderboard, rebuilt.leaderboard);
  if (rebuilt.configChanged) saveConfig(rebuilt.config);
  return rebuilt;
}

function refreshLeaderboard(
  players: Player[],
  markets: Market[],
  picks: Pick[],
  config?: GameConfig
): LeaderboardEntry[] {
  if (config) {
    return refreshLeaderboardWithConfig(players, markets, picks, config).leaderboard;
  }
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
    ...defaultAnswersPageSchedule(),
    phase12EarningsDeductionsApplied: false,
    page3EarningsDeductionsApplied: false,
    promotionLockedAt: null,
    promotedPlayerIds: null,
    eliminatedPlayerIds: null,
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
  const answersDefaults = defaultAnswersPageSchedule();
  return migrateAnswersPageSchedule(
    migratePageLockSchedule(
      defaultGameConfig({
        page1Locked: config?.page1Locked ?? false,
        page2Locked: config?.page2Locked ?? false,
        page3Locked: config?.page3Locked ?? false,
        page1LocksAt: config?.page1LocksAt ?? defaultPageLockSchedule().page1LocksAt,
        page2LocksAt: config?.page2LocksAt ?? defaultPageLockSchedule().page2LocksAt,
        page3LocksAt: config?.page3LocksAt ?? defaultPageLockSchedule().page3LocksAt,
        page1LockOverridden: config?.page1LockOverridden ?? false,
        page2LockOverridden: config?.page2LockOverridden ?? false,
        page3LockOverridden: config?.page3LockOverridden ?? false,
        answersPage1Public: config?.answersPage1Public ?? legacyAnswersPublic ?? answersDefaults.answersPage1Public,
        answersPage2Public: config?.answersPage2Public ?? legacyAnswersPublic ?? answersDefaults.answersPage2Public,
        answersPage3Public: config?.answersPage3Public ?? answersDefaults.answersPage3Public,
        answersPage1OpensAt:
          config?.answersPage1OpensAt ?? legacyAnswersOpensAt ?? answersDefaults.answersPage1OpensAt,
        answersPage2OpensAt:
          config?.answersPage2OpensAt ?? legacyAnswersOpensAt ?? answersDefaults.answersPage2OpensAt,
        answersPage3OpensAt: config?.answersPage3OpensAt ?? answersDefaults.answersPage3OpensAt,
        phase12EarningsDeductionsApplied: config?.phase12EarningsDeductionsApplied ?? false,
        page3EarningsDeductionsApplied: config?.page3EarningsDeductionsApplied ?? false,
        promotionLockedAt: config?.promotionLockedAt ?? null,
        promotedPlayerIds: config?.promotedPlayerIds ?? null,
        eliminatedPlayerIds: config?.eliminatedPlayerIds ?? null
      })
    ).config
  ).config;
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
  const migratedPromotion = migratePromotionSnapshotTiming(config);
  const rebuilt = rebuildLeaderboard(players, markets, picks, migratedPromotion.config);
  const configChanged = migratedPromotion.changed || rebuilt.configChanged;
  if (persist) {
    if (configChanged) saveConfig(rebuilt.config);
    write(KEYS.leaderboard, rebuilt.leaderboard);
  }

  return {
    players,
    markets,
    picks,
    config: rebuilt.config,
    leaderboard: rebuilt.leaderboard,
    configChanged
  };
}

export function snapshotFromState(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}): GameSnapshot {
  const hydrated = hydrateGameState(
    {
      players: state.players,
      markets: state.markets,
      picks: state.picks,
      config: state.config
    },
    { persist: false }
  );
  return {
    players: hydrated.players,
    markets: hydrated.markets,
    picks: hydrated.picks,
    config: hydrated.config
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
  state: { players: Player[]; markets: Market[]; picks: Pick[]; config?: GameConfig },
  playerId?: string | null,
  page?: PlayPage,
  leaderboardForPromotion?: LeaderboardEntry[],
  inviteCode?: string
): {
  player: Player;
  picks: Pick[];
  leaderboard: LeaderboardEntry[];
  config?: GameConfig;
  isUpdate: boolean;
} {
  const trimmedName = name.trim();
  let existing =
    (playerId ? state.players.find((p) => p.id === playerId) : undefined) ??
    state.players.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase());

  assertInviteCodeForRegistration(trimmedName, playerId, state.players, inviteCode);

  const promotionLeaderboard =
    leaderboardForPromotion ??
    refreshLeaderboard(state.players, state.markets, state.picks, state.config);
  const effectivePlayerId = playerId ?? existing?.id ?? null;
  const finalPickInputs =
    page !== undefined
      ? applyPromotionToSave(
          pickInputs,
          state.markets,
          promotionLeaderboard,
          effectivePlayerId,
          page,
          state.config
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
    if (state.config) {
      const rebuilt = refreshLeaderboardWithConfig(players, state.markets, picks, state.config);
      return { player, picks: newPicks, leaderboard: rebuilt.leaderboard, config: rebuilt.config, isUpdate: true };
    }
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
  if (state.config) {
    const rebuilt = refreshLeaderboardWithConfig(players, state.markets, picks, state.config);
    return { player, picks: newPicks, leaderboard: rebuilt.leaderboard, config: rebuilt.config, isUpdate: false };
  }
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
  const config = removePlayerFromPromotionSnapshot(state.config ?? defaultGameConfig(), playerId);
  if (state.config) saveConfig(config);
  const rebuilt = refreshLeaderboardWithConfig(players, state.markets, picks, config);
  return { players, picks, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}

export function setPlayerInGroup(
  playerId: string,
  inGroupPlayer: boolean,
  state: { players: Player[]; markets: Market[]; picks: Pick[]; config: GameConfig }
) {
  if (!state.players.some((p) => p.id === playerId)) {
    throw new Error("PLAYER_NOT_FOUND");
  }
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, inGroupPlayer } : p
  );
  savePlayers(players);
  const rebuilt = refreshLeaderboardWithConfig(players, state.markets, state.picks, state.config);
  return { players, picks: state.picks, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}

export function setPhase12EarningsDeductions(
  state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
  },
  enabled: boolean
) {
  const players = enabled
    ? state.players.map((player) => {
        const pickStats =
          player.pickStats ??
          computePickStats(
            state.picks.filter((pick) => pick.playerId === player.id),
            state.markets
          );
        return { ...player, pickPenalty: calculatePhase12PickPenalty(pickStats) };
      })
    : state.players.map((player) => ({ ...player, pickPenalty: 0 }));
  const config = { ...state.config, phase12EarningsDeductionsApplied: enabled };
  savePlayers(players);
  saveConfig(config);
  const rebuilt = refreshLeaderboardWithConfig(players, state.markets, state.picks, config);
  return { players, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}

export function setPage3EarningsDeductions(
  state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
  },
  enabled: boolean
) {
  const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, state.config);
  const players = enabled
    ? state.players.map((player) => {
        const pickStats =
          player.pickStats ??
          computePickStats(
            state.picks.filter((pick) => pick.playerId === player.id),
            state.markets
          );
        return {
          ...player,
          pickPenaltyPage3: calculatePage3PickPenalty(
            pickStats,
            isPlayerPromoted(rebuilt.leaderboard, player.id, state.config)
          )
        };
      })
    : state.players.map((player) => ({ ...player, pickPenaltyPage3: 0 }));
  const config = { ...state.config, page3EarningsDeductionsApplied: enabled };
  savePlayers(players);
  saveConfig(config);
  const next = refreshLeaderboardWithConfig(players, state.markets, state.picks, config);
  return { players, config: next.config, leaderboard: next.leaderboard };
}

/** @deprecated Use setPhase12EarningsDeductions */
export function applyPickPenalties(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
}) {
  const result = setPhase12EarningsDeductions(
    { ...state, config: defaultGameConfig({ phase12EarningsDeductionsApplied: true }) },
    true
  );
  return { players: result.players, leaderboard: result.leaderboard };
}

/** @deprecated Use setPage3EarningsDeductions */
export function applyPickPenaltiesPage3(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
}) {
  const result = setPage3EarningsDeductions(
    { ...state, config: defaultGameConfig({ page3EarningsDeductionsApplied: true }) },
    true
  );
  return { players: result.players, leaderboard: result.leaderboard };
}

export function updateMarketWinner(
  marketId: string,
  winner: string | null,
  state: { players: Player[]; markets: Market[]; picks: Pick[]; config?: GameConfig }
) {
  const markets = state.markets.map((m) =>
    m.id === marketId ? { ...m, winner: winner || null } : m
  );
  saveMarkets(markets);
  const leaderboard = refreshLeaderboard(state.players, markets, state.picks, state.config);
  return { markets, leaderboard };
}

export function setPageLocked(
  page: PlayPage,
  locked: boolean,
  state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
  }
) {
  const config = applyManualPageLock(state.config, page, locked);
  const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, config);
  return { config: rebuilt.config, leaderboard: rebuilt.leaderboard };
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
  return refreshLeaderboard(state.players, state.markets, state.picks, state.config);
}

export function recalculateLeaderboardWithConfig(state: {
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
}) {
  return refreshLeaderboardWithConfig(state.players, state.markets, state.picks, state.config);
}
