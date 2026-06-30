"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deletePlayerApi, patchPlayerHuApi, patchPlayerInGroupApi, fetchLeaderboard, setPhase12EarningsDeductionsApi, setPage3EarningsDeductionsApi, patchAdminConfigApi, patchMarketWinnerApi, registerPlayer, type LeaderboardResponse } from "@/lib/api-client";
import { getAdminToken } from "@/lib/admin-auth";
import { maybeSaveAdminBackup } from "@/lib/admin-backup";
import { defaultPageLockSchedule } from "@/lib/page-lock";
import { defaultAnswersPageSchedule } from "@/lib/public-features";
import { isPageLocked } from "@/data/markets";
import { getCurrentPlayerId, hydrateGameState, loadGameState, recalculateLeaderboardWithConfig, setCurrentPlayerId } from "@/lib/local-store";
import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";
import type { AnswersPageFeature } from "@/lib/public-features";
interface GameContextValue {
    ready: boolean;
    apiSync: boolean;
    submitPicks: (name: string, pickInputs: PlayerPickInput[], playerId: string | null | undefined, page: PlayPage, pagePickInputs: PlayerPickInput[], inviteCode?: string) => Promise<{
        isUpdate: boolean;
        playerId: string;
        pickStats: PickStats;
    }>;
    setMarketWinner: (marketId: string, winner: string | null) => Promise<void>;
    deletePlayer: (playerId: string) => Promise<void>;
    setPlayerInGroup: (playerId: string, inGroupPlayer: boolean) => Promise<void>;
    setPlayerHu: (playerId: string, huPlayer: boolean) => Promise<void>;
    togglePageLocked: (page: PlayPage) => Promise<void>;
    setPublicFeature: (feature: AnswersPageFeature, patch: {
        public?: boolean;
        opensAt?: string | null;
    }) => Promise<void>;
    setEarlyMarketAnswersPublic: (enabled: boolean) => Promise<void>;
    setRegistrationClosed: (closed: boolean) => Promise<void>;
    refreshScores: () => void;
    refreshFromCloud: () => Promise<void>;
    setPhase12EarningsDeductions: (enabled: boolean) => Promise<void>;
    setPage3EarningsDeductions: (enabled: boolean) => Promise<void>;
    players: Player[];
    markets: Market[];
    picks: Pick[];
    config: GameConfig;
    leaderboard: LeaderboardEntry[];
    currentPlayerId: string | null;
}
const GameContext = createContext<GameContextValue | null>(null);
function applyLeaderboardData(data: LeaderboardResponse, setters: {
    setPlayers: (v: Player[]) => void;
    setMarkets: (v: Market[]) => void;
    setPicks: (v: Pick[]) => void;
    setConfig: (v: GameConfig) => void;
    setLeaderboard: (v: LeaderboardEntry[]) => void;
}) {
    const hydrated = hydrateGameState({
        players: data.players,
        markets: data.markets,
        picks: data.picks,
        config: data.config
    }, { persist: true });
    setters.setPlayers(hydrated.players);
    setters.setMarkets(hydrated.markets);
    setters.setPicks(hydrated.picks);
    setters.setConfig(hydrated.config);
    setters.setLeaderboard(data.leaderboard ?? hydrated.leaderboard);
    if (typeof data.version === "number") {
        const saved = maybeSaveAdminBackup({
            version: data.version,
            players: hydrated.players,
            markets: hydrated.markets,
            picks: hydrated.picks,
            config: hydrated.config
        });
        if (saved && typeof window !== "undefined") {
            window.dispatchEvent(new Event("onemorecup-admin-backup"));
        }
    }
}
export function GameProvider({ children }: {
    children: ReactNode;
}) {
    const [ready, setReady] = useState(false);
    const [apiSync, setApiSync] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [picks, setPicks] = useState<Pick[]>([]);
    const [config, setConfig] = useState<GameConfig>({
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
        registrationClosed: false
    });
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentPlayerId, setCurrentPlayerIdState] = useState<string | null>(null);
    const [lockTick, setLockTick] = useState(0);
    const settersRef = useRef({ setPlayers, setMarkets, setPicks, setConfig, setLeaderboard });
    settersRef.current = { setPlayers, setMarkets, setPicks, setConfig, setLeaderboard };
    const applyResponse = useCallback((data: LeaderboardResponse) => {
        applyLeaderboardData(data, settersRef.current);
    }, []);
    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                const data = await fetchLeaderboard();
                if (cancelled)
                    return;
                applyResponse(data);
                setApiSync(true);
            }
            catch {
                if (cancelled)
                    return;
                const local = loadGameState();
                setPlayers(local.players);
                setMarkets(local.markets);
                setPicks(local.picks);
                setConfig(local.config);
                setLeaderboard(local.leaderboard);
                setApiSync(false);
            }
            setCurrentPlayerIdState(getCurrentPlayerId());
            setReady(true);
        }
        void init();
        return () => {
            cancelled = true;
        };
    }, [applyResponse]);
    useEffect(() => {
        if (!ready)
            return;
        if (currentPlayerId && !players.some((player) => player.id === currentPlayerId)) {
            setCurrentPlayerId(null);
            setCurrentPlayerIdState(null);
        }
    }, [ready, players, currentPlayerId]);
    useEffect(() => {
        if (!ready)
            return;
        const id = window.setInterval(() => setLockTick((tick) => tick + 1), 30000);
        return () => clearInterval(id);
    }, [ready]);
    useEffect(() => {
        if (!ready || apiSync)
            return;
        const rebuilt = recalculateLeaderboardWithConfig({ players, markets, picks, config });
        setLeaderboard(rebuilt.leaderboard);
        if (rebuilt.configChanged)
            setConfig(rebuilt.config);
    }, [lockTick, ready, apiSync, players, markets, picks, config]);
    const submitPicks = useCallback(async (name: string, pickInputs: PlayerPickInput[], playerId: string | null | undefined, page: PlayPage, pagePickInputs: PlayerPickInput[], inviteCode?: string) => {
        if (apiSync) {
            const result = await registerPlayer({
                name,
                playerId,
                inviteCode,
                pickInputs,
                page,
                pagePickInputs
            });
            applyResponse(result);
            setCurrentPlayerId(result.player.id);
            setCurrentPlayerIdState(result.player.id);
            return {
                isUpdate: result.isUpdate,
                playerId: result.player.id,
                pickStats: result.pickStats
            };
        }
        const { savePlayerPicks } = await import("@/lib/local-store");
        const result = savePlayerPicks(name, pickInputs, { players, markets, picks, config }, playerId, page, leaderboard, inviteCode);
        setPlayers((prev) => {
            const exists = prev.some((p) => p.id === result.player.id);
            return exists ? prev.map((p) => (p.id === result.player.id ? result.player : p)) : [...prev, result.player];
        });
        setPicks((prev) => [
            ...prev.filter((pick) => pick.playerId !== result.player.id),
            ...result.picks
        ]);
        setLeaderboard(result.leaderboard);
        if (result.config)
            setConfig(result.config);
        setCurrentPlayerIdState(result.player.id);
        return { isUpdate: result.isUpdate, playerId: result.player.id, pickStats: result.player.pickStats };
    }, [apiSync, players, markets, picks, config, leaderboard, applyResponse]);
    const requireAdminToken = () => {
        const token = getAdminToken();
        if (!token)
            throw new Error("UNAUTHORIZED");
        return token;
    };
    const setMarketWinner = useCallback(async (marketId: string, winner: string | null) => {
        if (apiSync) {
            applyResponse(await patchMarketWinnerApi(requireAdminToken(), marketId, winner));
            return;
        }
        const { updateMarketWinner } = await import("@/lib/local-store");
        const result = updateMarketWinner(marketId, winner, { players, markets, picks, config });
        setMarkets(result.markets);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const deletePlayer = useCallback(async (playerId: string) => {
        if (apiSync) {
            applyResponse(await deletePlayerApi(requireAdminToken(), playerId));
            return;
        }
        const { deletePlayer: deletePlayerLocal } = await import("@/lib/local-store");
        const result = deletePlayerLocal(playerId, { players, markets, picks, config });
        setPlayers(result.players);
        setPicks(result.picks);
        setConfig(result.config);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const setPlayerInGroup = useCallback(async (playerId: string, inGroupPlayer: boolean) => {
        if (apiSync) {
            applyResponse(await patchPlayerInGroupApi(requireAdminToken(), playerId, inGroupPlayer));
            return;
        }
        const { setPlayerInGroup: setLocal } = await import("@/lib/local-store");
        const result = setLocal(playerId, inGroupPlayer, { players, markets, picks, config });
        setPlayers(result.players);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const setPlayerHu = useCallback(async (playerId: string, huPlayer: boolean) => {
        if (apiSync) {
            applyResponse(await patchPlayerHuApi(requireAdminToken(), playerId, huPlayer));
            return;
        }
        const { setPlayerHu: setLocal } = await import("@/lib/local-store");
        const result = setLocal(playerId, huPlayer, { players, markets, picks, config });
        setPlayers(result.players);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const togglePageLocked = useCallback(async (page: PlayPage) => {
        const currentlyLocked = isPageLocked(config, page);
        if (apiSync) {
            applyResponse(await patchAdminConfigApi(requireAdminToken(), {
                page,
                locked: !currentlyLocked
            }));
            return;
        }
        const { setPageLocked } = await import("@/lib/local-store");
        const result = setPageLocked(page, !currentlyLocked, { players, markets, picks, config });
        setConfig(result.config);
        setLeaderboard(result.leaderboard);
    }, [apiSync, config, players, markets, picks, applyResponse]);
    const setPublicFeature = useCallback(async (feature: AnswersPageFeature, patch: {
        public?: boolean;
        opensAt?: string | null;
    }) => {
        if (apiSync) {
            applyResponse(await patchAdminConfigApi(requireAdminToken(), {
                feature,
                public: patch.public,
                opensAt: patch.opensAt
            }));
            return;
        }
        const { updatePublicFeature } = await import("@/lib/local-store");
        const result = updatePublicFeature(feature, patch, { config });
        setConfig(result.config);
    }, [apiSync, config, applyResponse]);
    const setEarlyMarketAnswersPublic = useCallback(async (enabled: boolean) => {
        if (apiSync) {
            applyResponse(await patchAdminConfigApi(requireAdminToken(), { answersM1_1Public: enabled }));
            return;
        }
        const { setEarlyMarketAnswersPublic: setLocal } = await import("@/lib/local-store");
        const result = setLocal(enabled, { config });
        setConfig(result.config);
    }, [apiSync, config, applyResponse]);
    const setRegistrationClosed = useCallback(async (closed: boolean) => {
        if (apiSync) {
            applyResponse(await patchAdminConfigApi(requireAdminToken(), { registrationClosed: closed }));
            return;
        }
        const { setRegistrationClosed: setLocal } = await import("@/lib/local-store");
        const result = setLocal(closed, { config });
        setConfig(result.config);
    }, [apiSync, config, applyResponse]);
    const refreshScores = useCallback(() => {
        const rebuilt = recalculateLeaderboardWithConfig({ players, markets, picks, config });
        setLeaderboard(rebuilt.leaderboard);
        if (rebuilt.configChanged)
            setConfig(rebuilt.config);
    }, [players, markets, picks, config]);
    const refreshFromCloud = useCallback(async () => {
        if (!apiSync)
            return;
        applyResponse(await fetchLeaderboard());
    }, [apiSync, applyResponse]);
    const setPhase12EarningsDeductions = useCallback(async (enabled: boolean) => {
        if (apiSync) {
            applyResponse(await setPhase12EarningsDeductionsApi(requireAdminToken(), enabled));
            return;
        }
        const { setPhase12EarningsDeductions: setLocal } = await import("@/lib/local-store");
        const result = setLocal({ players, markets, picks, config }, enabled);
        setPlayers(result.players);
        setConfig(result.config);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const setPage3EarningsDeductions = useCallback(async (enabled: boolean) => {
        if (apiSync) {
            applyResponse(await setPage3EarningsDeductionsApi(requireAdminToken(), enabled));
            return;
        }
        const { setPage3EarningsDeductions: setLocal } = await import("@/lib/local-store");
        const result = setLocal({ players, markets, picks, config }, enabled);
        setPlayers(result.players);
        setConfig(result.config);
        setLeaderboard(result.leaderboard);
    }, [apiSync, players, markets, picks, config, applyResponse]);
    const value = useMemo(() => ({
        ready,
        apiSync,
        players,
        markets,
        picks,
        config,
        leaderboard,
        currentPlayerId,
        submitPicks,
        setMarketWinner,
        deletePlayer,
        setPlayerInGroup,
        setPlayerHu,
        togglePageLocked,
        setPublicFeature,
        setEarlyMarketAnswersPublic,
        setRegistrationClosed,
        refreshScores,
        refreshFromCloud,
        setPhase12EarningsDeductions,
        setPage3EarningsDeductions
    }), [
        ready,
        apiSync,
        players,
        markets,
        picks,
        config,
        leaderboard,
        currentPlayerId,
        submitPicks,
        setMarketWinner,
        deletePlayer,
        setPlayerInGroup,
        setPlayerHu,
        togglePageLocked,
        setPublicFeature,
        setEarlyMarketAnswersPublic,
        setRegistrationClosed,
        refreshScores,
        refreshFromCloud,
        setPhase12EarningsDeductions,
        setPage3EarningsDeductions
    ]);
    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
export function useGame() {
    const ctx = useContext(GameContext);
    if (!ctx)
        throw new Error("useGame must be used within GameProvider");
    return ctx;
}
