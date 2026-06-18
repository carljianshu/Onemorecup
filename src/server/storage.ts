import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getStore } from "@netlify/blobs";
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
const BLOB_STORE_NAME = "onemorecup-game";
const BLOB_STATE_KEY = "game-state";
const BLOB_WRITE_RETRIES = 3;

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

function normalizeStoredGame(parsed: unknown): StoredGame {
  if (!parsed || typeof parsed !== "object") {
    return { version: 0, payload: emptyPayload() };
  }
  const record = parsed as Partial<StoredGame>;
  if (!record.payload) {
    return { version: record.version ?? 0, payload: emptyPayload() };
  }
  return record as StoredGame;
}

function isEmptyState(stored: StoredGame) {
  return (
    stored.version === 0 &&
    stored.payload.players.length === 0 &&
    stored.payload.picks.length === 0
  );
}

function useNetlifyBlobs() {
  return process.env.NETLIFY === "true" && !process.env.GAME_STATE_DIR;
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

function getBlobStore() {
  return getStore({ name: BLOB_STORE_NAME, consistency: "strong" });
}

async function readFromFile(): Promise<StoredGame> {
  try {
    const file = await stateFilePath();
    const raw = await readFile(file, "utf-8");
    return normalizeStoredGame(JSON.parse(raw));
  } catch {
    return { version: 0, payload: emptyPayload() };
  }
}

async function writeToFile(stored: StoredGame) {
  const file = await stateFilePath();
  await writeFile(file, JSON.stringify(stored, null, 2), "utf-8");
}

async function readFromBlob(): Promise<{ stored: StoredGame; etag?: string }> {
  const store = getBlobStore();
  const result = await store.getWithMetadata(BLOB_STATE_KEY, { type: "json" });
  if (!result?.data) {
    return { stored: { version: 0, payload: emptyPayload() } };
  }
  return {
    stored: normalizeStoredGame(result.data),
    etag: result.etag
  };
}

async function writeToBlob(
  stored: StoredGame,
  options: { onlyIfMatch: string } | { onlyIfNew: true }
) {
  const store = getBlobStore();
  return store.setJSON(BLOB_STATE_KEY, stored, options);
}

async function migrateFileStateToBlobIfNeeded(stored: StoredGame) {
  if (!isEmptyState(stored)) return stored;

  const fileStored = await readFromFile();
  if (isEmptyState(fileStored)) return stored;

  const result = await writeToBlob(fileStored, { onlyIfNew: true });
  if (result.modified) return fileStored;
  return (await readFromBlob()).stored;
}

export async function readStoredGame(): Promise<StoredGame> {
  if (!useNetlifyBlobs()) {
    return readFromFile();
  }

  const { stored } = await readFromBlob();
  return migrateFileStateToBlobIfNeeded(stored);
}

export async function mutateStoredGame(
  mutator: (stored: StoredGame) => GameSnapshot,
  expectedVersion?: number
): Promise<StoredGame> {
  if (!useNetlifyBlobs()) {
    const current = await readFromFile();
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const next: StoredGame = {
      version: current.version + 1,
      payload: mutator(current)
    };
    await writeToFile(next);
    return next;
  }

  for (let attempt = 0; attempt < BLOB_WRITE_RETRIES; attempt++) {
    let { stored: current, etag } = await readFromBlob();
    if (isEmptyState(current)) {
      current = await migrateFileStateToBlobIfNeeded(current);
      ({ stored: current, etag } = await readFromBlob());
    }

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new VersionConflictError();
    }

    const next: StoredGame = {
      version: current.version + 1,
      payload: mutator(current)
    };

    const result = etag
      ? await writeToBlob(next, { onlyIfMatch: etag })
      : await writeToBlob(next, { onlyIfNew: true });
    if (result.modified) return next;
  }

  throw new VersionConflictError();
}
