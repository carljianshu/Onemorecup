import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { GameSnapshot } from "@/lib/local-store";

export class VersionConflictError extends Error {
  constructor() {
    super("VERSION_CONFLICT");
    this.name = "VersionConflictError";
  }
}

export interface StoredGame {
  version: number;
  payload: GameSnapshot;
}

const STATE_FILENAME = "game-state.json";

function emptyPayload(): GameSnapshot {
  return {
    players: [],
    markets: null,
    picks: [],
    config: {
      page1Locked: false,
      page2Locked: false,
      answersPage1Public: false,
      answersPage2Public: false,
      answersPage1OpensAt: null,
      answersPage2OpensAt: null
    }
  };
}

let dataDirPromise: Promise<string> | null = null;

async function resolveDataDir() {
  if (process.env.GAME_STATE_DIR) {
    const dir = process.env.GAME_STATE_DIR;
    await mkdir(dir, { recursive: true });
    return dir;
  }

  if (!dataDirPromise) {
    dataDirPromise = (async () => {
      const preferred = path.join(process.cwd(), "data");
      try {
        await mkdir(preferred, { recursive: true });
        return preferred;
      } catch {
        const fallback = path.join("/tmp", "onemorecup-data");
        await mkdir(fallback, { recursive: true });
        return fallback;
      }
    })();
  }

  return dataDirPromise;
}

async function stateFilePath() {
  const dir = await resolveDataDir();
  return path.join(dir, STATE_FILENAME);
}

export async function readStoredGame(): Promise<StoredGame> {
  try {
    const file = await stateFilePath();
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as StoredGame;
    if (!parsed.payload) {
      return { version: parsed.version ?? 0, payload: emptyPayload() };
    }
    return parsed;
  } catch {
    return { version: 0, payload: emptyPayload() };
  }
}

export async function mutateStoredGame(
  mutator: (stored: StoredGame) => GameSnapshot,
  expectedVersion?: number
): Promise<StoredGame> {
  const current = await readStoredGame();
  if (expectedVersion !== undefined && current.version !== expectedVersion) {
    throw new VersionConflictError();
  }

  const payload = mutator(current);
  const next: StoredGame = {
    version: current.version + 1,
    payload
  };

  const file = await stateFilePath();
  await writeFile(file, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
