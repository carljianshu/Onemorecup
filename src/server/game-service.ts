import {
  hydrateGameState,
  removeSubQuestion,
  restoreSubQuestion,
  savePlayerPicks,
  setPageLocked,
  snapshotFromState,
  updateMarketWinner,
  updatePublicFeature,
  updateSubQuestionWinner,
  type GameSnapshot
} from "@/lib/local-store";
import { validatePage2MainQuestionState } from "@/lib/market-helpers";
import { validatePageSave } from "@/lib/pick-stats";
import { buildLeaderboard } from "@/lib/scoring";
import { mutateStoredGame } from "@/server/persist";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { GameConfig, LeaderboardEntry, PlayerPickInput, PlayPage } from "@/types";

export interface GameStateResponse {
  players: ReturnType<typeof hydrateGameState>["players"];
  markets: ReturnType<typeof hydrateGameState>["markets"];
  picks: ReturnType<typeof hydrateGameState>["picks"];
  config: GameConfig;
  leaderboard: LeaderboardEntry[];
  version: number;
}

function toResponse(stored: { version: number; payload: GameSnapshot }): GameStateResponse {
  const state = hydrateGameState(stored.payload, { persist: false });
  return {
    players: state.players,
    markets: state.markets,
    picks: state.picks,
    config: state.config,
    leaderboard: state.leaderboard,
    version: stored.version
  };
}

export async function getGameState(): Promise<GameStateResponse> {
  const { readStoredGame } = await import("@/server/storage");
  const stored = await readStoredGame();
  return toResponse(stored);
}

function selectionsFromPickInputs(pickInputs: PlayerPickInput[]) {
  const map: Record<string, string | null> = {};
  for (const input of pickInputs) {
    map[input.marketId] = input.team;
  }
  return map;
}

function assertPageUnlocked(config: GameConfig, page: PlayPage) {
  const locked = page === 1 ? config.page1Locked : config.page2Locked;
  if (locked) {
    throw new Error("PAGE_LOCKED");
  }
}

function validatePlayerSave(
  page: PlayPage,
  pickInputs: PlayerPickInput[],
  pagePickInputs: PlayerPickInput[],
  markets: GameStateResponse["markets"]
) {
  if (page === 2) {
    const structureError = validatePage2MainQuestionState(markets, selectionsFromPickInputs(pickInputs));
    if (structureError) throw new Error(structureError);
  }

  const validationError = validatePageSave(page, pickInputs, markets, pagePickInputs);
  if (validationError) throw new Error(validationError);
}

export async function putPlayerPicks(
  playerId: string | null,
  body: {
    name: string;
    pickInputs: PlayerPickInput[];
    page: PlayPage;
    pagePickInputs: PlayerPickInput[];
  },
  expectedVersion?: number
) {
  let saveResult: ReturnType<typeof savePlayerPicks> | null = null;

  const stored = await mutateStoredGame((current) => {
    const state = hydrateGameState(current.payload, { persist: false });
    assertPageUnlocked(state.config, body.page);
    validatePlayerSave(body.page, body.pickInputs, body.pagePickInputs, state.markets);

    saveResult = savePlayerPicks(
      body.name,
      body.pickInputs,
      { players: state.players, markets: state.markets, picks: state.picks },
      playerId && playerId !== "new" ? playerId : null
    );

    return snapshotFromState({
      players: saveResult.isUpdate
        ? state.players.map((p) => (p.id === saveResult!.player.id ? saveResult!.player : p))
        : [...state.players, saveResult.player],
      markets: state.markets,
      picks: [
        ...state.picks.filter((pick) => pick.playerId !== saveResult!.player.id),
        ...saveResult.picks
      ],
      config: state.config
    });
  }, expectedVersion);

  const response = toResponse(stored);
  return {
    ...response,
    player: saveResult!.player,
    isUpdate: saveResult!.isUpdate,
    pickStats: saveResult!.player.pickStats
  };
}

