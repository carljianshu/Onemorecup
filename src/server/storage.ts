import { readFile } from "fs/promises";
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

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "game-state.json");

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

export async function readStoredGame(): Promise<StoredGame> {
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StoredGame;
    if (!parsed.payload) {
      return { version: parsed.version ?? 0, payload: emptyPayload() };
    }
    return parsed;
  } catch {
    return { version: 0, payload: emptyPayload() };
  }
}
