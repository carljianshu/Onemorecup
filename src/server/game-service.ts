import {
  hydrateGameState,
  savePlayerPicks,
  snapshotFromState,
  type GameSnapshot
} from "@/lib/local-store";
import { validatePage2MainQuestionState } from "@/lib/market-helpers";
import { validatePageSave } from "@/lib/pick-stats";
import { mutateStoredGame, readStoredGame } from "@/server/storage";
import type { GameConfig, LeaderboardEntry, PlayerPickInput, PlayPage } from "@/types";

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  players: ReturnType<typeof hydrateGameState>["players"];
  markets: ReturnType<typeof hydrateGameState>["markets"];
  picks: ReturnType<typeof hydrateGameState>["picks"];
  config: GameConfig;
  version: number;
}

function toResponse(stored: { version: number; payload: GameSnapshot }): LeaderboardResponse {
  const state = hydrateGameState(stored.payload, { persist: false });
  return {
    leaderboard: state.leaderboard,
    players: state.players,
    markets: state.markets,
    picks: state.picks,
    config: state.config,
    version: stored.version
  };
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
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
  if (locked) throw new Error("PAGE_LOCKED");
}

function validatePlayerSave(
  page: PlayPage,
  pickInputs: PlayerPickInput[],
  pagePickInputs: PlayerPickInput[],
  markets: LeaderboardResponse["markets"]
) {
  if (page === 2) {
    const structureError = validatePage2MainQuestionState(markets, selectionsFromPickInputs(pickInputs));
    if (structureError) throw new Error(structureError);
  }

  const validationError = validatePageSave(page, pickInputs, markets, pagePickInputs);
  if (validationError) throw new Error(validationError);
}

export async function registerPlayer(
  body: {
    name: string;
    playerId?: string | null;
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
      body.playerId || null
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
