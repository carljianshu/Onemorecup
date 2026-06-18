"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  deletePlayerApi,
  fetchLeaderboard,
  patchAdminConfigApi,
  patchMarketWinnerApi,
  registerPlayer,
  type LeaderboardResponse
} from "@/lib/api-client";
import { getAdminToken } from "@/lib/admin-auth";
import { LEADERBOARD_POLL_MS, pathNeedsLiveSync } from "@/lib/leaderboard-poll";
import { defaultPageLockSchedule } from "@/lib/page-lock";
import { isPageLocked } from "@/data/markets";
import {
  getCurrentPlayerId,
  hydrateGameState,
  loadGameState,
  recalculateLeaderboard,
  setCurrentPlayerId
} from "@/lib/local-store";
import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";
import type { AnswersPageFeature } from "@/lib/public-features";

interface GameContextValue {
  ready: boolean;
  apiSync: boolean;
  submitPicks: (
    name: string,
    pickInputs: PlayerPickInput[],
    playerId: string | null | undefined,
    page: PlayPage,
    pagePickInputs: PlayerPickInput[],
    inviteCode?: string
  ) => Promise<{ isUpdate: boolean; playerId: string; pickStats: PickStats }>;
  setMarketWinner: (marketId: string, winner: string | null) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  togglePageLocked: (page: PlayPage) => Promise<void>;
  setPublicFeature: (
    feature: AnswersPageFeature,
    patch: { public?: boolean; opensAt?: string | null }
  ) => Promise<void>;
  refreshScores: () => void;
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

function applyLeaderboardData(
  data: LeaderboardResponse,
  setters: {
    setPlayers: (v: Player[]) => void;
    setMarkets: (v: Market[]) => void;
    setPicks: (v: Pick[]) => void;
    setConfig: (v: GameConfig) => void;
    setLeaderboard: (v: LeaderboardEntry[]) => void;
  }
) {
  const hydrated = hydrateGameState(
    {
      players: data.players,
      markets: data.markets,
      picks: data.picks,
      config: data.config
    },
    { persist: true }
  );
  setters.setPlayers(hydrated.players);
  setters.setMarkets(hydrated.markets);
  setters.setPicks(hydrated.picks);
  setters.setConfig(hydrated.config);
  setters.setLeaderboard(data.leaderboard ?? hydrated.leaderboard);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [apiSync, setApiSync] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [config, setConfig] = useState<GameConfig>({
    page1Locked: false,
    page2Locked: false,
    page3Locked: false,
    ...defaultPageLockSchedule(),
    answersPage1Public: false,
    answersPage2Public: false,
    answersPage3Public: false,
    answersPage1OpensAt: null,
    answersPage2OpensAt: null,
    answersPage3OpensAt: null
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
        if (cancelled) return;
        applyResponse(data);
        setApiSync(true);
      } catch {
        if (cancelled) return;
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
    const onVisibilityChange = () => {
      setTabVisible(document.visibilityState !== "hidden");
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!ready || !apiSync || !tabVisible || !pathNeedsLiveSync(pathname)) return;

    let cancelled = false;

    const pull = () => {
      fetchLeaderboard()
        .then((next) => {
          if (!cancelled) applyResponse(next);
        })
        .catch(() => undefined);
    };

    pull();
    const pollId = window.setInterval(pull, LEADERBOARD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [ready, apiSync, tabVisible, pathname, applyResponse]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => setLockTick((tick) => tick + 1), 30_000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!ready || apiSync) return;
    setLeaderboard(recalculateLeaderboard({ players, markets, picks, config }));
  }, [lockTick, ready, apiSync, players, markets, picks, config]);

  const submitPicks = useCallback(
    async (
      name: string,
      pickInputs: PlayerPickInput[],
      playerId: string | null | undefined,
      page: PlayPage,
      pagePickInputs: PlayerPickInput[],
      inviteCode?: string
    ) => {
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
      const result = savePlayerPicks(
        name,
        pickInputs,
        { players, markets, picks },
        playerId,
        page,
        leaderboard,
        inviteCode
      );
      setPlayers((prev) => {
        const exists = prev.some((p) => p.id === result.player.id);
        return exists ? prev.map((p) => (p.id === result.player.id ? result.player : p)) : [...prev, result.player];
      });
      setPicks((prev) => [
        ...prev.filter((pick) => pick.playerId !== result.player.id),
        ...result.picks
      ]);
      setLeaderboard(result.leaderboard);
      setCurrentPlayerIdState(result.player.id);
      return { isUpdate: result.isUpdate, playerId: result.player.id, pickStats: result.player.pickStats };
    },
    [apiSync, players, markets, picks, leaderboard, applyResponse]
  );

  const requireAdminToken = () => {
    const token = getAdminToken();
    if (!token) throw new Error("UNAUTHORIZED");
    return token;
  };

  const setMarketWinner = useCallback(
    async (marketId: string, winner: string | null) => {
      if (apiSync) {
        applyResponse(await patchMarketWinnerApi(requireAdminToken(), marketId, winner));
        return;
      }
      const { updateMarketWinner } = await import("@/lib/local-store");
      const result = updateMarketWinner(marketId, winner, { players, markets, picks });
      setMarkets(result.markets);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, players, markets, picks, applyResponse]
  );

  const deletePlayer = useCallback(
    async (playerId: string) => {
      if (apiSync) {
        applyResponse(await deletePlayerApi(requireAdminToken(), playerId));
        return;
      }
      const { deletePlayer: deletePlayerLocal } = await import("@/lib/local-store");
      const result = deletePlayerLocal(playerId, { players, markets, picks, config });
      setPlayers(result.players);
      setPicks(result.picks);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, players, markets, picks, config, applyResponse]
  );

  const togglePageLocked = useCallback(
    async (page: PlayPage) => {
      const currentlyLocked = isPageLocked(config, page);
      if (apiSync) {
        applyResponse(
          await patchAdminConfigApi(requireAdminToken(), {
            page,
            locked: !currentlyLocked
          })
        );
        return;
      }
      const { setPageLocked } = await import("@/lib/local-store");
      const result = setPageLocked(page, !currentlyLocked, { players, markets, picks, config, leaderboard });
      setConfig(result.config);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, config, players, markets, picks, leaderboard, applyResponse]
  );

  const setPublicFeature = useCallback(
    async (feature: AnswersPageFeature, patch: { public?: boolean; opensAt?: string | null }) => {
      if (apiSync) {
        applyResponse(
          await patchAdminConfigApi(requireAdminToken(), {
            feature,
            public: patch.public,
            opensAt: patch.opensAt
          })
        );
        return;
      }
      const { updatePublicFeature } = await import("@/lib/local-store");
      const result = updatePublicFeature(feature, patch, { config });
      setConfig(result.config);
    },
    [apiSync, config, applyResponse]
  );

  const refreshScores = useCallback(() => {
    const lb = recalculateLeaderboard({ players, markets, picks, config });
    setLeaderboard(lb);
  }, [players, markets, picks, config]);

  const value = useMemo(
    () => ({
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
      togglePageLocked,
      setPublicFeature,
      refreshScores
    }),
    [
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
      togglePageLocked,
      setPublicFeature,
      refreshScores
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
