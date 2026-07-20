import { DOUBLE_STAKE, STAKE_PER_PICK, marketsCatalogDrift, migratePickInputsForMarkets, migratePicksForMarkets, syncMarkets } from "@/data/markets";
import { applyManualPageLock, defaultPageLockSchedule, isPageLocked, migratePageLockSchedule } from "@/lib/page-lock";
import { defaultAnswersPageSchedule, migrateAnswersPageSchedule, migrateAnswersScheduleOpenApplied, patchAnswersPageSchedule } from "@/lib/public-features";
import { assertRegistrationAllowed, findKnownPlayer } from "@/lib/invite-code";
import { computeRankLockSnapshot, removePlayerFromRankLockSnapshot } from "@/lib/rank-lock";
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
    if (!isBrowser())
        return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return fallback;
        return JSON.parse(raw) as T;
    }
    catch {
        return fallback;
    }
}
function write<T>(key: string, value: T) {
    if (!isBrowser())
        return;
    localStorage.setItem(key, JSON.stringify(value));
}
function refreshLeaderboardWithConfig(players: Player[], markets: Market[], picks: Pick[], config: GameConfig): {
    leaderboard: LeaderboardEntry[];
    config: GameConfig;
    configChanged: boolean;
} {
    const rebuilt = rebuildLeaderboard(players, markets, picks, config);
    write(KEYS.leaderboard, rebuilt.leaderboard);
    if (rebuilt.configChanged)
        saveConfig(rebuilt.config);
    return rebuilt;
}
function refreshLeaderboard(players: Player[], markets: Market[], picks: Pick[], config?: GameConfig): LeaderboardEntry[] {
    if (config) {
        return refreshLeaderboardWithConfig(players, markets, picks, config).leaderboard;
    }
    const leaderboard = buildLeaderboard(players, markets, picks, config);
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
        rankLockApplied: false,
        rankLockAppliedAt: null,
        rankLockTopPlayerIds: null,
        rankLockBottomPlayerIds: null,
        registrationClosed: false,
        ...overrides
    };
}
function normalizeConfig(raw: unknown): GameConfig {
    if (raw && typeof raw === "object" && "locked" in raw && typeof (raw as {
        locked: unknown;
    }).locked === "boolean") {
        const locked = (raw as {
            locked: boolean;
        }).locked;
        return defaultGameConfig({ page1Locked: locked, page2Locked: locked });
    }
    const config = raw as Partial<GameConfig> & {
        answersPublic?: boolean;
        answersOpensAt?: string | null;
    } | null;
    const legacyAnswersPublic = config?.answersPublic ?? false;
    const legacyAnswersOpensAt = config?.answersOpensAt ?? null;
    const answersDefaults = defaultAnswersPageSchedule();
    return migrateAnswersScheduleOpenApplied(migrateAnswersPageSchedule(migratePageLockSchedule(defaultGameConfig({
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
        answersPage1OpensAt: config?.answersPage1OpensAt ?? legacyAnswersOpensAt ?? answersDefaults.answersPage1OpensAt,
        answersPage2OpensAt: config?.answersPage2OpensAt ?? legacyAnswersOpensAt ?? answersDefaults.answersPage2OpensAt,
        answersPage3OpensAt: config?.answersPage3OpensAt ?? answersDefaults.answersPage3OpensAt,
        answersPage1ScheduleOpenApplied: config?.answersPage1ScheduleOpenApplied ?? answersDefaults.answersPage1ScheduleOpenApplied,
        answersPage2ScheduleOpenApplied: config?.answersPage2ScheduleOpenApplied ?? answersDefaults.answersPage2ScheduleOpenApplied,
        answersPage3ScheduleOpenApplied: config?.answersPage3ScheduleOpenApplied ?? answersDefaults.answersPage3ScheduleOpenApplied,
        answersM1_1Public: config?.answersM1_1Public ?? answersDefaults.answersM1_1Public,
        phase12EarningsDeductionsApplied: config?.phase12EarningsDeductionsApplied ?? false,
        page3EarningsDeductionsApplied: config?.page3EarningsDeductionsApplied ?? false,
        promotionLockedAt: config?.promotionLockedAt ?? null,
        promotedPlayerIds: config?.promotedPlayerIds ?? null,
        eliminatedPlayerIds: config?.eliminatedPlayerIds ?? null,
        rankLockApplied: config?.rankLockApplied ?? false,
        rankLockAppliedAt: config?.rankLockAppliedAt ?? null,
        rankLockTopPlayerIds: config?.rankLockTopPlayerIds ?? null,
        rankLockBottomPlayerIds: config?.rankLockBottomPlayerIds ?? null,
        registrationClosed: config?.registrationClosed ?? true
    })).config).config).config;
}
function enrichPlayers(players: Player[], picks: Pick[], markets: Market[]): Player[] {
    return players.map((player) => ({
        ...player,
        pickStats: computePickStats(picks.filter((pick) => pick.playerId === player.id), markets)
    }));
}
function normalizePicks(picks: Pick[]): Pick[] {
    return picks
        .map((pick) => {
        const legacy = pick as Pick & {
            teamId?: string;
        };
        const team = pick.team ?? legacy.teamId;
        if (!team)
            return null;
        const stake = pick.stake === DOUBLE_STAKE ? DOUBLE_STAKE : STAKE_PER_PICK;
        return { playerId: pick.playerId, marketId: pick.marketId, team, stake };
    })
        .filter((p): p is Pick => p !== null);
}
function pickSnapshotKey(picks: Pick[]): string {
    return [...picks]
        .sort((a, b) => `${a.playerId}:${a.marketId}`.localeCompare(`${b.playerId}:${b.marketId}`))
        .map((pick) => `${pick.playerId}|${pick.marketId}|${pick.team}|${pick.stake}`)
        .join(";");
}
export function migrateStoredAnswers(snapshot: GameSnapshot): {
    markets: Market[];
    picks: Pick[];
    changed: boolean;
} {
    const markets = syncMarkets(snapshot.markets);
    const normalizedPicks = normalizePicks(snapshot.picks);
    const picks = migratePicksForMarkets(normalizedPicks, markets);
    const picksChanged = pickSnapshotKey(normalizedPicks) !== pickSnapshotKey(picks);
    const winnersChanged = markets.some((market) => {
        const previous = snapshot.markets?.find((item) => item.id === market.id);
        return (previous?.winner ?? null) !== (market.winner ?? null);
    });
    const catalogDrift = marketsCatalogDrift(snapshot.markets, markets);
    return { markets, picks, changed: picksChanged || winnersChanged || catalogDrift };
}
export function loadGameState() {
    const rawPlayers = read<Player[]>(KEYS.players, []);
    const markets = read<Market[] | null>(KEYS.markets, null);
    const picks = normalizePicks(read<Pick[]>(KEYS.picks, []));
    const storedConfig = read<Partial<GameConfig> | null>(KEYS.config, null);
    return hydrateGameState({
        players: rawPlayers,
        markets,
        picks,
        config: { ...defaultGameConfig(), ...storedConfig }
    }, { persist: true });
}
export interface GameSnapshot {
    players: Player[];
    markets: Market[] | null;
    picks: Pick[];
    config: GameConfig;
}
export function hydrateGameState(snapshot: GameSnapshot, options: {
    persist?: boolean;
} = {}) {
    const persist = options.persist ?? false;
    let markets = snapshot.markets;
    markets = syncMarkets(markets);
    if (persist)
        write(KEYS.markets, markets);
    const normalizedPicks = normalizePicks(snapshot.picks);
    const picks = migratePicksForMarkets(normalizedPicks, markets);
    if (persist) {
        savePicks(picks);
    }
    const players = enrichPlayers(snapshot.players, picks, markets);
    if (persist && snapshot.players.length > 0) {
        savePlayers(players);
    }
    const normalizedConfig = normalizeConfig(snapshot.config);
    const migratedPromotion = migratePromotionSnapshotTiming(normalizedConfig);
    const rebuilt = rebuildLeaderboard(players, markets, picks, migratedPromotion.config);
    const normalizedScheduleChanged = snapshot.config.page1LocksAt !== normalizedConfig.page1LocksAt ||
        snapshot.config.page2LocksAt !== normalizedConfig.page2LocksAt ||
        snapshot.config.page3LocksAt !== normalizedConfig.page3LocksAt ||
        snapshot.config.answersPage1OpensAt !== normalizedConfig.answersPage1OpensAt ||
        snapshot.config.answersPage2OpensAt !== normalizedConfig.answersPage2OpensAt ||
        snapshot.config.answersPage3OpensAt !== normalizedConfig.answersPage3OpensAt ||
        snapshot.config.answersPage1ScheduleOpenApplied !==
            normalizedConfig.answersPage1ScheduleOpenApplied ||
        snapshot.config.answersPage2ScheduleOpenApplied !==
            normalizedConfig.answersPage2ScheduleOpenApplied ||
        snapshot.config.answersPage3ScheduleOpenApplied !==
            normalizedConfig.answersPage3ScheduleOpenApplied;
    const configChanged = normalizedScheduleChanged || migratedPromotion.changed || rebuilt.configChanged;
    if (persist) {
        if (configChanged)
            saveConfig(rebuilt.config);
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
    const hydrated = hydrateGameState({
        players: state.players,
        markets: state.markets,
        picks: state.picks,
        config: state.config
    }, { persist: false });
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
    if (playerId)
        write(KEYS.currentPlayerId, playerId);
    else if (isBrowser())
        localStorage.removeItem(KEYS.currentPlayerId);
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
        if (seen.has(input.marketId))
            throw new Error("DUPLICATE_MARKET");
        seen.add(input.marketId);
        const market = markets.find((m) => m.id === input.marketId);
        if (!market)
            throw new Error("INVALID_MARKET");
        if (!market.candidates?.includes(input.team))
            throw new Error("INVALID_TEAM");
        if (input.double) {
            if (market.page === 1)
                page1Doubles += 1;
            else if (market.page === 2)
                page2Doubles += 1;
            else
                page3Doubles += 1;
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

export function savePlayerPicks(name: string, pickInputs: PlayerPickInput[], state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config?: GameConfig;
}, playerId?: string | null, page?: PlayPage, leaderboardForPromotion?: LeaderboardEntry[], inviteCode?: string): {
    player: Player;
    picks: Pick[];
    leaderboard: LeaderboardEntry[];
    config?: GameConfig;
    isUpdate: boolean;
} {
    const trimmedName = name.trim();
    const existing = findKnownPlayer(state.players, playerId ?? null, trimmedName);
    assertRegistrationAllowed(
        trimmedName,
        playerId,
        state.players,
        state.config?.registrationClosed ?? false,
        inviteCode
    );
    const effectivePlayerId = existing?.id ?? null;
    // 晋级门槛暂不在保存时生效；第三页全员开放，待后续规则更新后再接 applyPromotionToSave。
    const finalPickInputs = pickInputs;
    const migratedPickInputs = migratePickInputsForMarkets(finalPickInputs, state.markets);
    validatePickInputs(migratedPickInputs, state.markets);
    if (existing) {
        const nameTaken = state.players.some((p) => p.id !== existing!.id && p.name.toLowerCase() === trimmedName.toLowerCase());
        if (nameTaken)
            throw new Error("DUPLICATE_NAME");
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

export function createPlayerWithPicks(name: string, pickInputs: PlayerPickInput[], state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
}) {
    return savePlayerPicks(name, pickInputs, state);
}
export function deletePlayer(playerId: string, state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config?: GameConfig;
}) {
    const players = state.players.filter((p) => p.id !== playerId);
    const picks = state.picks.filter((p) => p.playerId !== playerId);
    savePlayers(players);
    savePicks(picks);
    const config = removePlayerFromRankLockSnapshot(
        removePlayerFromPromotionSnapshot(state.config ?? defaultGameConfig(), playerId),
        playerId
    );
    if (state.config)
        saveConfig(config);
    const rebuilt = refreshLeaderboardWithConfig(players, state.markets, picks, config);
    return { players, picks, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}
export function setPlayerInGroup(playerId: string, inGroupPlayer: boolean, state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}) {
    if (!state.players.some((p) => p.id === playerId)) {
        throw new Error("PLAYER_NOT_FOUND");
    }
    const players = state.players.map((p) => p.id === playerId ? { ...p, inGroupPlayer } : p);
    savePlayers(players);
    const rebuilt = refreshLeaderboardWithConfig(players, state.markets, state.picks, state.config);
    return { players, picks: state.picks, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}
export function setPlayerHu(playerId: string, huPlayer: boolean, state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}) {
    if (!state.players.some((p) => p.id === playerId)) {
        throw new Error("PLAYER_NOT_FOUND");
    }
    const players = state.players.map((p) => p.id === playerId ? { ...p, huPlayer } : p);
    savePlayers(players);
    const rebuilt = refreshLeaderboardWithConfig(players, state.markets, state.picks, state.config);
    return { players, picks: state.picks, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}
export function setPhase12EarningsDeductions(state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}, enabled: boolean) {
    const players = enabled
        ? state.players.map((player) => {
            const pickStats = player.pickStats ??
                computePickStats(state.picks.filter((pick) => pick.playerId === player.id), state.markets);
            return { ...player, pickPenalty: calculatePhase12PickPenalty(pickStats) };
        })
        : state.players.map((player) => ({ ...player, pickPenalty: 0 }));
    const config = { ...state.config, phase12EarningsDeductionsApplied: enabled };
    savePlayers(players);
    saveConfig(config);
    const rebuilt = refreshLeaderboardWithConfig(players, state.markets, state.picks, config);
    return { players, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}
export function setPage3EarningsDeductions(state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}, enabled: boolean) {
    const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, state.config);
    const players = enabled
        ? state.players.map((player) => {
            const pickStats = player.pickStats ??
                computePickStats(state.picks.filter((pick) => pick.playerId === player.id), state.markets);
            return {
                ...player,
                pickPenaltyPage3: calculatePage3PickPenalty(
                    pickStats,
                    isPlayerPromoted(rebuilt.leaderboard, player.id, state.config),
                    player.id,
                    state.config
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

function recomputePage3PenaltiesIfEnabled(
    players: Player[],
    markets: Market[],
    picks: Pick[],
    config: GameConfig,
    leaderboard: LeaderboardEntry[]
): Player[] {
    if (!config.page3EarningsDeductionsApplied)
        return players;
    return players.map((player) => {
        const pickStats = player.pickStats ??
            computePickStats(picks.filter((pick) => pick.playerId === player.id), markets);
        return {
            ...player,
            pickPenaltyPage3: calculatePage3PickPenalty(
                pickStats,
                isPlayerPromoted(leaderboard, player.id, config),
                player.id,
                config
            )
        };
    });
}

export function setRankLockApplied(state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}, enabled: boolean) {
    if (!enabled) {
        const config: GameConfig = {
            ...state.config,
            rankLockApplied: false,
            rankLockAppliedAt: null,
            rankLockTopPlayerIds: null,
            rankLockBottomPlayerIds: null
        };
        saveConfig(config);
        const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, config);
        const players = recomputePage3PenaltiesIfEnabled(
            state.players,
            state.markets,
            state.picks,
            rebuilt.config,
            rebuilt.leaderboard
        );
        if (rebuilt.config.page3EarningsDeductionsApplied)
            savePlayers(players);
        return { players, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
    }

    const preLockLeaderboard = buildLeaderboard(state.players, state.markets, state.picks);
    const config: GameConfig = {
        ...state.config,
        rankLockApplied: true,
        ...computeRankLockSnapshot(preLockLeaderboard)
    };
    saveConfig(config);
    const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, config);
    const players = recomputePage3PenaltiesIfEnabled(
        state.players,
        state.markets,
        state.picks,
        rebuilt.config,
        rebuilt.leaderboard
    );
    if (rebuilt.config.page3EarningsDeductionsApplied)
        savePlayers(players);
    return { players, config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}

/** @deprecated Use setPhase12EarningsDeductions */

export function applyPickPenalties(state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
}) {
    const result = setPhase12EarningsDeductions({ ...state, config: defaultGameConfig({ phase12EarningsDeductionsApplied: true }) }, true);
    return { players: result.players, leaderboard: result.leaderboard };
}

/** @deprecated Use setPage3EarningsDeductions */

export function applyPickPenaltiesPage3(state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
}) {
    const result = setPage3EarningsDeductions({ ...state, config: defaultGameConfig({ page3EarningsDeductionsApplied: true }) }, true);
    return { players: result.players, leaderboard: result.leaderboard };
}
export function updateMarketWinner(marketId: string, winner: string | null, state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config?: GameConfig;
}) {
    const markets = state.markets.map((m) =>
        m.id === marketId
            ? {
                ...m,
                winner: winner || null,
                settledAt: winner ? new Date().toISOString() : null
            }
            : m
    );
    saveMarkets(markets);
    const leaderboard = refreshLeaderboard(state.players, markets, state.picks, state.config);
    return { markets, leaderboard };
}
export function setPageLocked(page: PlayPage, locked: boolean, state: {
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
}) {
    const config = applyManualPageLock(state.config, page, locked);
    const rebuilt = refreshLeaderboardWithConfig(state.players, state.markets, state.picks, config);
    return { config: rebuilt.config, leaderboard: rebuilt.leaderboard };
}
export function updatePublicFeature(feature: AnswersPageFeature, patch: {
    public?: boolean;
    opensAt?: string | null;
}, state: {
    config: GameConfig;
}) {
    const config = patchAnswersPageSchedule(state.config, feature, patch);
    saveConfig(config);
    return { config };
}
export function setEarlyMarketAnswersPublic(enabled: boolean, state: {
    config: GameConfig;
}) {
    const config = { ...state.config, answersM1_1Public: enabled };
    saveConfig(config);
    return { config };
}
export function setRegistrationClosed(closed: boolean, state: {
    config: GameConfig;
}) {
    const config = { ...state.config, registrationClosed: closed };
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
