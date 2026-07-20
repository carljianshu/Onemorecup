import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const script = `
import assert from "node:assert/strict";
import {
  findKnownPlayer,
  assertRegistrationAllowed,
  isKnownPlayer
} from "./src/lib/invite-code.ts";

const players = [
  { id: "p1", name: "老钱", createdAt: "2026-01-01", pickStats: { page1Count: 1, page2Count: 0, page3Count: 0, totalCount: 1 } },
  { id: "p2", name: "Boss Crab", createdAt: "2026-01-01", pickStats: { page1Count: 1, page2Count: 0, page3Count: 0, totalCount: 1 } },
];

assert(findKnownPlayer(players, "p1", "")?.name === "老钱", "playerId alone should identify existing player");
assert(findKnownPlayer(players, null, " boss crab ")?.name === "Boss Crab", "name match should be case-insensitive and trimmed");
assert(findKnownPlayer(players, null, "新玩家") === undefined, "unknown name should not match");

assert(isKnownPlayer(players, "p2", ""), "known by id");
assert(isKnownPlayer(players, null, "老钱"), "known by name");

assert.throws(
  () => assertRegistrationAllowed("新玩家", null, players, true),
  /REGISTRATION_CLOSED/,
  "new player blocked when registration closed"
);

assert.doesNotThrow(
  () => assertRegistrationAllowed("", "p1", players, true),
  "existing player by id allowed when registration closed"
);

assert.doesNotThrow(
  () => assertRegistrationAllowed("老钱", null, players, true),
  "existing player by name allowed when registration closed"
);

assert.doesNotThrow(
  () => assertRegistrationAllowed("老钱", "p1", players, true),
  "existing player by id and name allowed when registration closed"
);

console.log("registration-closed smoke tests passed");
`;

const result = spawnSync("npx", ["--yes", "tsx", "-e", script], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log(result.stdout.trim());