async function mutateAdmin(
  mutator: (state: ReturnType<typeof hydrateGameState>) => GameSnapshot,
  expectedVersion?: number
) {
  const stored = await mutateStoredGame((current) => {
    const state = hydrateGameState(current.payload, { persist: false });
    return mutator(state);
  }, expectedVersion);
  return toResponse(stored);
}

export function patchMarketWinner(
  marketId: string,
  winner: string | null,
  expectedVersion?: number
) {
  return mutateAdmin((state) => {
    const result = updateMarketWinner(marketId, winner, {
      players: state.players,
      markets: state.markets,
      picks: state.picks
    });
    return snapshotFromState({
      players: state.players,
      markets: result.markets,
      picks: state.picks,
      config: state.config
    });
  }, expectedVersion);
}

export function patchSubQuestionWinner(
  marketId: string,
  subId: string,
  winner: string | null,
  expectedVersion?: number
) {
  return mutateAdmin((state) => {
    const result = updateSubQuestionWinner(marketId, subId, winner, {
      players: state.players,
      markets: state.markets,
      picks: state.picks
    });
    return snapshotFromState({
      players: state.players,
      markets: result.markets,
      picks: state.picks,
      config: state.config
    });
  }, expectedVersion);
}

export function hideSubQuestion(marketId: string, subId: string, expectedVersion?: number) {
  return mutateAdmin((state) => {
    const result = removeSubQuestion(marketId, subId, {
      players: state.players,
      markets: state.markets,
      picks: state.picks
    });
    return snapshotFromState({
      players: result.players,
      markets: result.markets,
      picks: result.picks,
      config: state.config
    });
  }, expectedVersion);
}

export function restoreSubQuestionAction(marketId: string, subId: string, expectedVersion?: number) {
  return mutateAdmin((state) => {
    const result = restoreSubQuestion(marketId, subId, {
      players: state.players,
      markets: state.markets,
      picks: state.picks
    });
    return snapshotFromState({
      players: result.players,
      markets: result.markets,
      picks: result.picks,
      config: state.config
    });
  }, expectedVersion);
}

export function patchGameConfig(
  patch: Partial<GameConfig> & {
    page?: PlayPage;
    pageLocked?: boolean;
    feature?: AnswersPageFeature;
    public?: boolean;
    opensAt?: string | null;
  },
  expectedVersion?: number
) {
  return mutateAdmin((state) => {
    let config = state.config;
    let leaderboard = state.leaderboard;

    if (patch.page !== undefined && patch.pageLocked !== undefined) {
      const result = setPageLocked(patch.page, patch.pageLocked, {
        players: state.players,
        markets: state.markets,
        picks: state.picks,
        config: state.config,
        leaderboard: state.leaderboard
      });
      config = result.config;
      leaderboard = result.leaderboard;
    } else {
      if (patch.page1Locked !== undefined) config = { ...config, page1Locked: patch.page1Locked };
      if (patch.page2Locked !== undefined) config = { ...config, page2Locked: patch.page2Locked };
      if (patch.answersPage1Public !== undefined) {
        config = { ...config, answersPage1Public: patch.answersPage1Public };
      }
      if (patch.answersPage2Public !== undefined) {
        config = { ...config, answersPage2Public: patch.answersPage2Public };
      }
      if (patch.answersPage1OpensAt !== undefined) {
        config = { ...config, answersPage1OpensAt: patch.answersPage1OpensAt };
      }
      if (patch.answersPage2OpensAt !== undefined) {
        config = { ...config, answersPage2OpensAt: patch.answersPage2OpensAt };
      }
      if (patch.feature) {
        const result = updatePublicFeature(
          patch.feature,
          { public: patch.public, opensAt: patch.opensAt },
          { config }
        );
        config = result.config;
      }
      leaderboard = buildLeaderboard(state.players, state.markets, state.picks, config.page2Locked);
    }

    return snapshotFromState({
      players: state.players,
      markets: state.markets,
      picks: state.picks,
      config
    });
  }, expectedVersion);
}
