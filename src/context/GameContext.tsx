"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  getCurrentPlayerId,
  loadGameState,
  recalculateLeaderboard,
  removeSubQuestion,
  restoreSubQuestion,
  savePlayerPicks,
  setPageLocked,
  updateMarketWinner,
  updatePublicFeature,
  updateSubQuestionWinner
} from "@/lib/local-store";
import type { GameConfig, LeaderboardEntry, Market, Pick, PickStats, Player, PlayerPickInput, PlayPage } from "@/types";
import type { AnswersPageFeature } from "@/lib/public-features";

interface GameContextValue {
  ready: boolean;
  players: Player[];
  markets: Market[];
  picks: Pick[];
  config: GameConfig;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string | null;
  submitPicks: (
    name: string,
    pickInputs: PlayerPickInput[],
    playerId?: string | null
  ) => { isUpdate: boolean; playerId: string; pickStats: PickStats };
  setMarketWinner: (marketId: string, winner: string | null) => void;
  setSubQuestionWinner: (marketId: string, subId: string, winner: string | null) => void;
  deleteSubQuestion: (marketId: string, subId: string) => void;
  restoreSubQuestion: (marketId: string, subId: string) => void;
  togglePageLocked: (page: PlayPage) => void;
  setPublicFeature: (
    feature: AnswersPageFeature,
    patch: { public?: boolean; opensAt?: string | null }
  ) => void;
  refreshScores: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    const state = loadGameState();
    setPlayers(state.players);
    setMarkets(state.markets);
    setPicks(state.picks);
    setConfig(state.config);
    setLeaderboard(state.leaderboard);
    setCurrentPlayerIdState(getCurrentPlayerId());
    setReady(true);
  }, []);

  const submitPicks = useCallback(
    (name: string, pickInputs: PlayerPickInput[], playerId?: string | null) => {
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
    [players, markets, picks]
  );

  const setMarketWinner = useCallback(
    (marketId: string, winner: string | null) => {
      const result = updateMarketWinner(marketId, winner, { players, markets, picks });
      setMarkets(result.markets);
      setLeaderboard(result.leaderboard);
    },
    [players, markets, picks]
  );

  const setSubQuestionWinner = useCallback(
    (marketId: string, subId: string, winner: string | null) => {
      const result = updateSubQuestionWinner(marketId, subId, winner, { players, markets, picks });
      setMarkets(result.markets);
      setLeaderboard(result.leaderboard);
    },
    [players, markets, picks]
  );

  const deleteSubQuestion = useCallback(
    (marketId: string, subId: string) => {
      const result = removeSubQuestion(marketId, subId, { players, markets, picks });
      setMarkets(result.markets);
      setPlayers(result.players);
      setLeaderboard(result.leaderboard);
    },
    [players, markets, picks]
  );

  const restoreSubQuestionAction = useCallback(
    (marketId: string, subId: string) => {
      const result = restoreSubQuestion(marketId, subId, { players, markets, picks });
      setMarkets(result.markets);
      setPlayers(result.players);
      setLeaderboard(result.leaderboard);
    },
    [players, markets, picks]
  );

  const togglePageLocked = useCallback(
    (page: PlayPage) => {
      const currentlyLocked = page === 1 ? config.page1Locked : config.page2Locked;
      const result = setPageLocked(page, !currentlyLocked, { players, markets, picks, config, leaderboard });
      setConfig(result.config);
      setLeaderboard(result.leaderboard);
    },
    [config, players, markets, picks, leaderboard]
  );

  const setPublicFeature = useCallback(
    (feature: AnswersPageFeature, patch: { public?: boolean; opensAt?: string | null }) => {
      const result = updatePublicFeature(feature, patch, { config });
      setConfig(result.config);
    },
    [config]
  );

  const refreshScores = useCallback(() => {
    const lb = recalculateLeaderboard({ players, markets, picks, config });
    setLeaderboard(lb);
  }, [players, markets, picks, config]);

  const value = useMemo(
    () => ({
      ready,
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
    [ready, players, markets, picks, config, leaderboard, currentPlayerId, submitPicks, setMarketWinner, setSubQuestionWinner, deleteSubQuestion, restoreSubQuestionAction, togglePageLocked, setPublicFeature, refreshScores]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
