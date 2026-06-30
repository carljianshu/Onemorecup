import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getStore } from "@netlify/blobs";
import type { GameSnapshot } from "@/lib/local-store";
import { defaultPageLockSchedule } from "@/lib/page-lock";
import { defaultAnswersPageSchedule } from "@/lib/public-features";

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
const VERSION_FILENAME = "game-state-version.txt";
const BLOB_STORE_NAME = "onemorecup-game";
const BLOB_STATE_KEY = "game-state";
const BLOB_VERSION_KEY = "game-state-version";
const BLOB_WRITE_RETRIES = 3;

function emptyPayload(): GameSnapshot {
  return {
    players: [],
    markets: null,
    picks: [],
    config: {
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

function isLocalFileStorage() {
  if (process.env.GAME_STATE_DIR) return true;
  // Plain `next dev` without Netlify CLI
  return process.env.NODE_ENV === "development" && !process.env.NETLIFY_DEV;
}

function useNetlifyBlobs() {
  if (isLocalFileStorage()) return false;
  // Netlify injects these at function runtime (NETLIFY alone is often build-only).
  return Boolean(
    process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.NETLIFY_SITE_ID ||
      process.env.NETLIFY === "true"
  );
}

export type StorageBackend = "blob" | "file";

export function getStorageBackend(): StorageBackend {
  return useNetlifyBlobs() ? "blob" : "file";
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
  const base = { name: BLOB_STORE_NAME, consistency: "strong" as const };

  if (process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext) {
    return getStore(base);
  }

  const siteID = process.env.NETLIFY_SITE_ID;
  const token =
    process.env.NETLIFY_AUTH_TOKEN ??
    process.env.NETLIFY_BLOBS_TOKEN ??
    process.env.NETLIFY_TOKEN;

  if (siteID && token) {
    return getStore({ ...base, siteID, token });
  }

  return getStore(base);
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

async function writeVersionMarker(version: number) {
  if (!useNetlifyBlobs()) {
    const file = path.join(await resolveDataDir(), VERSION_FILENAME);
    await writeFile(file, String(version), "utf-8");
    return;
  }
  const store = getBlobStore();
  await store.set(BLOB_VERSION_KEY, String(version));
}

async function migrateFileStateToBlobIfNeeded(stored: StoredGame) {
  if (!isEmptyState(stored)) return stored;

  const fileStored = await readFromFile();
  if (isEmptyState(fileStored)) return stored;

  const result = await writeToBlob(fileStored, { onlyIfNew: true });
  if (result.modified) {
    await writeVersionMarker(fileStored.version);
    return fileStored;
  }
  return (await readFromBlob()).stored;
}

/** 轻量读取版本号（Blob 下只读小 key，避免拉整份 game-state）。 */
export async function readStoredVersion(): Promise<number> {
  if (!useNetlifyBlobs()) {
    try {
      const file = path.join(await resolveDataDir(), VERSION_FILENAME);
      const raw = await readFile(file, "utf-8");
      const version = Number(raw.trim());
      if (Number.isFinite(version)) return version;
    } catch {
      // fall through
    }
    return (await readFromFile()).version;
  }

  const store = getBlobStore();
  const raw = await store.get(BLOB_VERSION_KEY, { type: "text" });
  if (raw !== null) {
    const version = Number(raw);
    if (Number.isFinite(version)) return version;
  }

  const { stored } = await readFromBlob();
  await writeVersionMarker(stored.version);
  return stored.version;
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
    await writeVersionMarker(next.version);
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
    if (result.modified) {
      await writeVersionMarker(next.version);
      return next;
    }
  }

  throw new VersionConflictError();
}
