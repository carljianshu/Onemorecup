import {
  hydrateGameState,
  migrateStoredAnswers,
  savePlayerPicks,
  setPageLocked,
  snapshotFromState,
  updateMarketWinner,
  updatePublicFeature,
  type GameSnapshot
} from "@/lib/local-store";
import { migratePickInputsForMarkets } from "@/data/markets";
import { assertInviteCodeForRegistration } from "@/lib/invite-code";
import { applyPromotionToSave } from "@/lib/promotion";
import { applyManualPageLock, isPageLocked } from "@/lib/page-lock";
import { validatePageSave } from "@/lib/pick-stats";
import { mutateStoredGame, readStoredGame, getStorageBackend } from "@/server/storage";
import type { AnswersPageFeature } from "@/lib/public-features";
import type { GameConfig, LeaderboardEntry, PlayerPickInput, PlayPage } from "@/types";

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  players: ReturnType<typeof hydrateGameState>["players"];
  markets: ReturnType<typeof hydrateGameState>["markets"];
  picks: ReturnType<typeof hydrateGameState>["picks"];
  config: GameConfig;
  version: number;
  storage: ReturnType<typeof getStorageBackend>;
}

function toResponse(stored: { version: number; payload: GameSnapshot }): LeaderboardResponse {
  const state = hydrateGameState(stored.payload, { persist: false });
  return {
    leaderboard: state.leaderboard,
    players: state.players,
    markets: state.markets,
    picks: state.picks,
    config: state.config,
    version: stored.version,
    storage: getStorageBackend()
  };
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  let stored = await readStoredGame();
  const migrated = migrateStoredAnswers(stored.payload);
  if (migrated.changed) {
    stored = await mutateStoredGame(
      (current) => ({
        ...current.payload,
        markets: migrated.markets,
        picks: migrated.picks
      }),
      stored.version
    );
  }
  return toResponse(stored);
}

function assertPageUnlocked(config: GameConfig, page: PlayPage) {
  if (isPageLocked(config, page)) throw new Error("PAGE_LOCKED");
}

function validatePlayerSave(
  page: PlayPage,
  pickInputs: PlayerPickInput[],
  pagePickInputs: PlayerPickInput[],
  markets: LeaderboardResponse["markets"]
) {
  const validationError = validatePageSave(page, pickInputs, markets, pagePickInputs);
  if (validationError) throw new Error(validationError.code);
}

export async function registerPlayer(
  body: {
    name: string;
    playerId?: string | null;
    inviteCode?: string;
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

    const pickInputs = migratePickInputsForMarkets(
      applyPromotionToSave(
        body.pickInputs,
        state.markets,
        state.leaderboard,
        body.playerId ?? null,
        body.page
      ),
      state.markets
    );
    validatePlayerSave(body.page, pickInputs, body.pagePickInputs, state.markets);
    assertInviteCodeForRegistration(
      body.name,
      body.playerId ?? null,
      state.players,
      body.inviteCode
    );

    saveResult = savePlayerPicks(
      body.name,
      pickInputs,
      { players: state.players, markets: state.markets, picks: state.picks },
      body.playerId || null,
      body.page,
      state.leaderboard,
      body.inviteCode
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

    if (patch.page !== undefined && patch.pageLocked !== undefined) {
      const result = setPageLocked(patch.page, patch.pageLocked, {
        players: state.players,
        markets: state.markets,
        picks: state.picks,
        config: state.config,
        leaderboard: state.leaderboard
      });
      config = result.config;
    } else {
      if (patch.page1Locked !== undefined) {
        config = applyManualPageLock(config, 1, patch.page1Locked);
      }
      if (patch.page2Locked !== undefined) {
        config = applyManualPageLock(config, 2, patch.page2Locked);
      }
      if (patch.page3Locked !== undefined) {
        config = applyManualPageLock(config, 3, patch.page3Locked);
      }
      if (patch.answersPage1Public !== undefined) {
        config = { ...config, answersPage1Public: patch.answersPage1Public };
      }
      if (patch.answersPage2Public !== undefined) {
        config = { ...config, answersPage2Public: patch.answersPage2Public };
      }
      if (patch.answersPage3Public !== undefined) {
        config = { ...config, answersPage3Public: patch.answersPage3Public };
      }
      if (patch.answersPage1OpensAt !== undefined) {
        config = { ...config, answersPage1OpensAt: patch.answersPage1OpensAt };
      }
      if (patch.answersPage2OpensAt !== undefined) {
        config = { ...config, answersPage2OpensAt: patch.answersPage2OpensAt };
      }
      if (patch.answersPage3OpensAt !== undefined) {
        config = { ...config, answersPage3OpensAt: patch.answersPage3OpensAt };
      }
      if (patch.feature) {
        const result = updatePublicFeature(
          patch.feature,
          { public: patch.public, opensAt: patch.opensAt },
          { config }
        );
        config = result.config;
      }
    }

    return snapshotFromState({
      players: state.players,
      markets: state.markets,
      picks: state.picks,
      config
    });
  }, expectedVersion);
}

export function removePlayer(playerId: string, expectedVersion?: number) {
  return mutateAdmin((state) => {
    const players = state.players.filter((p) => p.id !== playerId);
    const picks = state.picks.filter((p) => p.playerId !== playerId);
    if (players.length === state.players.length) {
      throw new Error("PLAYER_NOT_FOUND");
    }
    return snapshotFromState({
      players,
      markets: state.markets,
      picks,
      config: state.config
    });
  }, expectedVersion);
}
