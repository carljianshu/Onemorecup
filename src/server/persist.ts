import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { GameSnapshot } from "@/lib/local-store";
import { readStoredGame, VersionConflictError, type StoredGame } from "@/server/storage";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "game-state.json");

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

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
