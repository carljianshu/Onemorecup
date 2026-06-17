"use client";

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
  deleteSubQuestionApi,
  fetchLeaderboard,
  patchAdminConfigApi,
  patchMarketWinnerApi,
  patchSubQuestionWinnerApi,
  registerPlayer,
  restoreSubQuestionApi,
  type LeaderboardResponse
} from "@/lib/api-client";
import { getAdminToken } from "@/lib/admin-auth";
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
    pagePickInputs: PlayerPickInput[]
  ) => Promise<{ isUpdate: boolean; playerId: string; pickStats: PickStats }>;
  setMarketWinner: (marketId: string, winner: string | null) => Promise<void>;
  setSubQuestionWinner: (marketId: string, subId: string, winner: string | null) => Promise<void>;
  deleteSubQuestion: (marketId: string, subId: string) => Promise<void>;
  restoreSubQuestion: (marketId: string, subId: string) => Promise<void>;
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
  const [ready, setReady] = useState(false);
  const [apiSync, setApiSync] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [config, setConfig] = useState<GameConfig>({
    page1Locked: false,
    page2Locked: false,
    answersPage1Public: false,
    answersPage2Public: false,
    answersPage1OpensAt: null,
    answersPage2OpensAt: null
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPlayerId, setCurrentPlayerIdState] = useState<string | null>(null);

  const settersRef = useRef({ setPlayers, setMarkets, setPicks, setConfig, setLeaderboard });
  settersRef.current = { setPlayers, setMarkets, setPicks, setConfig, setLeaderboard };

  const applyResponse = useCallback((data: LeaderboardResponse) => {
    applyLeaderboardData(data, settersRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    async function init() {
      try {
        const data = await fetchLeaderboard();
        if (cancelled) return;
        applyResponse(data);
        setApiSync(true);

        pollId = setInterval(() => {
          fetchLeaderboard()
            .then((next) => {
              if (!cancelled) applyResponse(next);
            })
            .catch(() => undefined);
        }, 5000);
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
      if (pollId) clearInterval(pollId);
    };
  }, [applyResponse]);

  const submitPicks = useCallback(
    async (
      name: string,
      pickInputs: PlayerPickInput[],
      playerId: string | null | undefined,
      page: PlayPage,
      pagePickInputs: PlayerPickInput[]
    ) => {
      if (apiSync) {
        const result = await registerPlayer({
          name,
          playerId,
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
      const result = savePlayerPicks(name, pickInputs, { players, markets, picks }, playerId);
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
    [apiSync, players, markets, picks, applyResponse]
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

  const setSubQuestionWinner = useCallback(
    async (marketId: string, subId: string, winner: string | null) => {
      if (apiSync) {
        applyResponse(await patchSubQuestionWinnerApi(requireAdminToken(), marketId, subId, winner));
        return;
      }
      const { updateSubQuestionWinner } = await import("@/lib/local-store");
      const result = updateSubQuestionWinner(marketId, subId, winner, { players, markets, picks });
      setMarkets(result.markets);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, players, markets, picks, applyResponse]
  );

  const deleteSubQuestion = useCallback(
    async (marketId: string, subId: string) => {
      if (apiSync) {
        applyResponse(await deleteSubQuestionApi(requireAdminToken(), marketId, subId));
        return;
      }
      const { removeSubQuestion } = await import("@/lib/local-store");
      const result = removeSubQuestion(marketId, subId, { players, markets, picks });
      setMarkets(result.markets);
      setPlayers(result.players);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, players, markets, picks, applyResponse]
  );

  const restoreSubQuestionAction = useCallback(
    async (marketId: string, subId: string) => {
      if (apiSync) {
        applyResponse(await restoreSubQuestionApi(requireAdminToken(), marketId, subId));
        return;
      }
      const { restoreSubQuestion } = await import("@/lib/local-store");
      const result = restoreSubQuestion(marketId, subId, { players, markets, picks });
      setMarkets(result.markets);
      setPlayers(result.players);
      setLeaderboard(result.leaderboard);
    },
    [apiSync, players, markets, picks, applyResponse]
  );

  const togglePageLocked = useCallback(
    async (page: PlayPage) => {
      const currentlyLocked = page === 1 ? config.page1Locked : config.page2Locked;
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
      setSubQuestionWinner,
      deleteSubQuestion,
      restoreSubQuestion: restoreSubQuestionAction,
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
      setSubQuestionWinner,
      deleteSubQuestion,
      restoreSubQuestionAction,
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
